from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AuditLog, Facility, Service, ServiceCounter, User
from app.schemas.schemas import AuditLogResponse, FacilityResponse, ServiceResponse, CounterResponse
from app.api.deps import require_admin
from app.services.prediction_engine import AdaptiveWaitingIntelligenceEngine

router = APIRouter(prefix="/admin", tags=["Administration"])

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()

@router.get("/prediction-performance")
def get_prediction_performance(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdaptiveWaitingIntelligenceEngine.evaluate_model_accuracy(db)
