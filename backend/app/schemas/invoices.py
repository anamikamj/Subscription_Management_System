from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.core.constants import InvoiceStatus


class InvoiceLineRead(BaseModel):
    id: int
    invoice_id: int
    product_id: Optional[int] = None
    description: str
    quantity: int
    unit_price_paise: int
    tax_rate_bps: int
    line_subtotal_paise: int
    discount_paise: int
    taxable_amount_paise: int
    tax_amount_paise: int
    line_total_paise: int


class InvoiceRead(BaseModel):
    id: int
    invoice_number: str
    subscription_id: int
    customer_id: int
    billing_period_start: date
    billing_period_end: date
    issued_date: date
    due_date: date
    billing_name: str
    billing_email: str
    billing_phone: Optional[str] = None
    billing_address: Optional[str] = None
    subtotal_paise: int
    discount_paise: int
    tax_paise: int
    total_paise: int
    paid_amount_paise: int
    outstanding_paise: int = 0
    status: InvoiceStatus
    revision_number: int
    supersedes_invoice_id: Optional[int] = None
    revision_reason: Optional[str] = None
    lines: list[InvoiceLineRead] = []


class GenerateInvoiceRequest(BaseModel):
    issued_date: Optional[date] = None
    discount_rate_bps: int = Field(default=0, ge=0, le=10000)
    fixed_discount_paise: int = Field(default=0, ge=0)
