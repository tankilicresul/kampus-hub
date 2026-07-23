import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw, Lock, Mail } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signIn, signUp, errorMessage, status } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (isLoginTab) {
      await signIn(email.trim(), password.trim());
    } else {
      await signUp(email.trim(), password.trim());
    }
  };

  return (
    <div className="auth-container">
      {/* Brand Side Panel */}
      <div className="auth-brand-panel">
        <div className="brand-logo-badge">
          <img src="/logo.png" alt="Kampüs Hub Logo" />
        </div>
        <div className="auth-brand-title">Kampüs Hub</div>
        <div className="auth-brand-desc">
          Operasyonlarınızı, görevlerinizi ve satış süreçlerinizi tek bir noktadan yönetin.
        </div>
      </div>

      {/* Form Side Panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>
              {isLoginTab ? 'Giriş Yap' : 'Hesap Oluştur'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
              Yönetici veya ekip üyesi hesabı ile devam edin.
            </p>
          </div>

          {/* Tab switchers */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <button 
              type="button"
              style={{ 
                flex: 1, 
                padding: '10px', 
                background: 'none', 
                border: 'none', 
                color: isLoginTab ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom: isLoginTab ? '2px solid var(--accent-color)' : 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
              onClick={() => setIsLoginTab(true)}
            >
              Giriş Yap
            </button>
            <button 
              type="button"
              style={{ 
                flex: 1, 
                padding: '10px', 
                background: 'none', 
                border: 'none', 
                color: !isLoginTab ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom: !isLoginTab ? '2px solid var(--accent-color)' : 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
              onClick={() => setIsLoginTab(false)}
            >
              Kayıt Ol
            </button>
          </div>

          {errorMessage && (
            <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">E-posta Adresi</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="isim@kampuskapinda.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Şifre</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={status === 'checking'}
              style={{ marginTop: '8px' }}
            >
              {status === 'checking' ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : isLoginTab ? (
                'Giriş Yap'
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
