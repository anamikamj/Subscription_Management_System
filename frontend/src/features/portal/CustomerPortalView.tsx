import React from 'react';
import type { Subscription, Invoice, Plan } from '../../types';
import { formatCurrency, getSubscriptionStatusBadgeClasses, isInvoiceOverdue } from '../../utils/formatters';
import { Layers, Receipt, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface CustomerPortalViewProps {
  customerName: string;
  subscriptions: Subscription[];
  invoices: Invoice[];
  plans: Plan[];
  onSelectInvoice: (invoice: Invoice) => void;
}

export function CustomerPortalView({
  customerName,
  subscriptions,
  invoices,
  plans,
  onSelectInvoice
}: CustomerPortalViewProps) {
  const getStatusBadge = (invoice: Invoice) => {
    const overdue = isInvoiceOverdue(invoice);

    if (invoice.status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Paid
        </span>
      );
    }
    if (overdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5" /> Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5" /> Confirmed
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          Customer Portal
        </span>
        <h2 className="text-2xl font-bold text-slate-900 mt-2">Welcome, {customerName}</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review your active software licenses, upcoming renewals, and tax invoices.
        </p>
      </div>

      {/* Subscriptions */}
      <div>
        <h3 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          My Subscriptions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subscriptions.map((sub) => {
            const plan = plans.find((p) => p.id === sub.planId);
            return (
              <div key={sub.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{sub.number}</span>
                  <span
                    className={`text-[11px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getSubscriptionStatusBadgeClasses(
                      sub.status
                    )}`}
                  >
                    {sub.status}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="text-slate-800 font-semibold">{plan?.name}</div>
                  <div className="text-slate-500">Next Renewal: {sub.nextBillingDate}</div>
                </div>
                <div className="pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 font-medium">Included Products:</span>
                  <ul className="mt-1 space-y-1">
                    {sub.lines.map((l) => (
                      <li key={l.id} className="flex justify-between text-slate-600">
                        <span>
                          {l.productName} × {l.quantity}
                        </span>
                        <span className="font-medium">{formatCurrency(l.unitPricePaise * l.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h3 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-600" />
          My Invoices & Payment History
        </h3>
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Invoice #</th>
                <th className="px-5 py-3">Billing Period</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-5 py-3.5 font-bold text-slate-900">{inv.number}</td>
                  <td className="px-5 py-3.5">
                    {inv.billingPeriodStart} to {inv.billingPeriodEnd}
                  </td>
                  <td className="px-5 py-3.5">{inv.dueDate}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900">{formatCurrency(inv.totalPaise)}</td>
                  <td className="px-5 py-3.5 text-emerald-600 font-semibold">{formatCurrency(inv.paidAmountPaise)}</td>
                  <td className="px-5 py-3.5">{getStatusBadge(inv)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onSelectInvoice(inv)}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
