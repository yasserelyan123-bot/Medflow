from fastapi import APIRouter
from app.api.v1.endpoints import auth,patients,appointments,dashboard,users
api_router=APIRouter()
api_router.include_router(auth.router,prefix="/auth",tags=["auth"])
api_router.include_router(patients.router,prefix="/patients",tags=["patients"])
api_router.include_router(appointments.router,prefix="/appointments",tags=["appointments"])
api_router.include_router(dashboard.router,prefix="/dashboard",tags=["dashboard"])
api_router.include_router(users.router,prefix="/users",tags=["users"])
