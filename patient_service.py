from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.schemas.patient import PatientCreate


def generate_patient_number(clinic_id: int, db: Session) -> str:
    count = db.query(Patient).filter(Patient.clinic_id == clinic_id).count()
    return f"CL{clinic_id:03d}{count + 1:06d}"


def create_patient(db: Session, clinic_id: int, patient_in: PatientCreate) -> Patient:
    patient_number = generate_patient_number(clinic_id, db)
    patient = Patient(
        **patient_in.model_dump(), clinic_id=clinic_id, patient_number=patient_number
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def list_patients(db: Session, clinic_id: int, search: str | None = None):
    query = db.query(Patient).filter(Patient.clinic_id == clinic_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Patient.name.ilike(like))
            | (Patient.phone.ilike(like))
            | (Patient.patient_number.ilike(like))
        )
    return query.order_by(Patient.created_at.desc()).all()


def get_patient(db: Session, clinic_id: int, patient_id: int) -> Patient | None:
    return (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.clinic_id == clinic_id)
        .first()
    )
