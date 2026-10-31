# Subscription_Management_System
A unified software platform that runs the full life of a subscription business, from setting up products and plans to sending invoices, collecting payments and reporting revenue.
# Brightloop Subscription Management System

A local-first MVP that replaces Brightloop Software's spreadsheet-and-manual-billing workflow with one platform covering **plans → subscriptions → invoices → payments → revenue reporting**.

> Built in a 5-hour hackathon by a team of 4. Items marked **[EDIT]** are placeholders: update them to match your actual repo before submitting.

---

## 1. Problem Solved

Brightloop sells software on subscription (monthly/yearly plans, add-ons, variants). Today:

| Before | With this system |
|---|---|
| Subscriptions tracked in a spreadsheet | Central database with a clear lifecycle (Draft → Quotation → Confirmed → Active → Closed) |
| Renewals remembered by whoever notices | Plan rules and next-billing dates tracked per subscription |
| Invoices typed by hand | Invoices generated from the subscription, with lines, tax and totals prefilled |
| Payments matched by scrolling bank statements | Payments recorded against a specific invoice; balance and status update automatically |
| Revenue reports built quarterly | Live dashboard: active subscriptions, revenue received, outstanding amount, overdue invoices |

---

## 2. Demo Flow (end to end)

1. **Admin** signs in, reviews the catalog and plans, and sees role-restricted navigation.
2. **Staff** opens or creates a customer and creates a subscription.
3. Staff **generates the invoice** for that subscription (line items, tax, total, due date).
4. Staff **records a payment**; the balance and status change, and an overdue invoice is visible elsewhere.
5. The **dashboard** shows updated active subscriptions, revenue received, outstanding balance and filters.
6. **Customer** signs in and sees only their own subscriptions and invoices.

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite, Bootstrap for responsive styling |
| Backend | Python + FastAPI (all billing logic and role checks are server-side) |
| Data | SQLModel + SQLite (local file DB; models kept portable to PostgreSQL) |
| API | REST JSON under `/api`; interactive docs at `/docs` (Swagger) |

---

## 4. Getting Started

### Prerequisites

- Python 3.11+ **[EDIT if different]**
- Node.js 18+ and npm **[EDIT if different]**

### Setup and run

> **[EDIT]** Folder names and commands below assume `backend/` and `frontend/`. Adjust if your layout differs.

```bash
# 1. Clone
git clone <your-repo-url>
cd <your-repo-folder>

# 2. Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed                 # creates the SQLite DB and loads starter data
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000/api |
| API docs | http://localhost:8000/docs |

The frontend reads the API base URL from a single config value (`VITE_API_BASE_URL`, default `http://localhost:8000/api`). CORS on the backend is enabled only for the local frontend origin.

### Resetting to a clean state

Delete the SQLite file and re-run the seed command:

```bash
rm backend/<your-db-file>.db       # [EDIT] actual filename
python -m app.seed
```

---

## 5. Demo Accounts

Seeded for local demo use only. These are not real credentials.

| Role | Email | Password |
|---|---|---|
| Admin | **[EDIT]** admin@brightloop.demo | **[EDIT]** |
| Staff | **[EDIT]** staff@brightloop.demo | **[EDIT]** |
| Customer | **[EDIT]** customer@brightloop.demo | **[EDIT]** |

Seed passwords follow the same password policy as registration (see below).

---

## 6. Roles and Access

| Capability | Admin | Staff | Customer |
|---|:---:|:---:|:---:|
| Create staff accounts | ✅ | ❌ | ❌ |
| Manage products, plans, taxes, discounts | ✅ | ❌ | ❌ |
| Manage customers | ✅ | ✅ | ❌ |
| Create / transition subscriptions | ✅ | ✅ | ❌ |
| Generate invoices, record payments | ✅ | ✅ | ❌ |
| View dashboard | ✅ | ✅ | ❌ |
| View own subscriptions and invoices | n/a | n/a | ✅ (own records only) |

Access is enforced **on the server**, not only by hiding buttons. Customer queries are scoped by the authenticated customer's ID.

---

## 7. Architecture

```
┌────────────────────┐   REST/JSON    ┌───────────────────────────┐
│  React + Vite UI   │ ─────────────► │  FastAPI                  │
│  (role-aware shell)│ ◄───────────── │  ├─ auth / role checks    │
└────────────────────┘                │  ├─ service layer         │
                                      │  │   (state machine,      │
                                      │  │    billing, tax,       │
                                      │  │    discounts, payments)│
                                      │  └─ SQLModel ORM          │
                                      └─────────────┬─────────────┘
                                                    │
                                              ┌─────▼─────┐
                                              │  SQLite   │
                                              └───────────┘
```

