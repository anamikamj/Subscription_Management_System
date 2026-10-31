import { useState } from "react";
import "./App.css";
import { LoginPage } from "./features/auth/pages/LoginPage";
import type { User } from "./types";

function App() {
  const [view, setView] = useState<'landing' | 'login'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  if (view === 'login') {
    return (
      <LoginPage
        onSuccess={(user) => {
          setCurrentUser(user);
          alert(`Logged in successfully as ${user.name} (${user.role})!`);
          setView('landing');
        }}
        onBackToHome={() => setView('landing')}
      />
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">B</span>
          Brightloop
        </div>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="nav-actions">
          <button className="login-btn" onClick={() => setView('login')}>Log in</button>
          <button className="get-started" onClick={() => setView('login')}>Get Started ↗</button>
        </div>
      </nav>

      <main className="hero">
        <div className="hero-content">
          <span className="tagline">
            ✦ SMARTER SUBSCRIPTION MANAGEMENT
          </span>

          <h1>
            Subscriptions,
            <br />
            made <span>simple.</span>
          </h1>

          <p>
            Manage customers, plans, billing and payments
            all in one place. A smarter way to grow your
            subscription business.
          </p>

          <div className="hero-buttons">
            <button className="get-started" onClick={() => setView('login')}>
              Get Started →
            </button>
            <button className="learn-more">
              Explore Platform
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
          <div className="feature-card">
            <h3>01. Customers</h3>
            <p>Manage customer information in one place.</p>
          </div>

          <div className="feature-card">
            <h3>02. Subscriptions</h3>
            <p>Track plans, renewals and subscription status.</p>
          </div>

          <div className="feature-card">
            <h3>03. Billing</h3>
            <p>Organise invoices, payments and revenue.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
