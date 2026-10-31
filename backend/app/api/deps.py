"""Shared FastAPI dependencies (database session, current user, permissions)."""

from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from app.core.constants import UserRole
from app.core.dependencies import get_current_user, require_roles
from app.database.session import get_session
from app.models.entities import User

SessionDep = Annotated[Session, Depends(get_session)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]
AdminUserDep = Annotated[User, Depends(require_roles(UserRole.ADMIN.value))]
StaffOrAdminDep = Annotated[User, Depends(require_roles(UserRole.ADMIN.value, UserRole.STAFF.value))]