Key decisions:

- **Business logic lives in a backend service layer.** Totals, tax, discounts and state transitions are never trusted from the browser.
- **Money is stored as integer paise** everywhere (API and DB). The UI formats it as ₹.
- **Invoices snapshot** customer, line, price and tax details, so historical invoices do not change when the catalog changes.
- **Transactions** wrap invoice generation and payment recording.

---

## 8. Data Model

| Table | Purpose / key fields |
|---|---|
| `User` | name, normalized email (unique), password hash, role (`ADMIN`/`STAFF`/`CUSTOMER`), optional `customer_id` |
| `Customer` | name, billing email, contact details |
| `Product` | name, type, sales price, cost price, notes, active flag |
| `Plan` | name, cadence (daily/weekly/monthly/yearly), price, minimum quantity, `available_from/to`, `auto_close`, `allow_early_close`, `allow_pause`, `allow_renew` |
| `Subscription` | number, `customer_id`, `plan_id`, start/end dates, payment terms, status, `next_billing_date` |
| `SubscriptionLine` | product, quantity, unit price, tax rate, optional variant adjustment |
| `Invoice` | number, subscription, customer, billing period start/end, issued/due dates, subtotal, discount, tax, total, `paid_amount`, status |
| `InvoiceLine` | description/product, quantity, unit price, tax rate, line total |
| `Payment` | invoice, method, amount, `paid_at`, note |
| `TaxRule` / `DiscountRule` | only the fields needed for rules supported in the demo |

**Duplicate-billing guard:** `Invoice` has a unique constraint on `(subscription_id, billing_period_start, billing_period_end)`.

> **[EDIT]** Add or link a schema diagram here, e.g. `docs/schema.png`.

---

## 9. Status Values

| Entity | Values |
|---|---|
| Subscription | `DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE` → `CLOSED` |
| Invoice | `DRAFT` → `CONFIRMED` → `PAID` (and `CANCELLED` if supported) |

Invalid transitions are rejected with a readable error message.

---

## 10. Billing Logic

1. **Generate due invoice(s):** staff triggers "Generate due invoices" (or `POST /api/subscriptions/{id}/generate-invoice` for a single subscription). The server picks the subscription's next unbilled period.
2. **Lines** are copied from the subscription lines, with price and tax snapshotted.
3. **Tax** is computed per line from the line's tax rate, using integer arithmetic.
4. **Discount** is applied if an applicable rule exists *(see feature status)*.
5. **Totals and due date** are computed server-side from payment terms.
6. **Idempotency:** re-running generation for the same period does not create a second invoice (DB unique constraint plus a pre-check inside the transaction).
7. **Payments** are recorded against an invoice. Amounts must be positive and may not exceed the outstanding balance. The invoice is marked `PAID` only when the balance reaches zero.
8. **Overdue** = due date has passed and the invoice is not fully paid.

> **[EDIT]** Add exact rounding rules, payment-terms options and discount rules actually implemented.

---

## 11. API Overview

Full, always-current reference: **http://localhost:8000/docs**

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Sign in **[EDIT path]** |
| POST | `/api/staff` | Admin creates staff **[EDIT path]** |
| GET | `/api/dashboard/summary` | Active subs, revenue, outstanding, overdue count (with filters) |
| GET / POST | `/api/customers` | List / create customers |
| GET / POST | `/api/plans` | List / create plans |
| GET / POST | `/api/subscriptions` | List / create subscriptions |
| POST | `/api/subscriptions/{id}/generate-invoice` | Idempotent invoice generation |
| GET | `/api/invoices` | List invoices (filterable) |
| POST | `/api/invoices/{id}/payments` | Record a payment |

**Error shape** (consistent across the API):

```json
{
  "detail": "Human-readable message",
  "errors": [{ "field": "quantity", "message": "Must be greater than 0" }]
}
```

---

## 12. Validation and Security

- Passwords are **hashed**, never stored in plaintext.
- Password policy: **more than 8 characters**, with at least one uppercase letter, one lowercase letter and one special character.
- Emails are **normalized** (trimmed, lowercased) before uniqueness checks.
- All input is validated on the server: required fields, email format, positive quantities and prices, valid date ranges, valid state transitions.
- Role checks and customer scoping are enforced in the API.
- Totals are calculated server-side; client-submitted totals are ignored.
- No real credentials or secrets are committed; configuration is local.

