import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { ShieldCheck, UserCheck, Building2, KeyRound } from 'lucide-react';
import type { Role } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: Role) => void;
}

export function AuthModal({ isOpen, onClose, onSelectRole }: AuthModalProps) {
  const [selectedRole, setSelectedRole] = useState<Role>('ADMIN');

  const handleConfirm = () => {
    onSelectRole(selectedRole);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign in to Brightloop"
      subtitle="Choose a demo persona to test role-scoped permissions"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {/* Admin Role Card */}
          <div
            onClick={() => setSelectedRole('ADMIN')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              selectedRole === 'ADMIN'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Administrator</h4>
                <p className="text-xs text-slate-500">admin@brightloop.demo · Full access & catalog management</p>
              </div>
            </div>
            <input
              type="radio"
              checked={selectedRole === 'ADMIN'}
              onChange={() => setSelectedRole('ADMIN')}
              className="text-indigo-600"
            />
          </div>

          {/* Staff Role Card */}
          <div
            onClick={() => setSelectedRole('STAFF')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              selectedRole === 'STAFF'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Operations Staff</h4>
                <p className="text-xs text-slate-500">staff@brightloop.demo · Subscriptions & billing operations</p>
              </div>
            </div>
            <input
              type="radio"
              checked={selectedRole === 'STAFF'}
              onChange={() => setSelectedRole('STAFF')}
              className="text-indigo-600"
            />
          </div>

          {/* Customer Role Card */}
          <div
            onClick={() => setSelectedRole('CUSTOMER')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              selectedRole === 'CUSTOMER'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Customer Portal</h4>
                <p className="text-xs text-slate-500">customer@brightloop.demo · Scoped to Aarav Tech records</p>
              </div>
            </div>
            <input
              type="radio"
              checked={selectedRole === 'CUSTOMER'}
              onChange={() => setSelectedRole('CUSTOMER')}
              className="text-indigo-600"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Enter Brightloop OS
          </button>
        </div>
      </div>
    </Modal>
  );
}
