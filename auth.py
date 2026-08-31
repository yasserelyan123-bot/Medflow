from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.core.deps import get_current_user
from app.models.user import User
from app.models.clinic import Clinic
from app.models.branch import Branch
from app.schemas.auth import Token, UserCreate, UserRead
from app.services.auth_service import authenticate_user, create_user

router = APIRouter()


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": str(user.id), "clinic_id": user.clinic_id, "role": user.role})
    return Token(access_token=token)


@router.post("/register-clinic", response_model=UserRead)
def register_clinic(
    clinic_name: str,
    admin_full_name: str,
    admin_username: str,
    admin_password: str,
    admin_email: str | None = None,
    db: Session = Depends(get_db),
):
    """One-time signup: creates a new clinic, its first branch, and its
    first admin user. This is the only unauthenticated write endpoint —
    everything else requires a token.
    """
    if db.query(User).filter(User.username == admin_username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    clinic = Clinic(name=clinic_name)
    db.add(clinic)
    db.commit()
    db.refresh(clinic)

    branch = Branch(clinic_id=clinic.id, name="الفرع الرئيسي")
    db.add(branch)
    db.commit()

    admin = create_user(
        db,
        UserCreate(
            clinic_id=clinic.id,
            full_name=admin_full_name,
            username=admin_username,
            email=admin_email,
            password=admin_password,
            role="admin",
        ),
    )
    return admin


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user
