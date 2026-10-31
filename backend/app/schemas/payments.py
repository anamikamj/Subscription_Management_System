from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


PaymentMethod = Literal["CASH", "CARD", "BANK_TRANSFER", "UPI"]


class PaymentCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    method: PaymentMethod
    amount: int = Field(gt=0, description="Payment amount in integer paise")
    paid_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    note: str | None = Field(default=None, max_length=500)

    @field_validator("method", mode="before")
    @classmethod
    def normalize_method(cls, value):
        if isinstance(value, str):
            return value.strip().upper()
        return value

    @field_validator("paid_at")
    @classmethod
    def require_valid_datetime(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            # Treat a timezone-naive datetime as UTC.
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class PaymentRead(BaseModel):
    id: int
    invoice_id: int
    method: PaymentMethod
    amount: int
    paid_at: datetime
    note: str | None = None