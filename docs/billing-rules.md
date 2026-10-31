Brightloop – Billing Rules and Business Logic
1. Customer Management Business Rules
Every customer must have a unique email address.
Customer email addresses must be stored in lowercase without unnecessary whitespace.
A customer must exist before a subscription can be created.
Customers cannot directly modify subscription prices or invoice amounts.
Customers can view only their own subscriptions, invoices, and payment history.
A customer cannot be deleted if they have active subscriptions or outstanding invoices. Soft deletion should be used instead.
Inactive customers cannot create new subscriptions.
2. Product and Plan Management Business Rules
Every subscription plan must have a name and a valid price.
Plan prices must be greater than zero.
A plan must have a valid billing frequency:
Daily
Weekly
Monthly
Yearly
Minimum subscription quantity must be at least one.
A plan can only be assigned to a subscription if it is active and available.
The plan's availability end date cannot be earlier than its start date.
Changes to plan prices affect new subscriptions, not existing subscriptions or generated invoices.
A plan cannot be deleted if it is associated with subscriptions. It should be deactivated instead.
Tax rates must be nonnegative.
Plan renewal and pause capabilities are controlled through allow_renew and allow_pause.
3. Subscription Management Business Rules
A subscription must be associated with an existing customer and an active plan.
A subscription must have a valid start date.
Subscription quantity must be greater than or equal to the plan's minimum quantity.
Only Admin and Staff can create or update subscriptions.
A subscription can become ACTIVE only after confirmation and satisfaction of its activation conditions.
Invalid subscription status transitions must be rejected.
A closed subscription cannot generate new invoices.
A closed subscription cannot be reactivated. A new subscription must be created instead.
A subscription cannot be renewed if its plan does not allow renewal.
Pause/resume functionality is deferred for the hackathon.
No PAUSED status will be added to the subscription status enum.
A subscription cannot be closed early if early closure is disabled.
The next billing date must be calculated according to the plan's billing frequency.
3.1 Subscription Lifecycle

The approved lifecycle is:

DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED

Allowed transitions:

Current Status	Allowed Next Status
DRAFT	QUOTATION
QUOTATION	CONFIRMED, DRAFT
CONFIRMED	ACTIVE, CLOSED
ACTIVE	CLOSED
CLOSED	No further transitions

Additional rules:

Only Admin and Staff can change subscription status.
DRAFT and QUOTATION subscriptions cannot generate invoices.
CLOSED subscriptions cannot generate future invoices.
Invalid transitions must be rejected.
4. Billing and Invoice Timing
4.1 Advance Billing
Customers are billed in advance, not in arrears.
The first invoice is generated when the subscription becomes ACTIVE.
The first invoice covers the initial billing period.
Subsequent invoices are generated at the beginning of each new billing period.
Invoice generation must happen only when the subscription is eligible for billing.

Example:

Event	Date
Subscription becomes ACTIVE	January 1
First invoice generated	January 1
First billing period	January 1 – February 1
Next billing date	February 1
Second invoice generated	February 1
4.2 Billing Period Storage

Billing periods must use half-open intervals:

[billing_period_start, billing_period_end)

Rules:

billing_period_start is inclusive.
billing_period_end is exclusive.
The next billing period begins exactly when the previous period ends.
Billing periods must not overlap or leave gaps.

Example:

Invoice	Stored Billing Period
INV001	Jan 1 – Feb 1
INV002	Feb 1 – Mar 1
INV003	Mar 1 – Apr 1
4.3 Next Billing Date Calculation

The next billing date depends on the plan cadence.

Billing Frequency	Calculation
Daily	Add one calendar day
Weekly	Add seven calendar days
Monthly	Add one calendar month
Yearly	Add one calendar year
4.4 Month-End Date Handling

The original subscription start date must be preserved as the billing anchor.

Example for a January 31 subscription:

Billing Occurrence	Billing Date
First	January 31
Second	February 28
Third	March 31
Fourth	April 30
Fifth	May 31

Rules:

Calculate every billing date from the original billing anchor.
Do not repeatedly add one month to the previous adjusted date.
If the target month does not contain the original day, use the last day of that month.
February 29 in a leap year becomes February 28 in a non-leap year.

The existing Subscription.start_date serves as the original billing anchor. No additional anchor field is required for the MVP.

