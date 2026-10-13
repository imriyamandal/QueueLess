from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    QueueEntry, Queue, ServiceCounter, CounterService, Service, Facility, User, utc_now, ensure_utc
)
from app.schemas.schemas import (
    CounterResponse, QueueEntryResponse, CallNextRequest, StaffActionResponse
)
from app.services.queue_engine import QueueEngine
from app.api.deps import require_staff_or_admin
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/staff", tags=["Staff Operations"])

@router.get("/dashboard")
def get_staff_dashboard(
    queue_id: Optional[str] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    # Default to first active queue if not specified
    if not queue_id:
        first_q = db.query(Queue).filter(Queue.status == "OPEN").first()
        queue_id = first_q.id if first_q else None

    # Fetch counters
    counters = db.query(ServiceCounter).order_by(ServiceCounter.counter_number.asc()).all()
    counter_responses = []
    now = utc_now()

    # Optimized batch fetching to avoid N+1 queries
    entry_ids = [c.current_entry_id for c in counters if c.current_entry_id]
    entries_by_id = (
        {e.id: e for e in db.query(QueueEntry).filter(QueueEntry.id.in_(entry_ids)).all()}
        if entry_ids
        else {}
    )

    counter_ids = [c.id for c in counters]
    all_counter_services = (
        db.query(CounterService)
        .filter(CounterService.counter_id.in_(counter_ids))
        .all()
    ) if counter_ids else []

    services_by_counter: Dict[str, List[str]] = {}
    for cs in all_counter_services:
        if cs.service:
            services_by_counter.setdefault(cs.counter_id, []).append(cs.service.name)

    for c in counters:
        curr_entry = entries_by_id.get(c.current_entry_id) if c.current_entry_id else None
        service_elapsed = None
        if curr_entry and curr_entry.service_start_at:
            s_utc = ensure_utc(curr_entry.service_start_at)
            n_utc = ensure_utc(now)
            service_elapsed = int((n_utc - s_utc).total_seconds()) if s_utc and n_utc else None

        supported = services_by_counter.get(c.id, [])

        counter_responses.append(
            CounterResponse(
                id=c.id,
                facility_id=c.facility_id,
                name=c.name,
                counter_number=c.counter_number,
                status=c.status,
                current_entry_id=c.current_entry_id,
                current_token_number=curr_entry.token_number if curr_entry else None,
                current_visitor_name=curr_entry.visitor_name if curr_entry else None,
                service_elapsed_seconds=service_elapsed,
                last_state_change=c.last_state_change,
                supported_services=supported,
            )
        )

    # Fetch waiting list and in-service list for this queue
    waiting_entries = []
    in_service_entries = []
    if queue_id:
        waiting = (
            db.query(QueueEntry)
            .filter(QueueEntry.queue_id == queue_id, QueueEntry.status == "WAITING")
            .order_by(QueueEntry.priority.desc(), QueueEntry.joined_at.asc())
            .all()
        )
        for w in waiting:
            waiting_entries.append(
                QueueEntryResponse(
                    id=w.id,
                    queue_id=w.queue_id,
                    token_number=w.token_number,
                    visitor_name=w.visitor_name,
                    status=w.status,
                    priority=w.priority,
                    joined_at=w.joined_at,
                    called_at=w.called_at,
                    service_start_at=w.service_start_at,
                    completed_at=w.completed_at,
                    cancelled_at=w.cancelled_at,
                    assigned_counter_id=w.assigned_counter_id,
                    notes=w.notes,
                    travel_time_minutes=w.travel_time_minutes,
                )
            )

        in_service = (
            db.query(QueueEntry)
            .filter(QueueEntry.queue_id == queue_id, QueueEntry.status.in_(["CALLED", "IN_SERVICE"]))
            .all()
        )
        for s in in_service:
            in_service_entries.append(
                QueueEntryResponse(
                    id=s.id,
                    queue_id=s.queue_id,
                    token_number=s.token_number,
                    visitor_name=s.visitor_name,
                    status=s.status,
                    priority=s.priority,
                    joined_at=s.joined_at,
                    called_at=s.called_at,
                    service_start_at=s.service_start_at,
                    completed_at=s.completed_at,
                    cancelled_at=s.cancelled_at,
                    assigned_counter_id=s.assigned_counter_id,
                    notes=s.notes,
                    travel_time_minutes=s.travel_time_minutes,
                )
            )

    return {
        "active_queue_id": queue_id,
        "counters": counter_responses,
        "waiting_entries": waiting_entries,
        "in_service_entries": in_service_entries,
    }

@router.post("/queues/{queue_id}/call-next")
async def call_next_visitor(
    queue_id: str,
    req: CallNextRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    entry = QueueEngine.call_next(
        db=db,
        queue_id=queue_id,
        counter_id=req.counter_id,
        staff_actor=current_user.email,
    )
    background_tasks.add_task(
        ws_manager.broadcast_queue_event,
        queue_id,
        "TOKEN_CALLED",
        {"token": entry.token_number, "id": entry.id, "counter_id": req.counter_id},
    )
    return {"success": True, "message": f"Called {entry.token_number}", "ticket_id": entry.id}

@router.post("/tickets/{ticket_id}/start")
async def start_service(
    ticket_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    entry = QueueEngine.start_service(db=db, ticket_id=ticket_id, staff_actor=current_user.email)
    background_tasks.add_task(
        ws_manager.broadcast_queue_event,
        entry.queue_id,
        "SERVICE_STARTED",
        {"token": entry.token_number, "id": entry.id},
    )
    return {"success": True, "message": f"Service started for {entry.token_number}"}

@router.post("/tickets/{ticket_id}/complete")
async def complete_service(
    ticket_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    entry = QueueEngine.complete_service(db=db, ticket_id=ticket_id, staff_actor=current_user.email)
    background_tasks.add_task(
        ws_manager.broadcast_queue_event,
        entry.queue_id,
        "SERVICE_COMPLETED",
        {"token": entry.token_number, "id": entry.id},
    )
    return {"success": True, "message": f"Service completed for {entry.token_number}"}

@router.post("/tickets/{ticket_id}/no-show")
async def mark_no_show(
    ticket_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    entry = QueueEngine.mark_no_show(db=db, ticket_id=ticket_id, staff_actor=current_user.email)
    background_tasks.add_task(
        ws_manager.broadcast_queue_event,
        entry.queue_id,
        "TOKEN_NO_SHOW",
        {"token": entry.token_number, "id": entry.id},
    )
    return {"success": True, "message": f"Marked {entry.token_number} as no-show"}

@router.post("/tickets/{ticket_id}/requeue")
async def requeue_visitor(
    ticket_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    entry = QueueEngine.requeue_ticket(db=db, ticket_id=ticket_id, staff_actor=current_user.email)
    background_tasks.add_task(
        ws_manager.broadcast_queue_event,
        entry.queue_id,
        "TOKEN_REQUEUED",
        {"token": entry.token_number, "id": entry.id},
    )
    return {"success": True, "message": f"Requeued {entry.token_number}"}

@router.post("/counters/{counter_id}/pause")
async def pause_counter(
    counter_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    counter = QueueEngine.toggle_counter_pause(db, counter_id, pause=True, staff_actor=current_user.email)
    queues = db.query(Queue).filter(Queue.facility_id == counter.facility_id, Queue.status == "OPEN").all()
    for q in queues:
        background_tasks.add_task(
            ws_manager.broadcast_queue_event,
            q.id,
            "COUNTER_PAUSED",
            {"counter_id": counter.id, "name": counter.name},
        )
    return {"success": True, "message": f"Counter {counter.name} paused."}

@router.post("/counters/{counter_id}/resume")
async def resume_counter(
    counter_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    counter = QueueEngine.toggle_counter_pause(db, counter_id, pause=False, staff_actor=current_user.email)
    queues = db.query(Queue).filter(Queue.facility_id == counter.facility_id, Queue.status == "OPEN").all()
    for q in queues:
        background_tasks.add_task(
            ws_manager.broadcast_queue_event,
            q.id,
            "COUNTER_RESUMED",
            {"counter_id": counter.id, "name": counter.name},
        )
    return {"success": True, "message": f"Counter {counter.name} resumed."}
