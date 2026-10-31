import React, { useEffect, useState } from 'react';
import { ConfirmationModal } from '../../../components/common/ConfirmationModal';
import { Modal } from '../../../components/common/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  customerApi,
  invoiceApi,
  planApi,
  productApi,
  subscriptionApi,
} from '../../../services/api/client';
import type {
  Customer,
  Plan,
  Product,
  Subscription,
  SubscriptionLine,
  SubscriptionStatus,
} from '../../../types';
import {
  calculateTaxPaise,
  formatCadence,
  formatDate,
  formatPaiseToINR,
  getSubscriptionStatusStyle,
  inrToPaise,
} from '../../../utils/formatters';

interface SubscriptionsPageProps {
  initialSubId?: string;
  onNavigateToInvoice: (id: number) => void;
}

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({
  initialSubId,
  onNavigateToInvoice,
}) => {
  const { role, user } = useAuth();
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  // Transition confirmation modal
  const [transitionTarget, setTransitionTarget] = useState<SubscriptionStatus | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isProcessingTransition, setIsProcessingTransition] = useState(false);

  // Generate invoice modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  // Create form state
  const [formCustomerId, setFormCustomerId] = useState<number>(0);
  const [formPlanId, setFormPlanId] = useState<number>(0);
  const [formStartDate, setFormStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formTermsDays, setFormTermsDays] = useState<number>(15);
  const [formLines, setFormLines] = useState<
    Array<{
      product_id: number;
      quantity: number;
      unit_price_inr: string;
      tax_rate_bps: number;
      variant_name: string;
    }>
  >([]);

  const isCustomer = role === 'CUSTOMER';
  const canManage = role === 'ADMIN' || role === 'STAFF';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const customerFilterId = isCustomer && user?.customer_id ? user.customer_id : undefined;
      const [subs, custs, pls, prods] = await Promise.all([
        subscriptionApi.getAll(customerFilterId),
        canManage ? customerApi.getAll() : Promise.resolve([]),
        planApi.getAll(),
        productApi.getAll(),
      ]);
      setSubscriptions(subs);
      setCustomers(custs);
      setPlans(pls);
      setProducts(prods);

      if (initialSubId) {
        const target = subs.find((s) => s.id === parseInt(initialSubId));
        if (target) setSelectedSub(target);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load subscription data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, user]);

  const openCreateModal = () => {
    if (customers.length > 0) setFormCustomerId(customers[0].id);
    if (plans.length > 0) setFormPlanId(plans[0].id);
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate('');
    setFormTermsDays(15);

    // Initial default line with first product
    if (products.length > 0) {
      setFormLines([
        {
          product_id: products[0].id,
          quantity: 1,
          unit_price_inr: (products[0].sales_price_paise / 100).toString(),
          tax_rate_bps: 1800,
          variant_name: '',
        },
      ]);
    } else {
      setFormLines([]);
    }
    setIsCreateOpen(true);
  };

  const handleAddLine = () => {
    if (products.length === 0) return;
    const prod = products[0];
    setFormLines([
      ...formLines,
      {
        product_id: prod.id,
        quantity: 1,
        unit_price_inr: (prod.sales_price_paise / 100).toString(),
        tax_rate_bps: 1800,
        variant_name: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  const handleLineProductChange = (index: number, productId: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const updated = [...formLines];
    updated[index] = {
      ...updated[index],
      product_id: productId,
      unit_price_inr: (prod.sales_price_paise / 100).toString(),
    };
    setFormLines(updated);
  };

  const handleLineFieldChange = (
    index: number,
    field: 'quantity' | 'unit_price_inr' | 'tax_rate_bps' | 'variant_name',
    value: any
  ) => {
    const updated = [...formLines];
    updated[index] = { ...updated[index], [field]: value };
    setFormLines(updated);
  };

  // Preview totals calculation
  const calculatedSubtotalPaise = formLines.reduce((acc, line) => {
    const unitPaise = inrToPaise(line.unit_price_inr || '0');
    return acc + unitPaise * (line.quantity || 1);
  }, 0);

  const calculatedTaxPaise = formLines.reduce((acc, line) => {
    const unitPaise = inrToPaise(line.unit_price_inr || '0');
    const lineSubtotal = unitPaise * (line.quantity || 1);
    return acc + calculateTaxPaise(lineSubtotal, line.tax_rate_bps);
  }, 0);

  const calculatedTotalPaise = calculatedSubtotalPaise + calculatedTaxPaise;

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId || !formPlanId) {
      showToast('Customer and Plan are required', 'warning');
      return;
    }
    if (formLines.length === 0) {
      showToast('At least one product line is required', 'warning');
      return;
    }

    const payloadLines: SubscriptionLine[] = formLines.map((l) => ({
      product_id: l.product_id,
      quantity: Number(l.quantity) || 1,
      unit_price_paise: inrToPaise(l.unit_price_inr),
      tax_rate_bps: Number(l.tax_rate_bps) || 0,
      variant_name: l.variant_name.trim() || null,
      price_adjustment_paise: 0,
    }));

    try {
      const created = await subscriptionApi.create({
        customer_id: formCustomerId,
        plan_id: formPlanId,
        start_date: formStartDate,
        end_date: formEndDate || null,
        payment_terms_days: formTermsDays,
        status: 'QUOTATION',
        lines: payloadLines,
      });

      showToast(`Subscription ${created.subscription_number} created!`, 'success');
      setIsCreateOpen(false);
      loadData();
      setSelectedSub(created);
    } catch (err: any) {
      showToast(err.message || 'Error creating subscription', 'error');
    }
  };

  const promptTransition = (target: SubscriptionStatus) => {
    setTransitionTarget(target);
    setIsTransitionModalOpen(true);
  };

  const handleExecuteTransition = async () => {
    if (!selectedSub || !transitionTarget || !role) return;
    setIsProcessingTransition(true);
    try {
      const updated = await subscriptionApi.updateStatus(
        selectedSub.id,
        transitionTarget,
        role
      );
      showToast(
        `Subscription status transitioned to ${transitionTarget}`,
        'success'
      );
      setIsTransitionModalOpen(false);
      setSelectedSub(updated);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Transition rejected', 'error');
    } finally {
      setIsProcessingTransition(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedSub) return;
    setIsGeneratingInvoice(true);
    try {
      const inv = await invoiceApi.generateFromSubscription(selectedSub.id);
      showToast(`Invoice ${inv.invoice_number} created successfully!`, 'success');
      setIsInvoiceModalOpen(false);
      onNavigateToInvoice(inv.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate invoice', 'error');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const filteredSubs = subscriptions.filter((s) => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'ACTIVE', 'CONFIRMED', 'QUOTATION', 'DRAFT', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === st ? '#2563eb' : '#ffffff',
                color: statusFilter === st ? '#ffffff' : '#64748b',
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {canManage && (
          <button onClick={openCreateModal} style={primaryBtnStyle}>
            + Create Subscription
          </button>
        )}
      </div>

      {/* Subscriptions Table */}
      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Subscription #</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Plan & Cadence</th>
                <th style={thStyle}>Start Date</th>
                <th style={thStyle}>Next Billing</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    No subscriptions match this view.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  const statusStyle = getSubscriptionStatusStyle(sub.status);
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => setSelectedSub(sub)}
                      style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#2563eb' }}>
                        {sub.subscription_number}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#1e293b' }}>
                        {sub.customer?.name || `Customer #${sub.customer_id}`}
                      </td>
                      <td style={tdStyle}>
                        <div>{sub.plan?.name || `Plan #${sub.plan_id}`}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {formatCadence(sub.plan?.cadence)}
                        </div>
                      </td>
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
                            setSelectedSub(sub);
                          }}
                          style={viewBtnStyle}
                        >
                          Details ↗
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

      {/* Subscription Detail Modal */}
      {selectedSub && (
        <Modal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title={`Subscription: ${selectedSub.subscription_number}`}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Status Bar & Lifecycle Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  CURRENT STATUS
                </span>
                <div style={{ marginTop: '2px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 800,
                      ...getSubscriptionStatusStyle(selectedSub.status),
                    }}
                  >
                    {selectedSub.status}
                  </span>
                </div>
              </div>

              {canManage && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Allowed transitions according to backend state machine */}
                  {selectedSub.status === 'DRAFT' && (
                    <button
                      onClick={() => promptTransition('QUOTATION')}
                      style={actionBtnStyle('#2563eb')}
                    >
                      Send Quotation
                    </button>
                  )}

                  {selectedSub.status === 'QUOTATION' && (
                    <>
                      <button
                        onClick={() => promptTransition('CONFIRMED')}
                        style={actionBtnStyle('#9333ea')}
                      >
                        Confirm Order
                      </button>
                      <button
                        onClick={() => promptTransition('DRAFT')}
                        style={actionBtnStyle('#64748b')}
                      >
                        Revert to Draft
                      </button>
                    </>
                  )}

                  {selectedSub.status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() => promptTransition('ACTIVE')}
                        style={actionBtnStyle('#059669')}
                        title="Activates subscription and issues first billing invoice"
                      >
                        ▶ Activate & Bill
                      </button>
                      <button
                        onClick={() => promptTransition('CLOSED')}
                        style={actionBtnStyle('#dc2626')}
                      >
                        Close
                      </button>
                    </>
                  )}

                  {selectedSub.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => setIsInvoiceModalOpen(true)}
                        style={actionBtnStyle('#2563eb')}
                      >
                        🧾 Generate Invoice
                      </button>
                      <button
                        onClick={() => promptTransition('CLOSED')}
                        style={actionBtnStyle('#dc2626')}
                      >
                        End / Close
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Meta details grid */}
            <div style={infoGridStyle}>
              <div>
                <span style={labelMutedStyle}>CUSTOMER</span>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>
                  {selectedSub.customer?.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {selectedSub.customer?.billing_email}
                </div>
              </div>

              <div>
                <span style={labelMutedStyle}>PLAN</span>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>
                  {selectedSub.plan?.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {formatCadence(selectedSub.plan?.cadence)} • Terms: {selectedSub.payment_terms_days} days
                </div>
              </div>

              <div>
                <span style={labelMutedStyle}>START DATE</span>
                <div style={{ fontWeight: 600 }}>{formatDate(selectedSub.start_date)}</div>
              </div>

              <div>
                <span style={labelMutedStyle}>NEXT BILLING DATE</span>
                <div style={{ fontWeight: 600 }}>
                  {selectedSub.next_billing_date ? formatDate(selectedSub.next_billing_date) : 'N/A'}
                </div>
              </div>
            </div>

            {/* Subscription Line Items */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                Subscription Product Lines ({selectedSub.lines.length})
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Product</th>
                      <th style={thStyle}>Qty</th>
                      <th style={thStyle}>Unit Price</th>
                      <th style={thStyle}>GST Rate</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSub.lines.map((line, idx) => {
                      const effectivePrice = line.unit_price_paise + (line.price_adjustment_paise || 0);
                      const subtotal = effectivePrice * line.quantity;
                      const tax = calculateTaxPaise(subtotal, line.tax_rate_bps);
                      const total = subtotal + tax;

                      return (
                        <tr key={idx}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>
                              {line.product?.name || `Product #${line.product_id}`}
                            </div>
                            {line.variant_name && (
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                Variant: {line.variant_name}
                              </span>
                            )}
                          </td>
                          <td style={tdStyle}>{line.quantity}</td>
                          <td style={tdStyle}>{formatPaiseToINR(effectivePrice)}</td>
                          <td style={tdStyle}>{(line.tax_rate_bps / 100).toFixed(0)}%</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                            {formatPaiseToINR(total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for State Transitions */}
      <ConfirmationModal
        isOpen={isTransitionModalOpen}
        onClose={() => setIsTransitionModalOpen(false)}
        onConfirm={handleExecuteTransition}
        title={`Transition to ${transitionTarget}`}
        message={
          transitionTarget === 'ACTIVE'
            ? 'Activating this subscription will lock the quotation terms and immediately generate the first billing invoice. Continue?'
            : transitionTarget === 'CLOSED'
            ? 'Closing this subscription will stop recurring automated invoicing. Existing unpaid invoices remain due. Continue?'
            : `Are you sure you want to change this subscription status to ${transitionTarget}?`
        }
        confirmText={`Yes, Set ${transitionTarget}`}
        isDestructive={transitionTarget === 'CLOSED'}
        isLoading={isProcessingTransition}
      />

      {/* Confirmation Modal for Manual Invoice Generation */}
      <ConfirmationModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onConfirm={handleGenerateInvoice}
        title="Generate Invoice for Subscription"
        message="This will create a new formal invoice with tax line snapshots, calculated due date, and assign a unique sequential invoice number. Continue?"
        confirmText="Generate Invoice"
        isLoading={isGeneratingInvoice}
      />

      {/* Create Subscription Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Subscription"
        maxWidth="740px"
      >
        <form onSubmit={handleCreateSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Select Customer *</label>
              <select
                required
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(Number(e.target.value))}
                style={inputStyle}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.billing_email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Billing Plan *</label>
              <select
                required
                value={formPlanId}
                onChange={(e) => setFormPlanId(Number(e.target.value))}
                style={inputStyle}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatCadence(p.cadence)} - {formatPaiseToINR(p.price_paise)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Start Date *</label>
              <input
                type="date"
                required
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>End Date (Optional)</label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Payment Terms (Days)</label>
              <input
                type="number"
                min={0}
                value={formTermsDays}
                onChange={(e) => setFormTermsDays(Number(e.target.value) || 0)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Product Lines Section */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                Subscription Items & Modules *
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                style={addLineBtnStyle}
              >
                + Add Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {formLines.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1.2fr 1fr 1fr 30px',
                    gap: '8px',
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <select
                    value={line.product_id}
                    onChange={(e) => handleLineProductChange(idx, Number(e.target.value))}
                    style={inputStyle}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => handleLineFieldChange(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    style={inputStyle}
                  />

                  <input
                    type="number"
                    step="0.01"
                    value={line.unit_price_inr}
                    onChange={(e) => handleLineFieldChange(idx, 'unit_price_inr', e.target.value)}
                    placeholder="Price (₹)"
                    style={inputStyle}
                  />

                  <select
                    value={line.tax_rate_bps}
                    onChange={(e) => handleLineFieldChange(idx, 'tax_rate_bps', Number(e.target.value))}
                    style={inputStyle}
                  >
                    <option value={1800}>18% GST</option>
                    <option value={1200}>12% GST</option>
                    <option value={500}>5% GST</option>
                    <option value={0}>0% (Exempt)</option>
                  </select>

                  <input
                    type="text"
                    value={line.variant_name}
                    onChange={(e) => handleLineFieldChange(idx, 'variant_name', e.target.value)}
                    placeholder="Variant (opt)"
                    style={inputStyle}
                  />

                  {formLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontWeight: 800,
                      }}
                      title="Remove row"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Price calculation summary */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#f1f5f9',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
              }}
            >
              <div>
                <span>Subtotal: </span>
                <strong>{formatPaiseToINR(calculatedSubtotalPaise)}</strong>
                <span style={{ margin: '0 8px' }}>•</span>
                <span>Tax: </span>
                <strong>{formatPaiseToINR(calculatedTaxPaise)}</strong>
              </div>
              <div>
                <span style={{ color: '#475569' }}>Total / Period: </span>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                  {formatPaiseToINR(calculatedTotalPaise)}
                </strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
            <button type="submit" style={primaryBtnStyle}>
              Save as Quotation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Subscriptions styles
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

const addLineBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  color: '#2563eb',
  fontWeight: 700,
  fontSize: '12px',
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

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '14px',
  background: '#f8fafc',
  padding: '16px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
};

const labelMutedStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: '2px',
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

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: '6px',
    background: color,
    color: '#ffffff',
    border: 'none',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };
}
