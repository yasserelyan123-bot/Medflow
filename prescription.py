from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PrescriptionCreate(BaseModel):
    visit_id: int
    drug_name: str
    strength: Optional[str] = None
    form: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    duration_days: Optional[int] = None
    instructions: Optional[str] = None


class PrescriptionRead(BaseModel):
    id: int
    visit_id: int
    drug_name: str
    strength: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    duration_days: Optional[int] = None
    instructions: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
