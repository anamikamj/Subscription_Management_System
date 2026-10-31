from typing import Optional

from pydantic import BaseModel


class OverdueInvoiceItem(BaseModel):
    id: int
    invoice_number: str
    customer_id: int
    billing_name: str
    due_date: str
    total_paise: int
    paid_amount_paise: int
    outstanding_paise: int
    status: str


class DashboardSummary(BaseModel):
    active_subscriptions: int
    revenue_received_paise: int
    outstanding_amount_paise: int
    overdue_invoices_count: int
    overdue_invoices: list[OverdueInvoiceItem] = []
