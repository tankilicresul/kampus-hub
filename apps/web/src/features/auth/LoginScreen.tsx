import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { usePageMetadata, type PageMetadata } from '../../hooks/usePageMetadata';

export const LoginScreen: React.FC = () => {
  const { signIn, signUp, errorMessage, status } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const homeMetadata: PageMetadata = useMemo(() => ({
    title: 'TanCoreLab — Görev, CRM ve Ekip Yönetim Platformu',
    description: 'TanCoreLab ile görevlerinizi takip edin, CRM süreçlerinizi yönetin, günlük raporlar oluşturun ve ekip operasyonlarını tek çalışma alanından yönetin.',
    canonical: 'https://tancorelab.com/',
    robots: 'index, follow',
    ogType: 'website',
    ogTitle: 'TanCoreLab — Görev, CRM ve Ekip Yönetim Platformu',
    ogDescription: 'TanCoreLab ile görevlerinizi takip edin, CRM süreçlerinizi yönetin, günlük raporlar oluşturun ve ekip operasyonlarını tek çalışma alanından yönetin.',
    ogUrl: 'https://tancorelab.com/',
    twitterCard: 'summary',
    twitterTitle: 'TanCoreLab — Görev, CRM ve Ekip Yönetim Platformu',
    twitterDescription: 'TanCoreLab ile görevlerinizi takip edin, CRM süreçlerinizi yönetin, günlük raporlar oluşturun ve ekip operasyonlarını tek çalışma alanından yönetin.',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': 'https://tancorelab.com/#website',
        'url': 'https://tancorelab.com/',
        'name': 'TanCoreLab',
        'alternateName': ['TanCore Lab']
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': 'https://tancorelab.com/#webapp',
        'url': 'https://tancorelab.com/',
        'name': 'TanCoreLab',
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'All',
        'description': 'TanCoreLab ile görevlerinizi takip edin, CRM süreçlerinizi yönetin, günlük raporlar oluşturun ve ekip operasyonlarını tek çalışma alanından yönetin.'
      }
    ]
  }), []);

  usePageMetadata(homeMetadata);

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
          <img src="/logo.svg" alt="TanCoreLab Logo" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        <div className="auth-brand-title">TanCoreLab</div>
        <div className="auth-brand-desc">
          Girişim ekosistemine katılın. Tüm işlerinizi ve süreçlerinizi tek yerden yönetin.
        </div>

        {/* Developer Attribution Card (Desktop) */}
        <div style={{ marginTop: '40px', padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-color, #ff9f0a)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            TanCoreLab'in geliştiricisi
          </div>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.5, margin: '0 0 12px' }}>
            TanCoreLab, Resul Tankılıç tarafından geliştirilen görev, CRM, ekip ve operasyon yönetim platformudur.
          </p>
          <Link
            to="/resul-tankilic"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', textDecoration: 'none', transition: 'gap 0.2s ease' }}
          >
            Resul Tankılıç hakkında <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Form Side Panel (Desktop + Mobile Fullscreen) */}
      <div className="auth-form-panel">
        <div className="auth-card">
          {/* Mobile-Only Header with Large Logo (Transparent Background) */}
          <div className="auth-mobile-brand">
            <div className="brand-logo-large mobile-logo">
              <img src="/logo.svg" alt="TanCoreLab Logo" style={{ objectFit: 'contain' }} />
            </div>
            <div className="auth-brand-title mobile-title">TanCoreLab</div>
            <div className="auth-mobile-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '6px', maxWidth: '320px', fontWeight: 500, lineHeight: '1.4' }}>
              Girişim ekosistemine katılın. Tüm işlerinizi ve süreçlerinizi tek yerden yönetin.
            </div>
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
                  placeholder="isim@tancorelab.com"
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

          {/* Developer Attribution (Mobile Only) & Footer Links */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.4 }}>
              TanCoreLab, Resul Tankılıç tarafından geliştirilen görev, CRM, ekip ve operasyon yönetim platformudur.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.85rem' }}>
              <Link to="/resul-tankilic" style={{ color: 'var(--accent-color)', fontWeight: 700, textDecoration: 'none' }}>
                Resul Tankılıç hakkında
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
