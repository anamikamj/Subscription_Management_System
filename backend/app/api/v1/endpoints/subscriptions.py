"""Subscription endpoints: creation, lifecycle transitions, and on-demand invoice generation."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep, StaffOrAdminDep
from app.core.constants import SubscriptionStatus, UserRole
from app.core.permissions import check_customer_access
from app.models.entities import Invoice, Product, Subscription, SubscriptionLine
from app.schemas.invoices import GenerateInvoiceRequest, InvoiceLineRead, InvoiceRead
from app.schemas.subscriptions import (
    SubscriptionCreate,
    SubscriptionLineRead,
    SubscriptionRead,
    SubscriptionStatusTransition,
)
from app.services import billing_service, invoice_service, subscription_service
from app.utils.date_utils import billing_period, period_index_for

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def _format_subscription(sub: Subscription) -> SubscriptionRead:
    lines_read = []
    for l in sub.lines:
        lines_read.append(
            SubscriptionLineRead(
                id=l.id,
                subscription_id=l.subscription_id,
                product_id=l.product_id,
                quantity=l.quantity,
                unit_price_paise=l.unit_price_paise,
                tax_rate_bps=l.tax_rate_bps,
                variant_name=l.variant_name,
                price_adjustment_paise=l.price_adjustment_paise,
                product_name=l.product.name if l.product else None,
            )
        )
    return SubscriptionRead(
        id=sub.id,
        subscription_number=sub.subscription_number,
        customer_id=sub.customer_id,
        plan_id=sub.plan_id,
        start_date=sub.start_date,
        end_date=sub.end_date,
        next_billing_date=sub.next_billing_date,
        payment_terms_days=sub.payment_terms_days,
        status=sub.status,
        customer_name=sub.customer.name if sub.customer else None,
        plan_name=sub.plan.name if sub.plan else None,
        lines=lines_read,
    )


@router.get("", response_model=list[SubscriptionRead])
def list_subscriptions(
    current_user: CurrentUserDep,
    session: SessionDep,
    customer_id: Optional[int] = Query(default=None),
    status_filter: Optional[SubscriptionStatus] = Query(default=None, alias="status"),
):
    query = select(Subscription)

    if current_user.role == UserRole.CUSTOMER:
        query = query.where(Subscription.customer_id == current_user.customer_id)
    elif customer_id is not None:
        query = query.where(Subscription.customer_id == customer_id)

    if status_filter:
        query = query.where(Subscription.status == status_filter)

    query = query.order_by(Subscription.id.desc())
    subs = list(session.exec(query).all())
    return [_format_subscription(s) for s in subs]


@router.post("", response_model=SubscriptionRead, status_code=status.HTTP_201_CREATED)
def create_subscription_endpoint(
    payload: SubscriptionCreate,
    current_user: StaffOrAdminDep,
    session: SessionDep,
):
    lines_dict = [l.model_dump() for l in payload.lines]
    sub = subscription_service.create_subscription(
        session,
        customer_id=payload.customer_id,
        plan_id=payload.plan_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        payment_terms_days=payload.payment_terms_days,
        lines_data=lines_dict,
    )
    return _format_subscription(sub)


@router.get("/{subscription_id}", response_model=SubscriptionRead)
def get_subscription(
    subscription_id: int,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    sub = session.get(Subscription, subscription_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with ID {subscription_id} not found.",
        )
    check_customer_access(current_user, sub.customer_id)
    return _format_subscription(sub)


@router.post("/{subscription_id}/status", response_model=SubscriptionRead)
def transition_subscription_status(
    subscription_id: int,
    payload: SubscriptionStatusTransition,
    current_user: StaffOrAdminDep,
    session: SessionDep,
):
    """Transition subscription through lifecycle states:
    DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED.
    Activating also issues the first invoice in a unified transaction.
    """
    sub = session.get(Subscription, subscription_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with ID {subscription_id} not found.",
        )

    updated_sub = subscription_service.transition_status(
        session,
        sub,
        payload.status,
        actor_role=current_user.role,
    )
    return _format_subscription(updated_sub)


@router.post("/{subscription_id}/generate-invoice", response_model=InvoiceRead)
def generate_subscription_invoice(
    subscription_id: int,
    current_user: StaffOrAdminDep,
    session: SessionDep,
    payload: Optional[GenerateInvoiceRequest] = None,
):
    """Staff action: Generate the next due invoice for an active subscription idempotently."""
    sub = session.get(Subscription, subscription_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with ID {subscription_id} not found.",
        )

    if sub.status != SubscriptionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only ACTIVE subscriptions can generate invoices (current status: {sub.status.value}).",
        )

    # Determine the next unbilled period
    last_end = billing_service.last_invoiced_period_end(session, sub)
    cadence = sub.plan.cadence
    idx = 0 if last_end is None else period_index_for(sub.start_date, cadence, last_end)
    period = billing_period(sub.start_date, cadence, idx)

    req = payload or GenerateInvoiceRequest()
    invoice = invoice_service.generate_invoice(
        session,
        sub,
        period,
        issued_date=req.issued_date or date.today(),
        discount_rate_bps=req.discount_rate_bps,
        fixed_discount_paise=req.fixed_discount_paise,
    )

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
        for l in invoice.lines
    ]

    return InvoiceRead(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        subscription_id=invoice.subscription_id,
        customer_id=invoice.customer_id,
        billing_period_start=invoice.billing_period_start,
        billing_period_end=invoice.billing_period_end,
        issued_date=invoice.issued_date,
        due_date=invoice.due_date,
        billing_name=invoice.billing_name,
        billing_email=invoice.billing_email,
        billing_phone=invoice.billing_phone,
        billing_address=invoice.billing_address,
        subtotal_paise=invoice.subtotal_paise,
        discount_paise=invoice.discount_paise,
        tax_paise=invoice.tax_paise,
        total_paise=invoice.total_paise,
        paid_amount_paise=invoice.paid_amount_paise,
        outstanding_paise=invoice.total_paise - invoice.paid_amount_paise,
        status=invoice.status,
        revision_number=invoice.revision_number,
        supersedes_invoice_id=invoice.supersedes_invoice_id,
        revision_reason=invoice.revision_reason,
        lines=lines_read,
    )
