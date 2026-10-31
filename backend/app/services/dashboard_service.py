"""Dashboard metrics calculation service."""

from datetime import date, datetime, timezone
from typing import Any, Optional

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.constants import InvoiceStatus, SubscriptionStatus
from app.models.entities import Invoice, Payment, Subscription


def get_dashboard_summary(
    session: Session,
    *,
    as_of: Optional[date] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    customer_id: Optional[int] = None,
) -> dict[str, Any]:
    """Calculate aggregated dashboard metrics server-side.

    - Active subscriptions count
    - Revenue received (sum of payments in selected period)
    - Outstanding amount (unpaid balance on non-cancelled invoices)
    - Overdue invoice count (due_date < as_of with unpaid balance)
    - Overdue invoice list
    """
    today = as_of or date.today()

    # 1. Active subscriptions count
    sub_query = select(func.count(Subscription.id)).where(
        Subscription.status == SubscriptionStatus.ACTIVE
    )
    if customer_id is not None:
        sub_query = sub_query.where(Subscription.customer_id == customer_id)
    active_subscriptions = session.exec(sub_query).one() or 0

    # 2. Revenue received (from payments)
    pay_query = select(func.coalesce(func.sum(Payment.amount_paise), 0))
    if customer_id is not None:
        pay_query = pay_query.join(Invoice, Payment.invoice_id == Invoice.id).where(
            Invoice.customer_id == customer_id
        )
    if from_date is not None:
        from_dt = datetime.combine(from_date, datetime.min.time(), tzinfo=timezone.utc)
        pay_query = pay_query.where(Payment.paid_at >= from_dt)
    if to_date is not None:
        to_dt = datetime.combine(to_date, datetime.max.time(), tzinfo=timezone.utc)
        pay_query = pay_query.where(Payment.paid_at <= to_dt)
    revenue_received_paise = session.exec(pay_query).one() or 0

    # 3. Outstanding amount
    inv_base = select(Invoice).where(
        Invoice.status != InvoiceStatus.PAID,
        Invoice.status != InvoiceStatus.CANCELLED,
        Invoice.paid_amount_paise < Invoice.total_paise,
    )
    if customer_id is not None:
        inv_base = inv_base.where(Invoice.customer_id == customer_id)

    unpaid_invoices = list(session.exec(inv_base).all())
    outstanding_amount_paise = sum(
        inv.total_paise - inv.paid_amount_paise for inv in unpaid_invoices
    )

    # 4. Overdue invoices
    overdue_invoices = [
        inv for inv in unpaid_invoices if inv.due_date < today
    ]
    overdue_count = len(overdue_invoices)

    return {
        "active_subscriptions": active_subscriptions,
        "revenue_received_paise": revenue_received_paise,
        "outstanding_amount_paise": outstanding_amount_paise,
        "overdue_invoices_count": overdue_count,
        "overdue_invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer_id": inv.customer_id,
                "billing_name": inv.billing_name,
                "due_date": inv.due_date.isoformat(),
                "total_paise": inv.total_paise,
                "paid_amount_paise": inv.paid_amount_paise,
                "outstanding_paise": inv.total_paise - inv.paid_amount_paise,
                "status": inv.status.value,
            }
            for inv in overdue_invoices
        ],
    }
