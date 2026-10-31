export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  customerId?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  type: 'SERVICE' | 'SOFTWARE' | 'ADDON';
  salesPricePaise: number;
  costPricePaise: number;
  notes: string;
  active: boolean;
}

export type Cadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Plan {
  id: string;
  name: string;
  cadence: Cadence;
  pricePaise: number;
  minQuantity: number;
  availableFrom: string;
  availableTo?: string;
  autoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenew: boolean;
  taxRatePercent: number;
}

export type SubscriptionStatus = 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'CLOSED';

export interface SubscriptionLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPricePaise: number;
  taxRatePercent: number;
  discountPaise: number;
}

export interface Subscription {
  id: string;
  number: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  nextBillingDate: string;
  paymentTermsDays: number;
  lines: SubscriptionLine[];
  notes?: string;
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';

export interface InvoiceLine {
  id: string;
  description: string;
  productId?: string;
  quantity: number;
  unitPricePaise: number;
  taxRatePercent: number;
  taxAmountPaise: number;
  lineTotalPaise: number;
}

export interface Invoice {
  id: string;
  number: string;
  subscriptionId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  paidAmountPaise: number;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  createdAt: string;
}

export type PaymentMethod = 'BANK_TRANSFER' | 'CREDIT_CARD' | 'UPI' | 'CASH';

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  method: PaymentMethod;
  amountPaise: number;
  paidAt: string;
  note?: string;
}

export interface DashboardSummary {
  activeSubscriptionsCount: number;
  totalRevenuePaise: number;
  outstandingRevenuePaise: number;
  overdueInvoicesCount: number;
  totalSubscriptionsCount: number;
  totalInvoicesCount: number;
  recentSubscriptions: Subscription[];
  recentInvoices: Invoice[];
}

export interface ApiErrorResponse {
  detail: string;
  errors?: Array<{ field: string; message: string }>;
}
