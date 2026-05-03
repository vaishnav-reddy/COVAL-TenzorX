import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Fill all fields'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      login(data.user, data.token);
      toast.success('Welcome back!');
      navigate('/app/new-applicant');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@coval.ai', password: 'demo@123' })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Demo login failed');
      }
      
      login(data.user, data.token);
      toast.success('Logged in as Hackathon Judge!');
      navigate('/app/new-applicant');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all placeholder:text-gray-400 bg-[#FAFAFA]';

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans selection:bg-[#1a1a1a] selection:text-white flex flex-col">
      {/* Minimal nav */}
      <nav className="absolute top-0 w-full px-8 py-6 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center">
          <img src="/coval-logo.png" alt="COVAL Logo" className="h-6" />
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-8 text-center">
            <h1 className="text-[28px] font-semibold text-[#111] tracking-tight mb-2">Welcome back</h1>
            <p className="text-[15px] text-gray-500 font-medium">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                className={inputClass}
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[13px] font-semibold text-gray-700">Password</label>
                <Link to="#" className="text-[13px] font-medium text-gray-500 hover:text-[#111] transition-colors">Forgot?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={inputClass + ' pr-12'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#1A1A1A] hover:bg-black text-white font-medium rounded-xl text-[15px] transition-all shadow-sm disabled:opacity-70 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center justify-center text-[13px] font-medium text-gray-400 mb-6 uppercase tracking-wider">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <span className="relative bg-[#FDFDFD] px-4">For Hackathon Judges</span>
            </div>

            <button
              onClick={handleDemoLogin}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3.5 border border-[#EAEAEA] bg-white text-[#111] font-medium rounded-xl text-[15px] hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              Use Demo Credentials <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="text-center mt-10 text-[14px] font-medium text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#111] hover:underline font-semibold">
              Create an account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
