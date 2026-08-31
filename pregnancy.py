from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey
from datetime import datetime

from app.core.database import Base


class Pregnancy(Base):
    """One record per pregnancy episode for a patient.

    Gestational age is always derived at read-time from lmp_date (or an
    ultrasound-corrected date), never stored as a static number, so it is
    correct on every visit without manual updates.
    """

    __tablename__ = "pregnancies"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    lmp_date = Column(DateTime, nullable=True)  # آخر دورة شهرية
    edd_date = Column(DateTime, nullable=True)  # موعد الولادة المتوقع (LMP + 280 days, or ultrasound-corrected)
    edd_source = Column(String, default="lmp")  # lmp | ultrasound | manual

    gravida = Column(Integer, nullable=True)  # عدد مرات الحمل
    para = Column(Integer, nullable=True)      # عدد الولادات
    abortions = Column(Integer, nullable=True)  # عدد مرات الإجهاض

    is_multiple = Column(Boolean, default=False)  # حمل متعدد
    risk_factors = Column(Text, nullable=True)  # ضغط، سكر، تسمم حمل سابق، إلخ
    blood_group = Column(String, nullable=True)

    status = Column(String, default="active")  # active, delivered, miscarried, terminated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AncVisit(Base):
    """Antenatal care follow-up visit — one row per prenatal check-up."""

    __tablename__ = "anc_visits"

    id = Column(Integer, primary_key=True, index=True)
    pregnancy_id = Column(Integer, ForeignKey("pregnancies.id"), nullable=False, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=True)  # optional link to a general Visit
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    visit_date = Column(DateTime, default=datetime.utcnow)
    gestational_age_weeks = Column(Integer, nullable=True)
    gestational_age_days = Column(Integer, nullable=True)

    weight = Column(Float, nullable=True)
    bp_systolic = Column(Float, nullable=True)
    bp_diastolic = Column(Float, nullable=True)
    urine_protein = Column(String, nullable=True)  # negative, trace, +1, +2 ...
    fundal_height_cm = Column(Float, nullable=True)
    fetal_heart_rate = Column(Integer, nullable=True)
    fetal_presentation = Column(String, nullable=True)  # cephalic, breech, transverse

    # Fetal biometry (usually from ultrasound)
    bpd_mm = Column(Float, nullable=True)
    hc_mm = Column(Float, nullable=True)
    ac_mm = Column(Float, nullable=True)
    fl_mm = Column(Float, nullable=True)
    efw_grams = Column(Float, nullable=True)  # estimated fetal weight

    notes = Column(Text, nullable=True)
    next_visit_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    pregnancy_id = Column(Integer, ForeignKey("pregnancies.id"), nullable=False, index=True)

    delivery_date = Column(DateTime, nullable=True)
    delivery_type = Column(String, nullable=True)  # vaginal, c_section, assisted
    hospital = Column(String, nullable=True)
    complications = Column(Text, nullable=True)

    baby_gender = Column(String, nullable=True)
    baby_weight_grams = Column(Float, nullable=True)
    baby_apgar_1min = Column(Integer, nullable=True)
    baby_apgar_5min = Column(Integer, nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
