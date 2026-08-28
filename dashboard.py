from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.dashboard_service import get_stats
router = APIRouter()
@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    return get_stats(db)
