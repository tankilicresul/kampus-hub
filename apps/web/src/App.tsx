import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedShell } from './routing/AuthenticatedShell';
import { LoginRoute } from './routing/LoginRoute';
import { ProtectedAppRoute } from './routing/ProtectedAppRoute';
import { ResulTankilicProfilePage } from './features/landing/ResulTankilicProfilePage';

function App() {
  return (
    <Routes>
      <Route path="/resul-tankilic" element={<ResulTankilicProfilePage />} />
      <Route element={<AuthenticatedShell />}>
        <Route path="/" element={<LoginRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/app/*" element={<ProtectedAppRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
