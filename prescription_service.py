from sqlalchemy.orm import Session

from app.models.prescription import Prescription
from app.models.visit import Visit
from app.schemas.prescription import PrescriptionCreate


def create_prescription(db: Session, clinic_id: int, data: PrescriptionCreate) -> Prescription | None:
    # verify the visit belongs to this clinic before attaching a prescription to it
    visit = (
        db.query(Visit)
        .filter(Visit.id == data.visit_id, Visit.clinic_id == clinic_id)
        .first()
    )
    if not visit:
        return None
    prescription = Prescription(**data.model_dump())
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return prescription
