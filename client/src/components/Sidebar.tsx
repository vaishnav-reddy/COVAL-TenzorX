import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, LayoutDashboard, FileText, LogOut, User, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const NAV_SECTIONS = [
  {
    label: 'APPLICATIONS',
    items: [
      { label: 'New Application', path: '/app/new-applicant', icon: UserPlus },
    ],
  },
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'REPORTS',
    items: [
      { label: 'All Records', path: '/app/history', icon: FileText },
    ],
  },
];

export function Sidebar({ isOpen, setIsOpen, isToggleable }: { isOpen: boolean, setIsOpen: (o: boolean) => void, isToggleable: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className={clsx(
      "fixed left-0 top-0 h-screen w-[260px] z-50 flex flex-col bg-[#FDFDFD] border-r border-[#E5E5E5] transition-transform duration-300 print:hidden",
      isOpen ? "translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]" : "-translate-x-full"
    )}>
      {/* ── Logo ── */}
      <div className="h-24 flex items-center justify-between px-8 border-b border-[#E5E5E5]/60 shrink-0">
        <img src="/coval-logo.png" alt="COVAL Logo" className="h-5" />
        {isToggleable && (
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-[#111] transition-colors p-1">
             <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-4 py-8 space-y-8 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-3">
              {section.label}
            </p>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const active = location.pathname === item.path || (item.path !== '/app/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      navigate(item.path);
                      if (isToggleable) setIsOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] font-semibold transition-all text-left group',
                      active
                        ? 'bg-[#111] text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon className={clsx("w-[18px] h-[18px] shrink-0 transition-colors", active ? "text-white" : "text-gray-400 group-hover:text-gray-900")} strokeWidth={active ? 2.5 : 2} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User ── */}
      <div className="border-t border-[#E5E5E5]/60 p-4 relative shrink-0 bg-[#FDFDFD]">
        {showUserMenu && (
          <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-white border border-[#E5E5E5] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden z-50">
            <div className="px-4 py-3.5 border-b border-gray-50 bg-[#FAFAFA]">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-[11px] font-medium text-gray-400 truncate mt-0.5">{user?.email}</p>
            </div>
            <button onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-3 px-4 py-3.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left">
              <User className="w-4 h-4 text-gray-400" /> Profile
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors text-left border-t border-gray-50">
              <LogOut className="w-4 h-4 text-red-500" /> Sign out
            </button>
          </div>
        )}

        <button
          onClick={() => setShowUserMenu((v) => !v)}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all",
            showUserMenu ? "bg-white border-[#E5E5E5] shadow-sm" : "border-transparent hover:bg-gray-50 hover:border-[#E5E5E5]"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-[#111] flex items-center justify-center text-white font-bold text-[13px] shrink-0 shadow-inner">
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[13px] font-bold text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] font-medium text-gray-500 truncate mt-0.5">{user?.email || ''}</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
