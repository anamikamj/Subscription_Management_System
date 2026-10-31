"""Subscription lifecycle: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED."""

from __future__ import annotations

from datetime import date
from typing import Optional

from sqlmodel import Session

from app.core.constants import SubscriptionStatus as S
from app.core.constants import UserRole
from app.core.exceptions import (
    BusinessRuleError,
    InvalidTransitionError,
    PermissionDeniedError,
)
from app.models import Subscription
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