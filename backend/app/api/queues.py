from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import Queue, Service, Facility, QueueEntry, ServiceCounter
from app.schemas.schemas import QueueResponse, QueueStatusResponse
from app.services.prediction_engine import AdaptiveWaitingIntelligenceEngine

router = APIRouter(prefix="/queues", tags=["Queues"])

@router.get("", response_model=List[QueueResponse])
def list_queues(db: Session = Depends(get_db)):
    queues = db.query(Queue).filter(Queue.is_active == True).all()
    results = []
    for q in queues:
        service = db.query(Service).filter(Service.id == q.service_id).first()
        facility = db.query(Facility).filter(Facility.id == service.facility_id).first() if service else None
        
        waiting_count = db.query(func.count(QueueEntry.id)).filter(QueueEntry.queue_id == q.id, QueueEntry.status == "WAITING").scalar() or 0
        in_service_count = db.query(func.count(QueueEntry.id)).filter(QueueEntry.queue_id == q.id, QueueEntry.status == "IN_SERVICE").scalar() or 0
        completed_count = db.query(func.count(QueueEntry.id)).filter(QueueEntry.queue_id == q.id, QueueEntry.status == "COMPLETED").scalar() or 0

        results.append(
            QueueResponse(
                id=q.id,
                service_id=q.service_id,
                name=q.name,
                session_date=q.session_date,
                status=q.status,
                next_token_number=q.next_token_number,
                is_active=q.is_active,
                service_name=service.name if service else "General Service",
                facility_name=facility.name if facility else "Main Campus",
                waiting_count=waiting_count,
                in_service_count=in_service_count,
                completed_count=completed_count,
            )
        )
    return results

@router.get("/{queue_id}/status", response_model=QueueStatusResponse)
def get_queue_status(queue_id: str, db: Session = Depends(get_db)):
    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")

    waiting_count = db.query(func.count(QueueEntry.id)).filter(QueueEntry.queue_id == queue.id, QueueEntry.status == "WAITING").scalar() or 0
    in_service_count = db.query(func.count(QueueEntry.id)).filter(QueueEntry.queue_id == queue.id, QueueEntry.status == "IN_SERVICE").scalar() or 0
    
    # Active counters for this facility
    service = db.query(Service).filter(Service.id == queue.service_id).first()
    active_counters = 0
    if service:
        active_counters = db.query(func.count(ServiceCounter.id)).filter(
            ServiceCounter.facility_id == service.facility_id,
            ServiceCounter.status.in_(["AVAILABLE", "BUSY"])
        ).scalar() or 0

    mean_dur, std_dur, _ = AdaptiveWaitingIntelligenceEngine.get_service_duration_stats(db, queue.service_id)
    est_wait = int((waiting_count * mean_dur) / max(1, active_counters))
    lower = max(60, int(est_wait * 0.8))
    upper = int(est_wait * 1.3) + 120

    return QueueStatusResponse(
        queue_id=queue.id,
        queue_name=queue.name,
        status=queue.status,
        waiting_count=waiting_count,
        in_service_count=in_service_count,
        active_counters_count=active_counters,
        estimated_wait_seconds=est_wait,
        lower_bound_seconds=lower,
        upper_bound_seconds=upper,
    )
