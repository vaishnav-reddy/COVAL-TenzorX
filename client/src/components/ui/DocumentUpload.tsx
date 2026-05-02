import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image, X, Loader2, Sparkles } from 'lucide-react';
import { extractDocument } from '../../utils/api';
import toast from 'react-hot-toast';

interface ExtractionResult {
  documentType: string;
  ocrEngine: string;
  processingTime: number;
  extractionRate: number;
  extractedCount: number;
  fields: Record<string, unknown>;
  confidenceMap: Record<string, { confidence: 'high' | 'medium' | 'low'; source: string }>;
  rawTextPreview: string;
}

interface DocumentUploadProps {
  onExtracted: (fields: Record<string, unknown>, confidenceMap: Record<string, { confidence: 'high' | 'medium' | 'low'; source: string }>) => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  SALE_DEED: 'Sale Deed',
  PROPERTY_TAX: 'Property Tax Receipt',
  ENCUMBRANCE_CERT: 'Encumbrance Certificate',
  BUILDING_PLAN: 'Building Plan',
  KHATA_PATTA: 'Khata / Patta',
  AADHAAR: 'Aadhaar Card',
  PAN_CARD: 'PAN Card',
  UNKNOWN: 'Document',
};

const CONFIDENCE_STYLES = {
  high:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low:    'bg-red-50 text-red-600 border-red-200',
};

const CONFIDENCE_DOT = {
  high:   'bg-emerald-500',
  medium: 'bg-amber-500',
  low:    'bg-red-500',
};

export function DocumentUpload({ onExtracted }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  function handleFile(f: File) {
    const maxSize = 15 * 1024 * 1024;
    if (f.size > maxSize) {
      toast.error('File too large. Maximum size is 15 MB.');
      return;
    }
    setFile(f);
    setResult(null);
    runExtraction(f);
  }

  async function runExtraction(f: File) {
    setLoading(true);
    try {
      const res = await extractDocument(f);
      if (res.success) {
        setResult(res.data);
        toast.success(`Extracted ${res.data.extractedCount} fields from ${DOC_TYPE_LABELS[res.data.documentType] || 'document'}`);
      } else {
        toast.error(res.message || 'Extraction failed');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Extraction failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleApply() {
    if (!result) return;
    onExtracted(result.fields, result.confidenceMap);
    toast.success('Fields applied to form. Review highlighted fields.');
  }

  function reset() {
    setFile(null);
    setResult(null);
  }

  const fieldLabels: Record<string, string> = {
    propertyType: 'Property Type',
    city: 'City',
    locality: 'Locality',
    pincode: 'Pincode',
    area: 'Area (sqft)',
    yearOfConstruction: 'Year Built',
    floorNumber: 'Floor No.',
    totalFloors: 'Total Floors',
    constructionQuality: 'Quality',
    declaredValue: 'Declared Value',
    applicantName: 'Applicant Name',
    applicantPAN: 'PAN',
    applicantPhone: 'Phone',
    applicantEmail: 'Email',
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-gray-900 bg-gray-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.bmp"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#111]" />
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-700">Auto-fill from Document</p>
          <p className="text-xs text-gray-400 mt-1">
            Drop a Sale Deed, Property Tax Receipt, or any property document
          </p>
          <p className="text-[10px] text-gray-300 mt-1">PDF, JPG, PNG — up to 15 MB</p>
        </motion.div>
      )}

      {/* Processing state */}
      <AnimatePresence>
        {file && loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-gray-200 bg-gray-50 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                {file.type === 'application/pdf'
                  ? <FileText className="w-4 h-4 text-[#111]" />
                  : <Image className="w-4 h-4 text-[#111]" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{file.name}</p>
                <p className="text-[10px] text-[#111] mt-0.5 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running OCR extraction…
                </p>
              </div>
            </div>
            {/* Animated progress bar */}
            <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gray-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '90%' }}
                transition={{ duration: 4, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-gray-100 rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-gray-700">
                  {DOC_TYPE_LABELS[result.documentType]} detected
                </span>
                <span className="text-[10px] text-gray-400">
                  · {result.extractedCount} fields · {result.processingTime}ms
                </span>
              </div>
              <button onClick={reset} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Extraction rate bar */}
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400">Extraction confidence</span>
                <span className="text-[10px] font-semibold text-gray-600">{result.extractionRate}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    result.extractionRate >= 70 ? 'bg-emerald-500' :
                    result.extractionRate >= 40 ? 'bg-amber-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${result.extractionRate}%` }}
                />
              </div>
            </div>

            {/* Extracted fields */}
            <div className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(result.fields).map(([key, value]) => {
                const conf = result.confidenceMap[key];
                const label = fieldLabels[key] || key;
                const displayValue = key === 'declaredValue'
                  ? `₹${Number(value).toLocaleString('en-IN')}`
                  : String(value);

                return (
                  <div key={key} className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CONFIDENCE_DOT[conf?.confidence || 'low']}`} />
                      <span className="text-[11px] text-gray-500 shrink-0">{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-semibold text-gray-800 truncate max-w-[120px]" title={displayValue}>
                        {displayValue}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${CONFIDENCE_STYLES[conf?.confidence || 'low']}`}>
                        {conf?.confidence || 'low'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="px-4 pb-2 flex items-center gap-3">
              {(['high', 'medium', 'low'] as const).map(c => (
                <span key={c} className="flex items-center gap-1 text-[9px] text-gray-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT[c]}`} />
                  {c === 'high' ? 'Verified' : c === 'medium' ? 'Review' : 'Uncertain'}
                </span>
              ))}
            </div>

            {/* Apply button */}
            <div className="px-4 pb-4">
              <button
                onClick={handleApply}
                className="w-full py-2.5 bg-[#111] hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Apply {result.extractedCount} fields to form
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                Low-confidence fields will be highlighted for review
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
