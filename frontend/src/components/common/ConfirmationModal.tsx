import React from 'react';
import { Modal } from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="440px"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={cancelBtnStyle}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              ...confirmBtnStyle,
              background: isDestructive ? '#dc2626' : '#2563eb',
            }}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, lineHeight: 1.6, color: '#475569' }}>{message}</p>
    </Modal>
  );
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  color: '#475569',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
};

const confirmBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: '8px',
  border: 'none',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

