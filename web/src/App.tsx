import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Integrations } from '@/pages/Integrations';
import { Services } from '@/pages/Services';
import { Networks } from '@/pages/Networks';
import { Devices } from '@/pages/Devices';
import { DeviceDetailsPage } from '@/pages/DeviceDetails';
import { Settings } from '@/pages/Settings';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
      <Route path="/networks" element={<ProtectedRoute adminOnly><Networks /></ProtectedRoute>} />
      <Route path="/devices" element={<ProtectedRoute adminOnly><Devices /></ProtectedRoute>} />
      <Route path="/devices/:id" element={<ProtectedRoute adminOnly><DeviceDetailsPage /></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute adminOnly><Integrations /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
