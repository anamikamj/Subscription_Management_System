import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import type { UserRole } from '../../../types';

interface LoginPageProps {
  onSuccess: (role: UserRole) => void;
  onCancel: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onCancel }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter an email address', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      showToast('Signed in successfully', 'success');
      // Look up role from current user
      const currentUser = JSON.parse(
        localStorage.getItem('brightloop_current_user') || '{}'
      );
      onSuccess(currentUser.role || 'STAFF');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (
    demoEmail: string,
    expectedRole: UserRole
  ) => {
    setIsSubmitting(true);
    try {
      await login(demoEmail, 'demo123');
      showToast(`Signed in as ${expectedRole}`, 'success');
      onSuccess(expectedRole);
    } catch (err: any) {
      showToast(err.message || 'Sign in failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={logoIconStyle}>B</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#142b4a', margin: '12px 0 4px 0' }}>
            Brightloop Sign In
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Unified Subscription Management Platform
          </p>
        </div>

        {/* 1-Click Quick Demo Switcher */}
        <div style={quickSectionStyle}>
          <div style={quickSectionTitleStyle}>⚡ 1-CLICK HACKATHON DEMO ACCOUNTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() =>
                handleQuickDemoLogin('admin@brightloop.demo', 'ADMIN')
              }
              disabled={isSubmitting}
              style={{ ...quickBtnStyle, borderLeft: '4px solid #7c3aed' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>Administrator</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>admin@brightloop.demo (Catalog, Plans, All)</div>
              </div>
              <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 700 }}>Log In →</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickDemoLogin('staff@brightloop.demo', 'STAFF')
              }
              disabled={isSubmitting}
              style={{ ...quickBtnStyle, borderLeft: '4px solid #2563eb' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>Operations Staff</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>staff@brightloop.demo (Customers, Subscriptions, Billing)</div>
              </div>
              <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>Log In →</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickDemoLogin('customer@brightloop.demo', 'CUSTOMER')
              }
              disabled={isSubmitting}
              style={{ ...quickBtnStyle, borderLeft: '4px solid #059669' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>Customer Portal</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>customer@brightloop.demo (Acme Client Portal)</div>
              </div>
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>Log In →</span>
            </button>
          </div>
        </div>

        <div style={dividerStyle}>
          <span>or sign in with credentials</span>
        </div>

        {/* Standard Credentials Form */}
        <form onSubmit={handleStandardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Work Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. admin@brightloop.demo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={submitBtnStyle}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In to Brightloop'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '18px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={backBtnStyle}
          >
            ← Back to Public Website
          </button>
        </div>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 50% 30%, #e0e7ff 0%, #f8faff 70%)',
  padding: '20px',
  fontFamily: "'Inter', sans-serif",
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '20px',
  padding: '36px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 20px 45px -10px rgba(30, 41, 59, 0.15)',
  border: '1px solid #e2e8f0',
};

const logoIconStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  color: '#ffffff',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 800,
  fontSize: '22px',
  margin: '0 auto',
  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.28)',
};

const quickSectionStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '14px',
  marginBottom: '20px',
};

const quickSectionTitleStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 800,
  color: '#64748b',
  letterSpacing: '0.06em',
};

const quickBtnStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 14px',
  borderRadius: '8px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
};

const dividerStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '18px 0',
  position: 'relative',
  borderBottom: '1px solid #e2e8f0',
  lineHeight: '0.1em',
  color: '#94a3b8',
  fontSize: '11px',
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

const submitBtnStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '10px',
  background: 'linear-gradient(110deg, #2563eb, #6d5dfc)',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '14px',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
  marginTop: '8px',
};

const backBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#64748b',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};
