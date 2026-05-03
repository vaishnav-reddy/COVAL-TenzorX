import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';

export function AppLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isNewApp = location.pathname === '/app/new-applicant';
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isNewApp);

  useEffect(() => {
    setIsSidebarOpen(!isNewApp);
  }, [isNewApp]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden relative print:block print:h-auto print:overflow-visible">
      {/* Sidebar toggle button when hidden */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-40 p-2.5 bg-white border border-[#E5E5E5] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-gray-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-gray-700 transition-all print:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar Overlay for mobile/toggle */}
      {isSidebarOpen && isNewApp && (
        <div 
          className="fixed inset-0 bg-[#111]/20 backdrop-blur-sm z-40 transition-opacity print:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isToggleable={isNewApp} />
      
      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen && !isNewApp ? 'ml-[260px]' : 'ml-0'} h-full overflow-y-auto relative print:ml-0 print:h-auto print:overflow-visible`}>
        <Outlet />
      </main>
    </div>
  );
}
