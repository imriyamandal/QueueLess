from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    QueueEntry, Queue, Service, Facility, ServiceCounter, NotificationDelivery, utc_now, ensure_utc
)
from app.schemas.schemas import (
    QueueJoinRequest, TicketDetailResponse, QueueEntryResponse,
    TicketHistoryItem, NotificationDeliveryResponse, TestSmsRequest,
    FcmTokenUpdateRequest, TestPushRequest
)
from app.services.queue_engine import QueueEngine
from app.services.prediction_engine import AdaptiveWaitingIntelligenceEngine
from app.services.notification_service import NotificationService
from app.websocket.manager import ws_manager

router = APIRouter(tags=["Visitor Tickets"])

def build_ticket_response(db: Session, entry: QueueEntry) -> TicketDetailResponse:
    queue = db.query(Queue).filter(Queue.id == entry.queue_id).first()
    service = db.query(Service).filter(Service.id == queue.service_id).first() if queue else None
    facility = db.query(Facility).filter(Facility.id == service.facility_id).first() if service else None
    
    counter_name = None
    if entry.assigned_counter_id:
        counter = db.query(ServiceCounter).filter(ServiceCounter.id == entry.assigned_counter_id).first()
        if counter:
            counter_name = counter.name

    pred = AdaptiveWaitingIntelligenceEngine.calculate_ticket_prediction(db, entry.id, record_snapshot=False)

    # Fetch notification delivery records
    deliveries = (
        db.query(NotificationDelivery)
        .filter(NotificationDelivery.entry_id == entry.id)
        .order_by(NotificationDelivery.created_at.desc())
        .all()
    )
    delivery_responses = [
        NotificationDeliveryResponse(
            id=d.id,
            entry_id=d.entry_id,
            channel=getattr(d, "channel", "PUSH") or "PUSH",
            recipient_phone=d.recipient_phone,
            recipient_token=getattr(d, "recipient_token", None),
            event_type=d.event_type,
            provider=d.provider,
            status=d.status,
            provider_message_id=d.provider_message_id,
            message_text=d.message_text,
            error_message=d.error_message,
            created_at=d.created_at,
            delivered_at=d.delivered_at,
        )
        for d in deliveries
    ]

    ticket_resp = QueueEntryResponse(
        id=entry.id,
        queue_id=entry.queue_id,
        token_number=entry.token_number,
        visitor_name=entry.visitor_name,
        visitor_phone=entry.visitor_phone,
        fcm_token=entry.fcm_token,
        status=entry.status,
        priority=entry.priority,
        joined_at=entry.joined_at,
        called_at=entry.called_at,
        service_start_at=entry.service_start_at,
        completed_at=entry.completed_at,
        cancelled_at=entry.cancelled_at,
        assigned_counter_id=entry.assigned_counter_id,
        assigned_counter_name=counter_name,
        notes=entry.notes,
        travel_time_minutes=entry.travel_time_minutes,
        actual_waiting_seconds=entry.actual_waiting_seconds,
        actual_service_seconds=entry.actual_service_seconds,
    )

    fac_tz = facility.timezone if facility and facility.timezone else pred.get("facility_timezone", "Asia/Kolkata")

    return TicketDetailResponse(
        ticket=ticket_resp,
        facility_id=facility.id if facility else "unknown",
        facility_name=facility.name if facility else "Student Services Center",
        service_id=service.id if service else "unknown",
        service_name=service.name if service else "General Service",
        queue_name=queue.name if queue else "General Queue",
        position_ahead=pred["position_ahead"],
        estimated_wait_seconds=pred["estimated_wait_seconds"],
        lower_bound_seconds=pred["lower_bound_seconds"],
        upper_bound_seconds=pred["upper_bound_seconds"],
        estimated_turn_time=pred.get("estimated_turn_time"),
        turn_time_lower=pred.get("turn_time_lower"),
        turn_time_upper=pred.get("turn_time_upper"),
        recommended_departure_time=pred.get("recommended_departure_time"),
        active_counters_count=pred["active_counters_count"],
        data_quality=pred["data_quality"],
        explanation=pred["explanation"],
        facility_timezone=fac_tz,
        last_updated_at=pred.get("last_updated_at", utc_now()),
        status_message=pred.get("status_message", "You're in the queue."),
        notifications=delivery_responses,
    )

