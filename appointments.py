from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.appointment import AppointmentCreate,AppointmentRead,AppointmentUpdateStatus
from app.services.appointment_service import create_appointment,list_appointments,update_status
router=APIRouter()
@router.post("",response_model=AppointmentRead)
def new(payload:AppointmentCreate,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    try:return create_appointment(db,user.clinic_id,payload)
    except ValueError as e:raise HTTPException(400,str(e))
@router.get("",response_model=list[AppointmentRead])
def all(date:str|None=None,doctor_id:int|None=None,db:Session=Depends(get_db),user:User=Depends(get_current_user)):return list_appointments(db,user.clinic_id,date,doctor_id)
@router.patch("/{appointment_id}/status",response_model=AppointmentRead)
def status(appointment_id:int,payload:AppointmentUpdateStatus,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    try:a=update_status(db,user.clinic_id,appointment_id,payload.status)
    except ValueError as e:raise HTTPException(400,str(e))
    if not a:raise HTTPException(404,"Appointment not found")
    return a
