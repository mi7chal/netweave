import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Integrations } from "@/pages/Integrations";
import { Services } from "@/pages/Services";
import { Networks } from "@/pages/Networks";
import { Devices } from "@/pages/Devices";
import { DeviceDetailsPage } from "@/pages/DeviceDetails";
import { Users } from "@/pages/Users";
import { Settings } from "@/pages/Settings";
import { AuthCallback } from "@/pages/AuthCallback";
import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api-client";

function ProtectedRoute({
  children,
  adminOnly = false,
  allowPublic = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  allowPublic?: boolean;
}) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) return null;
  if (allowPublic) return <>{children}</>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function App() {
  const [homepagePublic, setHomepagePublic] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    fetchApi<Record<string, string>>("/api/settings/public", { silent: true })
      .then((data) => {
        setHomepagePublic(data.homepage_public === "true");
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  if (!settingsLoaded) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowPublic={homepagePublic}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute adminOnly>
            <Services />
          </ProtectedRoute>
        }
      />
      <Route
        path="/networks"
        element={
          <ProtectedRoute adminOnly>
            <Networks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices"
        element={
          <ProtectedRoute adminOnly>
            <Devices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices/:id"
        element={
          <ProtectedRoute adminOnly>
            <DeviceDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute adminOnly>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/integrations"
        element={
          <ProtectedRoute adminOnly>
            <Integrations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute adminOnly>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
