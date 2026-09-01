from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PatientCreate(BaseModel):
    branch_id: int
    name: str
    gender: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    national_id: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    insurance_info: Optional[str] = None
    notes: Optional[str] = None


class PatientRead(BaseModel):
    id: int
    patient_number: str
    clinic_id: int
    branch_id: int
    name: str
    gender: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
