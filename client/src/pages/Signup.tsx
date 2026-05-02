import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', company: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('Fill all required fields'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      login(data.user, data.token);
      toast.success(`Welcome, ${form.name}!`);
      navigate('/app/new-applicant');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all placeholder:text-gray-400 bg-[#FAFAFA]';

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans selection:bg-[#1a1a1a] selection:text-white flex flex-col">
      {/* Minimal nav */}
      <nav className="absolute top-0 w-full px-8 py-6 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center">
          <img src="/coval-logo.png" alt="COVAL Logo" className="h-6" />
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12 w-full mt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-8 text-center">
            <h1 className="text-[28px] font-semibold text-[#111] tracking-tight mb-2">Create an account</h1>
            <p className="text-[15px] text-gray-500 font-medium">Start valuating properties in seconds.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Full Name</label>
              <input type="text" className={inputClass} placeholder="Rahul Sharma" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Work Email</label>
              <input type="email" className={inputClass} placeholder="you@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Company / NBFC Name <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="text" className={inputClass} placeholder="e.g. Tata Capital" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={inputClass + ' pr-12'}
                  placeholder="Min. 6 characters"
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
              className="w-full py-3.5 bg-[#1A1A1A] hover:bg-black text-white font-medium rounded-xl text-[15px] transition-all shadow-sm disabled:opacity-70 mt-4"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-10 text-[14px] font-medium text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#111] hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
