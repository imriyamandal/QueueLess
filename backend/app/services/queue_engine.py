import json
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.models import (
    Queue, QueueEntry, Service, ServiceCounter, QueueEvent, AuditLog, utc_now, ensure_utc
)
from app.services.prediction_engine import AdaptiveWaitingIntelligenceEngine
from app.services.notification_service import NotificationService
from app.websocket.manager import ws_manager

logger = logging.getLogger("queueless.queue_engine")

class QueueEngine:
    VALID_ENTRY_TRANSITIONS = {
        "WAITING": ["CALLED", "CANCELLED"],
        "CALLED": ["IN_SERVICE", "NO_SHOW", "WAITING"],  # WAITING is requeue
        "IN_SERVICE": ["COMPLETED", "WAITING"],          # WAITING is recovery/interruption
        "COMPLETED": [],
        "CANCELLED": [],
        "NO_SHOW": []
    }

    @classmethod
    def join_queue(
        cls,
        db: Session,
        queue_id: str,
        visitor_name: str,
        visitor_phone: Optional[str] = None,
        priority: int = 0,
        travel_time_minutes: int = 5,
        visitor_id: Optional[str] = None,
        fcm_token: Optional[str] = None,
    ) -> QueueEntry:
        """
        Atomically joins a queue, generates the next token number, records event, and returns entry.
        """
        queue = db.query(Queue).filter(Queue.id == queue_id).with_for_update().first() if db.bind.dialect.name != "sqlite" else db.query(Queue).filter(Queue.id == queue_id).first()
        if not queue:
            raise HTTPException(status_code=404, detail="Queue not found")

        if queue.status != "OPEN":
            raise HTTPException(status_code=400, detail=f"Queue is currently {queue.status.lower()} and not accepting entries.")

        service = db.query(Service).filter(Service.id == queue.service_id).first()
        prefix = service.code if service and service.code else "Q"
        token_num = f"{prefix}-{queue.next_token_number:03d}"
        queue.next_token_number += 1

        entry = QueueEntry(
            queue_id=queue.id,
            token_number=token_num,
            visitor_id=visitor_id,
            visitor_name=visitor_name,
            visitor_phone=visitor_phone,
            fcm_token=fcm_token,
            status="WAITING",
            priority=priority,
            travel_time_minutes=travel_time_minutes,
            joined_at=utc_now(),
        )
        db.add(entry)

        # Log queue event
        event = QueueEvent(
            queue_id=queue.id,
            entry_id=entry.id,
            event_type="TOKEN_JOINED",
            timestamp=utc_now(),
            metadata_json=json.dumps({"token": token_num, "visitor": visitor_name, "priority": priority}),
        )
        db.add(event)
        db.commit()
        db.refresh(entry)

        # Calculate initial prediction snapshot
        pred = AdaptiveWaitingIntelligenceEngine.calculate_ticket_prediction(db, entry.id, record_snapshot=True)

        # Trigger notification (Web Push and/or SMS)
        if entry.visitor_phone or entry.fcm_token:
            try:
                NotificationService.notify_ticket_joined(
                    db, entry, service.name if service else "Service", int(pred["estimated_wait_seconds"] / 60)
                )
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to dispatch join notification for ticket {entry.token_number}: {e}")

        return entry

    @classmethod
    def call_next(
        cls, db: Session, queue_id: str, counter_id: str, staff_actor: str = "Staff"
    ) -> QueueEntry:
        """
        Assigns the next eligible waiting token to the specified counter.
        """
        counter = db.query(ServiceCounter).filter(ServiceCounter.id == counter_id).first()
        if not counter:
            raise HTTPException(status_code=404, detail="Counter not found")

        if counter.status == "PAUSED":
            raise HTTPException(status_code=400, detail="Cannot call visitor while counter is paused.")
        if counter.status == "OFFLINE":
            raise HTTPException(status_code=400, detail="Cannot call visitor while counter is offline.")
        if counter.status == "BUSY":
            raise HTTPException(status_code=400, detail="Counter is currently busy serving another visitor.")

        # Find next highest-priority waiting visitor
        next_entry = (
            db.query(QueueEntry)
            .filter(QueueEntry.queue_id == queue_id, QueueEntry.status == "WAITING")
            .order_by(QueueEntry.priority.desc(), QueueEntry.joined_at.asc())
            .first()
        )

        if not next_entry:
            raise HTTPException(status_code=404, detail="No waiting visitors in this queue.")

        next_entry.status = "CALLED"
        next_entry.called_at = utc_now()
        next_entry.assigned_counter_id = counter.id

        counter.status = "BUSY"
        counter.current_entry_id = next_entry.id
        counter.last_state_change = utc_now()

        event = QueueEvent(
            queue_id=queue_id,
            entry_id=next_entry.id,
            counter_id=counter.id,
            event_type="TOKEN_CALLED",
            actor_id=staff_actor,
            timestamp=utc_now(),
            metadata_json=json.dumps({"token": next_entry.token_number, "counter": counter.name}),
        )
        db.add(event)

        audit = AuditLog(
            actor_email=staff_actor,
            action="CALL_NEXT",
            target_resource=f"Token {next_entry.token_number} -> Counter {counter.name}",
            timestamp=utc_now(),
        )
        db.add(audit)
        # Trigger FCM Web Push & Call notification
        try:
            NotificationService.notify_ticket_called(db, next_entry, counter.name)
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to dispatch called notification for ticket {next_entry.token_number}: {e}")

        # Notify the next visitor behind it that their turn is approaching
        try:
            following_entry = (
                db.query(QueueEntry)
                .filter(QueueEntry.queue_id == queue_id, QueueEntry.status == "WAITING")
                .order_by(QueueEntry.priority.desc(), QueueEntry.joined_at.asc())
                .first()
            )
            if following_entry:
                q_service = db.query(Service).join(Queue, Queue.service_id == Service.id).filter(Queue.id == queue_id).first()
                NotificationService.notify_ticket_approaching(
                    db, following_entry, q_service.name if q_service else "Service", position_ahead=1
                )
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to dispatch approaching notification: {e}")

        db.commit()
        db.refresh(next_entry)
        db.refresh(counter)
        return next_entry

    @classmethod
    def start_service(cls, db: Session, ticket_id: str, staff_actor: str = "Staff") -> QueueEntry:
        entry = db.query(QueueEntry).filter(QueueEntry.id == ticket_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if entry.status != "CALLED":
            raise HTTPException(
                status_code=409,
                detail=f"Illegal transition: Cannot start service from '{entry.status}'. Must be 'CALLED'.",
            )

        entry.status = "IN_SERVICE"
        entry.service_start_at = utc_now()
        if entry.joined_at:
            j_utc = ensure_utc(entry.joined_at)
            s_utc = ensure_utc(entry.service_start_at)
            if j_utc and s_utc:
                entry.actual_waiting_seconds = max(0, int((s_utc - j_utc).total_seconds()))

        event = QueueEvent(
            queue_id=entry.queue_id,
            entry_id=entry.id,
            counter_id=entry.assigned_counter_id,
            event_type="SERVICE_STARTED",
            actor_id=staff_actor,
            timestamp=utc_now(),
            metadata_json=json.dumps({"token": entry.token_number}),
        )
        db.add(event)
        db.commit()
        db.refresh(entry)
        return entry

    @classmethod
    def complete_service(cls, db: Session, ticket_id: str, staff_actor: str = "Staff") -> QueueEntry:
        entry = db.query(QueueEntry).filter(QueueEntry.id == ticket_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if entry.status != "IN_SERVICE":
            raise HTTPException(
                status_code=409,
                detail=f"Illegal transition: Cannot complete service from '{entry.status}'. Must be 'IN_SERVICE'.",
            )

        entry.status = "COMPLETED"
        entry.completed_at = utc_now()
        if entry.service_start_at:
            s_utc = ensure_utc(entry.service_start_at)
            c_utc = ensure_utc(entry.completed_at)
            if s_utc and c_utc:
                entry.actual_service_seconds = max(0, int((c_utc - s_utc).total_seconds()))

        # Free the assigned counter
        if entry.assigned_counter_id:
            counter = db.query(ServiceCounter).filter(ServiceCounter.id == entry.assigned_counter_id).first()
            if counter:
                counter.status = "AVAILABLE"
                counter.current_entry_id = None
                counter.last_state_change = utc_now()

        event = QueueEvent(
            queue_id=entry.queue_id,
            entry_id=entry.id,
            counter_id=entry.assigned_counter_id,
            event_type="SERVICE_COMPLETED",
            actor_id=staff_actor,
            timestamp=utc_now(),
            metadata_json=json.dumps({"token": entry.token_number}),
        )
        db.add(event)
        db.commit()
        db.refresh(entry)

        # Trigger completion notification (Push and/or SMS)
        if entry.visitor_phone or entry.fcm_token:
            try:
                service = db.query(Service).join(Queue, Queue.service_id == Service.id).filter(Queue.id == entry.queue_id).first()
                NotificationService.notify_service_completed(db, entry, service.name if service else "Service")
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to dispatch completion notification for ticket {entry.token_number}: {e}")

        return entry

    @classmethod
    def mark_no_show(cls, db: Session, ticket_id: str, staff_actor: str = "Staff") -> QueueEntry:
        entry = db.query(QueueEntry).filter(QueueEntry.id == ticket_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if entry.status != "CALLED":
            raise HTTPException(
                status_code=409,
                detail=f"Cannot mark no-show for ticket with status '{entry.status}'. Must be 'CALLED'.",
            )

        entry.status = "NO_SHOW"
        entry.cancelled_at = utc_now()

        # Free counter
        if entry.assigned_counter_id:
            counter = db.query(ServiceCounter).filter(ServiceCounter.id == entry.assigned_counter_id).first()
            if counter:
                counter.status = "AVAILABLE"
                counter.current_entry_id = None
                counter.last_state_change = utc_now()

        event = QueueEvent(
            queue_id=entry.queue_id,
            entry_id=entry.id,
            counter_id=entry.assigned_counter_id,
            event_type="TOKEN_NO_SHOW",
            actor_id=staff_actor,
            timestamp=utc_now(),
            metadata_json=json.dumps({"token": entry.token_number}),
        )
        db.add(event)
        db.commit()
        db.refresh(entry)
        return entry

    @classmethod
    def requeue_ticket(cls, db: Session, ticket_id: str, staff_actor: str = "Staff") -> QueueEntry:
        entry = db.query(QueueEntry).filter(QueueEntry.id == ticket_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if entry.status not in ["CALLED", "IN_SERVICE"]:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot requeue ticket with status '{entry.status}'. Must be 'CALLED' or 'IN_SERVICE'.",
            )

        # Free counter
        if entry.assigned_counter_id:
            counter = db.query(ServiceCounter).filter(ServiceCounter.id == entry.assigned_counter_id).first()
            if counter:
                counter.status = "AVAILABLE"
                counter.current_entry_id = None
                counter.last_state_change = utc_now()

        entry.status = "WAITING"
        entry.assigned_counter_id = None
        entry.called_at = None
        entry.service_start_at = None

        event = QueueEvent(
            queue_id=entry.queue_id,
            entry_id=entry.id,
            event_type="TOKEN_REQUEUED",
            actor_id=staff_actor,
            timestamp=utc_now(),
            metadata_json=json.dumps({"token": entry.token_number}),
        )
        db.add(event)
        db.commit()
        db.refresh(entry)
        return entry

    @classmethod
    def cancel_ticket(cls, db: Session, ticket_id: str, reason: str = "Visitor cancelled") -> QueueEntry:
        entry = db.query(QueueEntry).filter(QueueEntry.id == ticket_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if entry.status != "WAITING":
            raise HTTPException(
                status_code=409,
                detail=f"Cannot cancel ticket in '{entry.status}' state.",
            )

        entry.status = "CANCELLED"
        entry.cancelled_at = utc_now()
        entry.notes = reason

        event = QueueEvent(
            queue_id=entry.queue_id,
            entry_id=entry.id,
            event_type="TOKEN_CANCELLED",
            timestamp=utc_now(),
            metadata_json=json.dumps({"token": entry.token_number, "reason": reason}),
        )
        db.add(event)
        db.commit()
        db.refresh(entry)
        return entry

    @classmethod
    def toggle_counter_pause(cls, db: Session, counter_id: str, pause: bool, staff_actor: str = "Staff") -> ServiceCounter:
        counter = db.query(ServiceCounter).filter(ServiceCounter.id == counter_id).first()
        if not counter:
            raise HTTPException(status_code=404, detail="Counter not found")

        if pause:
            if counter.status == "BUSY":
                raise HTTPException(status_code=400, detail="Cannot pause counter while service is currently active.")
            counter.status = "PAUSED"
            event_type = "COUNTER_PAUSED"
        else:
            counter.status = "AVAILABLE"
            event_type = "COUNTER_RESUMED"

        counter.last_state_change = utc_now()

        audit = AuditLog(
            actor_email=staff_actor,
            action=event_type,
            target_resource=f"Counter {counter.name}",
            timestamp=utc_now(),
        )
        db.add(audit)
        db.commit()
        db.refresh(counter)
        return counter
