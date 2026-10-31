import type {
  User,
  Customer,
  Product,
  Plan,
  Subscription,
  SubscriptionStatus,
  Invoice,
  Payment,
  DashboardSummary,
  PaymentMethod
} from '../../types';

class ApiClient {
  private token: string | null = null;
  private baseUrl: string = '/api';

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(errorData.detail || `HTTP Error ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/dashboard/summary');
  }

  // Subscriptions
  async getSubscriptions(): Promise<Subscription[]> {
    return this.request<Subscription[]>('/subscriptions');
  }

  async createSubscription(data: {
    customerId: string;
    planId: string;
    startDate: string;
    paymentTermsDays: number;
    lines: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPricePaise: number;
      taxRatePercent: number;
      discountPaise?: number;
    }>;
  }): Promise<Subscription> {
    return this.request<Subscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async transitionSubscription(id: string, targetStatus: SubscriptionStatus): Promise<Subscription> {
    return this.request<Subscription>(`/subscriptions/${id}/transition`, {
      method: 'PATCH',
      body: JSON.stringify({ targetStatus })
    });
  }

  async generateInvoice(subscriptionId: string): Promise<Invoice> {
    return this.request<Invoice>(`/subscriptions/${subscriptionId}/generate-invoice`, {
      method: 'POST'
    });
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return this.request<Invoice[]>('/invoices');
  }

  async getInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}`);
  }

  async recordPayment(
    invoiceId: string,
    data: { amountPaise: number; method: PaymentMethod; note?: string }
  ): Promise<{ payment: Payment; invoice: Invoice }> {
    return this.request<{ payment: Payment; invoice: Invoice }>(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return this.request<Customer[]>('/customers');
  }

  async createCustomer(data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    address?: string;
  }): Promise<Customer> {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Catalog
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  async getPlans(): Promise<Plan[]> {
    return this.request<Plan[]>('/plans');
  }
}

export const apiClient = new ApiClient();
