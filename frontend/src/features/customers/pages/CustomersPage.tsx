import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { customerApi, invoiceApi, subscriptionApi } from '../../../services/api/client';
import type { Customer, Invoice, Subscription } from '../../../types';
import { formatDate, formatPaiseToINR, getSubscriptionStatusStyle } from '../../../utils/formatters';

interface CustomersPageProps {
  onNavigateToSubscription: (id: number) => void;
  onNavigateToInvoice: (id: number) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  onNavigateToSubscription,
  onNavigateToInvoice,
}) => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSubs, setCustomerSubs] = useState<Subscription[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = role === 'ADMIN' || role === 'STAFF';

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await customerApi.getAll();
      setCustomers(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load customers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleOpenDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailLoading(true);
    try {
      const [subs, invs] = await Promise.all([
        subscriptionApi.getAll(customer.id),
        invoiceApi.getAll(customer.id),
      ]);
      setCustomerSubs(subs);
      setCustomerInvoices(invs);
    } catch {
      showToast('Failed to load customer details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      showToast('Name and billing email are required', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await customerApi.create({
        name: formName.trim(),
        billing_email: formEmail.trim(),
        phone: formPhone.trim() || null,
        address: formAddress.trim() || null,
      });
      showToast(`Customer "${created.name}" created successfully!`, 'success');
      setIsCreateOpen(false);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormAddress('');
      loadCustomers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.billing_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <input
            type="text"
            placeholder="Search by company, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateOpen(true)}
            style={primaryBtnStyle}
          >
            <span>+ Add Customer</span>
          </button>
        )}
      </div>

      {/* Customers Table Card */}
      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Customer Name</th>
                <th style={thStyle}>Billing Email</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Registered</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    {searchQuery ? 'No customers match your search.' : 'No customers found.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => handleOpenDetail(cust)}
                    style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b' }}>
                      {cust.name}
                    </td>
                    <td style={tdStyle}>{cust.billing_email}</td>
                    <td style={tdStyle}>{cust.phone || '—'}</td>
                    <td style={tdStyle}>{formatDate(cust.created_at)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(cust);
                        }}
                        style={viewBtnStyle}
                      >
                        Inspect ↗
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Customer: ${selectedCustomer.name}`}
          maxWidth="720px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Overview info box */}
            <div style={infoBoxStyle}>
              <div>
                <span style={infoLabelStyle}>BILLING EMAIL</span>
                <div style={infoValueStyle}>{selectedCustomer.billing_email}</div>
              </div>
              <div>
                <span style={infoLabelStyle}>PHONE</span>
                <div style={infoValueStyle}>{selectedCustomer.phone || 'Not recorded'}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={infoLabelStyle}>BILLING ADDRESS</span>
                <div style={infoValueStyle}>{selectedCustomer.address || 'Not specified'}</div>
              </div>
            </div>

            {/* Subscriptions section */}
            <div>
              <h4 style={sectionHeaderStyle}>
                Associated Subscriptions ({customerSubs.length})
              </h4>
              {detailLoading ? (
                <div style={{ padding: '16px', color: '#64748b' }}>Loading subscriptions...</div>
              ) : customerSubs.length === 0 ? (
                <div style={emptyBoxStyle}>No active or draft subscriptions for this account.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {customerSubs.map((sub) => {
                    const statusStyle = getSubscriptionStatusStyle(sub.status);
                    return (
                      <div
                        key={sub.id}
                        onClick={() => {
                          setSelectedCustomer(null);
                          onNavigateToSubscription(sub.id);
                        }}
                        style={itemRowStyle}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#2563eb' }}>
                            {sub.subscription_number}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Start: {formatDate(sub.start_date)} • Terms: {sub.payment_terms_days} days
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: statusStyle.bg,
                              color: statusStyle.color,
                            }}
                          >
                            {statusStyle.label}
                          </span>
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invoices section */}
            <div>
              <h4 style={sectionHeaderStyle}>
                Invoices & Billing History ({customerInvoices.length})
              </h4>
              {customerInvoices.length === 0 ? (
                <div style={emptyBoxStyle}>No invoices issued yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {customerInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setSelectedCustomer(null);
                        onNavigateToInvoice(inv.id);
                      }}
                      style={itemRowStyle}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>
                          {inv.invoice_number}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Issued: {formatDate(inv.issued_date)} • Due: {formatDate(inv.due_date)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>
                          {formatPaiseToINR(inv.total_paise)}
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: inv.status === 'PAID' ? '#059669' : '#d97706',
                          }}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Customer"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Company / Customer Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Technologies Pvt Ltd"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Billing Email Address *</label>
            <input
              type="email"
              required
              placeholder="billing@acme.example"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Phone Number (Optional)</label>
            <input
              type="text"
              placeholder="+91 98765 43210"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Billing Address (Optional)</label>
            <textarea
              rows={3}
              placeholder="Full office or registered billing address..."
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={primaryBtnStyle}
            >
              {isSubmitting ? 'Creating...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  background: '#ffffff',
  boxSizing: 'border-box',
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
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
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
  padding: '5px 10px',
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const infoBoxStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderRadius: '12px',
  padding: '16px',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
  border: '1px solid #e2e8f0',
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.05em',
};

const infoValueStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#1e293b',
  marginTop: '2px',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#1e293b',
  margin: '0 0 10px 0',
};

const itemRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 14px',
  borderRadius: '8px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  cursor: 'pointer',
};

const emptyBoxStyle: React.CSSProperties = {
  padding: '16px',
  background: '#f8fafc',
  borderRadius: '8px',
  textAlign: 'center',
  fontSize: '12px',
  color: '#94a3b8',
  border: '1px dashed #cbd5e1',
};
