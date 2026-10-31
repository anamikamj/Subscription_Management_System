from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.payments import PaymentCreate
from app.utils.validators import (
    normalize_email,
    validate_date_range,
    validate_email,
    validate_password,
    validate_payment_method,
    validate_positive_amount,
    validate_positive_quantity,
)


def test_password_requires_more_than_eight_characters():
    assert validate_password("Abcdef1!")  # 8 characters


def test_password_requires_uppercase():
    assert any(
        "uppercase" in error.lower()
        for error in validate_password("abcdefgh1!")
    )


def test_password_requires_lowercase():
    assert any(
        "lowercase" in error.lower()
        for error in validate_password("ABCDEFGH1!")
    )


def test_password_requires_special_character():
    assert any(
        "special character" in error.lower()
        for error in validate_password("Abcdefgh12")
    )


def test_valid_password_passes():
    assert validate_password("StrongPass1!") == []


def test_email_normalization():
    assert normalize_email("  Test@Example.com ") == "test@example.com"


def test_email_validation():
    assert validate_email(" Test@Example.com ")
    assert not validate_email("not-an-email")


def test_positive_amount():
    assert validate_positive_amount(Decimal("1"))
    assert not validate_positive_amount(Decimal("0"))
    assert not validate_positive_amount(Decimal("-1"))


def test_payment_method():
    assert validate_payment_method("upi")
    assert not validate_payment_method("CHEQUE")


def test_date_range():
    assert validate_date_range(date(2026, 1, 1), date(2026, 1, 2))
    assert not validate_date_range(date(2026, 1, 2), date(2026, 1, 1))


def test_positive_quantity():
    assert validate_positive_quantity(1)
    assert not validate_positive_quantity(0)
    assert not validate_positive_quantity(-1)


def test_auth_schemas_accept_valid_email():
    RegisterRequest(name="Test User", email="test@example.com", password="StrongPass1!")
    LoginRequest(email="test@example.com", password="StrongPass1!")


def test_auth_schema_rejects_invalid_email():
    with pytest.raises(ValidationError):
        RegisterRequest(name="Test User", email="not-an-email", password="StrongPass1!")


def test_payment_schema_normalizes_method_and_accepts_positive_amount():
    payment = PaymentCreate(method=" upi ", amount=100)
    assert payment.method == "UPI"
    assert payment.amount == 100


@pytest.mark.parametrize(
    ("method", "amount"),
    [
        ("CASH", 0),
        ("CASH", -1),
        ("CHEQUE", 100),
    ],
)
def test_payment_schema_rejects_invalid_method_or_amount(method, amount):
    with pytest.raises(ValidationError):
        PaymentCreate(method=method, amount=amount)