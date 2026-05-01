import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ShieldCheck, TrendingUp, FileText, ArrowRight, Cpu } from 'lucide-react';

const FEATURES = [
  {
    icon: Building2,
    title: 'AI-Powered Valuation',
    desc: 'Get instant, accurate property valuations backed by 5 AI engines running in sequence.',
  },
  {
    icon: ShieldCheck,
    title: 'Fraud Detection',
    desc: 'Automatically flags valuation anomalies, over-circle-rate deviations, and CERSAI risks.',
  },
  {
    icon: TrendingUp,
    title: 'Liquidity & Distress Analysis',
    desc: 'Know the real liquidation value and time-to-sell before approving any loan.',
  },
  {
    icon: FileText,
    title: 'RBI-Compliant Reports',
    desc: 'Printable audit-ready reports with full methodology, comparables, and lender recommendations.',
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">COVAL</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">NBFC</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-indigo-50/60 to-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-block text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-4">
            AI-Powered Collateral Valuation for NBFCs
          </span>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-5 leading-tight max-w-2xl mx-auto">
            Smarter property valuations,<br />
            <span className="text-indigo-600">instantly.</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
            COVAL replaces manual collateral assessment with AI — giving you a confidence-backed value range, fraud flags, and RBI-compliant reports in seconds.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Start for free <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Log in
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20 w-full">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Everything your lending team needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-5 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} COVAL · AI Collateral Valuation Engine
      </footer>
    </div>
  );
}
