/**
 * Isolated storage adapter for when backend REST routes are not yet mounted or offline.
 * Conforms strictly to the backend entities and business rules (e.g. integer paise,
 * subscription transitions, invoice generation, payment allocation).
 */

import type {
  Customer,
  DashboardSummary,
  Invoice,
  Payment,
  Plan,
  Product,
  Subscription,
  SubscriptionStatus,
  User,
  UserRole,
} from '../../types';
import { calculateTaxPaise } from '../../utils/formatters';

const STORAGE_KEY = 'brightloop_mvp_store_v1';

interface StoredData {
  users: User[];
  customers: Customer[];
  products: Product[];
  plans: Plan[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  payments: Payment[];
}

const SEED_DATA: StoredData = {
  users: [
    {
      id: 1,
      name: 'Brightloop Admin',
      email: 'admin@brightloop.demo',
      role: 'ADMIN',
      is_active: true,
    },
    {
      id: 2,
      name: 'Operations Staff',
      email: 'staff@brightloop.demo',
      role: 'STAFF',
      is_active: true,
    },
    {
      id: 3,
      name: 'Acme Corporation (Client)',
      email: 'customer@brightloop.demo',
      role: 'CUSTOMER',
      customer_id: 1,
      is_active: true,
    },
  ],
  customers: [
    {
      id: 1,
      name: 'Acme Technologies Pvt Ltd',
      billing_email: 'billing@acme.demo',
      phone: '+91 98765 43210',
      address: 'Plot 42, Tech Park, Electronic City, Bengaluru, Karnataka 560100',
      created_at: '2026-09-01T10:00:00Z',
    },
    {
      id: 2,
      name: 'BluePeak Logistics',
      billing_email: 'finance@bluepeak.in',
      phone: '+91 98112 23344',
      address: 'Level 5, Express Towers, Nariman Point, Mumbai, Maharashtra 400021',
      created_at: '2026-09-15T11:30:00Z',
    },
    {
      id: 3,
      name: 'Nexus Cloud Labs',
      billing_email: 'accounts@nexuscloud.io',
      phone: '+91 97223 34455',
      address: 'Tower B, HITEC City, Hyderabad, Telangana 500081',
      created_at: '2026-10-01T09:15:00Z',
    },
  ],
  products: [
    {
      id: 1,
      name: 'Brightloop Core Platform',
      product_type: 'Software Subscription',
      sales_price_paise: 2500000, // ₹25,000
      cost_price_paise: 500000,
      notes: 'Full access to core subscription management engine',
      is_active: true,
    },
    {
      id: 2,
      name: 'Advanced Analytics Addon',
      product_type: 'Addon',
      sales_price_paise: 750000, // ₹7,500
      cost_price_paise: 150000,
      notes: 'Real-time MRR, cohort churn, and predictive forecasting',
      is_active: true,
    },
    {
      id: 3,
      name: '24/7 Dedicated Support',
      product_type: 'Support SLA',
      sales_price_paise: 1000000, // ₹10,000
      cost_price_paise: 200000,
      notes: '15-minute response SLA with dedicated technical account manager',
      is_active: true,
    },
    {
      id: 4,
      name: 'Custom ERP Webhook Connector',
      product_type: 'Integration',
      sales_price_paise: 1500000, // ₹15,000
      cost_price_paise: 300000,
      notes: 'Bi-directional webhook sync with Tally, SAP, and QuickBooks',
      is_active: true,
    },
  ],
  plans: [
    {
      id: 1,
      name: 'Growth Monthly Plan',
      cadence: 'MONTHLY',
      price_paise: 2500000, // ₹25,000
      min_quantity: 1,
      available_from: '2026-01-01',
      auto_close: false,
      allow_early_close: false,
      allow_pause: true,
      allow_renew: true,
      is_active: true,
    },
    {
      id: 2,
      name: 'Scale Enterprise Monthly',
      cadence: 'MONTHLY',
      price_paise: 5000000, // ₹50,000
      min_quantity: 1,
      available_from: '2026-01-01',
      auto_close: false,
      allow_early_close: true,
      allow_pause: true,
      allow_renew: true,
      is_active: true,
    },
    {
      id: 3,
      name: 'Enterprise Annual (Discounted)',
      cadence: 'YEARLY',
      price_paise: 27000000, // ₹2,70,000
      min_quantity: 1,
      available_from: '2026-01-01',
      auto_close: false,
      allow_early_close: true,
      allow_pause: true,
      allow_renew: true,
      is_active: true,
    },
    {
      id: 4,
      name: 'Sprint Weekly Tier',
      cadence: 'WEEKLY',
      price_paise: 800000, // ₹8,000
      min_quantity: 1,
      available_from: '2026-01-01',
      auto_close: true,
      allow_early_close: false,
      allow_pause: false,
      allow_renew: true,
      is_active: true,
    },
  ],
  subscriptions: [
    {
      id: 1,
      subscription_number: 'SUB-2026-001',
      customer_id: 1,
      plan_id: 1,
      start_date: '2026-09-01',
      next_billing_date: '2026-11-01',
      payment_terms_days: 15,
      status: 'ACTIVE',
      lines: [
        {
          id: 1,
          subscription_id: 1,
          product_id: 1,
          quantity: 1,
          unit_price_paise: 2500000,
          tax_rate_bps: 1800,
          variant_name: 'Production Tier',
          price_adjustment_paise: 0,
        },
        {
          id: 2,
          subscription_id: 1,
          product_id: 2,
          quantity: 1,
          unit_price_paise: 750000,
          tax_rate_bps: 1800,
          variant_name: null,
          price_adjustment_paise: 0,
        },
      ],
    },
    {
      id: 2,
      subscription_number: 'SUB-2026-002',
      customer_id: 2,
      plan_id: 2,
      start_date: '2026-09-15',
      next_billing_date: '2026-10-15',
      payment_terms_days: 7,
      status: 'ACTIVE',
      lines: [
        {
          id: 3,
          subscription_id: 2,
          product_id: 1,
          quantity: 1,
          unit_price_paise: 2500000,
          tax_rate_bps: 1800,
          variant_name: null,
          price_adjustment_paise: 0,
        },
        {
          id: 4,
          subscription_id: 2,
          product_id: 3,
          quantity: 1,
          unit_price_paise: 1000000,
          tax_rate_bps: 1800,
          variant_name: 'Primary Tier',
          price_adjustment_paise: 0,
        },
      ],
    },
    {
      id: 3,
      subscription_number: 'SUB-2026-003',
      customer_id: 3,
      plan_id: 3,
      start_date: '2026-10-01',
      next_billing_date: '2027-10-01',
      payment_terms_days: 30,
      status: 'QUOTATION',
      lines: [
        {
          id: 5,
          subscription_id: 3,
          product_id: 1,
          quantity: 2,
          unit_price_paise: 2500000,
          tax_rate_bps: 1800,
          variant_name: null,
          price_adjustment_paise: 0,
        },
      ],
    },
  ],
  invoices: [
    {
      id: 1,
      invoice_number: 'INV-2026-001',
      subscription_id: 1,
      customer_id: 1,
      billing_period_start: '2026-09-01',
      billing_period_end: '2026-10-01',
      issued_date: '2026-09-01',
      due_date: '2026-09-16',
      billing_name: 'Acme Technologies Pvt Ltd',
      billing_email: 'billing@acme.demo',
      billing_phone: '+91 98765 43210',
      billing_address: 'Plot 42, Tech Park, Electronic City, Bengaluru',
      subtotal_paise: 3250000,
      discount_paise: 0,
      tax_paise: 585000, // 18% of 32,50,000 = 5,85,000
      total_paise: 3835000, // ₹38,350
      paid_amount_paise: 3835000, // Paid in full
      status: 'PAID',
      lines: [
        {
          id: 1,
          invoice_id: 1,
          product_id: 1,
          description: 'Brightloop Core Platform (Production Tier)',
          quantity: 1,
          unit_price_paise: 2500000,
          tax_rate_bps: 1800,
          line_total_paise: 2950000,
        },
        {
          id: 2,
          invoice_id: 1,
          product_id: 2,
          description: 'Advanced Analytics Addon',
          quantity: 1,
          unit_price_paise: 750000,
          tax_rate_bps: 1800,
          line_total_paise: 885000,
        },
      ],
    },
    {
      id: 2,
      invoice_number: 'INV-2026-002',
      subscription_id: 2,
      customer_id: 2,
      billing_period_start: '2026-09-15',
      billing_period_end: '2026-10-15',
      issued_date: '2026-09-15',
      due_date: '2026-09-22', // Already passed! Overdue!
      billing_name: 'BluePeak Logistics',
      billing_email: 'finance@bluepeak.in',
      billing_phone: '+91 98112 23344',
      billing_address: 'Level 5, Express Towers, Nariman Point, Mumbai',
      subtotal_paise: 3500000,
      discount_paise: 0,
      tax_paise: 630000,
      total_paise: 4130000, // ₹41,300
      paid_amount_paise: 0, // Unpaid
      status: 'CONFIRMED',
      lines: [
        {
          id: 3,
          invoice_id: 2,
          product_id: 1,
          description: 'Brightloop Core Platform',
          quantity: 1,
          unit_price_paise: 2500000,
          tax_rate_bps: 1800,
          line_total_paise: 2950000,
        },
        {
          id: 4,
          invoice_id: 2,
          product_id: 3,
          description: '24/7 Dedicated Support (Primary Tier)',
          quantity: 1,
          unit_price_paise: 1000000,
          tax_rate_bps: 1800,
          line_total_paise: 1180000,
        },
      ],
    },
  ],
  payments: [
    {
      id: 1,
      invoice_id: 1,
      method: 'UPI',
      amount_paise: 3835000,
      paid_at: '2026-09-02T14:22:00Z',
      note: 'UPI Reference: 425619882103',
    },
  ],
};

function getStore(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return SEED_DATA;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_DATA;
  }
}

