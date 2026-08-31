from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    clinic_id: int,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    details: str | None = None,
) -> None:
    entry = AuditLog(
        clinic_id=clinic_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.add(entry)
    db.commit()
