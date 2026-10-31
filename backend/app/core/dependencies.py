from typing import Annotated, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.security import decode_access_token
from app.database.session import get_session
from app.models.entities import User


bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "Invalid or expired access token.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Bearer access token required.")

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise _unauthorized()

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise _unauthorized("Invalid access token.")

    user = session.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized("User not found or inactive.")

    return user


def _role_value(user: User) -> str:
    """Return a normalized role for either a string or enum field."""
    role = user.role
    return str(getattr(role, "value", role)).upper()


def require_roles(*allowed_roles: str) -> Callable:
    allowed = {role.upper() for role in allowed_roles}

    def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if _role_value(current_user) not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return role_checker