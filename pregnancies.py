from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.audit import log_action
from app.models.user import User
from app.schemas.pregnancy import (
    PregnancyCreate,
    PregnancyRead,
    AncVisitCreate,
    AncVisitRead,
    DeliveryCreate,
    DeliveryRead,
)
from app.services import pregnancy_service

router = APIRouter()


@router.post("", response_model=PregnancyRead)
def new_pregnancy(
    payload: PregnancyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pregnancy = pregnancy_service.create_pregnancy(db, current_user.clinic_id, payload)
    log_action(db, current_user.clinic_id, current_user.id, "create", "pregnancy", pregnancy.id)
    return pregnancy_service.get_pregnancy_with_ga(db, current_user.clinic_id, pregnancy.id)


@router.get("/active", response_model=list[PregnancyRead])
def active_pregnancies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """High-value dashboard view: every currently pregnant patient sorted
    by nearest due date, so the clinic can see who needs attention soon."""
    return pregnancy_service.list_active_pregnancies(db, current_user.clinic_id)


@router.get("/{pregnancy_id}", response_model=PregnancyRead)
def get_pregnancy(
    pregnancy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pregnancy = pregnancy_service.get_pregnancy_with_ga(db, current_user.clinic_id, pregnancy_id)
    if not pregnancy:
        raise HTTPException(status_code=404, detail="Pregnancy record not found")
    return pregnancy


@router.post("/anc-visits", response_model=AncVisitRead)
def new_anc_visit(
    payload: AncVisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visit = pregnancy_service.create_anc_visit(db, current_user.clinic_id, payload)
    if not visit:
        raise HTTPException(status_code=404, detail="Pregnancy record not found")
    return visit


@router.get("/{pregnancy_id}/anc-visits", response_model=list[AncVisitRead])
def list_anc_visits(
    pregnancy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visits = pregnancy_service.list_anc_visits(db, current_user.clinic_id, pregnancy_id)
    if visits is None:
        raise HTTPException(status_code=404, detail="Pregnancy record not found")
    return visits


@router.post("/deliveries", response_model=DeliveryRead)
def new_delivery(
    payload: DeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delivery = pregnancy_service.record_delivery(db, current_user.clinic_id, payload)
    if not delivery:
        raise HTTPException(status_code=404, detail="Pregnancy record not found")
    return delivery
