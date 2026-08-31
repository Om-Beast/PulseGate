import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardProvider } from './contexts/DashboardContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ErrorBoundary } from './layouts/ErrorBoundary';
import { OverviewPage } from './pages/OverviewPage';
import { ServicesPage } from './pages/ServicesPage';
import { TrafficPage } from './pages/TrafficPage';
import { RateLimitsPage } from './pages/RateLimitsPage';
import { RequestsPage } from './pages/RequestsPage';
import { SystemPage } from './pages/SystemPage';

export default function App() {
  return (
    <ErrorBoundary>
      <DashboardProvider>
        <BrowserRouter>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/traffic" element={<TrafficPage />} />
              <Route path="/rate-limits" element={<RateLimitsPage />} />
              <Route path="/requests" element={<RequestsPage />} />
              <Route path="/system" element={<SystemPage />} />
            </Routes>
          </DashboardLayout>
        </BrowserRouter>
      </DashboardProvider>
    </ErrorBoundary>
  );
}
