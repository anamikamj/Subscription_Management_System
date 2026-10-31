"""End-to-end integration test verifying Person 1, Person 2, and Person 4 deliverables."""

import os
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.core.constants import BillingCadence, InvoiceStatus, PaymentMethod, SubscriptionStatus, UserRole
from app.database.connection import engine
from app.database.session import get_session
from app.main import app
from app.seed.seed_data import seed_database


from sqlalchemy.pool import StaticPool


@pytest.fixture(name="client")
def client_fixture():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)

    with Session(test_engine) as session:
        seed_database(session_override=session)

    def override_get_session():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    client = TestClient(app)
    yield client

    app.dependency_overrides.clear()


def login_as(client: TestClient, email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_auth_login_all_seeded_roles(client: TestClient):
    # Admin login
    admin_token = login_as(client, "admin@brightloop.demo", "Admin@12345")
    assert admin_token

    # Staff login
    staff_token = login_as(client, "staff@brightloop.demo", "Staff@12345")
    assert staff_token

    # Customer login
    customer_token = login_as(client, "customer@brightloop.demo", "Customer@12345")
    assert customer_token


def test_admin_only_staff_creation(client: TestClient):
    admin_token = login_as(client, "admin@brightloop.demo", "Admin@12345")
    staff_token = login_as(client, "staff@brightloop.demo", "Staff@12345")

    # Staff trying to create staff -> 403 Forbidden
    res = client.post(
        "/api/staff",
        json={"name": "New Staff", "email": "newstaff@brightloop.demo", "password": "Password123!"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert res.status_code == 403

    # Admin creates staff -> 201 Created
    res = client.post(
        "/api/staff",
        json={"name": "New Staff", "email": "newstaff@brightloop.demo", "password": "Password123!"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    assert res.json()["role"] == "STAFF"


def test_customer_scoping_and_isolation(client: TestClient):
    cust_token = login_as(client, "customer@brightloop.demo", "Customer@12345")

    # Customer 1 can view own customer info (id=1)
    res = client.get("/api/customers/1", headers={"Authorization": f"Bearer {cust_token}"})
    assert res.status_code == 200
    assert res.json()["billing_email"] == "customer@brightloop.demo"

    # Customer 1 cannot access customer 2's info -> 403 Forbidden
    res = client.get("/api/customers/2", headers={"Authorization": f"Bearer {cust_token}"})
    assert res.status_code == 403

    # Customer 1 listing customers gets only their own record
    res = client.get("/api/customers", headers={"Authorization": f"Bearer {cust_token}"})
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == 1


def test_end_to_end_subscription_lifecycle_invoice_and_payment(client: TestClient):
    staff_token = login_as(client, "staff@brightloop.demo", "Staff@12345")
    headers = {"Authorization": f"Bearer {staff_token}"}

    # 1. Create a customer
    res = client.post(
        "/api/customers",
        json={
            "name": "Tata Industries",
            "billing_email": "billing@tataind.demo",
            "phone": "+91 9123456789",
            "address": "Bombay House, Mumbai",
        },
        headers=headers,
    )
    assert res.status_code == 201
    customer_id = res.json()["id"]

    # 2. Create subscription with lines
    res = client.post(
        "/api/subscriptions",
        json={
            "customer_id": customer_id,
            "plan_id": 1,  # Monthly Business Plan
            "start_date": "2026-01-01",
            "payment_terms_days": 15,
            "lines": [
                {
                    "product_id": 1,
                    "quantity": 1,
                    "unit_price_paise": 150000,
                    "tax_rate_bps": 1800,
                }
            ],
        },
        headers=headers,
    )
    assert res.status_code == 201
    sub = res.json()
    sub_id = sub["id"]
    assert sub["status"] == "DRAFT"

    # 3. Transition: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE
    res = client.post(f"/api/subscriptions/{sub_id}/status", json={"status": "QUOTATION"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "QUOTATION"

    res = client.post(f"/api/subscriptions/{sub_id}/status", json={"status": "CONFIRMED"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "CONFIRMED"

    # Activation generates first invoice in transaction
    res = client.post(f"/api/subscriptions/{sub_id}/status", json={"status": "ACTIVE"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "ACTIVE"

    # 4. Invoices should now contain the first invoice for Tata
    res = client.get(f"/api/invoices?customer_id={customer_id}", headers=headers)
    assert res.status_code == 200
    invoices = res.json()
    assert len(invoices) == 1
    inv = invoices[0]
    inv_id = inv["id"]
    total = inv["total_paise"]
    assert inv["paid_amount_paise"] == 0
    assert inv["outstanding_paise"] == total

    # 5. Prevent duplicate billing for the same period
    res = client.post(
        f"/api/subscriptions/{sub_id}/generate-invoice",
        json={},
        headers=headers,
    )
    # The subscription start date is 2026-01-01 and period [2026-01-01, 2026-02-01) was already invoiced!
    # The next period [2026-02-01, 2026-03-01) can be invoiced once:
    assert res.status_code == 200
    second_inv = res.json()
    assert second_inv["billing_period_start"] == "2026-02-01"

    # Calling generate-invoice immediately again without advancing will invoice next period or reject duplicate
    res_dup = client.post(
        f"/api/subscriptions/{sub_id}/generate-invoice",
        headers=headers,
    )
    assert res_dup.status_code in (200, 400, 409)

    # 6. Payment tests on invoice 1:
    # Overpayment rejected
    res_overpay = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"method": "UPI", "amount": total + 1000},
        headers=headers,
    )
    assert res_overpay.status_code == 400
    assert "exceeds" in res_overpay.text.lower()

    # Non-positive amount rejected
    res_zero = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"method": "UPI", "amount": 0},
        headers=headers,
    )
    assert res_zero.status_code in (400, 422)

    # Partial payment
    partial_amount = total // 2
    res_partial = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"method": "BANK_TRANSFER", "amount": partial_amount, "note": "Half payment"},
        headers=headers,
    )
    assert res_partial.status_code == 201

    # Check updated balance
    res_inv = client.get(f"/api/invoices/{inv_id}", headers=headers)
    assert res_inv.json()["paid_amount_paise"] == partial_amount
    assert res_inv.json()["outstanding_paise"] == total - partial_amount
    assert res_inv.json()["status"] != "PAID"

    # Full settlement
    remaining = total - partial_amount
    res_full = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"method": "UPI", "amount": remaining, "note": "Final balance"},
        headers=headers,
    )
    assert res_full.status_code == 201

    res_inv_paid = client.get(f"/api/invoices/{inv_id}", headers=headers)
    assert res_inv_paid.json()["paid_amount_paise"] == total
    assert res_inv_paid.json()["outstanding_paise"] == 0
    assert res_inv_paid.json()["status"] == "PAID"

    # Paying again on a PAID invoice is rejected
    res_after_paid = client.post(
        f"/api/invoices/{inv_id}/payments",
        json={"method": "UPI", "amount": 100},
        headers=headers,
    )
    assert res_after_paid.status_code == 400


def test_dashboard_summary_endpoint(client: TestClient):
    admin_token = login_as(client, "admin@brightloop.demo", "Admin@12345")
    res = client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "active_subscriptions" in data
    assert "revenue_received_paise" in data
    assert "outstanding_amount_paise" in data
    assert "overdue_invoices_count" in data
    assert data["active_subscriptions"] >= 1
    assert data["revenue_received_paise"] > 0
    assert data["overdue_invoices_count"] >= 1
