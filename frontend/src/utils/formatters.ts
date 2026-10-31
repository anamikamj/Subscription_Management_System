import type { BillingCadence, InvoiceStatus, SubscriptionStatus } from '../types';

/**
 * Formats an integer amount of paise into Indian Rupee (INR) representation.
 * E.g. 250000 -> "₹2,500.00" or "₹2,500"
 */
export function formatPaiseToINR(
  paise: number | undefined | null,
  includeDecimals: boolean = true
): string {
  if (paise === undefined || paise === null || isNaN(paise)) {
    return '₹0.00';
  }

  const sign = paise < 0 ? '-' : '';
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;

  // Indian number formatting: last 3 digits, then groups of 2
  const rupeesStr = rupees.toString();
  let formattedRupees = '';

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.substring(rupeesStr.length - 3);
    const otherNumbers = rupeesStr.substring(0, rupeesStr.length - 3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${withCommas},${lastThree}`;
  }

  if (!includeDecimals && remainder === 0) {
    return `${sign}₹${formattedRupees}`;
  }

  const cents = remainder.toString().padStart(2, '0');
  return `${sign}₹${formattedRupees}.${cents}`;
}

/**
 * Converts user entered Rupee string or number into integer paise.
 */
export function inrToPaise(value: string | number): number {
  if (typeof value === 'number') {
    return Math.round(value * 100);
  }
  const clean = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Format ISO date string (YYYY-MM-DD) to friendly format (DD MMM YYYY).
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format ISO date/time string.
 */
export function formatDateTime(dateTimeStr?: string | null): string {
  if (!dateTimeStr) return '—';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTimeStr;
  }
}

/**
 * Format Billing Cadence for display.
 */
export function formatCadence(cadence?: BillingCadence): string {
  switch (cadence) {
    case 'DAILY':
      return 'Daily';
    case 'WEEKLY':
      return 'Weekly';
    case 'MONTHLY':
      return 'Monthly';
    case 'YEARLY':
      return 'Yearly';
    default:
      return cadence || '—';
  }
}

/**
 * Return CSS badge styles for subscription statuses.
 */
export function getSubscriptionStatusStyle(status: SubscriptionStatus): {
  bg: string;
  color: string;
  border: string;
  label: string;
} {
  switch (status) {
    case 'DRAFT':
      return {
        bg: '#f1f5f9',
        color: '#475569',
        border: '#cbd5e1',
        label: 'Draft',
      };
    case 'QUOTATION':
      return {
        bg: '#eff6ff',
        color: '#2563eb',
        border: '#bfdbfe',
        label: 'Quotation',
      };
    case 'CONFIRMED':
      return {
        bg: '#fdf4ff',
        color: '#9333ea',
        border: '#f5d0fe',
        label: 'Confirmed',
      };
    case 'ACTIVE':
      return {
        bg: '#ecfdf5',
        color: '#059669',
        border: '#a7f3d0',
        label: 'Active',
      };
    case 'CLOSED':
      return {
        bg: '#fef2f2',
        color: '#dc2626',
        border: '#fecaca',
        label: 'Closed',
      };
    default:
      return {
        bg: '#f1f5f9',
        color: '#64748b',
        border: '#e2e8f0',
        label: status,
      };
  }
}

/**
 * Return CSS badge styles for invoice statuses.
 */
export function getInvoiceStatusStyle(
  status: InvoiceStatus,
  dueDate?: string,
  outstandingPaise?: number
): {
  bg: string;
  color: string;
  border: string;
  label: string;
  isOverdue: boolean;
} {
  const isOverdue =
    status !== 'PAID' &&
    status !== 'CANCELLED' &&
    !!dueDate &&
    new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0)) &&
    (outstandingPaise === undefined || outstandingPaise > 0);

  if (isOverdue) {
    return {
      bg: '#fff1f2',
      color: '#e11d48',
      border: '#fecdd3',
      label: 'Overdue',
      isOverdue: true,
    };
  }

  switch (status) {
    case 'PAID':
      return {
        bg: '#ecfdf5',
        color: '#059669',
        border: '#a7f3d0',
        label: 'Paid',
        isOverdue: false,
      };
    case 'CONFIRMED':
      return {
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
        label: 'Confirmed',
        isOverdue: false,
      };
    case 'DRAFT':
      return {
        bg: '#f8fafc',
        color: '#64748b',
        border: '#e2e8f0',
        label: 'Draft',
        isOverdue: false,
      };
    case 'CANCELLED':
      return {
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
        label: 'Cancelled',
        isOverdue: false,
      };
    default:
      return {
        bg: '#f1f5f9',
        color: '#64748b',
        border: '#e2e8f0',
        label: status,
        isOverdue: false,
      };
  }
}

/**
 * Half-up tax calculation matching backend utils.
 */
export function calculateTaxPaise(taxablePaise: number, taxRateBps: number): number {
  if (taxRateBps <= 0 || taxablePaise <= 0) return 0;
  // tax = round(taxablePaise * taxRateBps / 10000)
  return Math.round((taxablePaise * taxRateBps) / 10000);
}
