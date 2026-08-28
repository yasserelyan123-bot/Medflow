from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from datetime import datetime
from app.core.database import Base
class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=False, index=True)
    drug_name = Column(String, nullable=False)
    strength = Column(String)
    dose = Column(String)
    frequency = Column(String)
    duration_days = Column(Integer)
    instructions = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
