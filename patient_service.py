from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.patient import Patient
from app.models.branch import Branch
from app.schemas.patient import PatientCreate

def generate_patient_number(clinic_id: int, db: Session) -> str:
    prefix = f"MF{clinic_id:04d}-"
    last = db.query(func.max(Patient.id)).scalar() or 0
    return f"{prefix}{last + 1:07d}"

def create_patient(db: Session, clinic_id: int, data: PatientCreate) -> Patient:
    branch = db.query(Branch).filter(Branch.id == data.branch_id, Branch.clinic_id == clinic_id).first()
    if not branch: raise ValueError("Branch does not belong to your clinic")
    patient = Patient(**data.model_dump(), clinic_id=clinic_id, patient_number=generate_patient_number(clinic_id, db))
    db.add(patient); db.commit(); db.refresh(patient); return patient

def list_patients(db, clinic_id, search=None):
    q=db.query(Patient).filter(Patient.clinic_id==clinic_id)
    if search:
        like=f"%{search}%"; q=q.filter((Patient.name.ilike(like))|(Patient.phone.ilike(like))|(Patient.patient_number.ilike(like)))
    return q.order_by(Patient.created_at.desc()).limit(200).all()

def get_patient(db, clinic_id, patient_id):
    return db.query(Patient).filter(Patient.id==patient_id, Patient.clinic_id==clinic_id).first()
