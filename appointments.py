from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.appointment import AppointmentCreate, AppointmentRead
from app.services.appointment_service import create_appointment
from app.models.appointment import Appointment
router = APIRouter()
@router.post("", response_model=AppointmentRead, status_code=201)
def new_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    return create_appointment(db, payload)
@router.get("", response_model=list[AppointmentRead])
def list_appointments(db: Session = Depends(get_db)):
    return db.query(Appointment).order_by(Appointment.start_time.desc()).all()
