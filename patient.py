from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from datetime import datetime

from app.core.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    patient_number = Column(String, unique=True, index=True, nullable=False)
    national_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    gender = Column(String, nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    allergies = Column(Text, nullable=True)
    chronic_conditions = Column(Text, nullable=True)  # free-text summary; structured data in ChronicCondition
    insurance_info = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
