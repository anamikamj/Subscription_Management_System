import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { invoiceApi, paymentApi } from '../../../services/api/client';
import type { Invoice, PaymentMethod } from '../../../types';
import {
  formatDate,
  formatPaiseToINR,
  getInvoiceStatusStyle,
  inrToPaise,
} from '../../../utils/formatters';

interface InvoicesPageProps {
  initialInvoiceId?: string;
  onNavigateToSubscription: (id: number) => void;
  onNavigateToPayments: () => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  initialInvoiceId,
  onNavigateToSubscription,
}) => {
  const { role, user } = useAuth();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Manual payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmountInr, setPaymentAmountInr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentNote, setPaymentNote] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const isCustomer = role === 'CUSTOMER';
  const canRecordPayment = role === 'ADMIN' || role === 'STAFF';

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const customerFilterId = isCustomer && user?.customer_id ? user.customer_id : undefined;
      const data = await invoiceApi.getAll(customerFilterId);
      setInvoices(data);

      if (initialInvoiceId) {
        const found = data.find((i) => i.id === parseInt(initialInvoiceId));
        if (found) setSelectedInvoice(found);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load invoices', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [role, user]);

  const openPaymentModal = (inv: Invoice) => {
    const outstandingPaise = inv.total_paise - inv.paid_amount_paise;
    setPaymentAmountInr((outstandingPaise / 100).toFixed(2));
    setPaymentMethod('UPI');
    setPaymentNote(`Payment for ${inv.invoice_number}`);
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amountPaise = inrToPaise(paymentAmountInr);
    const outstanding = selectedInvoice.total_paise - selectedInvoice.paid_amount_paise;

    if (amountPaise <= 0) {
      showToast('Payment amount must be greater than zero', 'warning');
      return;
    }
    if (amountPaise > outstanding) {
      showToast(
        `Amount cannot exceed outstanding balance of ${formatPaiseToINR(outstanding)}`,
        'warning'
      );
      return;
    }

    setIsRecordingPayment(true);
    try {
      await paymentApi.record({
        invoice_id: selectedInvoice.id,
        amount_paise: amountPaise,
        method: paymentMethod,
        note: paymentNote.trim() || null,
      });

      showToast('Payment recorded successfully! Invoice balance updated.', 'success');
      setIsPaymentModalOpen(false);

      // Reload invoices to get updated snapshot
      const customerFilterId = isCustomer && user?.customer_id ? user.customer_id : undefined;
      const updatedList = await invoiceApi.getAll(customerFilterId);
      setInvoices(updatedList);
      const reloadedInv = updatedList.find((i) => i.id === selectedInvoice.id);
      if (reloadedInv) setSelectedInvoice(reloadedInv);
    } catch (err: any) {
      showToast(err.message || 'Payment recording failed', 'error');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
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
            {isCustomer ? 'My Invoices & Receipts' : 'Invoices & Financial Snapshots'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Snapshot records with immutable tax rates, totals, and payment status
          </p>
        </div>

        <button onClick={loadInvoices} style={secondaryBtnStyle}>
          🔄 Refresh
        </button>
      </div>

      {/* Invoices Table Card */}
      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Invoice #</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Issue Date</th>
                <th style={thStyle}>Due Date</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Outstanding</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const outstanding = inv.total_paise - inv.paid_amount_paise;
                  const statusStyle = getInvoiceStatusStyle(
                    inv.status,
                    inv.due_date,
                    outstanding
                  );

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#2563eb' }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#1e293b' }}>
                        {inv.billing_name}
                      </td>
                      <td style={tdStyle}>{formatDate(inv.issued_date)}</td>
                      <td style={tdStyle}>{formatDate(inv.due_date)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        {formatPaiseToINR(inv.total_paise)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 700,
                          color: outstanding > 0 ? '#d97706' : '#059669',
                        }}
                      >
                        {formatPaiseToINR(outstanding)}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                          }}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(inv);
                          }}
                          style={viewBtnStyle}
                        >
                          View ↗
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail & Printable Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice ${selectedInvoice.invoice_number}`}
          maxWidth="760px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <button onClick={handlePrint} style={secondaryBtnStyle}>
                🖨️ Print / Save PDF
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {canRecordPayment &&
                  selectedInvoice.total_paise - selectedInvoice.paid_amount_paise > 0 && (
                    <button
                      onClick={() => openPaymentModal(selectedInvoice)}
                      style={primaryBtnStyle}
                    >
                      💳 Record Payment
                    </button>
                  )}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  style={secondaryBtnStyle}
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div className="printable-invoice" style={invoiceDocStyle}>
            {/* Invoice Document Header */}
            <div style={docHeaderStyle}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={miniLogoStyle}>B</div>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#142b4a' }}>
                    Brightloop Software
                  </span>
                </div>
                <div style={addressTextStyle}>
                  GSTIN: 29AAAAA0000A1Z5<br />
                  Electronic City, Bengaluru, Karnataka, 560100<br />
                  support@brightloop.demo
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb' }}>
                  TAX INVOICE
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                  {selectedInvoice.invoice_number}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Issued: {formatDate(selectedInvoice.issued_date)}
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
                  Due: {formatDate(selectedInvoice.due_date)}
                </div>
              </div>
            </div>

            {/* Billed To / Billing Period */}
            <div style={docPartyGridStyle}>
              <div style={docPartyBoxStyle}>
                <span style={docPartyLabelStyle}>BILLED TO</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {selectedInvoice.billing_name}
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                  {selectedInvoice.billing_email}
                </div>
                {selectedInvoice.billing_phone && (
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    {selectedInvoice.billing_phone}
                  </div>
                )}
                {selectedInvoice.billing_address && (
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', maxWidth: '300px' }}>
                    {selectedInvoice.billing_address}
                  </div>
                )}
              </div>

              <div style={docPartyBoxStyle}>
                <span style={docPartyLabelStyle}>SUBSCRIPTION DETAILS</span>
                <div style={{ marginTop: '4px', fontSize: '13px' }}>
                  <button
                    onClick={() => {
                      setSelectedInvoice(null);
                      onNavigateToSubscription(selectedInvoice.subscription_id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Subscription #{selectedInvoice.subscription_id} ↗
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Period: {formatDate(selectedInvoice.billing_period_start)} to{' '}
                  {formatDate(selectedInvoice.billing_period_end)}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span
                    style={{
                      ...getInvoiceStatusStyle(
                        selectedInvoice.status,
                        selectedInvoice.due_date,
                        selectedInvoice.total_paise - selectedInvoice.paid_amount_paise
                      ),
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={docLineTableStyle}>
              <thead>
                <tr>
                  <th style={docLineThStyle}>Item Description</th>
                  <th style={{ ...docLineThStyle, textAlign: 'center' }}>Qty</th>
                  <th style={{ ...docLineThStyle, textAlign: 'right' }}>Unit Price</th>
                  <th style={{ ...docLineThStyle, textAlign: 'center' }}>GST Rate</th>
                  <th style={{ ...docLineThStyle, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.lines.map((l) => (
                  <tr key={l.id}>
                    <td style={docLineTdStyle}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{l.description}</span>
                    </td>
                    <td style={{ ...docLineTdStyle, textAlign: 'center' }}>{l.quantity}</td>
                    <td style={{ ...docLineTdStyle, textAlign: 'right' }}>
                      {formatPaiseToINR(l.unit_price_paise)}
                    </td>
                    <td style={{ ...docLineTdStyle, textAlign: 'center' }}>
                      {(l.tax_rate_bps / 100).toFixed(0)}%
                    </td>
                    <td style={{ ...docLineTdStyle, textAlign: 'right', fontWeight: 600 }}>
                      {formatPaiseToINR(l.line_total_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Summary Breakdown */}
            <div style={docTotalsContainerStyle}>
              <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={totalRowStyle}>
                  <span style={{ color: '#64748b' }}>Subtotal:</span>
                  <span>{formatPaiseToINR(selectedInvoice.subtotal_paise)}</span>
                </div>
                <div style={totalRowStyle}>
                  <span style={{ color: '#64748b' }}>Tax (GST):</span>
                  <span>{formatPaiseToINR(selectedInvoice.tax_paise)}</span>
                </div>
                {selectedInvoice.discount_paise > 0 && (
                  <div style={totalRowStyle}>
                    <span style={{ color: '#64748b' }}>Discount:</span>
                    <span style={{ color: '#059669' }}>
                      -{formatPaiseToINR(selectedInvoice.discount_paise)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    ...totalRowStyle,
                    borderTop: '2px solid #0f172a',
                    paddingTop: '6px',
                    fontSize: '15px',
                    fontWeight: 800,
                  }}
                >
                  <span>Total Amount:</span>
                  <span style={{ color: '#0f172a' }}>
                    {formatPaiseToINR(selectedInvoice.total_paise)}
                  </span>
                </div>
                <div style={totalRowStyle}>
                  <span style={{ color: '#059669', fontWeight: 600 }}>Paid to Date:</span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>
                    {formatPaiseToINR(selectedInvoice.paid_amount_paise)}
                  </span>
                </div>
                <div
                  style={{
                    ...totalRowStyle,
                    background: '#fef2f2',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    color:
                      selectedInvoice.total_paise - selectedInvoice.paid_amount_paise > 0
                        ? '#dc2626'
                        : '#059669',
                  }}
                >
                  <span>Balance Due:</span>
                  <span>
                    {formatPaiseToINR(
                      selectedInvoice.total_paise - selectedInvoice.paid_amount_paise
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Payment Recording Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Manual Payment: ${selectedInvoice?.invoice_number}`}
        maxWidth="480px"
      >
        <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
            <div>
              Total Invoiced:{' '}
              <strong>{formatPaiseToINR(selectedInvoice?.total_paise)}</strong>
            </div>
            <div style={{ color: '#dc2626', marginTop: '2px' }}>
              Outstanding Balance:{' '}
              <strong>
                {formatPaiseToINR(
                  (selectedInvoice?.total_paise || 0) - (selectedInvoice?.paid_amount_paise || 0)
                )}
              </strong>
            </div>
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
            <label style={labelStyle}>Payment Method *</label>
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
            <label style={labelStyle}>Transaction Reference / Note</label>
            <input
              type="text"
              placeholder="e.g. UTR #, cheque number, or bank reference"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRecordingPayment}
              style={primaryBtnStyle}
            >
              {isRecordingPayment ? 'Recording...' : 'Confirm Receipt'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Styles
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

const viewBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  background: '#eff6ff',
  color: '#2563eb',
  border: '1px solid #bfdbfe',
  fontSize: '11px',
  fontWeight: 700,
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

const invoiceDocStyle: React.CSSProperties = {
  padding: '12px',
  fontFamily: "'Inter', sans-serif",
  color: '#1e293b',
};

const docHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  paddingBottom: '20px',
  borderBottom: '2px solid #e2e8f0',
};

const miniLogoStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 800,
  fontSize: '16px',
};

const addressTextStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748b',
  lineHeight: 1.5,
};

const docPartyGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '24px',
  margin: '20px 0',
};

const docPartyBoxStyle: React.CSSProperties = {
  background: '#f8fafc',
  padding: '14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const docPartyLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.05em',
};

const docLineTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  margin: '20px 0',
  fontSize: '13px',
};

const docLineThStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: '#f1f5f9',
  color: '#475569',
  fontWeight: 700,
  fontSize: '11px',
  textTransform: 'uppercase',
  borderBottom: '1px solid #cbd5e1',
};

const docLineTdStyle: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid #f1f5f9',
};

const docTotalsContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: '16px',
};

const totalRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
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
