"""Subscription lifecycle: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED."""

from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.constants import SubscriptionStatus as S
from app.core.constants import UserRole
from app.core.exceptions import (
    BusinessRuleError,
    InvalidTransitionError,
    PermissionDeniedError,
    ValidationError,
)
from app.models import Customer, Plan, Product, Subscription, SubscriptionLine
from app.services import billing_service, invoice_service

ALLOWED_TRANSITIONS: dict[S, frozenset[S]] = {
    S.DRAFT: frozenset({S.QUOTATION}),
    S.QUOTATION: frozenset({S.CONFIRMED, S.DRAFT}),
    S.CONFIRMED: frozenset({S.ACTIVE, S.CLOSED}),
    S.ACTIVE: frozenset({S.CLOSED}),
    S.CLOSED: frozenset(),
}

_STAFF_ROLES = {UserRole.ADMIN, UserRole.STAFF}


def validate_transition(current: S, new: S) -> None:
    if new not in ALLOWED_TRANSITIONS[current]:
        raise InvalidTransitionError(f"Cannot move subscription from {current.value} to {new.value}")


def check_activation_conditions(sub: Subscription, today: date) -> None:
    plan = sub.plan
    if not plan.is_active:
        raise BusinessRuleError("Plan is not active")
    if plan.available_from and today < plan.available_from:
        raise BusinessRuleError("Plan is not yet available")
    if plan.available_to and today > plan.available_to:
        raise BusinessRuleError("Plan availability has ended")
    if not sub.lines:
        raise BusinessRuleError("Subscription has no lines")
    if any(l.quantity < plan.min_quantity for l in sub.lines):
        raise BusinessRuleError(f"Quantity is below the plan minimum of {plan.min_quantity}")
    if sub.end_date is not None and sub.end_date <= sub.start_date:
        raise BusinessRuleError("End date must be after the start date")


def _check_can_close(sub: Subscription, today: date) -> None:
    # INTERPRETATION: closing an ACTIVE subscription *before its scheduled end
    # date* is "early closure" and needs plan.allow_early_close. Open-ended
    # subscriptions and ones already past end_date can always be closed.
    if sub.status == S.ACTIVE and sub.end_date is not None and sub.end_date > today:
        if not sub.plan.allow_early_close:
            raise BusinessRuleError("This plan does not allow early closure")


def transition_status(
    session: Session,
    sub: Subscription,
    new_status: S,
    *,
    actor_role: UserRole,
    today: Optional[date] = None,
) -> Subscription:
    """Move `sub` to `new_status`. Activation also issues the first invoice,
    all in one transaction: if invoicing fails, the status change is undone."""
    today = today or date.today()

    if actor_role not in _STAFF_ROLES:
        raise PermissionDeniedError("Only Admin and Staff can change subscription status")
    validate_transition(sub.status, new_status)

    try:
        if new_status == S.ACTIVE:
            check_activation_conditions(sub, today)
            sub.status = S.ACTIVE  # billing eligibility requires ACTIVE
            # Advance billing: first invoice covers the period starting at start_date.
            invoice_service.generate_invoice(
                session,
                sub,
                billing_service.first_period(sub),
                issued_date=today,
                commit=False,
            )  # also sets sub.next_billing_date

        elif new_status == S.CLOSED:
            _check_can_close(sub, today)
            if sub.end_date is None or sub.end_date > today:
                sub.end_date = today
            sub.status = S.CLOSED
            sub.next_billing_date = None  # existing invoices stay payable

        else:
            sub.status = new_status

        session.add(sub)
        session.commit()
        session.refresh(sub)
        return sub
    except Exception:
        session.rollback()  # expires sub, so in-memory status reverts too
        raise


def generate_subscription_number(session: Session, as_of: Optional[date] = None) -> str:
    issued_date = as_of or date.today()
    prefix = f"SUB-{issued_date.year}-"
    count = session.exec(
        select(func.count()).select_from(Subscription).where(
            Subscription.subscription_number.startswith(prefix)
        )
    ).one()
    return f"{prefix}{count + 1:06d}"


def create_subscription(
    session: Session,
    *,
    customer_id: int,
    plan_id: int,
    start_date: date,
    end_date: Optional[date] = None,
    payment_terms_days: int = 0,
    lines_data: list[dict],
) -> Subscription:
    """Create a subscription in DRAFT status with lines."""
    customer = session.get(Customer, customer_id)
    if not customer:
        raise ValidationError(f"Customer with ID {customer_id} does not exist", field="customer_id")

    plan = session.get(Plan, plan_id)
    if not plan:
        raise ValidationError(f"Plan with ID {plan_id} does not exist", field="plan_id")
    if not plan.is_active:
        raise BusinessRuleError("Cannot subscribe to an inactive plan", field="plan_id")

    if end_date is not None and end_date <= start_date:
        raise ValidationError("End date must be after the start date", field="end_date")

    if not lines_data:
        raise ValidationError("Subscription must contain at least one product line", field="lines")

    sub_number = generate_subscription_number(session, start_date)
    sub = Subscription(
        subscription_number=sub_number,
        customer_id=customer_id,
        plan_id=plan_id,
        start_date=start_date,
        end_date=end_date,
        payment_terms_days=payment_terms_days,
        status=S.DRAFT,
    )
    session.add(sub)
    session.flush()

    for item in lines_data:
        product_id = item["product_id"]
        product = session.get(Product, product_id)
        if not product:
            raise ValidationError(f"Product with ID {product_id} does not exist", field="product_id")

        qty = item.get("quantity", 1)
        if qty < 1:
            raise ValidationError("Quantity must be positive", field="quantity")

        unit_price = item.get("unit_price_paise", product.sales_price_paise)
        tax_rate = item.get("tax_rate_bps", 1800)
        variant = item.get("variant_name")
        price_adj = item.get("price_adjustment_paise", 0)

        sub_line = SubscriptionLine(
            subscription_id=sub.id,
            product_id=product_id,
            quantity=qty,
            unit_price_paise=unit_price,
            tax_rate_bps=tax_rate,
            variant_name=variant,
            price_adjustment_paise=price_adj,
        )
        session.add(sub_line)

    session.commit()
    session.refresh(sub)
    return sub