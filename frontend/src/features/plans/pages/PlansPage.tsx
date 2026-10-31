import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { planApi } from '../../../services/api/client';
import type { BillingCadence, Plan } from '../../../types';
import { formatCadence, formatDate, formatPaiseToINR, inrToPaise } from '../../../utils/formatters';

export const PlansPage: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCadence, setFormCadence] = useState<BillingCadence>('MONTHLY');
  const [formPrice, setFormPrice] = useState('');
  const [formMinQty, setFormMinQty] = useState(1);
  const [formFrom, setFormFrom] = useState('');
  const [formTo, setFormTo] = useState('');
  const [formAutoClose, setFormAutoClose] = useState(false);
  const [formAllowEarlyClose, setFormAllowEarlyClose] = useState(false);
  const [formAllowPause, setFormAllowPause] = useState(true);
  const [formAllowRenew, setFormAllowRenew] = useState(true);
  const [formActive, setFormActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = role === 'ADMIN';

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const data = await planApi.getAll();
      setPlans(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load plans', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormName('');
    setFormCadence('MONTHLY');
    setFormPrice('');
    setFormMinQty(1);
    setFormFrom('');
    setFormTo('');
    setFormAutoClose(false);
    setFormAllowEarlyClose(false);
    setFormAllowPause(true);
    setFormAllowRenew(true);
    setFormActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Plan) => {
    setEditingPlan(p);
    setFormName(p.name);
    setFormCadence(p.cadence);
    setFormPrice((p.price_paise / 100).toString());
    setFormMinQty(p.min_quantity);
    setFormFrom(p.available_from || '');
    setFormTo(p.available_to || '');
    setFormAutoClose(p.auto_close);
    setFormAllowEarlyClose(p.allow_early_close);
    setFormAllowPause(p.allow_pause);
    setFormAllowRenew(p.allow_renew);
    setFormActive(p.is_active);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) {
      showToast('Plan name and recurring price are required', 'warning');
      return;
    }

    const pricePaise = inrToPaise(formPrice);

    setIsSubmitting(true);
    try {
      if (editingPlan) {
        await planApi.update(editingPlan.id, {
          name: formName.trim(),
          cadence: formCadence,
          price_paise: pricePaise,
          min_quantity: formMinQty,
          available_from: formFrom || null,
          available_to: formTo || null,
          auto_close: formAutoClose,
          allow_early_close: formAllowEarlyClose,
          allow_pause: formAllowPause,
          allow_renew: formAllowRenew,
          is_active: formActive,
        });
        showToast(`Plan "${formName}" updated`, 'success');
      } else {
        await planApi.create({
          name: formName.trim(),
          cadence: formCadence,
          price_paise: pricePaise,
          min_quantity: formMinQty,
          available_from: formFrom || null,
          available_to: formTo || null,
          auto_close: formAutoClose,
          allow_early_close: formAllowEarlyClose,
          allow_pause: formAllowPause,
          allow_renew: formAllowRenew,
          is_active: formActive,
        });
        showToast(`Plan "${formName}" created`, 'success');
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Error saving plan', 'error');
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
            Subscription Billing Plans
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Cadences (Daily/Weekly/Monthly/Yearly), lifecycle rules, and renewal terms
          </p>
        </div>

        {isAdmin && (
          <button onClick={openCreateModal} style={primaryBtnStyle}>
            + Create Plan
          </button>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Plan Name</th>
                <th style={thStyle}>Cadence</th>
                <th style={thStyle}>Base Price</th>
                <th style={thStyle}>Min Qty</th>
                <th style={thStyle}>Lifecycle Rules</th>
                <th style={thStyle}>Status</th>
                {isAdmin && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Loading plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    No plans found.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b' }}>
                      {p.name}
                      {(p.available_from || p.available_to) && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>
                          Avail: {formatDate(p.available_from)} to {p.available_to ? formatDate(p.available_to) : 'open'}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {formatCadence(p.cadence)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: '#0f172a' }}>
                      {formatPaiseToINR(p.price_paise)}
                    </td>
                    <td style={tdStyle}>{p.min_quantity} unit(s)</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {p.allow_renew && <span style={tagStyle}>Renewable</span>}
                        {p.allow_early_close && <span style={tagStyle}>Early Close</span>}
                        {p.allow_pause && <span style={tagStyle}>Pausable</span>}
                        {p.auto_close && <span style={tagStyle}>Auto Close</span>}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: p.is_active ? '#ecfdf5' : '#f1f5f9',
                          color: p.is_active ? '#059669' : '#64748b',
                        }}
                      >
                        {p.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={() => openEditModal(p)}
                          style={editBtnStyle}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Plan' : 'Configure New Subscription Plan'}
        maxWidth="560px"
      >
        <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Plan Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Growth Monthly Plan"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Billing Cadence *</label>
              <select
                value={formCadence}
                onChange={(e) => setFormCadence(e.target.value as BillingCadence)}
                style={inputStyle}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Base Plan Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="25000.00"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Minimum Quantity</label>
              <input
                type="number"
                min={1}
                value={formMinQty}
                onChange={(e) => setFormMinQty(parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Available From</label>
              <input
                type="date"
                value={formFrom}
                onChange={(e) => setFormFrom(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Available To</label>
              <input
                type="date"
                value={formTo}
                onChange={(e) => setFormTo(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Lifecycle Toggles */}
          <div>
            <label style={{ ...labelStyle, marginBottom: '8px' }}>
              Subscription Lifecycle Rules
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={formAllowRenew}
                  onChange={(e) => setFormAllowRenew(e.target.checked)}
                />
                <span>Allow auto-renewal</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={formAllowEarlyClose}
                  onChange={(e) => setFormAllowEarlyClose(e.target.checked)}
                />
                <span>Allow early closure</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={formAllowPause}
                  onChange={(e) => setFormAllowPause(e.target.checked)}
                />
                <span>Allow pause</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={formAutoClose}
                  onChange={(e) => setFormAutoClose(e.target.checked)}
                />
                <span>Auto-close at term end</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <input
              type="checkbox"
              id="planActive"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
            />
            <label htmlFor="planActive" style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>
              Active (eligible for new customer subscriptions)
            </label>
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
              {isSubmitting ? 'Saving...' : 'Save Plan'}
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

const editBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  background: '#f1f5f9',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  fontWeight: 600,
  color: '#334155',
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

const tagStyle: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: '4px',
  background: '#f1f5f9',
  fontSize: '10px',
  color: '#475569',
  fontWeight: 600,
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

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: '#334155',
  cursor: 'pointer',
};
