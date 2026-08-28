from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.visit import VisitCreate
from app.services.visit_service import create_visit
router = APIRouter()
@router.post("", status_code=201)
def new_visit(payload: VisitCreate, db: Session = Depends(get_db)):
    visit = create_visit(db, payload)
    return {"message": "Visit created", "id": visit.id}
