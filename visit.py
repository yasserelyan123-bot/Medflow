from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class VisitCreate(BaseModel):
    appointment_id: Optional[int] = None
    patient_id: int
    doctor_id: int
    chief_complaint: str
    history: Optional[str] = None
    examination: Optional[str] = None
    diagnosis: Optional[str] = None
    plan: Optional[str] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    heart_rate: Optional[float] = None
    temperature: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    followup_date: Optional[datetime] = None


class VisitRead(BaseModel):
    id: int
    clinic_id: int
    patient_id: int
    doctor_id: int
    chief_complaint: str
    diagnosis: Optional[str] = None
    plan: Optional[str] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    weight: Optional[float] = None
    followup_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
