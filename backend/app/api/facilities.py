from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Facility, Department, Service
from app.schemas.schemas import FacilityResponse, DepartmentResponse, ServiceResponse

router = APIRouter(tags=["Facilities & Services"])

@router.get("/facilities", response_model=List[FacilityResponse])
def list_facilities(db: Session = Depends(get_db)):
    return db.query(Facility).filter(Facility.is_active == True).all()

@router.get("/facilities/{facility_id}", response_model=FacilityResponse)
def get_facility(facility_id: str, db: Session = Depends(get_db)):
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility

@router.get("/facilities/{facility_id}/departments", response_model=List[DepartmentResponse])
def list_departments(facility_id: str, db: Session = Depends(get_db)):
    return db.query(Department).filter(Department.facility_id == facility_id).all()

@router.get("/facilities/{facility_id}/services", response_model=List[ServiceResponse])
def list_facility_services(facility_id: str, db: Session = Depends(get_db)):
    return db.query(Service).filter(Service.facility_id == facility_id, Service.is_active == True).all()

@router.get("/services", response_model=List[ServiceResponse])
def list_all_services(db: Session = Depends(get_db)):
    return db.query(Service).filter(Service.is_active == True).all()
