import { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import LandOCRUpload, { type OCRResult } from '../components/ocr/LandOCRUpload';
import LandOCRResult from '../components/ocr/LandOCRResult';

const OCR_API = import.meta.env.VITE_OCR_API_URL || '/ocr-api';

interface DemoSample extends OCRResult {
  label: string;
}

export default function LandOCR() {
  const [result, setResult] = useState<OCRResult | null>(null);
  const [demos, setDemos] = useState<DemoSample[]>([]);

  useEffect(() => {
    fetch(`${OCR_API}/demo`)
      .then(r => r.json())
      .then(d => setDemos(d.samples || []))
      .catch(() => {
        // Fallback minimal demos
        setDemos([
          { label: 'UP Khatauni — Safe',          document_type: 'Khatauni',  confidence_score: 87 } as DemoSample,
          { label: 'Maharashtra 7/12 — Caution',  document_type: '7/12',      confidence_score: 63 } as DemoSample,
          { label: 'Punjab Jamabandi — Low',       document_type: 'Jamabandi', confidence_score: 41 } as DemoSample,
        ]);
      });
  }, []);

  function badgeClass(score: number) {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-5 h-5 text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Land Record OCR</h1>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">PP-OCRv5</span>
        </div>
        <p className="text-sm text-gray-500">
          Upload a Khatauni, 7/12, Jamabandi, Patta, or any ROR document to extract all fields instantly.
        </p>
      </div>

      {/* Upload / Result card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        {result ? (
          <LandOCRResult result={result} onReset={() => setResult(null)} />
        ) : (
          <LandOCRUpload onResult={setResult} />
        )}
      </div>

      {/* Demo samples */}
      {!result && demos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Try Demo Samples</p>
          <div className="grid grid-cols-3 gap-3">
            {demos.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setResult(s)}
                className="text-left p-3 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                <p className="text-xs font-semibold text-gray-800 mb-0.5">{s.document_type}</p>
                <p className="text-[10px] text-gray-500 mb-2 leading-tight">{s.label}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass(s.confidence_score)}`}>
                  {s.confidence_score}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
