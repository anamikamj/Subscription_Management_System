import React from 'react';
import { Layers, DollarSign, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { DashboardSummary } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  onNavigateTab: (tab: 'subscriptions' | 'invoices' | 'customers') => void;
}

export function DashboardView({ summary, onNavigateTab }: DashboardViewProps) {
  return (
    <div className="space-y-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          onClick={() => onNavigateTab('subscriptions')}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Subscriptions</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary?.activeSubscriptionsCount ?? 0}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Recurring contracts running
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Revenue Received</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {formatCurrency(summary?.totalRevenuePaise ?? 0)}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">Settled payments via UPI & Wire</p>
        </div>

        <div
          onClick={() => onNavigateTab('invoices')}
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Outstanding Invoices</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {formatCurrency(summary?.outstandingRevenuePaise ?? 0)}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">Pending customer settlement</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Alerts</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            {summary?.overdueInvoicesCount ?? 0}
          </div>
          <p className="text-xs text-rose-600 font-medium mt-1">Due date expired</p>
        </div>
      </div>
    </div>
  );
}
