from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.patient import Patient
from app.schemas.patient import PatientCreate
from fastapi import HTTPException

def generate_patient_number(clinic_id: int, db: Session) -> str:
    last_id = db.query(func.max(Patient.id)).filter(Patient.clinic_id == clinic_id).scalar() or 0
    return f"CL{clinic_id:03d}{last_id + 1:06d}"

def create_patient(db: Session, patient_in: PatientCreate):
    patient = Patient(**patient_in.model_dump(), patient_number=generate_patient_number(patient_in.clinic_id, db))
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient
