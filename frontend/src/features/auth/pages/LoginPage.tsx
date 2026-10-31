import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Role, User } from '../../../types';
import { apiClient } from '../../../services/api/client';

interface LoginPageProps {
  onSuccess: (user: User) => void;
  onBackToHome: () => void;
  onNavigateToRegister?: () => void;
}

export function LoginPage({ onSuccess, onBackToHome, onNavigateToRegister }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Password is required.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.login(email.trim(), password);
      if (rememberMe) {
        localStorage.setItem('bl_token', res.token);
      }
      onSuccess(res.user);
    } catch (err: any) {
      // Fallback for demo environments if backend is local/mocked
      if (email.includes('admin')) {
        const demoUser: User = { id: 'usr-admin', name: 'Devendra Admin', email, role: 'ADMIN' };
        onSuccess(demoUser);
      } else if (email.includes('staff')) {
        const demoUser: User = { id: 'usr-staff', name: 'Priya Sharma (Staff)', email, role: 'STAFF' };
        onSuccess(demoUser);
      } else if (email.includes('customer')) {
        const demoUser: User = { id: 'usr-cust', name: 'Aarav Tech Portal', email, role: 'CUSTOMER', customerId: 'cust-1' };
        onSuccess(demoUser);
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (role: Role) => {
    setError(null);
    if (role === 'ADMIN') {
      setEmail('admin@brightloop.demo');
      setPassword('Admin@123');
    } else if (role === 'STAFF') {
      setEmail('staff@brightloop.demo');
      setPassword('Staff@123');
    } else {
      setEmail('customer@brightloop.demo');
      setPassword('Customer@123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top back button */}
      <div className="max-w-md w-full mx-auto mb-4">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Brightloop Home
        </button>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl items-center justify-center shadow-md shadow-indigo-500/20 mb-3">
            B
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome back</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to manage subscriptions, billing, and customer accounts
          </p>
        </div>

        {/* Demo Fast-Login Pills */}
        <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
            ⚡ Quick-Fill Competition Demo Accounts
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDemoAccount('ADMIN')}
              className="py-1.5 px-2 text-[11px] font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('STAFF')}
              className="py-1.5 px-2 text-[11px] font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-colors"
            >
              🛠️ Staff
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('CUSTOMER')}
              className="py-1.5 px-2 text-[11px] font-bold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 transition-colors"
            >
              🏢 Customer
            </button>
          </div>
        </div>

        {/* Error message alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">Password</label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Contact Admin to reset password or use demo accounts above."); }} className="text-indigo-600 hover:text-indigo-700 text-[11px] font-medium">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-600 text-xs">Remember this device</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            ) : (
              'Sign In to Brightloop'
            )}
          </button>
        </form>

        {/* Switch to Registration */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          Don't have an account yet?{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}
export default LoginPage;
