import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ValuationProvider } from './context/ValuationContext';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PropertyForm from './pages/PropertyForm';
import ValuationDashboard from './pages/ValuationDashboard';
import FullReport from './pages/FullReport';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import LandOCR from './pages/LandOCR';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ValuationProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected app routes — sidebar layout */}
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="/app/new-applicant" replace />} />
                <Route path="new-applicant" element={<PropertyForm />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard/:id" element={<ValuationDashboard />} />
                <Route path="valuation/:id" element={<ValuationDashboard />} />
                <Route path="report/:id" element={<FullReport />} />
                <Route path="all-records" element={<AdminDashboard />} />
                <Route path="history" element={<AdminDashboard />} />
                <Route path="land-ocr" element={<LandOCR />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#fff', color: '#1a1a2e', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </ValuationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
