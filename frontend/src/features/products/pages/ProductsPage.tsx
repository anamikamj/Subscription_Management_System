import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { productApi } from '../../../services/api/client';
import type { Product } from '../../../types';
import { formatPaiseToINR, inrToPaise } from '../../../utils/formatters';

export const ProductsPage: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Software Subscription');
  const [formSalesPrice, setFormSalesPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = role === 'ADMIN';

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await productApi.getAll();
      setProducts(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormType('Software Subscription');
    setFormSalesPrice('');
    setFormCostPrice('');
    setFormNotes('');
    setFormActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormType(p.product_type || 'Software Subscription');
    setFormSalesPrice((p.sales_price_paise / 100).toString());
    setFormCostPrice((p.cost_price_paise / 100).toString());
    setFormNotes(p.notes || '');
    setFormActive(p.is_active);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSalesPrice) {
      showToast('Product name and sales price are required', 'warning');
      return;
    }

    const salesPaise = inrToPaise(formSalesPrice);
    const costPaise = formCostPrice ? inrToPaise(formCostPrice) : 0;

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await productApi.update(editingProduct.id, {
          name: formName.trim(),
          product_type: formType.trim(),
          sales_price_paise: salesPaise,
          cost_price_paise: costPaise,
          notes: formNotes.trim() || null,
          is_active: formActive,
        });
        showToast(`Product "${formName}" updated`, 'success');
      } else {
        await productApi.create({
          name: formName.trim(),
          product_type: formType.trim(),
          sales_price_paise: salesPaise,
          cost_price_paise: costPaise,
          notes: formNotes.trim() || null,
          is_active: formActive,
        });
        showToast(`Product "${formName}" added to catalog`, 'success');
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Error saving product', 'error');
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
            Product Catalog & Pricing
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Base products, add-on modules, and line-item components for subscriptions
          </p>
        </div>

        {isAdmin && (
          <button onClick={openCreateModal} style={primaryBtnStyle}>
            + Add Product
          </button>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Product Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Sales Price (INR)</th>
                <th style={thStyle}>Cost Price</th>
                <th style={thStyle}>Status</th>
                {isAdmin && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    No products created yet.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b' }}>
                      {p.name}
                      {p.notes && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>
                          {p.notes}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          fontSize: '11px',
                          color: '#475569',
                          fontWeight: 600,
                        }}
                      >
                        {p.product_type || 'Standard'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: '#0f172a' }}>
                      {formatPaiseToINR(p.sales_price_paise)}
                    </td>
                    <td style={{ ...tdStyle, color: '#64748b' }}>
                      {p.cost_price_paise > 0 ? formatPaiseToINR(p.cost_price_paise) : '—'}
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
                        {p.is_active ? 'Active' : 'Archived'}
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

      {/* Modal for Create/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Brightloop Core Platform"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Product Classification / Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              style={inputStyle}
            >
              <option value="Software Subscription">Software Subscription</option>
              <option value="Addon">Addon Module</option>
              <option value="Support SLA">Support SLA</option>
              <option value="Integration">Integration / Connector</option>
              <option value="One-Time Service">One-Time Service</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Sales Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="25000.00"
                value={formSalesPrice}
                onChange={(e) => setFormSalesPrice(e.target.value)}
                style={inputStyle}
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Stored in integer paise
              </span>
            </div>

            <div>
              <label style={labelStyle}>Internal Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="5000.00"
                value={formCostPrice}
                onChange={(e) => setFormCostPrice(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description / Product Notes</label>
            <textarea
              rows={2}
              placeholder="Features included, target audience..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="productActive"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
            />
            <label htmlFor="productActive" style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>
              Available for new subscriptions
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
              {isSubmitting ? 'Saving...' : 'Save Product'}
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
