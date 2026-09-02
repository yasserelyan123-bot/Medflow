from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime

from app.core.database import Base


class AuditLog(Base):
    """Append-only record of who did what to which record and when.
    Required for medical-record systems; never update or delete rows here.
    """

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False)  # create, update, delete, view
    entity_type = Column(String, nullable=False)  # patient, visit, prescription, ...
    entity_id = Column(Integer, nullable=True)
    details = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
