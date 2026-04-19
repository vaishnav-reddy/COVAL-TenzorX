import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ValuationProvider } from './context/ValuationContext';
import { Navbar } from './components/Navbar';
import PropertyForm from './pages/PropertyForm';
import ValuationDashboard from './pages/ValuationDashboard';
import FullReport from './pages/FullReport';
import AdminDashboard from './pages/AdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ValuationProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<PropertyForm />} />
            <Route path="/dashboard/:id" element={<ValuationDashboard />} />
            <Route path="/report/:id" element={<FullReport />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#0d2044', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </ValuationProvider>
    </QueryClientProvider>
  );
}
