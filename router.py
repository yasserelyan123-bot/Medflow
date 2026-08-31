from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    patients,
    appointments,
    visits,
    prescriptions,
    pregnancies,
    chronic,
    dashboard,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(visits.router, prefix="/visits", tags=["Visits"])
api_router.include_router(prescriptions.router, prefix="/prescriptions", tags=["Prescriptions"])
api_router.include_router(pregnancies.router, prefix="/pregnancies", tags=["Pregnancy & ANC"])
api_router.include_router(chronic.router, prefix="/chronic", tags=["Chronic Disease Follow-up"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
