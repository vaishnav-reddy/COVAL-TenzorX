import { useNavigate, useLocation } from 'react-router-dom';
import { Cpu, LayoutDashboard, PlusCircle } from 'lucide-react';
import { clsx } from 'clsx';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'New Valuation', path: '/', icon: PlusCircle },
    { label: 'Admin', path: '/admin', icon: LayoutDashboard },
  ];

  return (
    <nav className="border-b border-white/8 bg-[#071428]/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#1a9eff]/20 flex items-center justify-center group-hover:bg-[#1a9eff]/30 transition-colors">
            <Cpu className="w-4 h-4 text-[#1a9eff]" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">COVAL</span>
          <span className="text-[10px] text-[#1a9eff] bg-[#1a9eff]/10 px-1.5 py-0.5 rounded font-medium">NBFC</span>
        </button>
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                location.pathname === item.path
                  ? 'bg-[#1a9eff]/15 text-[#1a9eff]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
