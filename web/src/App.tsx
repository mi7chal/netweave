import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Integrations } from './pages/Integrations';
import { Services } from './pages/Services';
import { Networks } from './pages/Networks';
import { Devices } from './pages/Devices';
import { DeviceDetailsPage } from './pages/DeviceDetails';


function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/services" element={<Services />} />
      <Route path="/networks" element={<Networks />} />
      <Route path="/devices" element={<Devices />} />
      <Route path="/devices/:id" element={<DeviceDetailsPage />} />
    </Routes>
  )
}

export default App
