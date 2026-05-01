import { useNavigate, useLocation } from 'react-router-dom';
import { Cpu, UserPlus, LayoutDashboard, FileText, LogOut, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const NAV_SECTIONS = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'APPLICATIONS',
    items: [
      { label: 'Add Applicant', path: '/app/new-applicant', icon: UserPlus },
    ],
  },
  {
    label: 'REPORTS',
    items: [
      { label: 'All Reports', path: '/app/history', icon: FileText },
    ],
  },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 z-40 flex flex-col bg-white border-r border-gray-100">
      {/* ── Logo ── */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Cpu style={{ width: 16, height: 16 }} className="text-white" />
        </div>
        <span className="font-bold text-gray-900 text-[15px] tracking-tight">COVAL</span>
        <span className="ml-auto text-[9px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-bold tracking-wide">
          NBFC
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  location.pathname === item.path ||
                  (item.path !== '/app/dashboard' &&
                    location.pathname.startsWith(item.path));
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                      active
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User ── */}
      <div className="border-t border-gray-100 p-3 relative shrink-0">
        <button
          onClick={() => setShowUserMenu((v) => !v)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email || ''}</p>
          </div>
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
            <div className="px-3 py-2.5 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-800">{user?.name}</p>
              <p className="text-[10px] text-gray-400">{user?.email}</p>
            </div>
            <button
              onClick={() => setShowUserMenu(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <User className="w-3.5 h-3.5" /> Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
