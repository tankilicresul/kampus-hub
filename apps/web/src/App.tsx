import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLandingPlaceholder } from './features/landing/PublicLandingPlaceholder';
import { AuthenticatedShell } from './routing/AuthenticatedShell';
import { LoginRoute } from './routing/LoginRoute';
import { ProtectedAppRoute } from './routing/ProtectedAppRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingPlaceholder />} />
      <Route element={<AuthenticatedShell />}>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/app/*" element={<ProtectedAppRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
