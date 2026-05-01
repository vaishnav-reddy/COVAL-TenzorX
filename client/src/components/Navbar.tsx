import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, CreditCard, Lock, Globe, User, LayoutDashboard } from 'lucide-react';
import { clsx } from 'clsx';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Orders', path: '/admin' },
    { label: 'Get Support', path: '#' },
    { label: 'Create Document', path: '#' },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 shrink-0">
          <div className="bg-indigo-600 text-white font-extrabold text-sm px-2 py-1 rounded flex items-center gap-1">
            COVAL
            <span className="text-indigo-200 text-[10px]">✦</span>
          </div>
        </button>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => item.path !== '#' && navigate(item.path)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                location.pathname === item.path
                  ? 'text-indigo-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors">
            <Sparkles className="w-3.5 h-3.5" />
            Ask COVAL AI
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors">
            <CreditCard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bill Payments</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors">
            <span className="font-semibold">₹ 20</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors">
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Locker</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors">
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">En</span>
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <User className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </nav>
  );
}
