from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.core.constants import SubscriptionStatus


class SubscriptionLineCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)
    unit_price_paise: Optional[int] = Field(default=None, gt=0)
    tax_rate_bps: int = Field(default=1800, ge=0)
    variant_name: Optional[str] = None
    price_adjustment_paise: int = 0


class SubscriptionCreate(BaseModel):
    customer_id: int
    plan_id: int
    start_date: date
    end_date: Optional[date] = None
    payment_terms_days: int = Field(default=0, ge=0)
    lines: list[SubscriptionLineCreate] = Field(min_length=1)


class SubscriptionStatusTransition(BaseModel):
    status: SubscriptionStatus


class SubscriptionLineRead(BaseModel):
    id: int
    subscription_id: int
    product_id: int
    quantity: int
    unit_price_paise: int
    tax_rate_bps: int
    variant_name: Optional[str] = None
    price_adjustment_paise: int
    product_name: Optional[str] = None


class SubscriptionRead(BaseModel):
    id: int
    subscription_number: str
    customer_id: int
    plan_id: int
    start_date: date
    end_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    payment_terms_days: int
    status: SubscriptionStatus
    customer_name: Optional[str] = None
    plan_name: Optional[str] = None
    lines: list[SubscriptionLineRead] = []
