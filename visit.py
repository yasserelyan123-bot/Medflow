from pydantic import BaseModel
from datetime import datetime
from typing import Optional
class VisitCreate(BaseModel):
    appointment_id: int
    patient_id: int
    doctor_id: int
    chief_complaint: str
    history: Optional[str] = None
    examination: Optional[str] = None
    diagnosis: Optional[str] = None
    plan: Optional[str] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    weight: Optional[float] = None
    followup_date: Optional[datetime] = None
