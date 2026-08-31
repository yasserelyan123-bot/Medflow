from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AppointmentCreate(BaseModel):
    branch_id: int
    patient_id: int
    doctor_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    type: Optional[str] = "followup"
    notes: Optional[str] = None


class AppointmentUpdateStatus(BaseModel):
    status: str  # booked, arrived, completed, cancelled, no_show


class AppointmentRead(BaseModel):
    id: int
    clinic_id: int
    branch_id: int
    patient_id: int
    doctor_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    type: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True
