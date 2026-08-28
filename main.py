from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.router import api_router
import app.models

app = FastAPI(title=settings.PROJECT_NAME)
origins = ["*"] if settings.CORS_ORIGINS == "*" else [x.strip() for x in settings.CORS_ORIGINS.split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False if origins == ["*"] else True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router, prefix=settings.API_V1_STR)
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
@app.get("/")
def root(): return {"message": "ClinicFlow API"}
@app.get("/health")
def health(): return {"status": "ok"}
