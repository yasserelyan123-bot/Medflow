from sqlalchemy.orm import Session

from app.models.visit import Visit
from app.models.appointment import Appointment
from app.schemas.visit import VisitCreate


def create_visit(db: Session, clinic_id: int, data: VisitCreate) -> Visit:
    visit = Visit(**data.model_dump(), clinic_id=clinic_id)
    db.add(visit)
    if data.appointment_id:
        appointment = (
            db.query(Appointment)
            .filter(Appointment.id == data.appointment_id, Appointment.clinic_id == clinic_id)
            .first()
        )
        if appointment:
            appointment.status = "completed"
    db.commit()
    db.refresh(visit)
    return visit


def list_patient_visits(db: Session, clinic_id: int, patient_id: int):
    return (
        db.query(Visit)
        .filter(Visit.clinic_id == clinic_id, Visit.patient_id == patient_id)
        .order_by(Visit.created_at.desc())
        .all()
    )
