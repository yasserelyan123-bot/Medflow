from pydantic import BaseModel
from typing import Optional


class ClinicCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class ClinicRead(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True
