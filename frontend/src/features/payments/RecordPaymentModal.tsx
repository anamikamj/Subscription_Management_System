import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import type { Invoice, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface RecordPaymentModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onSubmit: (data: { amountPaise: number; method: PaymentMethod; note?: string }) => void;
}

export function RecordPaymentModal({
  invoice,
  onClose,
  onSubmit
}: RecordPaymentModalProps) {
  if (!invoice) return null;

  const balancePaise = invoice.totalPaise - invoice.paidAmountPaise;
  const [amountRupees, setAmountRupees] = useState<string>((balancePaise / 100).toString());
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountRupees);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a positive payment amount.');
      return;
    }
    const enteredPaise = Math.round(val * 100);
    if (enteredPaise > balancePaise) {
      setError(`Payment cannot exceed outstanding balance (${formatCurrency(balancePaise)}).`);
      return;
    }

    onSubmit({
      amountPaise: enteredPaise,
      method,
      note
    });
    onClose();
  };

  return (
    <Modal
      isOpen={!!invoice}
      onClose={onClose}
      title="Record Payment"
      subtitle={`Invoice: ${invoice.number} · ${invoice.customerName}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Financial Summary */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Total Invoiced:</span>
            <span className="font-semibold text-slate-900">{formatCurrency(invoice.totalPaise)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Previously Paid:</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(invoice.paidAmountPaise)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900">
            <span>Outstanding Balance:</span>
            <span className="text-rose-600">{formatCurrency(balancePaise)}</span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">₹</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={balancePaise / 100}
              value={amountRupees}
              onChange={(e) => {
                setAmountRupees(e.target.value);
                setError('');
              }}
              required
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="BANK_TRANSFER">Bank Wire / RTGS / NEFT</option>
            <option value="UPI">UPI (Instant Transfer)</option>
            <option value="CREDIT_CARD">Credit / Debit Card</option>
            <option value="CASH">Cheque / Direct Cash</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Payment Reference / Note</label>
          <input
            type="text"
            placeholder="e.g. UTR ref, Bank slip number"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
          >
            Confirm Settlement
          </button>
        </div>
      </form>
    </Modal>
  );
}
