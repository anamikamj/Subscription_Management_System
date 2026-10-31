import React from 'react';
import './App.css';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './features/auth/pages/LoginPage';
import { CustomersPage } from './features/customers/pages/CustomersPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { InvoicesPage } from './features/invoices/pages/InvoicesPage';
import { PaymentsPage } from './features/payments/pages/PaymentsPage';
import { PlansPage } from './features/plans/pages/PlansPage';
import { CustomerPortalPage } from './features/portal/pages/CustomerPortalPage';
import { ProductsPage } from './features/products/pages/ProductsPage';
import { SubscriptionsPage } from './features/subscriptions/pages/SubscriptionsPage';
import type { AppRoute } from './routes';
import { useAppNavigation } from './routes';

function MainApp() {
  const { currentRoute, routeParam, navigate } = useAppNavigation();
  const { isAuthenticated, role, quickSwitchRole } = useAuth();

  // If user navigated to SaaS app pages without authenticating, default to Admin for demo ease
  React.useEffect(() => {
    if (
      !isAuthenticated &&
      currentRoute !== 'landing' &&
      currentRoute !== 'login'
    ) {
      quickSwitchRole('ADMIN');
    }
  }, [currentRoute, isAuthenticated, quickSwitchRole]);

  // Route: Login Page
  if (currentRoute === 'login') {
    return (
      <LoginPage
        onSuccess={(assignedRole) => {
          navigate(assignedRole === 'CUSTOMER' ? 'portal' : 'dashboard');
        }}
        onCancel={() => navigate('landing')}
      />
    );
  }

  // Route: Public Landing Page
  if (currentRoute === 'landing') {
    return (
      <div className="app">
        <nav className="navbar">
          <div className="logo" onClick={() => navigate('landing')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">B</span>
            Brightloop
          </div>

          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="nav-actions">
            {isAuthenticated ? (
              <button
                className="get-started"
                onClick={() =>
                  navigate(role === 'CUSTOMER' ? 'portal' : 'dashboard')
                }
              >
                Open App ({role}) →
              </button>
            ) : (
              <>
                <button
                  className="login-btn"
                  onClick={() => navigate('login')}
                >
                  Log in
                </button>
                <button
                  className="get-started"
                  onClick={() => navigate('login')}
                >
                  Get Started ↗
                </button>
              </>
            )}
          </div>
        </nav>

        <main className="hero">
          <div className="hero-content">
            <span className="tagline">✦ SMARTER SUBSCRIPTION MANAGEMENT</span>

            <h1>
              Subscriptions,
              <br />
              made <span>simple.</span>
            </h1>

            <p>
              Manage customers, plans, billing and payments all in one place.
              A smarter way to grow your subscription business.
            </p>

            <div className="hero-buttons">
              <button
                className="get-started"
                onClick={() =>
                  navigate(
                    isAuthenticated
                      ? role === 'CUSTOMER'
                        ? 'portal'
                        : 'dashboard'
                      : 'login'
                  )
                }
              >
                {isAuthenticated ? 'Go to Dashboard →' : 'Launch Platform →'}
              </button>
              <button
                className="learn-more"
                onClick={() => navigate('login')}
              >
                Demo Accounts
              </button>
            </div>

            <div className="hero-note">
              ✦ One platform. Complete subscription control.
            </div>
          </div>

          <div className="hero-visual">
            <div className="glow"></div>

            <div className="floating-card card-one">
              <span>Monthly Revenue</span>
              <h2>₹42,500</h2>
              <small>↗ Growing steadily</small>
            </div>

            <div className="floating-card card-two">
              <span>Active Subscriptions</span>
              <h2>128</h2>
              <small>Customers connected</small>
            </div>

            <div className="orbit">
              <div className="orbit-center">B</div>
            </div>
          </div>
        </main>

        <section className="features" id="features">
          <span>EVERYTHING IN ONE PLACE</span>
          <h2>Built for your subscription business.</h2>

          <div className="feature-grid">
            <div
              className="feature-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('customers')}
            >
              <h3>01. Customers</h3>
              <p>
                Manage customer information, billing profiles, and accounts in
                one place.
              </p>
            </div>

            <div
              className="feature-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('subscriptions')}
            >
              <h3>02. Subscriptions</h3>
              <p>
                Track plans, renewals, custom product lines and automated lifecycle
                state transitions.
              </p>
            </div>

            <div
              className="feature-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('invoices')}
            >
              <h3>03. Billing & Payments</h3>
              <p>
                Generate GST-compliant tax invoices, track settlements, and report
                revenue in real-time.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // App Layout for all Authenticated / Operational Routes
  return (
    <AppLayout currentRoute={currentRoute} onNavigate={(r: AppRoute) => navigate(r)}>
      {currentRoute === 'dashboard' && (
        <DashboardPage
          onNavigateToInvoice={(id) => navigate('invoices', id)}
          onNavigateToSubscriptions={() => navigate('subscriptions')}
          onNavigateToPayments={() => navigate('payments')}
        />
      )}

      {currentRoute === 'customers' && (
        <CustomersPage
          onNavigateToSubscription={(id) => navigate('subscriptions', id)}
          onNavigateToInvoice={(id) => navigate('invoices', id)}
        />
      )}

      {currentRoute === 'products' && <ProductsPage />}

      {currentRoute === 'plans' && <PlansPage />}

      {currentRoute === 'subscriptions' && (
        <SubscriptionsPage
          initialSubId={routeParam}
          onNavigateToInvoice={(id) => navigate('invoices', id)}
        />
      )}

      {currentRoute === 'invoices' && (
        <InvoicesPage
          initialInvoiceId={routeParam}
          onNavigateToSubscription={(id) => navigate('subscriptions', id)}
          onNavigateToPayments={() => navigate('payments')}
        />
      )}

      {currentRoute === 'payments' && <PaymentsPage />}

      {currentRoute === 'portal' && (
        <CustomerPortalPage
          onNavigateToInvoice={(id) => navigate('invoices', id)}
          onNavigateToSubscription={(id) => navigate('subscriptions', id)}
        />
      )}
    </AppLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
