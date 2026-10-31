"""Invoice generation: snapshots everything, calculates on the backend,
and refuses to bill the same subscription period twice."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.constants import InvoiceStatus
from app.core.exceptions import BusinessRuleError, DuplicateInvoiceError, ValidationError
from app.models import Invoice, InvoiceLine, Subscription
from app.services import billing_service
from app.utils.calculations import LineInput, calculate_invoice
from app.utils.date_utils import BillingPeriod
from app.utils.invoice_number import generate_invoice_number

# ASSUMPTION: adjust to whatever your InvoiceStatus enum calls "issued/open".
INITIAL_INVOICE_STATUS = InvoiceStatus.DRAFT


def calculate_due_date(sub: Subscription, issued_date: date) -> date:
    """Subscription payment terms override customer defaults. (Customer has no
    payment-terms field yet; if you add one, fall back to it here.)"""
    terms = sub.payment_terms_days
    if terms is None or terms < 0:
        raise ValidationError("Payment terms must be non-negative")
    return issued_date + timedelta(days=terms)


def _line_description(line) -> str:
    name = line.product.name if line.product else f"Product #{line.product_id}"
    return f"{name} ({line.variant_name})" if line.variant_name else name


def generate_invoice(
    session: Session,
    sub: Subscription,
    period: BillingPeriod,
    *,
    issued_date: Optional[date] = None,
    discount_rate_bps: int = 0,
    fixed_discount_paise: int = 0,
    revision_number: int = 1,
    supersedes_invoice_id: Optional[int] = None,
    revision_reason: Optional[str] = None,
    commit: bool = True,
) -> Invoice:
    """Create the invoice for `period`.

    commit=False flushes only, so a caller (e.g. subscription activation) can
    make the invoice part of its own transaction. On any failure with
    commit=True the session is rolled back.
    """
    issued = issued_date or date.today()
    try:
        billing_service.assert_eligible(sub, period)

        already = session.exec(
            select(Invoice.id).where(
                Invoice.subscription_id == sub.id,
                Invoice.billing_period_start == period.start,
                Invoice.billing_period_end == period.end,
                Invoice.revision_number == revision_number,
            )
        ).first()
        if already is not None:
            raise DuplicateInvoiceError(
                f"Subscription {sub.id} is already invoiced for "
                f"{period.start} to {period.end} (revision {revision_number})"
            )

        if not sub.lines:
            raise ValidationError("Subscription has no lines to invoice")

        # Price actually charged = line price + any variant adjustment.
        inputs = [
            LineInput(l.quantity, l.unit_price_paise + l.price_adjustment_paise, l.tax_rate_bps)
            for l in sub.lines
        ]
        amounts = calculate_invoice(
            inputs,
            discount_rate_bps=discount_rate_bps,
            fixed_discount_paise=fixed_discount_paise,
        )

        customer = sub.customer
        invoice = Invoice(
            invoice_number=generate_invoice_number(session, issued),
            subscription_id=sub.id,
            customer_id=customer.id,
            billing_period_start=period.start,
            billing_period_end=period.end,
            issued_date=issued,
            due_date=calculate_due_date(sub, issued),
            # customer snapshot
            billing_name=customer.name,
            billing_email=customer.billing_email,
            billing_phone=customer.phone,
            billing_address=customer.address,
            subtotal_paise=amounts.subtotal_paise,
            discount_paise=amounts.discount_paise,
            tax_paise=amounts.tax_paise,
            total_paise=amounts.total_paise,
            paid_amount_paise=0,
            status=INITIAL_INVOICE_STATUS,
            revision_number=revision_number,
            supersedes_invoice_id=supersedes_invoice_id,
            revision_reason=revision_reason,
        )
        session.add(invoice)
        session.flush()  # DB unique constraint is the final duplicate guard

        for src, calc in zip(sub.lines, amounts.lines):
            session.add(
                InvoiceLine(
                    invoice_id=invoice.id,
                    product_id=src.product_id,
                    description=_line_description(src),
                    quantity=calc.quantity,
                    unit_price_paise=calc.unit_price_paise,
                    tax_rate_bps=calc.tax_rate_bps,
                    line_subtotal_paise=calc.line_subtotal_paise,
                    discount_paise=calc.discount_paise,
                    taxable_amount_paise=calc.taxable_amount_paise,
                    tax_amount_paise=calc.tax_amount_paise,
                    line_total_paise=calc.line_total_paise,
                )
            )

        sub.next_billing_date = billing_service.next_billing_date_after(sub, period)
        session.add(sub)
        session.flush()

        if commit:
            session.commit()
            session.refresh(invoice)
        return invoice

    except IntegrityError as exc:
        if commit:
            session.rollback()
        if "invoice_number" in str(exc.orig):
            raise BusinessRuleError("Invoice number collision; please retry") from exc
        raise DuplicateInvoiceError("Duplicate invoice for this subscription period") from exc
    except Exception:
        if commit:
            session.rollback()
        raise


def generate_due_invoices(session: Session, sub: Subscription, as_of: date) -> list[Invoice]:
    """Invoice every due, unbilled period up to `as_of` in ONE transaction."""
    invoices: list[Invoice] = []
    try:
        for period in billing_service.get_due_periods(session, sub, as_of):
            invoices.append(
                generate_invoice(session, sub, period, issued_date=as_of, commit=False)
            )
        session.commit()
    except Exception:
        session.rollback()
        raise
    return invoices