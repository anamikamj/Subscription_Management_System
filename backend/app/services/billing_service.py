"""Billing eligibility and period bookkeeping. Creates no invoices itself."""

from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.constants import SubscriptionStatus
from app.core.exceptions import BillingNotEligibleError
from app.models import Invoice, Subscription
from app.utils.date_utils import BillingPeriod, billing_period, period_index_for

MAX_CATCH_UP_PERIODS = 1000  # safety valve for runaway loops (e.g. daily plans)


def first_period(sub: Subscription) -> BillingPeriod:
    """The period beginning at the subscription start date (the billing anchor)."""
    return billing_period(sub.start_date, sub.plan.cadence, 0)


def starts_within_term(sub: Subscription, start: date) -> bool:
    """A period may not begin on or after the end date. No prorating."""
    return sub.end_date is None or start < sub.end_date


def is_due(period: BillingPeriod, as_of: date) -> bool:
    """Advance billing: a period is invoiced when it begins."""
    return period.start <= as_of


def assert_eligible(sub: Subscription, period: BillingPeriod) -> None:
    """Raise BillingNotEligibleError unless `period` may be invoiced."""
    if sub.status == SubscriptionStatus.CLOSED:
        raise BillingNotEligibleError("A closed subscription cannot generate invoices")
    if sub.status != SubscriptionStatus.ACTIVE:
        raise BillingNotEligibleError(
            f"Only ACTIVE subscriptions can be billed (status is {sub.status.value})"
        )
    if period.start < sub.start_date:
        raise BillingNotEligibleError("Period begins before the subscription start date")
    if not starts_within_term(sub, period.start):
        raise BillingNotEligibleError("Period begins on or after the subscription end date")
    # Periods must sit exactly on the anchored grid: no gaps, no overlaps.
    cadence = sub.plan.cadence
    idx = period_index_for(sub.start_date, cadence, period.start)
    if billing_period(sub.start_date, cadence, idx) != period:
        raise BillingNotEligibleError("Period does not match the subscription's billing schedule")


def last_invoiced_period_end(session: Session, sub: Subscription) -> Optional[date]:
    # Cancelled invoices still count: their period is only re-billed by an
    # explicit, authorised reissue, never by the scheduler.
    return session.exec(
        select(func.max(Invoice.billing_period_end)).where(Invoice.subscription_id == sub.id)
    ).one()


def get_due_periods(
    session: Session, sub: Subscription, as_of: date, limit: int = MAX_CATCH_UP_PERIODS
) -> list[BillingPeriod]:
    """All not-yet-invoiced periods that are due on `as_of`, oldest first."""
    if sub.status != SubscriptionStatus.ACTIVE:
        return []
    cadence = sub.plan.cadence
    last_end = last_invoiced_period_end(session, sub)
    # last_end is a boundary, so its index is the next period to bill.
    idx = 0 if last_end is None else period_index_for(sub.start_date, cadence, last_end)

    due: list[BillingPeriod] = []
    while len(due) < limit:
        period = billing_period(sub.start_date, cadence, idx)
        if not is_due(period, as_of) or not starts_within_term(sub, period.start):
            break
        due.append(period)
        idx += 1
    return due


def next_billing_date_after(sub: Subscription, period: BillingPeriod) -> Optional[date]:
    """Date the next invoice is generated, or None when billing has ended
    (the next period would start on or after the end date)."""
    return period.end if starts_within_term(sub, period.end) else None