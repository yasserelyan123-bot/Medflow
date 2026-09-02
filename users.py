from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.schemas.auth import UserCreate, UserRead
from app.services.auth_service import create_user

router = APIRouter()


@router.post("", response_model=UserRead)
def add_staff_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    # force the new user into the admin's own clinic — never trust a client-supplied clinic_id here
    payload.clinic_id = current_user.clinic_id
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    return create_user(db, payload)


@router.get("", response_model=list[UserRead])
def list_staff_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(User).filter(User.clinic_id == current_user.clinic_id).all()
