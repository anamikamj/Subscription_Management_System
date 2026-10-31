"""Payment service: record payments, update balances and status."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from app.core.constants import InvoiceStatus, PaymentMethod
from app.core.exceptions import BusinessRuleError, ValidationError
from app.models.entities import Invoice, Payment


def record_payment(
    session: Session,
    *,
    invoice_id: int,
    amount_paise: int,
    method: PaymentMethod,
    paid_at: Optional[datetime] = None,
    note: Optional[str] = None,
) -> Payment:
    """Record a payment against an invoice within a transaction.

    Enforces:
    - Positive amount
    - Invoice existence and non-cancelled status
    - Cannot exceed outstanding balance
    - Updates invoice paid amount and automatically marks it PAID when balance is 0
    """
    if amount_paise <= 0:
        raise ValidationError("Payment amount must be greater than zero", field="amount")

    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise ValidationError(f"Invoice with ID {invoice_id} not found")

    if invoice.status == InvoiceStatus.CANCELLED:
        raise BusinessRuleError("Cannot record payment against a cancelled invoice")

    outstanding = invoice.total_paise - invoice.paid_amount_paise
    if outstanding <= 0 or invoice.status == InvoiceStatus.PAID:
        raise BusinessRuleError("Invoice is already fully paid")

    if amount_paise > outstanding:
        raise BusinessRuleError(
            f"Payment amount ({amount_paise} paise) exceeds outstanding balance ({outstanding} paise)",
            field="amount",
        )

    payment = Payment(
        invoice_id=invoice.id,
        method=method,
        amount_paise=amount_paise,
        paid_at=paid_at or datetime.now(timezone.utc),
        note=note,
    )
    session.add(payment)

    invoice.paid_amount_paise += amount_paise
    if invoice.paid_amount_paise >= invoice.total_paise:
        invoice.status = InvoiceStatus.PAID
    elif invoice.status == InvoiceStatus.DRAFT:
        invoice.status = InvoiceStatus.CONFIRMED

    session.add(invoice)
    session.commit()
    session.refresh(payment)
    session.refresh(invoice)
    return payment


def get_payments_for_invoice(session: Session, invoice_id: int) -> list[Payment]:
    return list(
        session.exec(
            select(Payment).where(Payment.invoice_id == invoice_id).order_by(Payment.paid_at.desc())
        ).all()
    )
