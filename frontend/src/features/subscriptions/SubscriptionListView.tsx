import React, { useState } from 'react';
import type { Subscription, Customer, Plan, SubscriptionStatus } from '../../types';
import { formatCurrency, getSubscriptionStatusBadgeClasses } from '../../utils/formatters';
import { Layers, Receipt, Plus, Search, Calendar } from 'lucide-react';

interface SubscriptionListViewProps {
  subscriptions: Subscription[];
  customers: Customer[];
  plans: Plan[];
  onTransition: (subId: string, targetStatus: SubscriptionStatus) => void;
  onGenerateInvoice: (subId: string) => void;
  onCreateNew: () => void;
}

export function SubscriptionListView({
  subscriptions,
  customers,
  plans,
  onTransition,
  onGenerateInvoice,
  onCreateNew
}: SubscriptionListViewProps) {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filteredSubs = subscriptions.filter((sub) => {
    const cust = customers.find((c) => c.id === sub.customerId);
    const matchesSearch =
      sub.number.toLowerCase().includes(search.toLowerCase()) ||
      cust?.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || sub.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Subscription Lifecycle</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transitions: DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <Plus className="w-4 h-4" /> New Subscription
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subscriptions or customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'CONFIRMED', 'QUOTATION', 'DRAFT', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                filter === st ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Subscription Cards */}
      <div className="space-y-4">
        {filteredSubs.map((sub) => {
          const cust = customers.find((c) => c.id === sub.customerId);
          const plan = plans.find((p) => p.id === sub.planId);
          const subTotal = sub.lines.reduce(
            (acc, l) => acc + l.unitPricePaise * l.quantity * (1 + l.taxRatePercent / 100),
            0
          );

          return (
            <div
              key={sub.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-900">{sub.number}</span>
                    <span
                      className={`text-[11px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getSubscriptionStatusBadgeClasses(
                        sub.status
                      )}`}
                    >
                      {sub.status}
                    </span>
                    <span className="text-xs text-slate-400">Start: {sub.startDate}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {cust?.name} <span className="text-xs text-slate-400 font-normal">({cust?.company})</span>
                  </div>
                </div>

                {/* State Machine Transition Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {sub.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => onTransition(sub.id, 'QUOTATION')}
                        className="px-3 py-1.5 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                      >
                        Send Quotation
                      </button>
                      <button
                        onClick={() => onTransition(sub.id, 'CONFIRMED')}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                      >
                        Confirm Order
                      </button>
                    </>
                  )}
                  {sub.status === 'QUOTATION' && (
                    <button
                      onClick={() => onTransition(sub.id, 'CONFIRMED')}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                    >
                      Customer Approved → Confirm
                    </button>
                  )}
                  {sub.status === 'CONFIRMED' && (
                    <button
                      onClick={() => onTransition(sub.id, 'ACTIVE')}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                    >
                      Activate Subscription
                    </button>
                  )}
                  {sub.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => onGenerateInvoice(sub.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Generate Due Invoice
                      </button>
                      <button
                        onClick={() => onTransition(sub.id, 'CLOSED')}
                        className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    </>
                  )}
                  {sub.status === 'CLOSED' && (
                    <button
                      onClick={() => onTransition(sub.id, 'DRAFT')}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    >
                      Re-open as Draft
                    </button>
                  )}
                </div>
              </div>

              {/* Subscription Details & Line Items */}
              <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Plan Cadence:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {plan?.name} ({plan?.cadence})
                  </div>
                  <div className="text-slate-500 mt-0.5">Terms: Net {sub.paymentTermsDays} days</div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Next Billing Date:</span>
                  <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    {sub.nextBillingDate}
                  </div>
                  <div className="text-slate-500 mt-0.5">Estimated Total: {formatCurrency(subTotal)}</div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Contract Line Items:</span>
                  <ul className="mt-1 space-y-1">
                    {sub.lines.map((ln) => (
                      <li key={ln.id} className="flex justify-between text-slate-700">
                        <span>
                          {ln.productName} × {ln.quantity}
                        </span>
                        <span className="font-medium">{formatCurrency(ln.unitPricePaise * ln.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
