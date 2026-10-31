"""Billing-date arithmetic.

Every boundary is computed from the ORIGINAL anchor (Subscription.start_date),
never by adding a month to the previous (possibly clamped) date. That is what
keeps a Jan 31 subscription on Jan 31 -> Feb 28 -> Mar 31 -> Apr 30.

Periods are half-open: [start, end). `end` of one period == `start` of the next.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta

from app.core.constants import BillingCadence


@dataclass(frozen=True)
class BillingPeriod:
    start: date  # inclusive
    end: date    # exclusive

    def __post_init__(self) -> None:
        if self.end <= self.start:
            raise ValueError("billing period end must be after start")

    def contains(self, day: date) -> bool:
        return self.start <= day < self.end


def add_months(anchor: date, months: int) -> date:
    """anchor + N calendar months, clamping to the last day of short months."""
    total = anchor.year * 12 + (anchor.month - 1) + months
    year, month0 = divmod(total, 12)
    month = month0 + 1
    day = min(anchor.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def boundary(anchor: date, cadence: BillingCadence, n: int) -> date:
    """The n-th billing boundary (n=0 is the anchor itself)."""
    if n < 0:
        raise ValueError("boundary index must be >= 0")
    if cadence == BillingCadence.DAILY:
        return anchor + timedelta(days=n)
    if cadence == BillingCadence.WEEKLY:
        return anchor + timedelta(days=7 * n)
    if cadence == BillingCadence.MONTHLY:
        return add_months(anchor, n)
    if cadence == BillingCadence.YEARLY:
        return add_months(anchor, 12 * n)  # Feb 29 -> Feb 28 in non-leap years
    raise ValueError(f"unsupported cadence: {cadence}")


def billing_period(anchor: date, cadence: BillingCadence, index: int) -> BillingPeriod:
    """The index-th period [boundary(index), boundary(index + 1))."""
    return BillingPeriod(
        boundary(anchor, cadence, index),
        boundary(anchor, cadence, index + 1),
    )


def period_index_for(anchor: date, cadence: BillingCadence, on_date: date) -> int:
    """Index of the period containing `on_date`."""
    if on_date < anchor:
        raise ValueError("date is before the billing anchor")

    if cadence == BillingCadence.DAILY:
        guess = (on_date - anchor).days
    elif cadence == BillingCadence.WEEKLY:
        guess = (on_date - anchor).days // 7
    elif cadence == BillingCadence.MONTHLY:
        guess = (on_date.year - anchor.year) * 12 + on_date.month - anchor.month
    elif cadence == BillingCadence.YEARLY:
        guess = on_date.year - anchor.year
    else:
        raise ValueError(f"unsupported cadence: {cadence}")

    guess = max(guess, 0)
    # The estimate can be off by one because of month-end clamping; correct it.
    while boundary(anchor, cadence, guess) > on_date:
        guess -= 1
    while boundary(anchor, cadence, guess + 1) <= on_date:
        guess += 1
    return guess


def next_billing_date(anchor: date, cadence: BillingCadence, after: date) -> date:
    """First billing boundary strictly after `after`."""
    return boundary(anchor, cadence, period_index_for(anchor, cadence, after) + 1)