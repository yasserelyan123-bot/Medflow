from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ChronicConditionCreate(BaseModel):
    patient_id: int
    condition_name: str
    icd10_code: Optional[str] = None
    diagnosed_date: Optional[datetime] = None
    status: Optional[str] = "active"
    target_notes: Optional[str] = None
    notes: Optional[str] = None


class ChronicConditionRead(BaseModel):
    id: int
    clinic_id: int
    patient_id: int
    condition_name: str
    icd10_code: Optional[str] = None
    diagnosed_date: Optional[datetime] = None
    status: str
    target_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class VitalReadingCreate(BaseModel):
    patient_id: int
    chronic_condition_id: Optional[int] = None
    reading_type: str  # blood_pressure, blood_glucose, weight, hba1c, cholesterol
    reading_date: Optional[datetime] = None
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    glucose_value: Optional[float] = None
    glucose_unit: Optional[str] = None
    glucose_context: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class VitalReadingRead(BaseModel):
    id: int
    clinic_id: int
    patient_id: int
    chronic_condition_id: Optional[int] = None
    reading_type: str
    reading_date: datetime
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    glucose_value: Optional[float] = None
    glucose_context: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    is_abnormal: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True
