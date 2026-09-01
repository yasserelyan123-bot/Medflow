from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.audit import log_action
from app.models.user import User
from app.schemas.chronic import (
    ChronicConditionCreate,
    ChronicConditionRead,
    VitalReadingCreate,
    VitalReadingRead,
)
from app.services import chronic_service

router = APIRouter()


@router.post("/conditions", response_model=ChronicConditionRead)
def new_condition(
    payload: ChronicConditionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    condition = chronic_service.create_condition(db, current_user.clinic_id, payload)
    log_action(db, current_user.clinic_id, current_user.id, "create", "chronic_condition", condition.id)
    return condition


@router.get("/conditions/patient/{patient_id}", response_model=list[ChronicConditionRead])
def list_conditions(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return chronic_service.list_patient_conditions(db, current_user.clinic_id, patient_id)


@router.post("/readings", response_model=VitalReadingRead)
def new_reading(
    payload: VitalReadingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return chronic_service.create_reading(db, current_user.clinic_id, current_user.id, payload)


@router.get("/readings/patient/{patient_id}", response_model=list[VitalReadingRead])
def list_readings(
    patient_id: int,
    reading_type: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns readings newest-first — this is the feed the UI charts
    to show a patient's blood pressure or glucose trend over time."""
    return chronic_service.list_patient_readings(
        db, current_user.clinic_id, patient_id, reading_type, limit
    )