function saveStore(data: StoredData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export const storageAdapter = {
  // Auth
  login(email: string): User | null {
    const store = getStore();
    const user = store.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    return user || null;
  },

  getUsers(): User[] {
    return getStore().users;
  },

  // Customers
  getCustomers(): Customer[] {
    return getStore().customers;
  },

  getCustomerById(id: number): Customer | null {
    return getStore().customers.find((c) => c.id === id) || null;
  },

  createCustomer(data: Omit<Customer, 'id' | 'created_at'>): Customer {
    const store = getStore();
    const nextId =
      store.customers.length > 0
        ? Math.max(...store.customers.map((c) => c.id)) + 1
        : 1;
    const newCustomer: Customer = {
      ...data,
      id: nextId,
      created_at: new Date().toISOString(),
    };
    store.customers.unshift(newCustomer);
    saveStore(store);
    return newCustomer;
  },

  updateCustomer(id: number, data: Partial<Customer>): Customer {
    const store = getStore();
    const idx = store.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Customer ${id} not found`);
    store.customers[idx] = { ...store.customers[idx], ...data };
    saveStore(store);
    return store.customers[idx];
  },

  // Products
  getProducts(): Product[] {
    return getStore().products;
  },

  getProductById(id: number): Product | null {
    return getStore().products.find((p) => p.id === id) || null;
  },

  createProduct(data: Omit<Product, 'id'>): Product {
    const store = getStore();
    const nextId =
      store.products.length > 0
        ? Math.max(...store.products.map((p) => p.id)) + 1
        : 1;
    const newProduct: Product = { ...data, id: nextId };
    store.products.unshift(newProduct);
    saveStore(store);
    return newProduct;
  },

  updateProduct(id: number, data: Partial<Product>): Product {
    const store = getStore();
    const idx = store.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Product ${id} not found`);
    store.products[idx] = { ...store.products[idx], ...data };
    saveStore(store);
    return store.products[idx];
  },

  // Plans
  getPlans(): Plan[] {
    return getStore().plans;
  },

  getPlanById(id: number): Plan | null {
    return getStore().plans.find((p) => p.id === id) || null;
  },

  createPlan(data: Omit<Plan, 'id'>): Plan {
    const store = getStore();
    const nextId =
      store.plans.length > 0
        ? Math.max(...store.plans.map((p) => p.id)) + 1
        : 1;
    const newPlan: Plan = { ...data, id: nextId };
    store.plans.unshift(newPlan);
    saveStore(store);
    return newPlan;
  },

  updatePlan(id: number, data: Partial<Plan>): Plan {
    const store = getStore();
    const idx = store.plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Plan ${id} not found`);
    store.plans[idx] = { ...store.plans[idx], ...data };
    saveStore(store);
    return store.plans[idx];
  },

  // Subscriptions
  getSubscriptions(customerId?: number): Subscription[] {
    const store = getStore();
    const subs = store.subscriptions.map((s) => ({
      ...s,
      customer: store.customers.find((c) => c.id === s.customer_id),
      plan: store.plans.find((p) => p.id === s.plan_id),
      lines: s.lines.map((l) => ({
        ...l,
        product: store.products.find((p) => p.id === l.product_id),
      })),
    }));

    if (customerId) {
      return subs.filter((s) => s.customer_id === customerId);
    }
    return subs;
  },

  getSubscriptionById(id: number): Subscription | null {
    const subs = this.getSubscriptions();
    return subs.find((s) => s.id === id) || null;
  },

  createSubscription(
    data: Omit<Subscription, 'id' | 'subscription_number' | 'status'> & {
      status?: SubscriptionStatus;
    }
  ): Subscription {
    const store = getStore();
    const nextId =
      store.subscriptions.length > 0
        ? Math.max(...store.subscriptions.map((s) => s.id)) + 1
        : 1;
    const year = new Date().getFullYear();
    const subNumber = `SUB-${year}-${nextId.toString().padStart(3, '0')}`;

    const newSub: Subscription = {
      ...data,
      id: nextId,
      subscription_number: subNumber,
      status: data.status || 'DRAFT',
      lines: data.lines.map((l, i) => ({
        ...l,
        id: nextId * 100 + i + 1,
        subscription_id: nextId,
      })),
    };

    store.subscriptions.unshift(newSub);
    saveStore(store);
    return this.getSubscriptionById(nextId)!;
  },

  /**
   * Transition subscription status following backend state machine:
   * DRAFT -> QUOTATION
   * QUOTATION -> CONFIRMED, DRAFT
   * CONFIRMED -> ACTIVE, CLOSED
   * ACTIVE -> CLOSED
   * CLOSED -> None
   */
  transitionSubscriptionStatus(
    id: number,
    newStatus: SubscriptionStatus,
    _actorRole: UserRole
  ): Subscription {
    const store = getStore();
    const idx = store.subscriptions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Subscription ${id} not found`);

    const sub = store.subscriptions[idx];
    const current = sub.status;

    const allowedTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
      DRAFT: ['QUOTATION'],
      QUOTATION: ['CONFIRMED', 'DRAFT'],
      CONFIRMED: ['ACTIVE', 'CLOSED'],
      ACTIVE: ['CLOSED'],
      CLOSED: [],
    };

    if (!allowedTransitions[current].includes(newStatus)) {
      throw new Error(`Cannot transition subscription from ${current} to ${newStatus}`);
    }

    sub.status = newStatus;

    // When transitioning to ACTIVE, automatically generate first invoice if not already generated
    if (newStatus === 'ACTIVE') {
      const hasInvoice = store.invoices.some((inv) => inv.subscription_id === sub.id);
      if (!hasInvoice) {
        saveStore(store); // save status first
        this.generateInvoiceForSubscription(sub.id);
        return this.getSubscriptionById(id)!;
      }
    }

    saveStore(store);
    return this.getSubscriptionById(id)!;
  },

  // Invoices
  getInvoices(customerId?: number): Invoice[] {
    const store = getStore();
    const invoices = store.invoices.map((inv) => ({
      ...inv,
      customer: store.customers.find((c) => c.id === inv.customer_id),
      subscription: store.subscriptions.find((s) => s.id === inv.subscription_id),
    }));

    if (customerId) {
      return invoices.filter((i) => i.customer_id === customerId);
    }
    return invoices;
  },

  getInvoiceById(id: number): Invoice | null {
    const invoices = this.getInvoices();
    return invoices.find((i) => i.id === id) || null;
  },

  generateInvoiceForSubscription(subscriptionId: number): Invoice {
    const store = getStore();
    const sub = store.subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) throw new Error(`Subscription ${subscriptionId} not found`);

    const customer = store.customers.find((c) => c.id === sub.customer_id);
    if (!customer) throw new Error(`Customer for subscription not found`);

    // Guard duplicate invoices for the current period
    const existing = store.invoices.find(
      (inv) =>
        inv.subscription_id === sub.id &&
        inv.billing_period_start === sub.start_date
    );
    if (existing) {
      throw new Error(
        `Invoice ${existing.invoice_number} already exists for this subscription billing period.`
      );
    }

    const nextId =
      store.invoices.length > 0
        ? Math.max(...store.invoices.map((i) => i.id)) + 1
        : 1;
    const year = new Date().getFullYear();
    const invNumber = `INV-${year}-${nextId.toString().padStart(3, '0')}`;

    let subtotalPaise = 0;
    let totalTaxPaise = 0;

    const invoiceLines = sub.lines.map((l, index) => {
      const product = store.products.find((p) => p.id === l.product_id);
      const effectiveUnitPrice = l.unit_price_paise + (l.price_adjustment_paise || 0);
      const lineSubtotal = effectiveUnitPrice * l.quantity;
      const tax = calculateTaxPaise(lineSubtotal, l.tax_rate_bps);
      const lineTotal = lineSubtotal + tax;

      subtotalPaise += lineSubtotal;
      totalTaxPaise += tax;

      return {
        id: nextId * 100 + index + 1,
        invoice_id: nextId,
        product_id: l.product_id,
        description:
          l.variant_name && product
            ? `${product.name} (${l.variant_name})`
            : product?.name || `Product #${l.product_id}`,
        quantity: l.quantity,
        unit_price_paise: effectiveUnitPrice,
        tax_rate_bps: l.tax_rate_bps,
        line_subtotal_paise: lineSubtotal,
        tax_amount_paise: tax,
        line_total_paise: lineTotal,
      };
    });

    const totalPaise = subtotalPaise + totalTaxPaise;

    // Calculate due date based on payment terms
    const issuedDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (sub.payment_terms_days || 0));

    const newInvoice: Invoice = {
      id: nextId,
      invoice_number: invNumber,
      subscription_id: sub.id,
      customer_id: customer.id,
      billing_period_start: sub.start_date,
      billing_period_end:
        sub.next_billing_date ||
        new Date(issuedDate.setMonth(issuedDate.getMonth() + 1)).toISOString().split('T')[0],
      issued_date: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      billing_name: customer.name,
      billing_email: customer.billing_email,
      billing_phone: customer.phone,
      billing_address: customer.address,
      subtotal_paise: subtotalPaise,
      discount_paise: 0,
      tax_paise: totalTaxPaise,
      total_paise: totalPaise,
      paid_amount_paise: 0,
      status: 'CONFIRMED',
      lines: invoiceLines,
    };

    store.invoices.unshift(newInvoice);
    saveStore(store);
    return this.getInvoiceById(nextId)!;
  },

  // Payments
  getPayments(invoiceId?: number): Payment[] {
    const store = getStore();
    const payments = store.payments.map((p) => ({
      ...p,
      invoice: store.invoices.find((i) => i.id === p.invoice_id),
    }));

    if (invoiceId) {
      return payments.filter((p) => p.invoice_id === invoiceId);
    }
    return payments;
  },

  recordPayment(data: {
    invoice_id: number;
    amount_paise: number;
    method: Payment['method'];
    note?: string | null;
  }): Payment {
    const store = getStore();
    const invIdx = store.invoices.findIndex((i) => i.id === data.invoice_id);
    if (invIdx === -1) throw new Error(`Invoice ${data.invoice_id} not found`);

    const invoice = store.invoices[invIdx];
    const outstanding = invoice.total_paise - invoice.paid_amount_paise;

    if (data.amount_paise <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    if (data.amount_paise > outstanding) {
      throw new Error(
        `Payment amount (₹${(data.amount_paise / 100).toFixed(2)}) exceeds outstanding balance (₹${(outstanding / 100).toFixed(2)})`
      );
    }

    const nextId =
      store.payments.length > 0
        ? Math.max(...store.payments.map((p) => p.id)) + 1
        : 1;

    const newPayment: Payment = {
      id: nextId,
      invoice_id: data.invoice_id,
      amount_paise: data.amount_paise,
      method: data.method,
      note: data.note || null,
      paid_at: new Date().toISOString(),
    };

    // Update invoice balance and status
    invoice.paid_amount_paise += data.amount_paise;
    if (invoice.paid_amount_paise >= invoice.total_paise) {
      invoice.status = 'PAID';
    }

    store.payments.unshift(newPayment);
    saveStore(store);
    return newPayment;
  },

  // Dashboard summary
  getDashboardSummary(period: 'all' | 'month' | 'year' = 'all'): DashboardSummary {
    const store = getStore();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const activeSubs = store.subscriptions.filter((s) => s.status === 'ACTIVE').length;

    let filteredPayments = store.payments;
    let filteredInvoices = store.invoices;

    if (period === 'month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      filteredPayments = store.payments.filter((p) => {
        const d = new Date(p.paid_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      filteredInvoices = store.invoices.filter((i) => {
        const d = new Date(i.issued_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else if (period === 'year') {
      const currentYear = now.getFullYear();
      filteredPayments = store.payments.filter((p) => {
        const d = new Date(p.paid_at);
        return d.getFullYear() === currentYear;
      });
      filteredInvoices = store.invoices.filter((i) => {
        const d = new Date(i.issued_date);
        return d.getFullYear() === currentYear;
      });
    }

    const totalRevenuePaise = filteredPayments.reduce(
      (acc, p) => acc + p.amount_paise,
      0
    );

    let outstandingPaise = 0;
    let overdueCount = 0;
    let overduePaise = 0;

    for (const inv of filteredInvoices) {
      if (inv.status !== 'CANCELLED') {
        const balance = inv.total_paise - inv.paid_amount_paise;
        if (balance > 0) {
          outstandingPaise += balance;
          if (inv.due_date < todayStr) {
            overdueCount++;
            overduePaise += balance;
          }
        }
      }
    }

    return {
      active_subscriptions: activeSubs,
      total_revenue_paise: totalRevenuePaise,
      outstanding_paise: outstandingPaise,
      overdue_invoices_count: overdueCount,
      overdue_paise: overduePaise,
      period,
      recent_invoices: this.getInvoices().slice(0, 5),
      recent_payments: this.getPayments().slice(0, 5),
    };
  },

  // Reset store to initial state
  resetStore(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
  },
};
