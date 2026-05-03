import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, TrendingUp, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface CibilData {
  score: string;
  existingLoans: string;
  existingEMIs: string;
}

interface CibilScorePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CibilData) => void;
  loading?: boolean;
}

export default function CibilScorePopup({ isOpen, onClose, onSubmit, loading = false }: CibilScorePopupProps) {
  const [formData, setFormData] = useState<CibilData>({
    score: '',
    existingLoans: '',
    existingEMIs: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CibilData, string>>>({});

  const validateForm = () => {
    const newErrors: Partial<Record<keyof CibilData, string>> = {};

    if (formData.score && (parseInt(formData.score) < 300 || parseInt(formData.score) > 900)) {
      newErrors.score = 'CIBIL score must be between 300-900';
    }

    if (formData.existingLoans && parseInt(formData.existingLoans) < 0) {
      newErrors.existingLoans = 'Invalid amount';
    }

    if (formData.existingEMIs && parseInt(formData.existingEMIs) < 0) {
      newErrors.existingEMIs = 'Invalid amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!formData.score) {
      // Allow skipping CIBIL score
      onSubmit({ score: '', existingLoans: '', existingEMIs: '' });
      onClose();
      return;
    }

    if (validateForm()) {
      onSubmit(formData);
      onClose();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 750) return 'text-emerald-600 bg-emerald-50';
    if (score >= 700) return 'text-green-600 bg-green-50';
    if (score >= 650) return 'text-amber-600 bg-amber-50';
    if (score >= 600) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 750) return 'Excellent';
    if (score >= 700) return 'Very Good';
    if (score >= 650) return 'Good';
    if (score >= 600) return 'Fair';
    return 'Poor';
  };

  const scoreNum = parseInt(formData.score) || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Credit Information</h2>
                  <p className="text-xs text-gray-400">Optional - Helps determine loan eligibility</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* CIBIL Score Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  CIBIL Score <span className="text-gray-400 font-normal">(300-900)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    placeholder="Enter your CIBIL score"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                      errors.score ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    min="300"
                    max="900"
                  />
                  {scoreNum > 0 && (
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs font-medium ${getScoreColor(scoreNum)}`}>
                      {getScoreLabel(scoreNum)}
                    </div>
                  )}
                </div>
                {errors.score && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {errors.score}
                  </p>
                )}
              </div>

              {/* Score Indicators */}
              {scoreNum > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-600">Loan Impact</span>
                    <span className={`text-xs font-bold ${getScoreColor(scoreNum)}`}>
                      {scoreNum >= 750 ? 'Maximum LTV' : 
                       scoreNum >= 700 ? 'High LTV' :
                       scoreNum >= 650 ? 'Standard LTV' :
                       scoreNum >= 600 ? 'Reduced LTV' : 'Low LTV'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full transition-all ${
                        scoreNum >= 750 ? 'bg-emerald-500' :
                        scoreNum >= 700 ? 'bg-green-500' :
                        scoreNum >= 650 ? 'bg-amber-500' :
                        scoreNum >= 600 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${((scoreNum - 300) / 600) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Existing Loans */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Existing Loans (₹)
                </label>
                <input
                  type="number"
                  value={formData.existingLoans}
                  onChange={(e) => setFormData({ ...formData, existingLoans: e.target.value })}
                  placeholder="Total existing loan amount"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                    errors.existingLoans ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  min="0"
                />
                {errors.existingLoans && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {errors.existingLoans}
                  </p>
                )}
              </div>

              {/* Existing EMIs */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Monthly EMIs (₹)
                </label>
                <input
                  type="number"
                  value={formData.existingEMIs}
                  onChange={(e) => setFormData({ ...formData, existingEMIs: e.target.value })}
                  placeholder="Total monthly EMI payments"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                    errors.existingEMIs ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  min="0"
                />
                {errors.existingEMIs && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {errors.existingEMIs}
                  </p>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex gap-3">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Why this matters:</p>
                    <ul className="space-y-1 text-blue-600">
                      <li>• Higher CIBIL scores = better loan terms</li>
                      <li>• Existing loans affect your eligibility</li>
                      <li>• This helps us calculate accurate LTV ratios</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  onSubmit({ score: '', existingLoans: '', existingEMIs: '' });
                  onClose();
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Skip for Now
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-900 hover:bg-black text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Continue
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
