from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.audit import log_action
from app.models.user import User
from app.schemas.visit import VisitCreate, VisitRead
from app.services import visit_service

router = APIRouter()


@router.post("", response_model=VisitRead)
def new_visit(
    payload: VisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visit = visit_service.create_visit(db, current_user.clinic_id, payload)
    log_action(db, current_user.clinic_id, current_user.id, "create", "visit", visit.id)
    return visit


@router.get("/patient/{patient_id}", response_model=list[VisitRead])
def list_patient_visits(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return visit_service.list_patient_visits(db, current_user.clinic_id, patient_id)
