import csv
import io
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import QueueEntry, Queue, Service, ensure_utc
from app.schemas.schemas import AnalyticsOverview
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

@router.get("", response_model=AnalyticsOverview)
def get_analytics_overview(db: Session = Depends(get_db)):
    return AnalyticsService.get_operational_metrics(db)

@router.get("/export")
def export_analytics_csv(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ticket ID", "Token Number", "Status", "Priority",
        "Joined At", "Service Start At", "Completed At",
        "Waiting Duration (s)", "Service Duration (s)"
    ])

    entries = db.query(QueueEntry).filter(QueueEntry.status == "COMPLETED").all()
    for e in entries:
        wait_dur = e.actual_waiting_seconds
        if wait_dur is None and e.service_start_at and e.joined_at:
            j_utc = ensure_utc(e.joined_at)
            s_utc = ensure_utc(e.service_start_at)
            wait_dur = int((s_utc - j_utc).total_seconds()) if s_utc and j_utc else ""
        elif wait_dur is None:
            wait_dur = ""

        serv_dur = e.actual_service_seconds
        if serv_dur is None and e.completed_at and e.service_start_at:
            s_utc = ensure_utc(e.service_start_at)
            c_utc = ensure_utc(e.completed_at)
            serv_dur = int((c_utc - s_utc).total_seconds()) if c_utc and s_utc else ""
        elif serv_dur is None:
            serv_dur = ""
        writer.writerow([
            e.id, e.token_number, e.status, e.priority,
            e.joined_at.isoformat() if e.joined_at else "",
            e.service_start_at.isoformat() if e.service_start_at else "",
            e.completed_at.isoformat() if e.completed_at else "",
            wait_dur, serv_dur
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=queueless-analytics-export.csv"},
    )
