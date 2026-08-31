from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.pregnancy import Pregnancy, AncVisit, Delivery
from app.schemas.pregnancy import PregnancyCreate, AncVisitCreate, DeliveryCreate


def calculate_edd_from_lmp(lmp_date: datetime) -> datetime:
    """Naegele's rule: EDD = LMP + 280 days."""
    return lmp_date + timedelta(days=280)


def calculate_gestational_age(reference_date: datetime, lmp_date: datetime | None) -> tuple[int | None, int | None]:
    """Returns (weeks, days) of gestational age as of reference_date."""
    if not lmp_date:
        return None, None
    delta_days = (reference_date - lmp_date).days
    if delta_days < 0:
        return None, None
    return delta_days // 7, delta_days % 7


def create_pregnancy(db: Session, clinic_id: int, data: PregnancyCreate) -> Pregnancy:
    payload = data.model_dump()
    if not payload.get("edd_date") and payload.get("lmp_date"):
        payload["edd_date"] = calculate_edd_from_lmp(payload["lmp_date"])
        payload["edd_source"] = "lmp"
    pregnancy = Pregnancy(**payload, clinic_id=clinic_id)
    db.add(pregnancy)
    db.commit()
    db.refresh(pregnancy)
    return pregnancy


def get_pregnancy_with_ga(db: Session, clinic_id: int, pregnancy_id: int) -> Pregnancy | None:
    pregnancy = (
        db.query(Pregnancy)
        .filter(Pregnancy.id == pregnancy_id, Pregnancy.clinic_id == clinic_id)
        .first()
    )
    if pregnancy:
        weeks, days = calculate_gestational_age(datetime.utcnow(), pregnancy.lmp_date)
        pregnancy.current_gestational_age_weeks = weeks
        pregnancy.current_gestational_age_days = days
    return pregnancy


def list_active_pregnancies(db: Session, clinic_id: int):
    pregnancies = (
        db.query(Pregnancy)
        .filter(Pregnancy.clinic_id == clinic_id, Pregnancy.status == "active")
        .order_by(Pregnancy.edd_date.asc())
        .all()
    )
    for p in pregnancies:
        weeks, days = calculate_gestational_age(datetime.utcnow(), p.lmp_date)
        p.current_gestational_age_weeks = weeks
        p.current_gestational_age_days = days
    return pregnancies


def create_anc_visit(db: Session, clinic_id: int, data: AncVisitCreate) -> AncVisit | None:
    pregnancy = (
        db.query(Pregnancy)
        .filter(Pregnancy.id == data.pregnancy_id, Pregnancy.clinic_id == clinic_id)
        .first()
    )
    if not pregnancy:
        return None
    payload = data.model_dump()
    visit_date = payload.get("visit_date") or datetime.utcnow()
    payload["visit_date"] = visit_date
    weeks, days = calculate_gestational_age(visit_date, pregnancy.lmp_date)
    anc_visit = AncVisit(**payload, gestational_age_weeks=weeks, gestational_age_days=days)
    db.add(anc_visit)
    db.commit()
    db.refresh(anc_visit)
    return anc_visit


def list_anc_visits(db: Session, clinic_id: int, pregnancy_id: int):
    pregnancy = (
        db.query(Pregnancy)
        .filter(Pregnancy.id == pregnancy_id, Pregnancy.clinic_id == clinic_id)
        .first()
    )
    if not pregnancy:
        return None
    return (
        db.query(AncVisit)
        .filter(AncVisit.pregnancy_id == pregnancy_id)
        .order_by(AncVisit.visit_date.asc())
        .all()
    )


def record_delivery(db: Session, clinic_id: int, data: DeliveryCreate) -> Delivery | None:
    pregnancy = (
        db.query(Pregnancy)
        .filter(Pregnancy.id == data.pregnancy_id, Pregnancy.clinic_id == clinic_id)
        .first()
    )
    if not pregnancy:
        return None
    delivery = Delivery(**data.model_dump())
    db.add(delivery)
    pregnancy.status = "delivered"
    db.commit()
    db.refresh(delivery)
    return delivery
