from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.user import User
from app.models.branch import Branch
from app.schemas.appointment import AppointmentCreate

VALID_STATUS={"booked","arrived","completed","cancelled","no_show"}

def create_appointment(db: Session, clinic_id: int, data: AppointmentCreate):
    if data.end_time and data.end_time <= data.start_time: raise ValueError("End time must be after start time")
    branch=db.query(Branch).filter(Branch.id==data.branch_id, Branch.clinic_id==clinic_id).first()
    patient=db.query(Patient).filter(Patient.id==data.patient_id, Patient.clinic_id==clinic_id).first()
    doctor=db.query(User).filter(User.id==data.doctor_id, User.clinic_id==clinic_id, User.role=="doctor", User.is_active.is_(True)).first()
    if not branch or not patient or not doctor: raise ValueError("Branch, patient and doctor must belong to your clinic")
    end=data.end_time or (data.start_time+timedelta(minutes=30))
    conflict=db.query(Appointment).filter(Appointment.clinic_id==clinic_id,Appointment.doctor_id==data.doctor_id,Appointment.status.notin_(["cancelled","no_show"]),Appointment.start_time<end,Appointment.end_time>data.start_time).first()
    if conflict: raise ValueError("Doctor already has an overlapping appointment")
    appointment=Appointment(**data.model_dump(),clinic_id=clinic_id,end_time=end)
    db.add(appointment); db.commit(); db.refresh(appointment); return appointment

def list_appointments(db, clinic_id, date=None, doctor_id=None):
    q=db.query(Appointment).filter(Appointment.clinic_id==clinic_id)
    if date:
        start=datetime.fromisoformat(date); q=q.filter(Appointment.start_time>=start,Appointment.start_time<start+timedelta(days=1))
    if doctor_id: q=q.filter(Appointment.doctor_id==doctor_id)
    return q.order_by(Appointment.start_time).limit(500).all()

def update_status(db, clinic_id, appointment_id, status):
    if status not in VALID_STATUS: raise ValueError("Invalid appointment status")
    a=db.query(Appointment).filter(Appointment.id==appointment_id,Appointment.clinic_id==clinic_id).first()
    if not a:return None
    a.status=status; db.commit(); db.refresh(a); return a
