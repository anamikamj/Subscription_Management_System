"""Staff administration endpoints (Admin-only)."""

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import AdminUserDep, SessionDep
from app.core.constants import UserRole
from app.core.security import hash_password
from app.models.entities import User
from app.schemas.auth import StaffCreateRequest, UserRead
from app.utils.validators import normalize_email, validate_password

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_staff_member(
    payload: StaffCreateRequest,
    current_admin: AdminUserDep,
    session: SessionDep,
):
    """Admin-only: Create a new Staff account."""
    pwd_errors = validate_password(payload.password)
    if pwd_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="; ".join(pwd_errors),
        )

    email = normalize_email(payload.email)
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    staff_user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=UserRole.STAFF,
        is_active=True,
    )
    session.add(staff_user)
    session.commit()
    session.refresh(staff_user)

    return UserRead(
        id=staff_user.id,
        name=staff_user.name,
        email=staff_user.email,
        role=staff_user.role.value,
        customer_id=staff_user.customer_id,
    )
