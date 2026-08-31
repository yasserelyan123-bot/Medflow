from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.router import api_router

# Import every model module so SQLAlchemy registers all tables
# before create_all() runs below.
from app.models import (  # noqa: F401
    clinic,
    branch,
    user,
    patient,
    appointment,
    visit,
    prescription,
    invoice,
    pregnancy,
    chronic,
    audit_log,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="نظام إدارة عيادات طبية متعدد التخصصات، مع وحدات متخصصة لمتابعة الحمل والأمراض المزمنة.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend's real domain before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "ClinicFlow API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


Base.metadata.create_all(bind=engine)
