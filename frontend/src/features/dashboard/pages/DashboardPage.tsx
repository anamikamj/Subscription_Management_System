import React, { useEffect, useState } from 'react';
import { StatCard } from '../../../components/common/StatCard';
import { useToast } from '../../../context/ToastContext';
import { dashboardApi } from '../../../services/api/client';
import type { DashboardSummary } from '../../../types';
import {
  formatDate,
  formatDateTime,
  formatPaiseToINR,
  getInvoiceStatusStyle,
} from '../../../utils/formatters';

interface DashboardPageProps {
  onNavigateToInvoice: (id: number) => void;
  onNavigateToSubscriptions: () => void;
  onNavigateToPayments: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToInvoice,
  onNavigateToSubscriptions,
  onNavigateToPayments,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [period, setPeriod] = useState<'all' | 'month' | 'year'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const loadData = async (selectedPeriod: 'all' | 'month' | 'year') => {
    setIsLoading(true);
    try {
      const data = await dashboardApi.getSummary(selectedPeriod);
      setSummary(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Controls: Period Filter & Refresh */}
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
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Executive Revenue & Subscription Summary
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Live local-first billing analytics across subscriptions and collections
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Period Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '3px',
            }}
          >
            {(['all', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: period === p ? '#2563eb' : 'transparent',
                  color: period === p ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
              >
                {p === 'all' && 'All Time'}
                {p === 'month' && 'This Month'}
                {p === 'year' && 'This Year'}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadData(period)}
            disabled={isLoading}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔄</span>
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
        }}
      >
        <StatCard
          title="Active Subscriptions"
          value={isLoading ? '...' : summary?.active_subscriptions ?? 0}
          subtitle="Currently generating recurring revenue"
          icon="🔄"
          highlight
        />

        <StatCard
          title="Revenue Received"
          value={isLoading ? '...' : formatPaiseToINR(summary?.total_revenue_paise, false)}
          subtitle={
            period === 'all'
              ? 'Cumulative cash collections'
              : period === 'month'
              ? 'Collected this month'
              : 'Collected this year'
          }
          icon="💰"
          trend="+18.4%"
          trendColor="#059669"
        />

        <StatCard
          title="Outstanding Payments"
          value={isLoading ? '...' : formatPaiseToINR(summary?.outstanding_paise, false)}
          subtitle="Uncollected across confirmed invoices"
          icon="⏳"
          trend={summary?.outstanding_paise ? 'Pending clearance' : 'All clear'}
          trendColor={summary?.outstanding_paise ? '#d97706' : '#059669'}
        />

        <StatCard
          title="Overdue Invoices"
          value={
            isLoading
              ? '...'
              : `${summary?.overdue_invoices_count ?? 0} (${formatPaiseToINR(summary?.overdue_paise, false)})`
          }
          subtitle="Past due date without full payment"
          icon="⚠️"
          trend={summary?.overdue_invoices_count ? 'Requires follow-up' : 'Zero overdue'}
          trendColor={summary?.overdue_invoices_count ? '#dc2626' : '#059669'}
        />
      </div>

      {/* Split Row: Recent Invoices & Recent Collections */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Recent Invoices Card */}
        <div style={cardContainerStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                Recent Invoices
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Latest billing snapshots generated
              </span>
            </div>
            <button
              onClick={onNavigateToSubscriptions}
              style={linkActionStyle}
            >
              View Subscriptions →
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Invoice #</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {!summary?.recent_invoices?.length ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  summary.recent_invoices.map((inv) => {
                    const statusStyle = getInvoiceStatusStyle(
                      inv.status,
                      inv.due_date,
                      inv.total_paise - inv.paid_amount_paise
                    );
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => onNavigateToInvoice(inv.id)}
                        style={clickableRowStyle}
                      >
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#2563eb' }}>
                          {inv.invoice_number}
                        </td>
                        <td style={{ ...tdStyle, color: '#1e293b', fontWeight: 600 }}>
                          {inv.billing_name}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>
                          {formatPaiseToINR(inv.total_paise)}
                        </td>
                        <td style={tdStyle}>{formatDate(inv.due_date)}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payment Receipts */}
        <div style={cardContainerStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                Recent Collections
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Settled payments and receipts
              </span>
            </div>
            <button
              onClick={onNavigateToPayments}
              style={linkActionStyle}
            >
              Payment Log →
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Method</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Reference / Note</th>
                </tr>
              </thead>
              <tbody>
                {!summary?.recent_payments?.length ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No manual payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  summary.recent_payments.map((p) => (
                    <tr key={p.id}>
                      <td style={tdStyle}>{formatDateTime(p.paid_at)}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#334155',
                          }}
                        >
                          {p.method}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#059669' }}>
                        +{formatPaiseToINR(p.amount_paise)}
                      </td>
                      <td style={{ ...tdStyle, color: '#64748b', fontSize: '12px' }}>
                        {p.note || 'Manual settlement'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const cardContainerStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '18px 22px',
  borderBottom: '1px solid #f1f5f9',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const linkActionStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#2563eb',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
  textAlign: 'left',
};

const thStyle: React.CSSProperties = {
  padding: '12px 18px',
  background: '#f8fafc',
  color: '#64748b',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e2e8f0',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 18px',
  borderBottom: '1px solid #f1f5f9',
  color: '#334155',
};

const clickableRowStyle: React.CSSProperties = {
  cursor: 'pointer',
  transition: 'background-color 0.1s ease',
};
