from datetime import date

import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from app.core.constants import BillingCadence as C
from app.core.constants import SubscriptionStatus as S
from app.core.constants import UserRole
from app.core.exceptions import (BillingNotEligibleError, BusinessRuleError, DuplicateInvoiceError,
                                 InvalidTransitionError, PermissionDeniedError, ValidationError)
from app.models import Customer, Invoice, InvoiceLine, Plan, Product, Subscription, SubscriptionLine
from app.services import billing_service, invoice_service, subscription_service
from app.utils.calculations import LineInput, allocate_proportionally, calculate_invoice, tax_half_up
from app.utils.date_utils import billing_period, next_billing_date, period_index_for


# ---------- date_utils ----------
def test_month_end_anchor_preserved():
    a = date(2025, 1, 31)
    got = [billing_period(a, C.MONTHLY, i).start for i in range(5)]
    assert got == [date(2025,1,31), date(2025,2,28), date(2025,3,31), date(2025,4,30), date(2025,5,31)]

def test_periods_contiguous_half_open():
    a = date(2025, 1, 31)
    for i in range(30):
        assert billing_period(a, C.MONTHLY, i).end == billing_period(a, C.MONTHLY, i + 1).start

def test_leap_year_yearly():
    a = date(2024, 2, 29)
    assert [billing_period(a, C.YEARLY, i).start.isoformat() for i in range(5)] == \
        ["2024-02-29", "2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]

def test_daily_weekly():
    assert billing_period(date(2025,1,1), C.DAILY, 0).end == date(2025,1,2)
    assert billing_period(date(2025,1,1), C.WEEKLY, 0).end == date(2025,1,8)

def test_period_index_and_next_date():
    a = date(2025, 1, 31)
    assert period_index_for(a, C.MONTHLY, date(2025, 2, 27)) == 0
    assert period_index_for(a, C.MONTHLY, date(2025, 2, 28)) == 1  # start inclusive
    assert next_billing_date(a, C.MONTHLY, date(2025, 2, 28)) == date(2025, 3, 31)


# ---------- calculations ----------
def test_spec_example():
    r = calculate_invoice([LineInput(1, 250_000, 1800)], discount_rate_bps=1000)
    assert (r.subtotal_paise, r.discount_paise, r.tax_paise, r.total_paise) == (250_000, 25_000, 40_500, 265_500)

def test_half_up():
    assert tax_half_up(5, 1000) == 1      # 0.5 -> 1
    assert tax_half_up(4, 1000) == 0      # 0.4 -> 0
    assert tax_half_up(15, 1000) == 2     # 1.5 -> 2

def test_discount_allocation_sums_and_taxes_per_line():
    r = calculate_invoice([LineInput(1, 10_001, 1800), LineInput(1, 10_001, 500), LineInput(1, 10_001, 0)],
                          discount_rate_bps=1000)
    assert sum(l.discount_paise for l in r.lines) == r.discount_paise
    assert r.tax_paise == sum(l.tax_amount_paise for l in r.lines)
    assert r.total_paise == r.subtotal_paise - r.discount_paise + r.tax_paise

def test_allocate_exact():
    assert sum(allocate_proportionally(101, [1, 1, 1])) == 101

@pytest.mark.parametrize("kw", [dict(discount_rate_bps=10_001), dict(fixed_discount_paise=999_999_999),
                                dict(discount_rate_bps=100, fixed_discount_paise=100)])
def test_bad_discounts(kw):
    with pytest.raises(ValidationError):
        calculate_invoice([LineInput(1, 1000, 0)], **kw)

def test_bad_lines():
    for bad in (LineInput(0, 100), LineInput(1, 0), LineInput(1, 100, -1)):
        with pytest.raises(ValidationError):
            calculate_invoice([bad])


# ---------- services ----------
@pytest.fixture
def session():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s

def make_sub(session, start=date(2025, 1, 31), end=None, cadence=C.MONTHLY, early=False, terms=15):
    cust = Customer(name="Rahul", billing_email="rahul@example.com", phone="999")
    plan = Plan(name="Pro", cadence=cadence, price_paise=99_900, allow_early_close=early)
    prod = Product(name="Pro Plan", sales_price_paise=99_900)
    session.add_all([cust, plan, prod]); session.commit()
    sub = Subscription(subscription_number="SUB1", customer_id=cust.id, plan_id=plan.id,
                       start_date=start, end_date=end, payment_terms_days=terms)
    session.add(sub); session.commit()
    session.add(SubscriptionLine(subscription_id=sub.id, product_id=prod.id, quantity=1,
                                 unit_price_paise=99_900, tax_rate_bps=1800))
    session.commit(); session.refresh(sub)
    return sub

def activate(session, sub, today=date(2025, 1, 31)):
    for st in (S.QUOTATION, S.CONFIRMED, S.ACTIVE):
        subscription_service.transition_status(session, sub, st, actor_role=UserRole.STAFF, today=today)
    return sub

def test_activation_creates_first_invoice_with_snapshots(session):
    sub = activate(session, make_sub(session))
    inv = session.exec(select(Invoice)).one()
    assert (inv.billing_period_start, inv.billing_period_end) == (date(2025,1,31), date(2025,2,28))
    assert inv.total_paise == 99_900 + 17_982
    assert inv.due_date == date(2025, 2, 15)
    assert (inv.billing_name, inv.billing_email) == ("Rahul", "rahul@example.com")
    line = session.exec(select(InvoiceLine)).one()
    assert (line.unit_price_paise, line.tax_rate_bps, line.tax_amount_paise) == (99_900, 1800, 17_982)
    assert sub.next_billing_date == date(2025, 2, 28)

def test_snapshot_survives_price_change(session):
    sub = activate(session, make_sub(session))
    sub.lines[0].unit_price_paise = 500_000; session.add(sub.lines[0]); session.commit()
    assert session.exec(select(Invoice)).one().total_paise == 117_882

def test_duplicate_prevented(session):
    sub = activate(session, make_sub(session))
    with pytest.raises(DuplicateInvoiceError):
        invoice_service.generate_invoice(session, sub, billing_service.first_period(sub), issued_date=date(2025,1,31))
    assert len(session.exec(select(Invoice)).all()) == 1

def test_db_constraint_is_last_line_of_defence(session):
    from sqlalchemy.exc import IntegrityError
    sub = activate(session, make_sub(session))
    first = session.exec(select(Invoice)).one()
    dup = Invoice(**{**first.model_dump(exclude={"id"}), "invoice_number": "INV-X"})
    session.add(dup)
    with pytest.raises(IntegrityError):
        session.flush()

def test_catch_up_billing(session):
    sub = activate(session, make_sub(session))
    due = billing_service.get_due_periods(session, sub, date(2025, 4, 30))
    assert [p.start for p in due] == [date(2025,2,28), date(2025,3,31), date(2025,4,30)]
    invs = invoice_service.generate_due_invoices(session, sub, date(2025, 4, 30))
    assert len(invs) == 3 and sub.next_billing_date == date(2025, 5, 31)
    assert billing_service.get_due_periods(session, sub, date(2025, 4, 30)) == []

def test_stops_when_next_period_starts_on_or_after_end(session):
    # end Mar 31: period starting Mar 31 must NOT be billed (>= end_date)
    sub = activate(session, make_sub(session, end=date(2025, 3, 31)))
    invs = invoice_service.generate_due_invoices(session, sub, date(2025, 12, 31))
    assert [i.billing_period_start for i in invs] == [date(2025, 2, 28)]
    assert sub.next_billing_date is None

def test_mid_period_close_no_proration_no_new_invoice(session):
    sub = activate(session, make_sub(session, start=date(2025,1,1)), today=date(2025,1,1))
    subscription_service.transition_status(session, sub, S.CLOSED, actor_role=UserRole.ADMIN, today=date(2025,1,15))
    assert sub.status == S.CLOSED and sub.next_billing_date is None
    assert len(session.exec(select(Invoice)).all()) == 1      # January invoice remains
    assert billing_service.get_due_periods(session, sub, date(2025, 6, 1)) == []
    with pytest.raises(BillingNotEligibleError):
        billing_service.assert_eligible(sub, billing_period(sub.start_date, C.MONTHLY, 1))

def test_not_eligible_before_active(session):
    sub = make_sub(session)
    with pytest.raises(BillingNotEligibleError):
        invoice_service.generate_invoice(session, sub, billing_service.first_period(sub))

def test_off_grid_period_rejected(session):
    from app.utils.date_utils import BillingPeriod
    sub = activate(session, make_sub(session))
    with pytest.raises(BillingNotEligibleError):
        billing_service.assert_eligible(sub, BillingPeriod(date(2025,2,1), date(2025,3,1)))

def test_lifecycle_rules(session):
    sub = make_sub(session)
    with pytest.raises(InvalidTransitionError):
        subscription_service.transition_status(session, sub, S.ACTIVE, actor_role=UserRole.STAFF)
    with pytest.raises(PermissionDeniedError):
        subscription_service.transition_status(session, sub, S.QUOTATION, actor_role=UserRole.CUSTOMER)
    activate(session, sub)
    subscription_service.transition_status(session, sub, S.CLOSED, actor_role=UserRole.STAFF, today=date(2025,2,1))
    with pytest.raises(InvalidTransitionError):               # closed is terminal
        subscription_service.transition_status(session, sub, S.ACTIVE, actor_role=UserRole.STAFF)

def test_activation_failure_rolls_back(session):
    sub = make_sub(session)
    sub.lines[0].quantity = 0   # invalid -> invoicing fails
    session.add(sub.lines[0]); session.commit()
    for st in (S.QUOTATION, S.CONFIRMED):
        subscription_service.transition_status(session, sub, st, actor_role=UserRole.STAFF)
    with pytest.raises(BusinessRuleError):
        subscription_service.transition_status(session, sub, S.ACTIVE, actor_role=UserRole.STAFF, today=date(2025,1,31))
    session.refresh(sub)
    assert sub.status == S.CONFIRMED and session.exec(select(Invoice)).all() == []

def test_early_close_flag(session):
    sub = activate(session, make_sub(session, end=date(2025, 12, 31)))
    with pytest.raises(BusinessRuleError):
        subscription_service.transition_status(session, sub, S.CLOSED, actor_role=UserRole.STAFF, today=date(2025,2,1))
    sub.plan.allow_early_close = True; session.add(sub.plan); session.commit()
    subscription_service.transition_status(session, sub, S.CLOSED, actor_role=UserRole.STAFF, today=date(2025,2,1))
    assert sub.end_date == date(2025, 2, 1)