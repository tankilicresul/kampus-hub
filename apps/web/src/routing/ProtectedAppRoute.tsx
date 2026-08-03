import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../app_layout';
import { AuthLoader } from './AuthLoader';
import { AccessDeniedView } from './AccessDeniedView';

export const ProtectedAppRoute: React.FC = () => {
  const { status } = useAuth();

  if (status === 'checking') {
    return <AuthLoader />;
  }

  if (status === 'error') {
    return <AccessDeniedView />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};
