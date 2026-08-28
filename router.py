from fastapi import APIRouter
from app.api.v1.endpoints import patients, appointments, visits, dashboard
api_router = APIRouter()
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(visits.router, prefix="/visits", tags=["Visits"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
