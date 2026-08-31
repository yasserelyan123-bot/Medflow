from datetime import datetime
from sqlalchemy.orm import Session

from app.models.chronic import ChronicCondition, VitalReading
from app.schemas.chronic import ChronicConditionCreate, VitalReadingCreate


def create_condition(db: Session, clinic_id: int, data: ChronicConditionCreate) -> ChronicCondition:
    condition = ChronicCondition(**data.model_dump(), clinic_id=clinic_id)
    db.add(condition)
    db.commit()
    db.refresh(condition)
    return condition


def list_patient_conditions(db: Session, clinic_id: int, patient_id: int):
    return (
        db.query(ChronicCondition)
        .filter(ChronicCondition.clinic_id == clinic_id, ChronicCondition.patient_id == patient_id)
        .order_by(ChronicCondition.created_at.desc())
        .all()
    )


def _assess_abnormality(data: VitalReadingCreate) -> str | None:
    """Simple threshold-based flagging. This is a convenience flag for the
    clinic UI only — it never substitutes for the doctor's own judgement.
    """
    if data.reading_type == "blood_pressure" and data.systolic and data.diastolic:
        if data.systolic >= 180 or data.diastolic >= 120:
            return "critical"
        if data.systolic >= 140 or data.diastolic >= 90:
            return "high"
        if data.systolic < 90 or data.diastolic < 60:
            return "low"
        return "normal"

    if data.reading_type == "blood_glucose" and data.glucose_value is not None:
        ctx = data.glucose_context or "random"
        if ctx == "fasting":
            if data.glucose_value >= 126:
                return "high"
            if data.glucose_value < 70:
                return "low"
            return "normal"
        if ctx == "postprandial":
            if data.glucose_value >= 200:
                return "high"
            if data.glucose_value < 70:
                return "low"
            return "normal"
    return None


def create_reading(db: Session, clinic_id: int, recorded_by: int, data: VitalReadingCreate) -> VitalReading:
    payload = data.model_dump()
    if not payload.get("reading_date"):
        payload["reading_date"] = datetime.utcnow()
    abnormal_flag = _assess_abnormality(data)
    reading = VitalReading(
        **payload, clinic_id=clinic_id, recorded_by=recorded_by, is_abnormal=abnormal_flag
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


def list_patient_readings(
    db: Session,
    clinic_id: int,
    patient_id: int,
    reading_type: str | None = None,
    limit: int = 100,
):
    query = db.query(VitalReading).filter(
        VitalReading.clinic_id == clinic_id, VitalReading.patient_id == patient_id
    )
    if reading_type:
        query = query.filter(VitalReading.reading_type == reading_type)
    return query.order_by(VitalReading.reading_date.desc()).limit(limit).all()
