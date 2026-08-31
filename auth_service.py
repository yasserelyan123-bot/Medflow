from sqlalchemy.orm import Session

from app.models.user import User
from app.core.security import verify_password, hash_password
from app.schemas.auth import UserCreate


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_user(db: Session, data: UserCreate) -> User:
    user = User(
        clinic_id=data.clinic_id,
        full_name=data.full_name,
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
