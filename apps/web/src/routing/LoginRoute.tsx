import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../features/auth/LoginScreen';
import { AuthLoader } from './AuthLoader';
import { AccessDeniedView } from './AccessDeniedView';

export const LoginRoute: React.FC = () => {
  const { status } = useAuth();

  if (status === 'checking') {
    return <AuthLoader />;
  }

  if (status === 'error') {
    return <AccessDeniedView />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/app" replace />;
  }

  return <LoginScreen />;
};
