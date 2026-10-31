import React, { useEffect, useState } from 'react';
import { StatCard } from '../../../components/common/StatCard';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { invoiceApi, subscriptionApi } from '../../../services/api/client';
import type { Invoice, Subscription } from '../../../types';
import {
  formatDate,
  formatPaiseToINR,
  getInvoiceStatusStyle,
  getSubscriptionStatusStyle,
} from '../../../utils/formatters';

interface CustomerPortalPageProps {
  onNavigateToInvoice: (id: number) => void;
  onNavigateToSubscription: (id: number) => void;
}

export const CustomerPortalPage: React.FC<CustomerPortalPageProps> = ({
  onNavigateToInvoice,
  onNavigateToSubscription,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const customerId = user?.customer_id;

  const loadCustomerData = async () => {
    if (!customerId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [subs, invs] = await Promise.all([
        subscriptionApi.getAll(customerId),
        invoiceApi.getAll(customerId),
      ]);
      setSubscriptions(subs);
      setInvoices(invs);
    } catch (err: any) {
      showToast(err.message || 'Failed to load your account records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE').length;
  const unpaidInvoices = invoices.filter(
    (i) => i.total_paise - i.paid_amount_paise > 0 && i.status !== 'CANCELLED'
  );
  const totalOutstandingPaise = unpaidInvoices.reduce(
    (acc, i) => acc + (i.total_paise - i.paid_amount_paise),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Welcome Banner */}
      <div style={bannerStyle}>
        <div>
          <span style={welcomeBadgeStyle}>CUSTOMER SELF-SERVICE PORTAL</span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>
            Welcome back, {user?.name || 'Customer'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Inspect your recurring subscriptions, billing schedule, and download tax invoices
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}
      >
        <StatCard
          title="Active Subscriptions"
          value={isLoading ? '...' : activeSubs}
          subtitle="Plans currently running"
          icon="🔄"
          highlight
        />

        <StatCard
          title="Outstanding Balance"
          value={isLoading ? '...' : formatPaiseToINR(totalOutstandingPaise, false)}
          subtitle={unpaidInvoices.length > 0 ? `${unpaidInvoices.length} unpaid invoice(s)` : 'Account settled'}
          icon="💳"
          trend={totalOutstandingPaise > 0 ? 'Payment due' : 'All clear'}
          trendColor={totalOutstandingPaise > 0 ? '#d97706' : '#059669'}
        />

        <StatCard
          title="Total Invoices"
          value={isLoading ? '...' : invoices.length}
          subtitle="Billing cycles issued"
          icon="📄"
        />
      </div>

      {/* Subscriptions Section */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
              My Subscriptions
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Your contract plans and enrolled service tiers
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Subscription #</th>
                <th style={thStyle}>Plan Tier</th>
                <th style={thStyle}>Billing Cycle</th>
                <th style={thStyle}>Start Date</th>
                <th style={thStyle}>Next Billing</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Loading your subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No subscriptions associated with your account.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const statusStyle = getSubscriptionStatusStyle(sub.status);
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => onNavigateToSubscription(sub.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#2563eb' }}>
                        {sub.subscription_number}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{sub.plan?.name}</td>
                      <td style={tdStyle}>{sub.plan?.cadence}</td>
                      <td style={tdStyle}>{formatDate(sub.start_date)}</td>
                      <td style={tdStyle}>
                        {sub.next_billing_date ? formatDate(sub.next_billing_date) : '—'}
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
                          }}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button style={viewBtnStyle}>View Lines ↗</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices Section */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
              My Billing Invoices
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Historical bills, receipts, and payment status
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Invoice #</th>
                <th style={thStyle}>Issued Date</th>
                <th style={thStyle}>Due Date</th>
                <th style={thStyle}>Total Amount</th>
                <th style={thStyle}>Balance Due</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Download / View</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
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
                      onClick={() => onNavigateToInvoice(inv.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#2563eb' }}>
                        {inv.invoice_number}
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
                          color: outstanding > 0 ? '#dc2626' : '#059669',
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
                        <button style={viewBtnStyle}>View Tax Invoice ↗</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const bannerStyle: React.CSSProperties = {
  background: 'linear-gradient(120deg, #ffffff, #f1f6ff)',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid #dbeafe',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.05)',
};

const welcomeBadgeStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#2563eb',
  letterSpacing: '0.08em',
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '18px 22px',
  borderBottom: '1px solid #f1f5f9',
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

const viewBtnStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: '6px',
  background: '#eff6ff',
  color: '#2563eb',
  border: '1px solid #bfdbfe',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
};
