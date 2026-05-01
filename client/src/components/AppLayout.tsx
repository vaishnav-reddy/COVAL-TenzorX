import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';

export function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Permanent sidebar — always visible */}
      <Sidebar />
      {/* Main content area offset by sidebar width */}
      <main className="flex-1 ml-56 h-full overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
