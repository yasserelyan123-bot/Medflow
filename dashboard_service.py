from datetime import datetime
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.visit import Visit
from app.models.pregnancy import Pregnancy


def get_stats(db: Session, clinic_id: int) -> dict:
    today = datetime.utcnow().date()
    start = datetime.combine(today, datetime.min.time())
    end = datetime.combine(today, datetime.max.time())

    return {
        "today_appointments": db.query(Appointment)
        .filter(
            Appointment.clinic_id == clinic_id,
            Appointment.start_time >= start,
            Appointment.start_time <= end,
        )
        .count(),
        "total_patients": db.query(Patient).filter(Patient.clinic_id == clinic_id).count(),
        "total_visits": db.query(Visit).filter(Visit.clinic_id == clinic_id).count(),
        "active_pregnancies": db.query(Pregnancy)
        .filter(Pregnancy.clinic_id == clinic_id, Pregnancy.status == "active")
        .count(),
    }
