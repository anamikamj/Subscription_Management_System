"""Database seeding script with realistic starter dataset for Brightloop MVP."""

from datetime import date, datetime, timedelta, timezone

from sqlmodel import Session, select

from app.core.constants import BillingCadence, InvoiceStatus, PaymentMethod, SubscriptionStatus, UserRole
from app.core.security import hash_password
from app.database.connection import engine
from app.database.init_db import create_db_and_tables
from app.models.entities import Customer, Invoice, InvoiceLine, Payment, Plan, Product, Subscription, SubscriptionLine, User


from typing import Optional

def seed_database(session_override: Optional[Session] = None) -> None:
    """Populate database with initial demo accounts, products, plans, subscriptions, and invoices."""
    if session_override is None:
        create_db_and_tables()

    def _do_seed(session: Session):
        # Check if already seeded
        existing_admin = session.exec(select(User).where(User.email == "admin@brightloop.demo")).first()
        if existing_admin:
            print("Database already contains seed data. Skipping seed.")
            return

        print("Seeding database with demo data...")

        # 1. Customers
        acme = Customer(
            name="Acme Corporation",
            billing_email="customer@brightloop.demo",
            phone="+91 9876543210",
            address="100 Innovation Way, Bengaluru, Karnataka 560001",
        )
        globex = Customer(
            name="Globex Enterprises",
            billing_email="globex@brightloop.demo",
            phone="+91 9811223344",
            address="42 Cyber City, Hyderabad, Telangana 500081",
        )
        session.add(acme)
        session.add(globex)
        session.commit()
        session.refresh(acme)
        session.refresh(globex)

        # 2. Users (Admin, Staff, Customers)
        admin = User(
            name="Brightloop Administrator",
            email="admin@brightloop.demo",
            password_hash=hash_password("Admin@12345"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        staff = User(
            name="Operations Staff",
            email="staff@brightloop.demo",
            password_hash=hash_password("Staff@12345"),
            role=UserRole.STAFF,
            is_active=True,
        )
        acme_user = User(
            name="Acme Billing Admin",
            email="customer@brightloop.demo",
            password_hash=hash_password("Customer@12345"),
            role=UserRole.CUSTOMER,
            customer_id=acme.id,
            is_active=True,
        )
        globex_user = User(
            name="Globex Billing Lead",
            email="globex@brightloop.demo",
            password_hash=hash_password("Globex@12345"),
            role=UserRole.CUSTOMER,
            customer_id=globex.id,
            is_active=True,
        )
        session.add_all([admin, staff, acme_user, globex_user])
        session.commit()

        # 3. Products
        core_prod = Product(
            name="Cloud Core Platform",
            product_type="Platform",
            sales_price_paise=150000,  # ₹1,500
            cost_price_paise=50000,
            notes="Core multi-tenant subscription engine",
            is_active=True,
        )
        analytics_prod = Product(
            name="Advanced Analytics Module",
            product_type="Add-on",
            sales_price_paise=80000,  # ₹800
            cost_price_paise=25000,
            notes="Real-time dashboard and custom exports",
            is_active=True,
        )
        support_prod = Product(
            name="24/7 Priority Support",
            product_type="Service",
            sales_price_paise=120000,  # ₹1,200
            cost_price_paise=40000,
            notes="Dedicated SLA support with 1-hour response",
            is_active=True,
        )
        session.add_all([core_prod, analytics_prod, support_prod])
        session.commit()
        session.refresh(core_prod)
        session.refresh(analytics_prod)
        session.refresh(support_prod)

        # 4. Plans
        monthly_plan = Plan(
            name="Monthly Business Plan",
            cadence=BillingCadence.MONTHLY,
            price_paise=230000,  # ₹2,300
            min_quantity=1,
            auto_close=False,
            allow_early_close=True,
            allow_pause=False,
            allow_renew=True,
            is_active=True,
        )
        yearly_plan = Plan(
            name="Annual Enterprise Plan",
            cadence=BillingCadence.YEARLY,
            price_paise=2400000,  # ₹24,000
            min_quantity=1,
            auto_close=False,
            allow_early_close=False,
            allow_pause=False,
            allow_renew=True,
            is_active=True,
        )
        weekly_plan = Plan(
            name="Weekly Starter Plan",
            cadence=BillingCadence.WEEKLY,
            price_paise=60000,  # ₹600
            min_quantity=1,
            auto_close=False,
            allow_early_close=True,
            allow_pause=False,
            allow_renew=True,
            is_active=True,
        )
        session.add_all([monthly_plan, yearly_plan, weekly_plan])
        session.commit()
        session.refresh(monthly_plan)
        session.refresh(yearly_plan)
        session.refresh(weekly_plan)

        # 5. Subscriptions
        today = date.today()
        two_months_ago = today - timedelta(days=60)
        one_month_ago = today - timedelta(days=30)
        next_month = today + timedelta(days=30)

        # Acme Active Subscription
        sub1 = Subscription(
            subscription_number="SUB-2026-000001",
            customer_id=acme.id,
            plan_id=monthly_plan.id,
            start_date=two_months_ago,
            end_date=None,
            next_billing_date=next_month,
            payment_terms_days=15,
            status=SubscriptionStatus.ACTIVE,
        )
        session.add(sub1)
        session.commit()
        session.refresh(sub1)

        sub1_line1 = SubscriptionLine(
            subscription_id=sub1.id,
            product_id=core_prod.id,
            quantity=1,
            unit_price_paise=150000,
            tax_rate_bps=1800,
        )
        sub1_line2 = SubscriptionLine(
            subscription_id=sub1.id,
            product_id=analytics_prod.id,
            quantity=1,
            unit_price_paise=80000,
            tax_rate_bps=1800,
        )
        session.add_all([sub1_line1, sub1_line2])
        session.commit()

        # Globex Draft/Quotation Subscription
        sub2 = Subscription(
            subscription_number="SUB-2026-000002",
            customer_id=globex.id,
            plan_id=yearly_plan.id,
            start_date=today,
            end_date=None,
            next_billing_date=None,
            payment_terms_days=30,
            status=SubscriptionStatus.QUOTATION,
        )
        session.add(sub2)
        session.commit()
        session.refresh(sub2)

        sub2_line = SubscriptionLine(
            subscription_id=sub2.id,
            product_id=core_prod.id,
            quantity=2,
            unit_price_paise=150000,
            tax_rate_bps=1800,
        )
        session.add(sub2_line)
        session.commit()

        # 6. Invoices for Acme
        # Invoice 1: Past invoice, fully PAID
        inv1_subtotal = 230000
        inv1_tax = int((inv1_subtotal * 1800 + 5000) / 10000)
        inv1_total = inv1_subtotal + inv1_tax
        inv1 = Invoice(
            invoice_number="INV-2026-000001",
            subscription_id=sub1.id,
            customer_id=acme.id,
            billing_period_start=two_months_ago,
            billing_period_end=one_month_ago,
            issued_date=two_months_ago,
            due_date=two_months_ago + timedelta(days=15),
            billing_name=acme.name,
            billing_email=acme.billing_email,
            billing_phone=acme.phone,
            billing_address=acme.address,
            subtotal_paise=inv1_subtotal,
            discount_paise=0,
            tax_paise=inv1_tax,
            total_paise=inv1_total,
            paid_amount_paise=inv1_total,
            status=InvoiceStatus.PAID,
            revision_number=1,
        )
        session.add(inv1)
        session.commit()
        session.refresh(inv1)

        inv1_line1 = InvoiceLine(
            invoice_id=inv1.id,
            product_id=core_prod.id,
            description="Cloud Core Platform",
            quantity=1,
            unit_price_paise=150000,
            tax_rate_bps=1800,
            line_subtotal_paise=150000,
            discount_paise=0,
            taxable_amount_paise=150000,
            tax_amount_paise=int((150000 * 1800 + 5000) / 10000),
            line_total_paise=150000 + int((150000 * 1800 + 5000) / 10000),
        )
        inv1_line2 = InvoiceLine(
            invoice_id=inv1.id,
            product_id=analytics_prod.id,
            description="Advanced Analytics Module",
            quantity=1,
            unit_price_paise=80000,
            tax_rate_bps=1800,
            line_subtotal_paise=80000,
            discount_paise=0,
            taxable_amount_paise=80000,
            tax_amount_paise=int((80000 * 1800 + 5000) / 10000),
            line_total_paise=80000 + int((80000 * 1800 + 5000) / 10000),
        )
        session.add_all([inv1_line1, inv1_line2])
        session.commit()

        # Payment for Invoice 1
        pay1 = Payment(
            invoice_id=inv1.id,
            method=PaymentMethod.BANK_TRANSFER,
            amount_paise=inv1_total,
            paid_at=datetime.combine(two_months_ago + timedelta(days=2), datetime.min.time(), tzinfo=timezone.utc),
            note="Full settlement for period 1",
        )
        session.add(pay1)
        session.commit()

        # Invoice 2: Past due date, partially paid -> OVERDUE for demo display
        inv2_due = today - timedelta(days=5)  # Overdue
        inv2 = Invoice(
            invoice_number="INV-2026-000002",
            subscription_id=sub1.id,
            customer_id=acme.id,
            billing_period_start=one_month_ago,
            billing_period_end=today,
            issued_date=one_month_ago,
            due_date=inv2_due,
            billing_name=acme.name,
            billing_email=acme.billing_email,
            billing_phone=acme.phone,
            billing_address=acme.address,
            subtotal_paise=inv1_subtotal,
            discount_paise=0,
            tax_paise=inv1_tax,
            total_paise=inv1_total,
            paid_amount_paise=100000,  # ₹1,000 paid, remaining ₹1,714
            status=InvoiceStatus.CONFIRMED,
            revision_number=1,
        )
        session.add(inv2)
        session.commit()
        session.refresh(inv2)

        inv2_line1 = InvoiceLine(
            invoice_id=inv2.id,
            product_id=core_prod.id,
            description="Cloud Core Platform",
            quantity=1,
            unit_price_paise=150000,
            tax_rate_bps=1800,
            line_subtotal_paise=150000,
            discount_paise=0,
            taxable_amount_paise=150000,
            tax_amount_paise=int((150000 * 1800 + 5000) / 10000),
            line_total_paise=150000 + int((150000 * 1800 + 5000) / 10000),
        )
        inv2_line2 = InvoiceLine(
            invoice_id=inv2.id,
            product_id=analytics_prod.id,
            description="Advanced Analytics Module",
            quantity=1,
            unit_price_paise=80000,
            tax_rate_bps=1800,
            line_subtotal_paise=80000,
            discount_paise=0,
            taxable_amount_paise=80000,
            tax_amount_paise=int((80000 * 1800 + 5000) / 10000),
            line_total_paise=80000 + int((80000 * 1800 + 5000) / 10000),
        )
        session.add_all([inv2_line1, inv2_line2])
        session.commit()

        # Partial payment for Invoice 2
        pay2 = Payment(
            invoice_id=inv2.id,
            method=PaymentMethod.UPI,
            amount_paise=100000,
            paid_at=datetime.combine(one_month_ago + timedelta(days=5), datetime.min.time(), tzinfo=timezone.utc),
            note="Partial payment advance via UPI",
        )
        session.add(pay2)
        print("Seeding completed successfully!")
        print("Demo Accounts:")
        print("  Admin:    admin@brightloop.demo    / Admin@12345")
        print("  Staff:    staff@brightloop.demo    / Staff@12345")
        print("  Customer: customer@brightloop.demo / Customer@12345")
        print("  Customer: globex@brightloop.demo   / Globex@12345")

    if session_override is not None:
        _do_seed(session_override)
    else:
        with Session(engine) as session:
            _do_seed(session)


if __name__ == "__main__":
    seed_database()
