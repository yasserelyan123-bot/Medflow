from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base,engine
from app.api.v1.router import api_router
from app.models import clinic,branch,user,patient,appointment,visit,prescription,invoice,pregnancy,chronic,audit_log
app=FastAPI(title=settings.PROJECT_NAME,version="1.0.0")
origins=[x.strip() for x in settings.CORS_ORIGINS.split(",") if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
app.include_router(api_router,prefix=settings.API_V1_STR)
@app.get("/")
def root(): return {"name":"MedFlow","status":"ok","docs":"/docs"}
@app.get("/health")
def health(): return {"status":"ok"}
Base.metadata.create_all(bind=engine)
