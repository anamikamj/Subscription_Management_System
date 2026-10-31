import React, { createContext, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" style={toastContainerStyle}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...toastItemStyle,
              ...(toast.type === 'success'
                ? { background: '#059669', color: '#fff' }
                : toast.type === 'error'
                ? { background: '#dc2626', color: '#fff' }
                : toast.type === 'warning'
                ? { background: '#d97706', color: '#fff' }
                : { background: '#1e293b', color: '#fff' }),
            }}
          >
            <span>
              {toast.type === 'success' && '✓ '}
              {toast.type === 'error' && '✕ '}
              {toast.type === 'warning' && '⚠ '}
              {toast.type === 'info' && 'ℹ '}
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const toastContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  zIndex: 99999,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  pointerEvents: 'none',
};

const toastItemStyle: React.CSSProperties = {
  padding: '12px 18px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  display: 'flex',
  alignItems: 'center',
  maxWidth: '380px',
  animation: 'slideUp 0.25s ease-out',
  pointerEvents: 'auto',
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

