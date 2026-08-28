from pydantic import BaseModel
from datetime import datetime
from typing import Optional
class AppointmentCreate(BaseModel):
    clinic_id: int
    branch_id: int
    patient_id: int
    doctor_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    type: str = "followup"
    notes: Optional[str] = None
class AppointmentRead(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    start_time: datetime
    status: str
    type: str
    model_config = {"from_attributes": True}
