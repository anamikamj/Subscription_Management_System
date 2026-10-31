"""Role and customer-scope authorization helpers."""

from fastapi import HTTPException, status

from app.core.constants import UserRole
from app.models.entities import User


def check_customer_access(user: User, customer_id: int) -> None:
    """Ensure the user is authorized to access records for `customer_id`.

    Admin and Staff can access all customer records.
    Customer accounts are strictly scoped to their own linked customer_id.
    """
    role = getattr(user.role, "value", user.role)
    if role in (UserRole.ADMIN, UserRole.STAFF, "ADMIN", "STAFF"):
        return

    if role in (UserRole.CUSTOMER, "CUSTOMER"):
        if user.customer_id is None or user.customer_id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access another customer's data.",
            )
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to perform this action.",
    )