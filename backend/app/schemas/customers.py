from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    billing_email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    billing_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class CustomerRead(BaseModel):
    id: int
    name: str
    billing_email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime
