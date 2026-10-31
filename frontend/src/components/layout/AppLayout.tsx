import React, { useState } from 'react';
import type { AppRoute } from '../../routes';
import type { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { IntegrationBadge } from '../common/IntegrationBadge';

interface AppLayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onNavigate,
  children,
}) => {
  const { user, role, quickSwitchRole, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCustomer = role === 'CUSTOMER';
  const isAdmin = role === 'ADMIN';

  // Navigation items based on role
  const customerNav: Array<{ route: AppRoute; label: string; icon: string }> = [
    { route: 'portal', label: 'My Portal', icon: '👤' },
    { route: 'subscriptions', label: 'My Subscriptions', icon: '🔄' },
    { route: 'invoices', label: 'My Invoices', icon: '📄' },
  ];

  const adminStaffNav: Array<{ route: AppRoute; label: string; icon: string }> = [
    { route: 'dashboard', label: 'Dashboard', icon: '📊' },
    { route: 'customers', label: 'Customers', icon: '👥' },
    ...(isAdmin
      ? [
          { route: 'products' as AppRoute, label: 'Products', icon: '📦' },
          { route: 'plans' as AppRoute, label: 'Plans', icon: '📋' },
        ]
      : []),
    { route: 'subscriptions', label: 'Subscriptions', icon: '🔄' },
    { route: 'invoices', label: 'Invoices', icon: '📄' },
    { route: 'payments', label: 'Payments', icon: '💳' },
  ];

  const navItems = isCustomer ? customerNav : adminStaffNav;

  const handleRoleSwitch = async (targetRole: UserRole) => {
    await quickSwitchRole(targetRole);
    if (targetRole === 'CUSTOMER') {
      onNavigate('portal');
    } else if (currentRoute === 'portal') {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="brightloop-shell" style={shellStyle}>
      {/* Mobile Top Bar */}
      <div className="mobile-bar" style={mobileBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={miniLogoIconStyle}>B</span>
          <span style={{ fontWeight: 800, color: '#142b4a' }}>Brightloop</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={hamburgerButtonStyle}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`app-sidebar ${mobileMenuOpen ? 'open' : ''}`}
        style={{
          ...sidebarStyle,
          transform: mobileMenuOpen ? 'translateX(0)' : undefined,
        }}
      >
        {/* Brand header */}
        <div style={brandHeaderStyle}>
          <div
            onClick={() => onNavigate('landing')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            title="Return to Brightloop Landing Page"
          >
            <div style={logoIconStyle}>B</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', color: '#142b4a', lineHeight: 1.1 }}>
                Brightloop
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Subscription OS
              </div>
            </div>
          </div>
        </div>

        {/* User Card in Sidebar */}
        <div style={sidebarUserCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={avatarStyle}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#1e293b',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {user?.name || 'Guest User'}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                <span style={roleBadgeStyle(role || 'STAFF')}>{role || 'STAFF'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={navSectionLabelStyle}>NAVIGATION</div>
          {navItems.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => {
                  onNavigate(item.route);
                  setMobileMenuOpen(false);
                }}
                style={{
                  ...navButtonStyle,
                  background: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#2563eb' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span style={activeIndicatorStyle} />}
              </button>
            );
          })}

          <div style={{ ...navSectionLabelStyle, marginTop: '20px' }}>QUICK ROLES (DEMO)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => handleRoleSwitch('ADMIN')}
              style={{
                ...quickRoleBtnStyle,
                borderLeft: role === 'ADMIN' ? '3px solid #7c3aed' : '3px solid transparent',
                background: role === 'ADMIN' ? '#f5f3ff' : '#f8fafc',
              }}
            >
              <span>⚡ Admin</span>
              <span style={{ fontSize: '11px', color: '#7c3aed' }}>Full Access</span>
            </button>
            <button
              onClick={() => handleRoleSwitch('STAFF')}
              style={{
                ...quickRoleBtnStyle,
                borderLeft: role === 'STAFF' ? '3px solid #2563eb' : '3px solid transparent',
                background: role === 'STAFF' ? '#eff6ff' : '#f8fafc',
              }}
            >
              <span>⚡ Staff</span>
              <span style={{ fontSize: '11px', color: '#2563eb' }}>Ops & Billing</span>
            </button>
            <button
              onClick={() => handleRoleSwitch('CUSTOMER')}
              style={{
                ...quickRoleBtnStyle,
                borderLeft: role === 'CUSTOMER' ? '3px solid #059669' : '3px solid transparent',
                background: role === 'CUSTOMER' ? '#ecfdf5' : '#f8fafc',
              }}
            >
              <span>⚡ Customer</span>
              <span style={{ fontSize: '11px', color: '#059669' }}>Self-Serve</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div style={sidebarFooterStyle}>
          <button
            onClick={() => onNavigate('landing')}
            style={secondaryNavButtonStyle}
            title="View public landing page"
          >
            <span>🌐</span>
            <span>Landing Page</span>
          </button>
          <button
            onClick={logout}
            style={{ ...secondaryNavButtonStyle, color: '#dc2626' }}
            title="Sign out"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={contentWrapperStyle}>
        {/* Top Header Bar */}
        <header style={topHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={pageTitleStyle}>
              {currentRoute === 'dashboard' && 'Operations Dashboard'}
              {currentRoute === 'customers' && 'Customer Management'}
              {currentRoute === 'products' && 'Product Catalog'}
              {currentRoute === 'plans' && 'Subscription Plans'}
              {currentRoute === 'subscriptions' &&
                (isCustomer ? 'My Subscriptions' : 'Subscription Management')}
              {currentRoute === 'invoices' &&
                (isCustomer ? 'My Invoices' : 'Invoices & Billing')}
              {currentRoute === 'payments' && 'Payment History'}
              {currentRoute === 'portal' && 'Customer Self-Service Portal'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IntegrationBadge />

            {/* Quick Demo Switcher in Header */}
            <div style={headerRolePillsStyle}>
              {(['ADMIN', 'STAFF', 'CUSTOMER'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSwitch(r)}
                  style={{
                    ...headerRoleButtonStyle,
                    background: role === r ? '#1e293b' : '#f1f5f9',
                    color: role === r ? '#ffffff' : '#64748b',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main style={mainContentStyle}>{children}</main>
      </div>
    </div>
  );
};

// Styles
const shellStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#f8faff',
  width: '100%',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

const mobileBarStyle: React.CSSProperties = {
  display: 'none',
  height: '60px',
  background: '#ffffff',
  borderBottom: '1px solid #e2e8f0',
  padding: '0 16px',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
};

const miniLogoIconStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  color: '#ffffff',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 800,
  fontSize: '14px',
};

const hamburgerButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: '22px',
  cursor: 'pointer',
  padding: '6px',
  color: '#1e293b',
};

const sidebarStyle: React.CSSProperties = {
  width: '260px',
  minWidth: '260px',
  backgroundColor: '#ffffff',
  borderRight: '1px solid #e9edf5',
  display: 'flex',
  flexDirection: 'column',
  position: 'sticky',
  top: 0,
  height: '100vh',
  zIndex: 90,
  overflowY: 'auto',
};

const brandHeaderStyle: React.CSSProperties = {
  height: '75px',
  padding: '0 20px',
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid #f1f5f9',
};

const logoIconStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  color: '#ffffff',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 800,
  fontSize: '18px',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
};

const sidebarUserCardStyle: React.CSSProperties = {
  margin: '12px',
  padding: '12px',
  background: '#f8fafc',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
};

const avatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  color: '#ffffff',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 700,
  fontSize: '14px',
  flexShrink: 0,
};

function roleBadgeStyle(role: UserRole): React.CSSProperties {
  let bg = '#eff6ff';
  let color = '#2563eb';
  if (role === 'ADMIN') {
    bg = '#f5f3ff';
    color = '#7c3aed';
  } else if (role === 'CUSTOMER') {
    bg = '#ecfdf5';
    color = '#059669';
  }
  return {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    background: bg,
    color: color,
    letterSpacing: '0.5px',
  };
}

const navSectionLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  color: '#94a3b8',
  padding: '6px 12px',
  letterSpacing: '0.8px',
};

const navButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 14px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '13.5px',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  position: 'relative',
  transition: 'all 0.15s ease',
};

const activeIndicatorStyle: React.CSSProperties = {
  marginLeft: 'auto',
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: '#2563eb',
};

const quickRoleBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '7px 10px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  color: '#334155',
};

const sidebarFooterStyle: React.CSSProperties = {
  padding: '14px',
  borderTop: '1px solid #f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const secondaryNavButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  borderRadius: '8px',
  background: 'transparent',
  border: 'none',
  fontSize: '13px',
  fontWeight: 600,
  color: '#64748b',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left',
};

const contentWrapperStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const topHeaderStyle: React.CSSProperties = {
  height: '75px',
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e9edf5',
  padding: '0 32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 80,
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
  fontWeight: 800,
  color: '#142b4a',
  letterSpacing: '-0.3px',
};

const headerRolePillsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  background: '#f1f5f9',
  padding: '3px',
  borderRadius: '8px',
};

const headerRoleButtonStyle: React.CSSProperties = {
  border: 'none',
  padding: '5px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
};

const mainContentStyle: React.CSSProperties = {
  padding: '32px',
  flex: 1,
  overflowY: 'auto',
  maxWidth: '1400px',
  width: '100%',
  boxSizing: 'border-box',
};
