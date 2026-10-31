
"""SQLModel database entities for Brightloop."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

from app.core.constants import (
    BillingCadence,
    InvoiceStatus,
    PaymentMethod,
    SubscriptionStatus,
    UserRole,
)


# --------------------------------------------------
# 1. CUSTOMER
# --------------------------------------------------

class Customer(SQLModel, table=True):
    __tablename__ = "customers"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    billing_email: str = Field(index=True)
    phone: Optional[str] = None
    address: Optional[str] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    user: Optional["User"] = Relationship(back_populates="customer")
    subscriptions: list["Subscription"] = Relationship(
        back_populates="customer"
    )
    invoices: list["Invoice"] = Relationship(back_populates="customer")


# --------------------------------------------------
# 2. USER
# --------------------------------------------------

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.CUSTOMER, index=True)

    # Only customer accounts need a linked customer record.
    customer_id: Optional[int] = Field(
        default=None,
        foreign_key="customers.id",
        unique=True,
    )

    is_active: bool = Field(default=True)

    customer: Optional[Customer] = Relationship(back_populates="user")


# --------------------------------------------------
# 3. PRODUCT
# --------------------------------------------------

class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    product_type: Optional[str] = None

    # All monetary values are stored in paise.
    sales_price_paise: int
    cost_price_paise: int = Field(default=0)

    notes: Optional[str] = None
    is_active: bool = Field(default=True)

    subscription_lines: list["SubscriptionLine"] = Relationship(
        back_populates="product"
    )
    invoice_lines: list["InvoiceLine"] = Relationship(
        back_populates="product"
    )


# --------------------------------------------------
# 4. PLAN
# --------------------------------------------------

class Plan(SQLModel, table=True):
    __tablename__ = "plans"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)

    cadence: BillingCadence
    price_paise: int
    min_quantity: int = Field(default=1)

    available_from: Optional[date] = None
    available_to: Optional[date] = None

    auto_close: bool = Field(default=False)
    allow_early_close: bool = Field(default=False)
    allow_pause: bool = Field(default=False)
    allow_renew: bool = Field(default=True)

    is_active: bool = Field(default=True)

    subscriptions: list["Subscription"] = Relationship(
        back_populates="plan"
    )


# --------------------------------------------------
# 5. SUBSCRIPTION
# --------------------------------------------------

class Subscription(SQLModel, table=True):
    __tablename__ = "subscriptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    subscription_number: str = Field(unique=True, index=True)

    customer_id: int = Field(foreign_key="customers.id", index=True)
    plan_id: int = Field(foreign_key="plans.id", index=True)

    start_date: date
    end_date: Optional[date] = None
    next_billing_date: Optional[date] = None

    payment_terms_days: int = Field(default=0)

    status: SubscriptionStatus = Field(
        default=SubscriptionStatus.DRAFT,
        index=True,
    )

    customer: Customer = Relationship(back_populates="subscriptions")
    plan: Plan = Relationship(back_populates="subscriptions")

    lines: list["SubscriptionLine"] = Relationship(
        back_populates="subscription"
    )
    invoices: list["Invoice"] = Relationship(
        back_populates="subscription"
    )


# --------------------------------------------------
# 6. SUBSCRIPTION LINE
# --------------------------------------------------

class SubscriptionLine(SQLModel, table=True):
    __tablename__ = "subscription_lines"

    id: Optional[int] = Field(default=None, primary_key=True)

    subscription_id: int = Field(
        foreign_key="subscriptions.id",
        index=True,
    )
    product_id: int = Field(foreign_key="products.id")

    quantity: int = Field(default=1)
    unit_price_paise: int

    # 1800 basis points means 18%.
    tax_rate_bps: int = Field(default=0)

    variant_name: Optional[str] = None
    price_adjustment_paise: int = Field(default=0)

    subscription: Subscription = Relationship(back_populates="lines")
    product: Product = Relationship(back_populates="subscription_lines")


# --------------------------------------------------
# 7. INVOICE
# --------------------------------------------------

class Invoice(SQLModel, table=True):
    __tablename__ = "invoices"

    # Prevent two invoices for the same subscription
    # and billing period.
    __table_args__ = (
        UniqueConstraint(
            "subscription_id",
            "billing_period_start",
            "billing_period_end",
            name="uq_invoice_subscription_billing_period",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_number: str = Field(unique=True, index=True)

    subscription_id: int = Field(
        foreign_key="subscriptions.id",
        index=True,
    )
    customer_id: int = Field(foreign_key="customers.id", index=True)

    billing_period_start: date
    billing_period_end: date

    issued_date: date
    due_date: date

    # Customer snapshot: preserves details at invoice time.
    billing_name: str
    billing_email: str
    billing_phone: Optional[str] = None
    billing_address: Optional[str] = None

    # All monetary amounts are in paise.
    subtotal_paise: int = Field(default=0)
    discount_paise: int = Field(default=0)
    tax_paise: int = Field(default=0)
    total_paise: int = Field(default=0)
    paid_amount_paise: int = Field(default=0)

    status: InvoiceStatus = Field(
        default=InvoiceStatus.DRAFT,
        index=True,
    )

    subscription: Subscription = Relationship(back_populates="invoices")
    customer: Customer = Relationship(back_populates="invoices")

    lines: list["InvoiceLine"] = Relationship(
        back_populates="invoice"
    )
    payments: list["Payment"] = Relationship(
        back_populates="invoice"
    )


# --------------------------------------------------
# 8. INVOICE LINE
# --------------------------------------------------

class InvoiceLine(SQLModel, table=True):
    __tablename__ = "invoice_lines"

    id: Optional[int] = Field(default=None, primary_key=True)

    invoice_id: int = Field(foreign_key="invoices.id", index=True)

    # Optional because the product may no longer exist.
    product_id: Optional[int] = Field(
        default=None,
        foreign_key="products.id",
    )

    # Snapshot of the product description at invoice time.
    description: str

    quantity: int
    unit_price_paise: int
    tax_rate_bps: int = Field(default=0)
    line_total_paise: int

    invoice: Invoice = Relationship(back_populates="lines")
    product: Optional[Product] = Relationship(
        back_populates="invoice_lines"
    )


# --------------------------------------------------
# 9. PAYMENT
# --------------------------------------------------

class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: Optional[int] = Field(default=None, primary_key=True)

    invoice_id: int = Field(foreign_key="invoices.id", index=True)

    method: PaymentMethod
    amount_paise: int

    paid_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    note: Optional[str] = None

    invoice: Invoice = Relationship(back_populates="payments")
