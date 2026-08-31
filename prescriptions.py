from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.prescription import PrescriptionCreate, PrescriptionRead
from app.services import prescription_service

router = APIRouter()


@router.post("", response_model=PrescriptionRead)
def new_prescription(
    payload: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prescription = prescription_service.create_prescription(db, current_user.clinic_id, payload)
    if not prescription:
        raise HTTPException(status_code=404, detail="Visit not found")
    return prescription
