import type { SubscriptionStatus, InvoiceStatus } from '../types';

export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(rupees);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function isInvoiceOverdue(invoice: { status: InvoiceStatus; dueDate: string }): boolean {
  if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') return false;
  const today = new Date().toISOString().split('T')[0];
  return invoice.dueDate < today;
}

export function getSubscriptionStatusBadgeClasses(status: SubscriptionStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'QUOTATION':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'CLOSED':
      return 'bg-rose-100 text-rose-800 border-rose-200';
  }
}
