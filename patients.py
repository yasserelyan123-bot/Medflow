from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.patient import PatientCreate, PatientRead
from app.services.patient_service import create_patient
from app.models.patient import Patient
router = APIRouter()
@router.post("", response_model=PatientRead, status_code=201)
def create_new_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    return create_patient(db, payload)
@router.get("", response_model=list[PatientRead])
def list_patients(clinic_id: int | None = None, branch_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Patient)
    if clinic_id is not None: q = q.filter(Patient.clinic_id == clinic_id)
    if branch_id is not None: q = q.filter(Patient.branch_id == branch_id)
    return q.order_by(Patient.created_at.desc()).all()
