import React, { useEffect, useState } from 'react';
import type { IntegrationMode } from '../../services/api/client';
import {
  getIntegrationMode,
  subscribeIntegrationMode,
} from '../../services/api/client';
import { storageAdapter } from '../../services/api/storageAdapter';
import { useToast } from '../../context/ToastContext';

export const IntegrationBadge: React.FC = () => {
  const [mode, setMode] = useState<IntegrationMode>(getIntegrationMode());
  const { showToast } = useToast();

  useEffect(() => {
    return subscribeIntegrationMode((newMode) => {
      setMode(newMode);
    });
  }, []);

  const handleResetData = () => {
    if (confirm('Reset demo data to initial seeded state?')) {
      storageAdapter.resetStore();
      showToast('Demo store reset to initial state', 'success');
      window.location.reload();
    }
  };

  const isLive = mode === 'live_backend';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 12px',
        borderRadius: '20px',
        background: isLive ? '#ecfdf5' : '#fef3c7',
        border: `1px solid ${isLive ? '#a7f3d0' : '#fde68a'}`,
        fontSize: '11px',
        fontWeight: 600,
        color: isLive ? '#065f46' : '#92400e',
      }}
      title={
        isLive
          ? 'Connected to live FastAPI backend at http://localhost:8000/api'
          : 'Backend routes not detected. Using isolated local adapter conforming to backend SQLModel contracts.'
      }
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: isLive ? '#10b981' : '#f59e0b',
        }}
      />
      <span>{isLive ? 'Backend: Live API' : 'Backend: Isolated Adapter'}</span>

      <button
        type="button"
        onClick={handleResetData}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0 2px',
          color: isLive ? '#065f46' : '#92400e',
          fontSize: '11px',
          textDecoration: 'underline',
        }}
        title="Reset seeded demo store"
      >
        Reset Data
      </button>
    </div>
  );
};
