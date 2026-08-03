import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessDeniedView: React.FC = () => {
  const { errorMessage, logOut } = useAuth();
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <ShieldAlert size={48} style={{ color: 'var(--color-danger)', margin: '0 auto' }} />
        <div className="auth-title">Erişim Engellendi</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          {errorMessage || 'Bu hesaba erişim yetkiniz bulunmuyor.'}
        </p>
        <button className="btn btn-secondary btn-block" onClick={logOut}>
          <LogOut size={16} />
          <span>Girişe Dön</span>
        </button>
      </div>
    </div>
  );
};
