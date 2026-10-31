import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '580px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={backdropStyle}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ ...boxStyle, maxWidth }}
      >
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#142b4a' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={closeBtnStyle}
          >
            ✕
          </button>
        </div>

        <div style={bodyStyle}>{children}</div>

        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  );
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '16px',
};

const boxStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  width: '100%',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '18px 24px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const closeBtnStyle: React.CSSProperties = {
  background: '#f1f5f9',
  border: 'none',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  fontSize: '14px',
  color: '#64748b',
  cursor: 'pointer',
};

const bodyStyle: React.CSSProperties = {
  padding: '24px',
  overflowY: 'auto',
  fontSize: '14px',
  color: '#334155',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  background: '#f8fafc',
};

