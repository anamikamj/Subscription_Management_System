from typing import Optional

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    product_type: Optional[str] = None
    sales_price_paise: int = Field(gt=0, description="Price in paise (positive)")
    cost_price_paise: int = Field(default=0, ge=0, description="Cost in paise")
    notes: Optional[str] = None
    is_active: bool = True


class ProductRead(BaseModel):
    id: int
    name: str
    product_type: Optional[str] = None
    sales_price_paise: int
    cost_price_paise: int
    notes: Optional[str] = None
    is_active: bool
