from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.core.constants import BillingCadence


class PlanCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    cadence: BillingCadence
    price_paise: int = Field(gt=0, description="Price in paise (greater than zero)")
    min_quantity: int = Field(default=1, ge=1)
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    auto_close: bool = False
    allow_early_close: bool = False
    allow_pause: bool = False
    allow_renew: bool = True
    is_active: bool = True


class PlanRead(BaseModel):
    id: int
    name: str
    cadence: BillingCadence
    price_paise: int
    min_quantity: int
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    auto_close: bool
    allow_early_close: bool
    allow_pause: bool
    allow_renew: bool
    is_active: bool
