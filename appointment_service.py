from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate


def create_appointment(db: Session, clinic_id: int, data: AppointmentCreate) -> Appointment:
    appointment = Appointment(**data.model_dump(), clinic_id=clinic_id)
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


def list_appointments(
    db: Session, clinic_id: int, date: str | None = None, doctor_id: int | None = None
):
    query = db.query(Appointment).filter(Appointment.clinic_id == clinic_id)
    if date:
        start = datetime.fromisoformat(date)
        end = start + timedelta(days=1)
        query = query.filter(Appointment.start_time >= start, Appointment.start_time < end)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    return query.order_by(Appointment.start_time.asc()).all()


def update_status(db: Session, clinic_id: int, appointment_id: int, status: str) -> Appointment | None:
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id, Appointment.clinic_id == clinic_id)
        .first()
    )
    if not appointment:
        return None
    appointment.status = status
    db.commit()
    db.refresh(appointment)
    return appointment
