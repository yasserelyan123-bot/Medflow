from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PregnancyCreate(BaseModel):
    patient_id: int
    lmp_date: Optional[datetime] = None
    edd_date: Optional[datetime] = None  # provide directly if ultrasound-corrected
    edd_source: Optional[str] = "lmp"
    gravida: Optional[int] = None
    para: Optional[int] = None
    abortions: Optional[int] = None
    is_multiple: Optional[bool] = False
    risk_factors: Optional[str] = None
    blood_group: Optional[str] = None


class PregnancyRead(BaseModel):
    id: int
    clinic_id: int
    patient_id: int
    lmp_date: Optional[datetime] = None
    edd_date: Optional[datetime] = None
    edd_source: Optional[str] = None
    gravida: Optional[int] = None
    para: Optional[int] = None
    abortions: Optional[int] = None
    is_multiple: bool
    risk_factors: Optional[str] = None
    blood_group: Optional[str] = None
    status: str
    created_at: datetime
    current_gestational_age_weeks: Optional[int] = None
    current_gestational_age_days: Optional[int] = None

    class Config:
        from_attributes = True


class AncVisitCreate(BaseModel):
    pregnancy_id: int
    doctor_id: int
    visit_id: Optional[int] = None
    visit_date: Optional[datetime] = None
    weight: Optional[float] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    urine_protein: Optional[str] = None
    fundal_height_cm: Optional[float] = None
    fetal_heart_rate: Optional[int] = None
    fetal_presentation: Optional[str] = None
    bpd_mm: Optional[float] = None
    hc_mm: Optional[float] = None
    ac_mm: Optional[float] = None
    fl_mm: Optional[float] = None
    efw_grams: Optional[float] = None
    notes: Optional[str] = None
    next_visit_date: Optional[datetime] = None


class AncVisitRead(BaseModel):
    id: int
    pregnancy_id: int
    doctor_id: int
    visit_date: datetime
    gestational_age_weeks: Optional[int] = None
    gestational_age_days: Optional[int] = None
    weight: Optional[float] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    fundal_height_cm: Optional[float] = None
    fetal_heart_rate: Optional[int] = None
    efw_grams: Optional[float] = None
    notes: Optional[str] = None
    next_visit_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeliveryCreate(BaseModel):
    pregnancy_id: int
    delivery_date: Optional[datetime] = None
    delivery_type: Optional[str] = None
    hospital: Optional[str] = None
    complications: Optional[str] = None
    baby_gender: Optional[str] = None
    baby_weight_grams: Optional[float] = None
    baby_apgar_1min: Optional[int] = None
    baby_apgar_5min: Optional[int] = None
    notes: Optional[str] = None


class DeliveryRead(BaseModel):
    id: int
    pregnancy_id: int
    delivery_date: Optional[datetime] = None
    delivery_type: Optional[str] = None
    hospital: Optional[str] = None
    baby_gender: Optional[str] = None
    baby_weight_grams: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True
