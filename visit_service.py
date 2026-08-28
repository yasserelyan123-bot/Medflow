from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.visit import Visit
from app.models.appointment import Appointment
from app.schemas.visit import VisitCreate
def create_visit(db: Session, data: VisitCreate):
    appointment = db.get(Appointment, data.appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appointment.patient_id != data.patient_id:
        raise HTTPException(status_code=400, detail="Appointment and patient do not match")
    if appointment.doctor_id != data.doctor_id:
        raise HTTPException(status_code=400, detail="Appointment and doctor do not match")
    visit = Visit(**data.model_dump())
    db.add(visit)
    appointment.status = "completed"
    db.commit()
    db.refresh(visit)
    return visit