Implementation: backend/app/utils/date_utils.py

5. Subscription End Date and Prorating
Prorated billing is out of scope for the hackathon.
An active subscription can generate an invoice for its current full billing period.
If a subscription ends partway through an already invoiced period, the existing invoice remains payable.
No automatic refund or partial-period adjustment is calculated.
No new invoice is generated for a billing period beginning on or after the subscription end date.
Closing a subscription stops future billing but does not cancel existing invoices or payments.
Outstanding invoices remain payable even after subscription closure.

Example:

A monthly subscription covers January 1 – February 1 and closes on January 15.

The January invoice remains valid.
No February invoice is generated.
Any outstanding January balance remains payable.
6. Invoice Management Business Rules
An invoice can only be generated for an eligible subscription.
An invoice must have a unique invoice number.
Invoice line items must be copied from the subscription.
Invoice subtotal must be calculated by the backend.
Invoice totals must never be accepted directly from the frontend.
Invoice due date must be calculated using applicable payment terms.
An invoice must preserve historical product prices, tax rates, discounts, and customer details.
The system must prevent accidental duplicate invoices for the same subscription and billing period.
Cancelled invoices cannot receive new payments.
An invoice must be marked overdue when its due date has passed and it has an outstanding balance.
Cancelled invoices must be excluded from outstanding balance calculations.
6.1 Invoice Calculation

All invoice calculations must happen on the backend.

Step 1: Subtotal

Subtotal = Σ(Quantity × Unit Price)

Step 2: Discount

Discount = Eligible Amount × Discount Rate

Step 3: Taxable Amount

Taxable Amount = Subtotal - Discount

Step 4: Tax

Tax = Taxable Amount × Tax Rate

Step 5: Final Total

Total = Subtotal - Discount + Tax

6.2 Tax and Discount Order
Discounts must be deducted before calculating tax.
Tax must be calculated on the discounted taxable amount.
Tax must be calculated separately for each invoice line.
Each line's tax must be rounded to the nearest paise using half-up rounding.
Invoice tax is the sum of the rounded line-level tax amounts.
Invoice-level discounts must be allocated proportionally across applicable lines when different tax rates exist.

Example:

Component	Amount
Subtotal	₹2,500
Discount (10%)	-₹250
Taxable Amount	₹2,250
Tax (18%)	+₹405
Final Total	₹2,655
6.3 Monetary Calculations
Store monetary values as integer paise.
Store tax rates as integer basis points.
Example: 18% tax = 1800 basis points.
Use consistent half-up rounding.
Store calculated discount and tax amounts on invoices and invoice lines.
6.4 Invoice Due Date
The invoice due date must be calculated using applicable payment terms.
Subscription payment terms can override customer default payment terms.
If no override exists, use the customer's payment terms.
Payment terms must be nonnegative.
6.5 Duplicate Invoice Prevention

The system must not generate duplicate invoices for the same subscription and billing period.

The original uniqueness constraint is:

(subscription_id, billing_period_start, billing_period_end)

For controlled invoice revisions, use:

(subscription_id, billing_period_start, billing_period_end, revision_number)

The uniqueness constraint must be enforced at the database level.

Invoice creation and duplicate checking must happen inside a database transaction.

7. Cancelled Invoice and Reissue Rules
Cancelled invoices must remain in the database.
Their original invoice numbers must be retained.
Cancelled invoices cannot receive new payments.
Cancelled invoices must be excluded from outstanding balance calculations.
Cancelling an invoice must not automatically generate another invoice.
Reissuing an invoice must be an explicit authorized action.
Only Admin or authorized Staff can initiate invoice reissue.
The original cancelled invoice must remain unchanged.
7.1 Invoice Revision Fields

The Invoice model must support:

Field	Purpose
revision_number	Invoice revision, initially 1
supersedes_invoice_id	References the previous invoice
revision_reason	Explains why the invoice was reissued

Revision rules:

Original invoice starts at revision 1.
A new revision can only be created after the previous invoice is cancelled.
Revision numbers must increase sequentially.
The new invoice must reference the previous invoice.
Existing payments must not be silently discarded.
No automatic reissue is allowed.
8. Invoice Line Business Rules

Each invoice line must preserve its historical calculation details.

Required fields:

Field	Purpose
quantity	Billed quantity
unit_price_paise	Historical unit price
tax_rate_bps	Historical tax rate
line_subtotal_paise	Quantity × Unit Price
discount_paise	Allocated discount
taxable_amount_paise	Subtotal minus discount
tax_amount_paise	Rounded line-level tax
line_total_paise	Taxable amount plus tax

Rules:

Quantity must be greater than zero.
Unit price must be positive.
Tax rate must be nonnegative.
The backend must calculate all line amounts.
Previously generated invoices must not change when product prices or tax rules change.
9. Payment Management Business Rules
Only Admin and Staff can record payments.
A payment must be associated with an existing invoice.
Payment amount must be greater than zero.
Payment amount cannot exceed the outstanding invoice balance.
Payments cannot be recorded against cancelled or fully paid invoices.
Every payment must have a transaction date.
Payment method must be valid.

Supported payment methods:

Cash
Bank Transfer
UPI
Card

Additional rules:

Partial payments must be supported.
Invoice paid amount must be updated after successful payment recording.
An invoice becomes PAID only when its outstanding balance reaches zero.
Payment operations must use database transactions.
9.1 Payment Example
Transaction	Amount
Invoice Total	₹1,000
First Payment	₹400
Remaining Balance	₹600
Second Payment	₹600
Remaining Balance	₹0
Final Invoice Status	PAID
10. Discount Management Business Rules
Discounts can be fixed amounts or percentages.
Percentage discounts cannot exceed 100%.
Fixed discounts cannot exceed the eligible invoice amount.
Discounts must have valid start and end dates.
Expired discounts cannot be applied.
Usage limits must be respected.
Discounts cannot result in a negative invoice total.
Multiple discounts must not be combined unless explicitly permitted.
Discounts must be applied before tax calculation.
Discount eligibility must be validated by the backend.
11. Tax Management Business Rules
Tax rates must not be negative.
Tax must be calculated on the applicable taxable amount.
Tax rules must be applied according to product or service configuration.
Tax calculations must happen on the backend.
Tax must be rounded per invoice line using half-up rounding.
Previously generated invoices must retain their original tax rates.
Tax calculations must use integer paise and basis points.
12. Authentication and Authorization Rules

Every user must authenticate before accessing protected endpoints.

Passwords must be hashed and never stored in plaintext.

12.1 Role Permissions
Business Operation	Admin	Staff	Customer
Create Staff	Yes	No	No
Manage Products and Plans	Yes	No	No
Manage Customers	Yes	Yes	No
Create Subscriptions	Yes	Yes	No
Generate Invoices	Yes	Yes	No
Record Payments	Yes	Yes	No
View Dashboard	Yes	Yes	No
View Own Invoices	No	No	Yes
View Own Subscriptions	No	No	Yes
View Own Payment History	No	No	Yes

Additional rules:

Only Admin can create Staff accounts.
Users cannot access functionality outside their assigned roles.
Customers cannot access another customer's records by changing an API ID.
Unauthorized access must return HTTP 403 or 404 as appropriate.
All authorization checks must happen on the backend.
Customers cannot modify invoice calculations or payment records.
13. Revenue and Dashboard Business Rules
Active subscription count includes only subscriptions with ACTIVE status.
Revenue received represents successfully recorded payments, not invoice totals.
Outstanding amount is calculated from unpaid invoice balances.
Overdue invoice count includes invoices past their due dates with outstanding balances.
Cancelled invoices must be excluded from normal outstanding calculations.
Dashboard figures must update after successful payment recording.
Revenue reports must support date-based filtering.
Partial payments contribute only the amount actually received to revenue.
14. Important Edge Cases
Scenario	Expected Behavior
Duplicate invoice generation	Reject duplicate billing for the same revision and period
Payment greater than balance	Reject payment
Negative subscription price	Reject
Zero plan price	Reject
Invalid subscription transition	Reject
Inactive plan	Prevent new subscriptions
Expired plan	Prevent new subscriptions
Closed subscription	Prevent future billing
Expired discount	Do not apply discount
Customer accesses another customer's invoice	Return 403 or 404
Invoice already paid	Prevent additional payment
Cancelled invoice	Reject new payments
Invalid due date	Reject
Database transaction fails	Roll back incomplete operation
Subscription ends mid-period	No prorating; preserve existing invoice
Month-end billing	Preserve original billing anchor
Cancelled invoice correction	Require authorized controlled revision
Tax rule changes	Preserve historical invoice tax rate
15. Top 15 Business Rules to Prioritize
No.	Business Rule	Priority
1	Unique customer email	High
2	Valid product and plan pricing	High
3	Minimum subscription quantity	High
4	Valid subscription lifecycle	High
5	Only active plans can be subscribed to	High
6	Automatic next billing date calculation	High
7	Backend invoice calculations	High
8	Tax calculation	High
9	Duplicate invoice prevention	High
10	Payment cannot exceed outstanding balance	High
11	Partial payment support	High
12	Automatic invoice status updates	High
13	Overdue invoice detection	High
14	Role-based access control	High
15	Customer-specific data access	High
16. Backend Architecture

