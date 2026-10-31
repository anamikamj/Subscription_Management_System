/**
 * Centralized API client for Brightloop REST endpoints.
 * Targets /api base URL with JWT auth bearer header.
 * If backend endpoints are not mounted, falls back safely to isolated storage adapter
 * while transparently exposing the integration status to the UI.
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
} from '../../types';
import { storageAdapter } from './storageAdapter';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

export type IntegrationMode = 'live_backend' | 'isolated_adapter';

let currentIntegrationMode: IntegrationMode = 'isolated_adapter';
const listeners: Array<(mode: IntegrationMode) => void> = [];

export function getIntegrationMode(): IntegrationMode {
  return currentIntegrationMode;
}

export function subscribeIntegrationMode(
  callback: (mode: IntegrationMode) => void
): () => void {
  listeners.push(callback);
  callback(currentIntegrationMode);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function setIntegrationMode(mode: IntegrationMode) {
  if (currentIntegrationMode !== mode) {
    currentIntegrationMode = mode;
    listeners.forEach((cb) => cb(mode));
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('brightloop_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data?: T; status: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...options.headers,
      },
    });

    if (res.ok) {
      setIntegrationMode('live_backend');
      const data = await res.json();
      return { ok: true, data, status: res.status };
    }

    // If 404, the route does not exist yet on backend
    if (res.status === 404) {
      setIntegrationMode('isolated_adapter');
      return { ok: false, status: 404 };
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Request failed with status ${res.status}`);
  } catch {
    // Network failure (backend offline or route missing)
    setIntegrationMode('isolated_adapter');
    return { ok: false, status: 0 };
  }
}

// ----------------------------------------------------
// Authentication API
// ----------------------------------------------------
export const authApi = {
  async login(email: string, password?: string): Promise<{ token: string; user: User }> {
    const req = await request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: password || 'demo123' }),
    });

    if (req.ok && req.data) {
      localStorage.setItem('brightloop_token', req.data.access_token);
      return { token: req.data.access_token, user: req.data.user };
    }

    // Isolated adapter fallback
    const user = storageAdapter.login(email);
    if (!user) {
      throw new Error('User not found. Use one of the seeded demo accounts.');
    }
    const token = `adapter_token_${user.id}_${Date.now()}`;
    localStorage.setItem('brightloop_token', token);
    return { token, user };
  },

  async getMe(): Promise<User | null> {
    const req = await request<User>('/auth/me');
    if (req.ok && req.data) return req.data;

    // Check stored user from adapter
    const savedUserStr = localStorage.getItem('brightloop_current_user');
    if (savedUserStr) {
      try {
        return JSON.parse(savedUserStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  logout(): void {
    localStorage.removeItem('brightloop_token');
    localStorage.removeItem('brightloop_current_user');
  },
};

// ----------------------------------------------------
// Customer API
// ----------------------------------------------------
export const customerApi = {
  async getAll(): Promise<Customer[]> {
    const req = await request<Customer[]>('/customers');
    if (req.ok && req.data) return req.data;
    return storageAdapter.getCustomers();
  },

  async getById(id: number): Promise<Customer> {
    const req = await request<Customer>(`/customers/${id}`);
    if (req.ok && req.data) return req.data;
    const cust = storageAdapter.getCustomerById(id);
    if (!cust) throw new Error('Customer not found');
    return cust;
  },

  async create(data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const req = await request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (req.ok && req.data) return req.data;
    return storageAdapter.createCustomer(data);
  },

  async update(id: number, data: Partial<Customer>): Promise<Customer> {
    const req = await request<Customer>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (req.ok && req.data) return req.data;
    return storageAdapter.updateCustomer(id, data);
  },
};

// ----------------------------------------------------
// Product API
// ----------------------------------------------------
export const productApi = {
  async getAll(): Promise<Product[]> {
    const req = await request<Product[]>('/products');
    if (req.ok && req.data) return req.data;
    return storageAdapter.getProducts();
  },

  async getById(id: number): Promise<Product> {
    const req = await request<Product>(`/products/${id}`);
    if (req.ok && req.data) return req.data;
    const p = storageAdapter.getProductById(id);
    if (!p) throw new Error('Product not found');
    return p;
  },

  async create(data: Omit<Product, 'id'>): Promise<Product> {
    const req = await request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (req.ok && req.data) return req.data;
    return storageAdapter.createProduct(data);
  },

  async update(id: number, data: Partial<Product>): Promise<Product> {
    const req = await request<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (req.ok && req.data) return req.data;
    return storageAdapter.updateProduct(id, data);
  },
};

// ----------------------------------------------------
// Plan API
// ----------------------------------------------------
export const planApi = {
  async getAll(): Promise<Plan[]> {
    const req = await request<Plan[]>('/plans');
    if (req.ok && req.data) return req.data;
    return storageAdapter.getPlans();
  },

  async getById(id: number): Promise<Plan> {
    const req = await request<Plan>(`/plans/${id}`);
    if (req.ok && req.data) return req.data;
    const p = storageAdapter.getPlanById(id);
    if (!p) throw new Error('Plan not found');
    return p;
  },

  async create(data: Omit<Plan, 'id'>): Promise<Plan> {
    const req = await request<Plan>('/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (req.ok && req.data) return req.data;
    return storageAdapter.createPlan(data);
  },

  async update(id: number, data: Partial<Plan>): Promise<Plan> {
    const req = await request<Plan>(`/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (req.ok && req.data) return req.data;
    return storageAdapter.updatePlan(id, data);
  },
};

// ----------------------------------------------------
// Subscription API
// ----------------------------------------------------
export const subscriptionApi = {
  async getAll(customerId?: number): Promise<Subscription[]> {
    const url = customerId ? `/subscriptions?customer_id=${customerId}` : '/subscriptions';
    const req = await request<Subscription[]>(url);
    if (req.ok && req.data) return req.data;
    return storageAdapter.getSubscriptions(customerId);
  },

  async getById(id: number): Promise<Subscription> {
    const req = await request<Subscription>(`/subscriptions/${id}`);
    if (req.ok && req.data) return req.data;
    const sub = storageAdapter.getSubscriptionById(id);
    if (!sub) throw new Error('Subscription not found');
    return sub;
  },

  async create(
    data: Omit<Subscription, 'id' | 'subscription_number' | 'status'> & {
      status?: SubscriptionStatus;
    }
  ): Promise<Subscription> {
    const req = await request<Subscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (req.ok && req.data) return req.data;
    return storageAdapter.createSubscription(data);
  },

  async updateStatus(
    id: number,
    newStatus: SubscriptionStatus,
    role: User['role']
  ): Promise<Subscription> {
    const req = await request<Subscription>(`/subscriptions/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: newStatus }),
    });
    if (req.ok && req.data) return req.data;
    return storageAdapter.transitionSubscriptionStatus(id, newStatus, role);
  },
};

// ----------------------------------------------------
// Invoice API
// ----------------------------------------------------
export const invoiceApi = {
  async getAll(customerId?: number): Promise<Invoice[]> {
    const url = customerId ? `/invoices?customer_id=${customerId}` : '/invoices';
    const req = await request<Invoice[]>(url);
    if (req.ok && req.data) return req.data;
    return storageAdapter.getInvoices(customerId);
  },

  async getById(id: number): Promise<Invoice> {
    const req = await request<Invoice>(`/invoices/${id}`);
    if (req.ok && req.data) return req.data;
    const inv = storageAdapter.getInvoiceById(id);
    if (!inv) throw new Error('Invoice not found');
    return inv;
  },

  async generateFromSubscription(subscriptionId: number): Promise<Invoice> {
    const req = await request<Invoice>(
      `/subscriptions/${subscriptionId}/generate-invoice`,
      { method: 'POST' }
    );
    if (req.ok && req.data) return req.data;
    return storageAdapter.generateInvoiceForSubscription(subscriptionId);
  },
};

// ----------------------------------------------------
// Payment API
// ----------------------------------------------------
export const paymentApi = {
  async getAll(invoiceId?: number): Promise<Payment[]> {
    const url = invoiceId ? `/invoices/${invoiceId}/payments` : '/payments';
    const req = await request<Payment[]>(url);
    if (req.ok && req.data) return req.data;
    return storageAdapter.getPayments(invoiceId);
  },

  async record(data: {
    invoice_id: number;
    amount_paise: number;
    method: Payment['method'];
    note?: string | null;
  }): Promise<Payment> {
    const req = await request<Payment>(`/invoices/${data.invoice_id}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        method: data.method,
        amount: data.amount_paise,
        note: data.note,
      }),
    });
    if (req.ok && req.data) return req.data;
    return storageAdapter.recordPayment(data);
  },
};

// ----------------------------------------------------
// Dashboard API
// ----------------------------------------------------
export const dashboardApi = {
  async getSummary(period: 'all' | 'month' | 'year' = 'all'): Promise<DashboardSummary> {
    const req = await request<DashboardSummary>(`/dashboard/summary?period=${period}`);
    if (req.ok && req.data) return req.data;
    return storageAdapter.getDashboardSummary(period);
  },
};
