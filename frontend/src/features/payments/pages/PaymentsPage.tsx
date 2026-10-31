import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { invoiceApi, paymentApi } from '../../../services/api/client';
import type { Invoice, Payment, PaymentMethod } from '../../../types';
import { formatDateTime, formatPaiseToINR, inrToPaise } from '../../../utils/formatters';

export const PaymentsPage: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New payment modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number>(0);
  const [paymentAmountInr, setPaymentAmountInr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRecord = role === 'ADMIN' || role === 'STAFF';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allPayments, allInvoices] = await Promise.all([
        paymentApi.getAll(),
        invoiceApi.getAll(),
      ]);
      setPayments(allPayments);
      setInvoices(allInvoices);
    } catch (err: any) {
      showToast(err.message || 'Failed to load payments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const eligibleInvoices = invoices.filter(
    (i) => i.total_paise - i.paid_amount_paise > 0 && i.status !== 'CANCELLED'
  );

  const openCreateModal = () => {
    if (eligibleInvoices.length > 0) {
      const first = eligibleInvoices[0];
      setSelectedInvoiceId(first.id);
      const outstanding = first.total_paise - first.paid_amount_paise;
      setPaymentAmountInr((outstanding / 100).toFixed(2));
    } else {
      setSelectedInvoiceId(0);
      setPaymentAmountInr('');
    }
    setPaymentMethod('UPI');
    setPaymentNote('');
    setIsModalOpen(true);
  };

  const handleInvoiceChange = (id: number) => {
    setSelectedInvoiceId(id);
    const target = invoices.find((i) => i.id === id);
    if (target) {
      const outstanding = target.total_paise - target.paid_amount_paise;
      setPaymentAmountInr((outstanding / 100).toFixed(2));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      showToast('Please select an invoice with an outstanding balance', 'warning');
      return;
    }

    const amountPaise = inrToPaise(paymentAmountInr);
    const targetInvoice = invoices.find((i) => i.id === selectedInvoiceId);
    if (!targetInvoice) return;

    const outstanding = targetInvoice.total_paise - targetInvoice.paid_amount_paise;
    if (amountPaise <= 0) {
      showToast('Amount must be greater than zero', 'warning');
      return;
    }
    if (amountPaise > outstanding) {
      showToast(
        `Amount cannot exceed outstanding balance of ${formatPaiseToINR(outstanding)}`,
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await paymentApi.record({
        invoice_id: selectedInvoiceId,
        amount_paise: amountPaise,
        method: paymentMethod,
        note: paymentNote.trim() || null,
      });

      showToast('Manual payment recorded successfully!', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Payment recording failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Payment History & Settlements
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Auditable log of cash collections, card settlements, bank transfers, and UPI receipts
          </p>
        </div>

        {canRecord && (
          <button
            onClick={openCreateModal}
            disabled={eligibleInvoices.length === 0}
            style={{
              ...primaryBtnStyle,
              opacity: eligibleInvoices.length === 0 ? 0.6 : 1,
              cursor: eligibleInvoices.length === 0 ? 'not-allowed' : 'pointer',
            }}
            title={
              eligibleInvoices.length === 0
                ? 'No invoices with outstanding balances'
                : 'Record manual payment'
            }
          >
            + Record Manual Payment
          </button>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Receipt ID</th>
                <th style={thStyle}>Settled Date</th>
                <th style={thStyle}>Invoice Ref</th>
                <th style={thStyle}>Payment Method</th>
                <th style={thStyle}>Amount Collected</th>
                <th style={thStyle}>Transaction Note</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#2563eb' }}>
                      #REC-{p.id.toString().padStart(4, '0')}
                    </td>
                    <td style={tdStyle}>{formatDateTime(p.paid_at)}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#1e293b' }}>
                      {p.invoice?.invoice_number || `Invoice #${p.invoice_id}`}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#334155',
                        }}
                      >
                        {p.method}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: '#059669' }}>
                      +{formatPaiseToINR(p.amount_paise)}
                    </td>
                    <td style={{ ...tdStyle, color: '#64748b' }}>
                      {p.note || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Customer Payment Receipt"
        maxWidth="500px"
      >
        <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Target Invoice with Outstanding Balance *</label>
            <select
              required
              value={selectedInvoiceId}
              onChange={(e) => handleInvoiceChange(Number(e.target.value))}
              style={inputStyle}
            >
              {eligibleInvoices.map((inv) => {
                const bal = inv.total_paise - inv.paid_amount_paise;
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} ({inv.billing_name}) — Due: {formatPaiseToINR(bal)}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Payment Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={paymentAmountInr}
              onChange={(e) => setPaymentAmountInr(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Settlement Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              style={inputStyle}
            >
              <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="CASH">Cash Settlement</option>
              <option value="OTHER">Other Reference</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Reference Number / Transaction Note</label>
            <input
              type="text"
              placeholder="e.g. UTR-49102847582 or Bank Cheque #91823"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={primaryBtnStyle}
            >
              {isSubmitting ? 'Recording...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '10px',
  background: '#2563eb',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '13px',
  border: 'none',
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: '10px',
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  color: '#475569',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
  textAlign: 'left',
};

const thStyle: React.CSSProperties = {
  padding: '14px 20px',
  background: '#f8fafc',
  color: '#64748b',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e2e8f0',
};

const tdStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #f1f5f9',
  color: '#334155',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};
