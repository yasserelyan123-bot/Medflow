from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.audit import log_action
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientRead
from app.services.patient_service import create_patient, list_patients, get_patient
router=APIRouter()
@router.post("",response_model=PatientRead)
def create_new(payload:PatientCreate,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    try: p=create_patient(db,user.clinic_id,payload)
    except ValueError as e: raise HTTPException(400,str(e))
    log_action(db,user.clinic_id,user.id,"create","patient",p.id); return p
@router.get("",response_model=list[PatientRead])
def list_all(search:str|None=None,db:Session=Depends(get_db),user:User=Depends(get_current_user)): return list_patients(db,user.clinic_id,search)
@router.get("/{patient_id}",response_model=PatientRead)
def get_one(patient_id:int,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    p=get_patient(db,user.clinic_id,patient_id)
    if not p: raise HTTPException(404,"Patient not found")
    log_action(db,user.clinic_id,user.id,"view","patient",p.id); return p
