from sqlalchemy.orm import Session
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.visit import Visit
from datetime import datetime, time
def get_stats(db: Session):
    today = datetime.utcnow().date()
    start = datetime.combine(today, time.min)
    end = datetime.combine(today, time.max)
    return {
        "today_appointments": db.query(Appointment).filter(Appointment.start_time >= start, Appointment.start_time <= end).count(),
        "total_patients": db.query(Patient).count(),
        "total_visits": db.query(Visit).count(),
    }