The project follows this architecture:

text
React Frontend
      |
      v
FastAPI Backend
      |
      v
Business Logic / Service Layer
      |
      v
SQLModel + SQLite

16.1 Services

Location: backend/app/services/

File	Responsibility
subscription_service.py	Subscription creation, lifecycle, expiration and closure
billing_service.py	Billing eligibility, billing periods and next billing dates
invoice_service.py	Invoice generation, calculations, snapshots and duplicate prevention
payment_service.py	Payment validation, partial payments and outstanding balances
plan_service.py	Plan availability, pricing, cadence and deactivation
dashboard_service.py	Revenue, outstanding balances and overdue invoices
auth_service.py	Authentication, roles and permissions
16.2 Utilities

Location: backend/app/utils/

File	Responsibility
calculations.py	Subtotal, discount, tax, total and outstanding balance calculations
date_utils.py	Daily, weekly, monthly and yearly date calculations, month-end handling and leap years
validators.py	Validation of quantities, prices, dates and payment amounts
invoice_number.py	Unique invoice number generation
16.3 Models

Location: backend/app/models/

File	Responsibility
plan.py	Plan pricing, billing cadence and availability
subscription.py	Subscription dates, status and relationships
subscription_line.py	Products, quantities, prices and tax rates
invoice.py	Invoice periods, amounts, status and revisions
invoice_line.py	Individual invoice items and calculation breakdown
payment.py	Payment amount, method, date and invoice relationship
16.4 Tests

Location: backend/tests/

File	Responsibility
test_subscriptions.py	Lifecycle transitions, expiration and closure
test_plans.py	Pricing, cadence and plan deactivation
test_invoices.py	Invoice calculations, billing periods and duplicate prevention
test_payments.py	Partial payments, excess payment rejection and status updates
test_dashboard.py	Revenue, outstanding balances and overdue calculations
17. Database and Implementation Rules
Database constraints must enforce important uniqueness and validation requirements wherever possible.
Service-layer validation must enforce business rules before database writes.
Invoice and payment operations must use database transactions.
Failed transactions must roll back incomplete operations.
SQLModel model changes must be accompanied by appropriate database migrations or development database recreation.
create_all() must not be assumed to update existing database columns or constraints.
Historical invoices and payments must be preserved.
18. Recommended Implementation Order
Update SQLModel entities and database constraints.
Implement date utilities and calculation utilities.
Implement subscription service and lifecycle validation.
Implement billing and invoice services.
Implement payment service.
Implement authentication and role-based authorization.
Implement dashboard service.
Add tests for billing dates, calculations, duplicate invoices, payments and edge cases.
Final Development Agreement

The following decisions are authoritative for the Brightloop MVP:

Advance billing; first invoice on subscription activation.
Billing periods use inclusive start dates and exclusive end dates.
Original billing-day anchor is preserved for month-end calculations.
No prorating or automatic partial-period refunds.
Discounts are applied before tax.
Tax is calculated and rounded per invoice line using half-up rounding.
Billing, invoice, subscription and payment logic remain in separate services.
Pause/resume is deferred; no PAUSED status is introduced.
Cancelled invoices remain stored and cannot receive payments.
Invoice reissue requires explicit authorization and revision numbers.
Historical invoice prices, tax rates and customer details must remain unchanged.
Backend calculations and authorization are mandatory.
Database transactions must protect invoice and payment operations.

Implementation priority: Complete schema corrections and verification before continuing with the remaining CRUD endpoints and billing services.