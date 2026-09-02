from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from datetime import datetime

from app.core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=True)
    total_amount = Column(Float, default=0)
    discount = Column(Float, default=0)
    tax = Column(Float, default=0)
    grand_total = Column(Float, default=0)
    status = Column(String, default="draft")  # draft, issued, paid, partially_paid, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
