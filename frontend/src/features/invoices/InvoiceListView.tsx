import React from 'react';
import type { Invoice } from '../../types';
import { formatCurrency, isInvoiceOverdue } from '../../utils/formatters';
import { CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';

interface InvoiceListViewProps {
  invoices: Invoice[];
  onSelectInvoice: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
}

export function InvoiceListView({
  invoices,
  onSelectInvoice,
  onRecordPayment
}: InvoiceListViewProps) {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Invoices & Collections</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Snapshotted historical prices, GST tax calculations, and payment tracking
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Invoice #</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5">Total (with GST)</th>
                <th className="px-5 py-3.5">Paid / Due</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoices.map((inv) => {
                const balance = inv.totalPaise - inv.paidAmountPaise;
                const overdue = isInvoiceOverdue(inv);

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{inv.number}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{inv.customerName}</div>
                      <div className="text-[11px] text-slate-400">{inv.customerEmail}</div>
                    </td>
                    <td className="px-5 py-4">
                      {inv.billingPeriodStart} to {inv.billingPeriodEnd}
                    </td>
                    <td className="px-5 py-4">
                      <span className={overdue ? 'font-bold text-rose-600' : ''}>{inv.dueDate}</span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-900">{formatCurrency(inv.totalPaise)}</td>
                    <td className="px-5 py-4">
                      <div className="text-emerald-700 font-medium">Paid: {formatCurrency(inv.paidAmountPaise)}</div>
                      {balance > 0 && (
                        <div className="text-amber-600 font-semibold">Due: {formatCurrency(balance)}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(inv)}</td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      >
                        Preview
                      </button>
                      {balance > 0 && (
                        <button
                          onClick={() => onRecordPayment(inv)}
                          className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
