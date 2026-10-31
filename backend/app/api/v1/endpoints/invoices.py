"""Invoice and payment endpoints."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep, StaffOrAdminDep
from app.core.constants import InvoiceStatus, PaymentMethod, UserRole
from app.core.permissions import check_customer_access
from app.models.entities import Invoice, Payment
from app.schemas.invoices import InvoiceLineRead, InvoiceRead
from app.schemas.payments import PaymentCreate, PaymentRead
from app.services import payment_service

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _format_invoice(inv: Invoice) -> InvoiceRead:
    lines_read = [
        InvoiceLineRead(
            id=l.id,
            invoice_id=l.invoice_id,
            product_id=l.product_id,
            description=l.description,
            quantity=l.quantity,
            unit_price_paise=l.unit_price_paise,
            tax_rate_bps=l.tax_rate_bps,
            line_subtotal_paise=l.line_subtotal_paise,
            discount_paise=l.discount_paise,
            taxable_amount_paise=l.taxable_amount_paise,
            tax_amount_paise=l.tax_amount_paise,
            line_total_paise=l.line_total_paise,
        )
        for l in inv.lines
    ]
    return InvoiceRead(
        id=inv.id,
        invoice_number=inv.invoice_number,
        subscription_id=inv.subscription_id,
        customer_id=inv.customer_id,
        billing_period_start=inv.billing_period_start,
        billing_period_end=inv.billing_period_end,
        issued_date=inv.issued_date,
        due_date=inv.due_date,
        billing_name=inv.billing_name,
        billing_email=inv.billing_email,
        billing_phone=inv.billing_phone,
        billing_address=inv.billing_address,
        subtotal_paise=inv.subtotal_paise,
        discount_paise=inv.discount_paise,
        tax_paise=inv.tax_paise,
        total_paise=inv.total_paise,
        paid_amount_paise=inv.paid_amount_paise,
        outstanding_paise=inv.total_paise - inv.paid_amount_paise,
        status=inv.status,
        revision_number=inv.revision_number,
        supersedes_invoice_id=inv.supersedes_invoice_id,
        revision_reason=inv.revision_reason,
        lines=lines_read,
    )


@router.get("", response_model=list[InvoiceRead])
def list_invoices(
    current_user: CurrentUserDep,
    session: SessionDep,
    customer_id: Optional[int] = Query(default=None),
    status_filter: Optional[InvoiceStatus] = Query(default=None, alias="status"),
    overdue_only: bool = Query(default=False),
):
    query = select(Invoice)

    if current_user.role == UserRole.CUSTOMER:
        query = query.where(Invoice.customer_id == current_user.customer_id)
    elif customer_id is not None:
        query = query.where(Invoice.customer_id == customer_id)

    if status_filter:
        query = query.where(Invoice.status == status_filter)

    if overdue_only:
        today = date.today()
        query = query.where(
            Invoice.due_date < today,
            Invoice.status != InvoiceStatus.PAID,
            Invoice.status != InvoiceStatus.CANCELLED,
            Invoice.paid_amount_paise < Invoice.total_paise,
        )

    query = query.order_by(Invoice.id.desc())
    invoices = list(session.exec(query).all())
    return [_format_invoice(inv) for inv in invoices]


@router.get("/{invoice_id}", response_model=InvoiceRead)
def get_invoice(
    invoice_id: int,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )
    check_customer_access(current_user, invoice.customer_id)
    return _format_invoice(invoice)


@router.post("/{invoice_id}/payments", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def record_invoice_payment(
    invoice_id: int,
    payload: PaymentCreate,
    current_user: StaffOrAdminDep,
    session: SessionDep,
):
    """Admin and Staff: Record a payment against an invoice.
    Updates paid amount, verifies no overpayment, and marks Paid if balance is zero.
    """
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )

    method_enum = PaymentMethod(payload.method)
    payment = payment_service.record_payment(
        session,
        invoice_id=invoice.id,
        amount_paise=payload.amount,
        method=method_enum,
        paid_at=payload.paid_at,
        note=payload.note,
    )

    return PaymentRead(
        id=payment.id,
        invoice_id=payment.invoice_id,
        method=payment.method.value,
        amount=payment.amount_paise,
        paid_at=payment.paid_at,
        note=payment.note,
    )


@router.get("/{invoice_id}/payments", response_model=list[PaymentRead])
def list_invoice_payments(
    invoice_id: int,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )
    check_customer_access(current_user, invoice.customer_id)

    payments = payment_service.get_payments_for_invoice(session, invoice_id)
    return [
        PaymentRead(
            id=p.id,
            invoice_id=p.invoice_id,
            method=p.method.value,
            amount=p.amount_paise,
            paid_at=p.paid_at,
            note=p.note,
        )
        for p in payments
    ]
