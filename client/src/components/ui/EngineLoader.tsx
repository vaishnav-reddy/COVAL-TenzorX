import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const ENGINES = [
  'Initializing Valuation Engine...',
  'Running Liquidity Analysis...',
  'Computing Distress Value...',
  'Scanning for Risk & Fraud Signals...',
  'Calculating Confidence Score...',
  'Compiling Audit Trail...',
];

export function EngineLoader() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < ENGINES.length - 1 ? s + 1 : s));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Loader2 className="w-5 h-5 text-indigo-600" />
            </motion.div>
          </div>
          <div>
            <h3 className="text-gray-900 font-semibold">COVAL Engines Running</h3>
            <p className="text-gray-500 text-sm">Processing your property valuation</p>
          </div>
        </div>
        <div className="space-y-3">
          {ENGINES.map((engine, i) => (
            <AnimatePresence key={engine}>
              {i <= step && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3"
                >
                  {i < step ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="shrink-0">
                      <Loader2 className="w-4 h-4 text-indigo-600" />
                    </motion.div>
                  )}
                  <span className={`text-sm ${i < step ? 'text-emerald-600' : 'text-gray-800'}`}>{engine}</span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
        <div className="mt-6">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-600 rounded-full"
              animate={{ width: `${((step + 1) / ENGINES.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