@router.post("/queues/{queue_id}/join", response_model=TicketDetailResponse)
async def join_queue(
    queue_id: str,
    req: QueueJoinRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    entry = QueueEngine.join_queue(
        db=db,
        queue_id=queue_id,
        visitor_name=req.visitor_name,
        visitor_phone=req.visitor_phone,
        priority=req.priority,
        travel_time_minutes=req.travel_time_minutes,
        fcm_token=req.fcm_token,
    )

    # Broadcast event to queue subscribers
    background_tasks.add_task(
        ws_manager.broadcast_queue_event,
        queue_id,
        "TOKEN_JOINED",
        {"token": entry.token_number, "id": entry.id, "visitor": entry.visitor_name},
    )

    return build_ticket_response(db, entry)

@router.get("/tickets/history", response_model=List[TicketHistoryItem])
def get_ticket_history(
    phone: Optional[str] = Query(None, description="Visitor phone number"),
    ids: Optional[str] = Query(None, description="Comma-separated ticket UUIDs"),
    visitor_name: Optional[str] = Query(None, description="Visitor display name"),
    status: Optional[str] = Query(None, description="Filter: ALL, ACTIVE, COMPLETED, CANCELLED, etc."),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(QueueEntry)

    has_filter = False
    if ids:
        ticket_id_list = [t.strip() for t in ids.split(",") if t.strip()]
        if ticket_id_list:
            query = query.filter(QueueEntry.id.in_(ticket_id_list))
            has_filter = True
    elif phone:
        query = query.filter(QueueEntry.visitor_phone.like(f"%{phone.strip()}%"))
        has_filter = True
    elif visitor_name:
        query = query.filter(QueueEntry.visitor_name.ilike(f"%{visitor_name.strip()}%"))
        has_filter = True

    if status and status.upper() != "ALL":
        st = status.upper()
        if st == "ACTIVE":
            query = query.filter(QueueEntry.status.in_(["WAITING", "CALLED", "IN_SERVICE"]))
        elif st in ["CANCELLED", "NO_SHOW"]:
            query = query.filter(QueueEntry.status.in_(["CANCELLED", "NO_SHOW"]))
        else:
            query = query.filter(QueueEntry.status == st)
        has_filter = True

    if not has_filter:
        # In demo mode, return recent entries if no filter specified
        query = query.order_by(QueueEntry.joined_at.desc()).limit(limit)
    else:
        query = query.order_by(QueueEntry.joined_at.desc()).limit(limit)

    entries = query.all()
    history_items = []
    for entry in entries:
        q = db.query(Queue).filter(Queue.id == entry.queue_id).first()
        srv = db.query(Service).filter(Service.id == q.service_id).first() if q else None
        fac = db.query(Facility).filter(Facility.id == srv.facility_id).first() if srv else None
        counter = db.query(ServiceCounter).filter(ServiceCounter.id == entry.assigned_counter_id).first() if entry.assigned_counter_id else None

        # Compute durations if not already recorded
        actual_wait = entry.actual_waiting_seconds
        if actual_wait is None and entry.service_start_at and entry.joined_at:
            j_utc = ensure_utc(entry.joined_at)
            s_utc = ensure_utc(entry.service_start_at)
            if j_utc and s_utc:
                actual_wait = max(0, int((s_utc - j_utc).total_seconds()))

        actual_serv = entry.actual_service_seconds
        if actual_serv is None and entry.completed_at and entry.service_start_at:
            s_utc = ensure_utc(entry.service_start_at)
            c_utc = ensure_utc(entry.completed_at)
            if s_utc and c_utc:
                actual_serv = max(0, int((c_utc - s_utc).total_seconds()))

        history_items.append(
            TicketHistoryItem(
                id=entry.id,
                token_number=entry.token_number,
                queue_id=entry.queue_id,
                facility_name=fac.name if fac else "Student Services Hub",
                service_name=srv.name if srv else "Administrative Desk",
                status=entry.status,
                priority=entry.priority,
                joined_at=entry.joined_at,
                called_at=entry.called_at,
                service_start_at=entry.service_start_at,
                completed_at=entry.completed_at,
                cancelled_at=entry.cancelled_at,
                actual_waiting_seconds=actual_wait,
                actual_service_seconds=actual_serv,
                assigned_counter_name=counter.name if counter else None,
                notes=entry.notes,
            )
        )
    return history_items

@router.get("/tickets/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    entry = db.query(QueueEntry).filter(QueueEntry.id == ticket_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return build_ticket_response(db, entry)

@router.get("/tickets/{ticket_id}/notifications", response_model=List[NotificationDeliveryResponse])
def get_ticket_notifications(ticket_id: str, db: Session = Depends(get_db)):
    deliveries = (
        db.query(NotificationDelivery)
        .filter(NotificationDelivery.entry_id == ticket_id)
        .order_by(NotificationDelivery.created_at.desc())
        .all()
    )
    return deliveries

@router.post("/tickets/{ticket_id}/cancel", response_model=TicketDetailResponse)
async def cancel_ticket(
    ticket_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    entry = QueueEngine.cancel_ticket(db, ticket_id)
    background_tasks.add_task(
        ws_manager.broadcast_queue_event,
        entry.queue_id,
        "TOKEN_CANCELLED",
        {"token": entry.token_number, "id": entry.id},
    )
    return build_ticket_response(db, entry)

@router.post("/tickets/{ticket_id}/check-in", response_model=TicketDetailResponse)
def check_in_ticket(ticket_id: str, db: Session = Depends(get_db)):
    entry = db.query(QueueEntry).filter(QueueEntry.id == ticket_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ticket not found")
    entry.check_in_at = utc_now()
    db.commit()
    db.refresh(entry)
    return build_ticket_response(db, entry)

@router.get("/tickets/{ticket_id}/prediction")
def get_ticket_prediction(ticket_id: str, db: Session = Depends(get_db)):
    return AdaptiveWaitingIntelligenceEngine.calculate_ticket_prediction(db, ticket_id, record_snapshot=True)

@router.post("/tickets/{ticket_id}/fcm-token")
def register_ticket_fcm_token(ticket_id: str, req: FcmTokenUpdateRequest, db: Session = Depends(get_db)):
    """
    Registers or refreshes the browser's FCM device token for web push alerts.
    """
    try:
        entry = NotificationService.register_fcm_token(db, ticket_id, req.fcm_token)
        return {
            "success": True,
            "message": "FCM device token registered successfully",
            "ticket_id": ticket_id,
            "token_number": entry.token_number,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/notifications/test-fcm")
def send_test_fcm_notification(req: TestPushRequest):
    """
    Test FCM Web Push endpoint to verify browser push notification delivery.
    """
    token = req.fcm_token or req.token
    if not token:
        raise HTTPException(status_code=422, detail="fcm_token or token is required")
    return NotificationService.send_test_push(token, req.title, req.body)

@router.post("/notifications/test-sms")
def send_test_notification(req: TestSmsRequest):
    """
    Test SMS dispatch endpoint to verify provider configuration.
    """
    return NotificationService.send_test_sms(req.phone, req.message)
