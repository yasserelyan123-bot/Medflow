from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey
from datetime import datetime

from app.core.database import Base


class ChronicCondition(Base):
    """A diagnosed chronic condition on a patient's medical history
    (e.g. Type 2 Diabetes, Hypertension). VitalReading rows are attached
    to this so every measurement is tied to what it's tracking.
    """

    __tablename__ = "chronic_conditions"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    condition_name = Column(String, nullable=False)  # e.g. "Type 2 Diabetes", "Hypertension"
    icd10_code = Column(String, nullable=True)
    diagnosed_date = Column(DateTime, nullable=True)
    status = Column(String, default="active")  # active, controlled, resolved
    target_notes = Column(Text, nullable=True)  # doctor's target range / plan notes
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VitalReading(Base):
    """A single time-stamped measurement — the record that lets the
    clinic chart a patient's blood pressure or glucose over months,
    which is the whole point of chronic-disease follow-up.

    One row per reading, not one column that gets overwritten, so history
    is never lost and trends can be plotted.
    """

    __tablename__ = "vital_readings"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    chronic_condition_id = Column(Integer, ForeignKey("chronic_conditions.id"), nullable=True, index=True)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    reading_type = Column(String, nullable=False)  # blood_pressure, blood_glucose, weight, hba1c, cholesterol
    reading_date = Column(DateTime, default=datetime.utcnow, index=True)

    # Blood pressure
    systolic = Column(Float, nullable=True)
    diastolic = Column(Float, nullable=True)

    # Blood glucose
    glucose_value = Column(Float, nullable=True)
    glucose_unit = Column(String, nullable=True)  # mg/dL or mmol/L
    glucose_context = Column(String, nullable=True)  # fasting, postprandial, random, hba1c

    # Generic single-value reading (weight, cholesterol, hba1c%, etc.)
    value = Column(Float, nullable=True)
    unit = Column(String, nullable=True)

    is_abnormal = Column(String, nullable=True)  # normal, high, low, critical — set by service layer rules
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
