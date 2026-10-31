import re
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Optional


ALLOWED_PAYMENT_METHODS = {
    "CASH",
    "CARD",
    "BANK_TRANSFER",
    "UPI",
}


def validate_password(password: str) -> list[str]:
    """Return a separate error message for every password rule that fails."""
    errors = []

    if len(password) <= 8:
        errors.append("Password must contain more than 8 characters.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r"[^A-Za-z0-9]", password):
        errors.append("Password must contain at least one special character.")

    return errors


def normalize_email(email: str) -> str:
    """Normalize before checking uniqueness or storing an email."""
    return email.strip().lower()


def validate_email(email: str) -> bool:
    """Check basic email shape after trimming surrounding whitespace."""
    pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
    return re.fullmatch(pattern, normalize_email(email)) is not None


def validate_positive_amount(amount: Decimal | int | str) -> bool:
    """Payment amounts must be finite and greater than zero."""
    try:
        value = Decimal(str(amount))
    except (InvalidOperation, TypeError, ValueError):
        return False

    return value.is_finite() and value > 0


def normalize_payment_method(method: str) -> str:
    return method.strip().upper()


def validate_payment_method(method: str) -> bool:
    return normalize_payment_method(method) in ALLOWED_PAYMENT_METHODS


def validate_date_range(
    start_date: Optional[date],
    end_date: Optional[date],
) -> bool:
    """Allow an absent end date; otherwise it must not precede the start."""
    if start_date is None or end_date is None:
        return True

    return end_date >= start_date


def validate_positive_quantity(quantity: int) -> bool:
    return quantity > 0