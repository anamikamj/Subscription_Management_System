/**
 * Domain types and enums matching backend SQLModel entities & schemas.
 */

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'CLOSED';

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';

export type BillingCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'OTHER';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  customer_id?: number | null;
  is_active: boolean;
}

export interface Customer {
  id: number;
  name: string;
  billing_email: string;
  phone?: string | null;
  address?: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  product_type?: string | null;
  sales_price_paise: number;
  cost_price_paise: number;
  notes?: string | null;
  is_active: boolean;
}

export interface Plan {
  id: number;
  name: string;
  cadence: BillingCadence;
  price_paise: number;
  min_quantity: number;
  available_from?: string | null;
  available_to?: string | null;
  auto_close: boolean;
  allow_early_close: boolean;
  allow_pause: boolean;
  allow_renew: boolean;
  is_active: boolean;
}

export interface SubscriptionLine {
  id?: number;
  subscription_id?: number;
  product_id: number;
  quantity: number;
  unit_price_paise: number;
  tax_rate_bps: number; // e.g. 1800 for 18%
  variant_name?: string | null;
  price_adjustment_paise: number;
  product?: Product;
}

export interface Subscription {
  id: number;
  subscription_number: string;
  customer_id: number;
  plan_id: number;
  start_date: string;
  end_date?: string | null;
  next_billing_date?: string | null;
  payment_terms_days: number;
  status: SubscriptionStatus;
  customer?: Customer;
  plan?: Plan;
  lines: SubscriptionLine[];
}

export interface InvoiceLine {
  id: number;
  invoice_id: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price_paise: number;
  tax_rate_bps: number;
  line_subtotal_paise?: number;
  discount_paise?: number;
  taxable_amount_paise?: number;
  tax_amount_paise?: number;
  line_total_paise: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  subscription_id: number;
  customer_id: number;
  billing_period_start: string;
  billing_period_end: string;
  issued_date: string;
  due_date: string;
  billing_name: string;
  billing_email: string;
  billing_phone?: string | null;
  billing_address?: string | null;
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  total_paise: number;
  paid_amount_paise: number;
  status: InvoiceStatus;
  revision_number?: number;
  lines: InvoiceLine[];
  subscription?: Subscription;
  customer?: Customer;
}

export interface Payment {
  id: number;
  invoice_id: number;
  method: PaymentMethod;
  amount_paise: number;
  paid_at: string;
  note?: string | null;
  invoice?: Invoice;
}

export interface DashboardSummary {
  active_subscriptions: number;
  total_revenue_paise: number;
  outstanding_paise: number;
  overdue_invoices_count: number;
  overdue_paise: number;
  period: 'all' | 'month' | 'year';
  recent_invoices: Invoice[];
  recent_payments: Payment[];
}

