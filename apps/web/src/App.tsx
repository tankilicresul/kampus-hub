import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LoginScreen } from './features/auth/LoginScreen';
import { AppLayout } from './app_layout';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

const NavigationContainer: React.FC = () => {
  const { status, errorMessage, logOut } = useAuth();
  const [minLoadingDone, setMinLoadingDone] = useState(false);

  useEffect(() => {
    // Show the gorgeous loader for at least 2.8 seconds
    const timer = setTimeout(() => {
      setMinLoadingDone(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  if (status === 'checking' || !minLoadingDone) {
    return (
      <div className="tc-loader-wrap">
        {/* Breathing logo */}
        <div className="tc-loader-logo">
          <img src="/logo.svg" alt="" />
        </div>

        {/* Orbit ring spinner */}
        <div className="tc-spinner-ring" style={{ position: 'relative' }}>
          <div className="tc-orbit" />
        </div>

        {/* Bouncing dots */}
        <div className="tc-dots">
          <div className="tc-dot" />
          <div className="tc-dot" />
          <div className="tc-dot" />
        </div>
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
      <NotificationProvider>
        <NavigationContainer />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
