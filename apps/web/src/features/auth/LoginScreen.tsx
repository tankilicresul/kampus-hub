import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw, Lock, Mail, User } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signIn, signUp, errorMessage, status } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (!isLoginTab && !fullName.trim()) return;

    if (isLoginTab) {
      await signIn(email.trim(), password.trim());
    } else {
      await signUp(email.trim(), password.trim(), fullName.trim());
    }
  };

  return (
    <div className="auth-container">
      {/* Brand Side Panel (Desktop) */}
      <div className="auth-brand-panel">
        <div className="brand-logo-large">
          <img src="/logo.svg" alt="Kampüs Hub Logo" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        <div className="auth-brand-title">Kampüs Hub</div>
        <div className="auth-brand-desc">
          Tüm işlerinizi ve süreçlerinizi tek yerden yönetin.
        </div>
      </div>

      {/* Form Side Panel (Desktop + Mobile Fullscreen) */}
      <div className="auth-form-panel">
        <div className="auth-card">
          {/* Mobile-Only Header with Large Logo (Transparent Background) */}
          <div className="auth-mobile-brand">
            <div className="brand-logo-large mobile-logo">
              <img src="/logo.svg" alt="Kampüs Hub Logo" style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <div className="auth-brand-title mobile-title">Kampüs Hub</div>
          </div>

          <div className="auth-header" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>
              {isLoginTab ? 'Giriş' : 'Kayıt'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '6px' }}>
              {isLoginTab 
                ? 'Hesabınızla hemen giriş yapın.' 
                : 'Bilgileri girip hemen kayıt olun.'}
            </p>
          </div>

          {/* Tab switchers */}
          <div className="auth-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '28px' }}>
            <button 
              type="button"
              className={`auth-tab-btn ${isLoginTab ? 'active' : ''}`}
              style={{ 
                flex: 1, 
                padding: '12px', 
                background: 'none', 
                border: 'none', 
                color: isLoginTab ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom: isLoginTab ? '3px solid var(--accent-color)' : 'none',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setIsLoginTab(true)}
            >
              Giriş
            </button>
            <button 
              type="button"
              className={`auth-tab-btn ${!isLoginTab ? 'active' : ''}`}
              style={{ 
                flex: 1, 
                padding: '12px', 
                background: 'none', 
                border: 'none', 
                color: !isLoginTab ? 'var(--accent-color)' : 'var(--text-secondary)',
                borderBottom: !isLoginTab ? '3px solid var(--accent-color)' : 'none',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setIsLoginTab(false)}
            >
              Kayıt
            </button>
          </div>

          {errorMessage && (
            <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Show First Name & Last Name field when Registering */}
            {!isLoginTab && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                  Ad Soyad
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '44px', height: '48px', fontSize: '0.95rem' }}
                    placeholder="Ahmet Yılmaz"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                E-posta
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px', height: '48px', fontSize: '0.95rem' }}
                  placeholder="isim@kampuskapinda.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                Şifre
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px', height: '48px', fontSize: '0.95rem' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={status === 'checking'}
              style={{ 
                marginTop: '10px', 
                height: '52px', 
                fontSize: '1rem', 
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {status === 'checking' ? (
                <RefreshCw className="animate-spin" size={20} />
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
