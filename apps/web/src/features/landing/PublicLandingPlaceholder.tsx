import React from 'react';
import { Link } from 'react-router-dom';

export const PublicLandingPlaceholder: React.FC = () => {
  return (
    <div className="auth-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="auth-card" style={{ maxWidth: '520px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <img 
          src="/logo.svg" 
          alt="TanCoreLab Logo" 
          style={{ width: '64px', height: '64px', objectFit: 'contain' }} 
        />
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
          TanCoreLab — Görev, CRM ve Ekip Yönetim Platformu
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
          TanCoreLab ile görevlerinizi takip edin, CRM süreçlerinizi yönetin, günlük raporlar oluşturun ve ekip operasyonlarını tek çalışma alanından yönetin.
        </p>
        <Link 
          to="/login" 
          className="btn btn-primary btn-block" 
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', fontSize: '1rem', marginTop: '10px' }}
        >
          Giriş Yap / Hesabım
        </Link>
      </div>
    </div>
  );
};
