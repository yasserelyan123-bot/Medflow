from sqlalchemy import Column, Integer, Numeric, String, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base
class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"))
    total_amount = Column(Numeric(12,2), default=0)
    discount = Column(Numeric(12,2), default=0)
    tax = Column(Numeric(12,2), default=0)
    grand_total = Column(Numeric(12,2), default=0)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