---

## 13. Feature Status

Legend: ✅ implemented · 🟡 simulated / partial · ⬜ deferred

> **[EDIT]** Update every row to reflect what actually works at submission time. Do not claim anything that was not demonstrated.

### Must-have (MVP)

| Feature | Status |
|---|:---:|
| Sign-in for Admin / Staff / Customer with role-aware navigation | ⬜ |
| Admin-only staff creation | ⬜ |
| Customer, product and plan create/edit (cadence, price, min qty, availability dates) | ⬜ |
| Subscription creation with lines and lifecycle states | ⬜ |
| Invoice generation with tax, totals, due date | ⬜ |
| Duplicate-billing prevention | ⬜ |
| Payment recording with balance/status update | ⬜ |
| Overdue invoice visibility | ⬜ |
| Dashboard summary cards with basic filter | ⬜ |
| Validation with readable error messages | ⬜ |
| Local DB persistence, seed data, documented run path | ⬜ |
| Responsive layout | ⬜ |
| Customer portal scoped to own records | ⬜ |

### Stretch

| Feature | Status |
|---|:---:|
| Quotation templates with validity period | ⬜ |
| Product variant price adjustments | ⬜ |
| Discount rules (fixed / percentage, limits, dates, usage cap) | ⬜ |
| Pause / resume / renew / cancel actions | ⬜ |
| Scheduled renewal / billing job | ⬜ |
| Password reset flow | ⬜ |
| PDF / print invoice | ⬜ |
| Pagination and richer filters | ⬜ |
| Audit log | ⬜ |

### Simulated by design

- **Payments:** manual payment records only; no payment gateway is integrated.
- **Invoice generation:** triggered on demand from a "Generate due invoices" action **[EDIT: or describe scheduled job if built]**.
- **Email / password reset:** no real email delivery is configured. **[EDIT: describe the local dev flow, e.g. reset link printed to server console.]**

---

## 14. Performance Notes

Target: every page responds in under 2 seconds with thousands of subscriptions.

- Dashboard figures are computed with **server-side aggregate queries**, not by loading rows into memory.
- List endpoints are **paginated** **[EDIT: confirm]**.
- Indexes on frequently filtered columns (status, customer, due date, billing dates) **[EDIT: confirm]**.

---

## 15. Known Limitations and Future Work

> **[EDIT]** Replace with the honest list at submission time. Likely candidates:

- SQLite is used for the hackathon; production should move to PostgreSQL.
- No real payment gateway or email provider.
- Deferred items from the Feature Status table above.
- Automated test coverage is limited **[EDIT]**.

---

## 16. Screenshots

> **[EDIT]** Add screenshots to `docs/screenshots/` and reference them here.

| View | Screenshot |
|---|---|
| Dashboard | `docs/screenshots/dashboard.png` |
| Subscription detail | `docs/screenshots/subscription.png` |
| Invoice with payment | `docs/screenshots/invoice.png` |
| Customer portal (mobile) | `docs/screenshots/portal-mobile.png` |

---

## 17. Team and Contributions

| Member | Lane | Branch |
|---|---|---|
| **[EDIT]** Person 1 | Backend, data model, API wiring, seed/run setup, integration | `feat/backend-data` |
| **[EDIT]** Person 2 | Subscription lifecycle, billing, tax/discount logic, idempotency | `feat/billing` |
| **[EDIT]** Person 3 | Frontend shell, responsive screens, dashboard, portal views | `feat/ui` |
| **[EDIT]** Person 4 | Auth, roles, customer scoping, payments, validation review, demo notes | `feat/auth-payments` |

Workflow: short-lived branches, small pull requests, each member reviews at least one other member's change, `main` always runnable.

---

## 18. Submission Checklist

- [ ] App starts locally from the steps above and loads persisted data
- [ ] Role-specific views work; a customer cannot access another customer's data
- [ ] Only Admin can add staff
- [ ] Invalid email/password, quantity/date and payment inputs show clear feedback
- [ ] Subscription moves through the supported lifecycle
- [ ] Invoice totals (subtotal, tax, discount if implemented, total, due date) are correct
- [ ] Repeating invoice generation creates no duplicate
- [ ] Payment updates balance and status; overdue invoices are visible
- [ ] Dashboard values change after the demo payment; filters work
- [ ] Remote repository shows commits from all four members
- [ ] README, screenshots and feature status match actual behavior
