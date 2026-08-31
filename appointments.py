from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentRead, AppointmentUpdateStatus
from app.services import appointment_service

router = APIRouter()


@router.post("", response_model=AppointmentRead)
def new_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return appointment_service.create_appointment(db, current_user.clinic_id, payload)


@router.get("", response_model=list[AppointmentRead])
def list_appointments(
    date: str | None = None,
    doctor_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return appointment_service.list_appointments(db, current_user.clinic_id, date, doctor_id)


@router.patch("/{appointment_id}/status", response_model=AppointmentRead)
def update_appointment_status(
    appointment_id: int,
    payload: AppointmentUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appointment = appointment_service.update_status(
        db, current_user.clinic_id, appointment_id, payload.status
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment
