from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.audit import log_action
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientRead
from app.services import patient_service

router = APIRouter()


@router.post("", response_model=PatientRead)
def create_new_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = patient_service.create_patient(db, current_user.clinic_id, payload)
    log_action(db, current_user.clinic_id, current_user.id, "create", "patient", patient.id)
    return patient


@router.get("", response_model=list[PatientRead])
def list_patients(
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return patient_service.list_patients(db, current_user.clinic_id, search)


@router.get("/{patient_id}", response_model=PatientRead)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = patient_service.get_patient(db, current_user.clinic_id, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    log_action(db, current_user.clinic_id, current_user.id, "view", "patient", patient.id)
    return patient
