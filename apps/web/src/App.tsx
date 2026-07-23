import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './features/auth/LoginScreen';
import { AppLayout } from './app_layout';
import { RefreshCw, ShieldAlert, LogOut } from 'lucide-react';

const NavigationContainer: React.FC = () => {
  const { status, errorMessage, logOut } = useAuth();

  if (status === 'checking') {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: 'var(--bg-main)', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
        <RefreshCw className="animate-spin" size={48} style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LoginScreen />;
  }

  if (status === 'error') {
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
  }

  return <AppLayout />;
};

function App() {
  return (
    <AuthProvider>
      <NavigationContainer />
    </AuthProvider>
  );
}

export default App;
