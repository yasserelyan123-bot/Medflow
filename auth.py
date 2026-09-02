from pydantic import BaseModel
from typing import Optional


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    clinic_id: int
    full_name: str
    username: str
    email: Optional[str] = None
    password: str
    role: str = "receptionist"


class UserRead(BaseModel):
    id: int
    clinic_id: int
    full_name: str
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True
