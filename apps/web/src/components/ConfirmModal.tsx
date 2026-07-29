import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Evet',
  cancelText = 'İptal',
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '400px', width: '90%', padding: '24px', borderRadius: '16px', textAlign: 'center' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '50%', 
            backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDestructive ? '#ef4444' : '#3b82f6'
          }}>
            <AlertTriangle size={24} />
          </div>
        </div>
        
        <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
            style={{ flex: 1, padding: '10px 0', fontSize: '0.9rem', fontWeight: 600 }}
          >
            {cancelText}
          </button>
          <button 
            className="btn" 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            style={{ 
              flex: 1, padding: '10px 0', fontSize: '0.9rem', fontWeight: 600,
              backgroundColor: isDestructive ? '#ef4444' : 'var(--accent-color)',
              color: '#fff', border: 'none'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
