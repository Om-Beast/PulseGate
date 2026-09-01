import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardProvider } from './contexts/DashboardContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ErrorBoundary } from './layouts/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';

// Lazy-load pages for code splitting
const OverviewPage   = lazy(() => import('./pages/OverviewPage').then(m => ({ default: m.OverviewPage })));
const TrafficPage    = lazy(() => import('./pages/TrafficPage').then(m => ({ default: m.TrafficPage })));
const ServicesPage   = lazy(() => import('./pages/ServicesPage').then(m => ({ default: m.ServicesPage })));
const RateLimitsPage = lazy(() => import('./pages/RateLimitsPage').then(m => ({ default: m.RateLimitsPage })));
const RequestsPage   = lazy(() => import('./pages/RequestsPage').then(m => ({ default: m.RequestsPage })));
const FailuresPage   = lazy(() => import('./pages/FailuresPage').then(m => ({ default: m.FailuresPage })));
const SystemPage     = lazy(() => import('./pages/SystemPage').then(m => ({ default: m.SystemPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <svg className="w-5 h-5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  );
}

function ProtectedApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <DashboardProvider>
      <BrowserRouter>
        <DashboardLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/traffic" element={<TrafficPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/rate-limits" element={<RateLimitsPage />} />
              <Route path="/requests" element={<RequestsPage />} />
              <Route path="/failures" element={<FailuresPage />} />
              <Route path="/system" element={<SystemPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </DashboardLayout>
      </BrowserRouter>
    </DashboardProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
