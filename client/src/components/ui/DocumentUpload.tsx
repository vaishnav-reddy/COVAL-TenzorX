import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Image, X, Loader2, Sparkles, MapPin, Hash,
  ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle, Plus, Files,
} from 'lucide-react';
import { extractDocuments } from '../../utils/api';
import toast from 'react-hot-toast';

/* ─── Types ──────────────────────────────────────────────────── */
type Confidence = 'high' | 'medium' | 'low';
interface ConfEntry { confidence: Confidence; source: string }

interface PerFile {
  fileName: string;
  success: boolean;
  documentType: string;
  isLandRecord: boolean;
  processingTime: number;
  extractionRate: number;
  extractedCount: number;
  error: string | null;
}

interface MergedResult {
  fields: Record<string, unknown>;
  confidenceMap: Record<string, ConfEntry>;
  fieldSources: Record<string, string>;
  extractedCount: number;
  extractionRate: number;
  documentType: string;
  isLandRecord: boolean;
  aiPowered?: boolean;
  ocrEngine?: string;
  perFile: PerFile[];
  totalFiles: number;
  successfulFiles: number;
}

interface Props {
  onExtracted: (
    fields: Record<string, unknown>,
    confidenceMap: Record<string, ConfEntry>
  ) => void;
}

/* ─── Constants ──────────────────────────────────────────────── */
const DOC_LABELS: Record<string, { label: string; icon: string }> = {
  SALE_DEED:        { label: 'Sale Deed',               icon: '📄' },
  PROPERTY_TAX:     { label: 'Property Tax Receipt',    icon: '🏛️' },
  ENCUMBRANCE_CERT: { label: 'Encumbrance Certificate', icon: '🔒' },
  BUILDING_PLAN:    { label: 'Building Plan',           icon: '📐' },
  KHATA_PATTA:      { label: 'Khata / Patta',           icon: '📋' },
  AADHAAR:          { label: 'Aadhaar Card',            icon: '🪪' },
  PAN_CARD:         { label: 'PAN Card',                icon: '💳' },
  SEVEN_TWELVE:     { label: '7/12 Extract',            icon: '🌾' },
  RTC:              { label: 'RTC / Pahani',            icon: '🌾' },
  KHATA_CERT:       { label: 'Khata Certificate',       icon: '📋' },
  PATTA:            { label: 'Patta / Chitta',          icon: '📋' },
  MUTATION:         { label: 'Mutation / Jamabandi',    icon: '🔄' },
  EC:               { label: 'Encumbrance Certificate', icon: '🔒' },
  INDEX_II:         { label: 'Index II / Registration', icon: '📑' },
  TEHSILDAR_CERT:   { label: 'Tehsildar Certificate',   icon: '🏛️' },
  UNKNOWN:          { label: 'Document',                icon: '📄' },
};

const CONF_STYLE: Record<Confidence, string> = {
  high:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50   text-amber-700   border-amber-200',
  low:    'bg-red-50     text-red-600     border-red-200',
};

const CONF_DOT: Record<Confidence, string> = {
  high:   'bg-emerald-500',
  medium: 'bg-amber-500',
  low:    'bg-red-500',
};

const FIELD_LABELS: Record<string, string> = {
  propertyType:        'Property Type',
  propertySubType:     'Sub-type',
  purpose:             'Loan Purpose',
  loanAmountRequired:  'Loan Amount',
  declaredValue:       'Declared Value',
  city:                'City',
  locality:            'Locality',
  pincode:             'Pincode',
  area:                'Area (sqft)',
  areaType:            'Area Type',
  yearOfConstruction:  'Year Built',
  floorNumber:         'Floor No.',
  totalFloors:         'Total Floors',
  constructionQuality: 'Quality',
  amenities:           'Amenities',
  ownershipType:       'Ownership',
  titleClarity:        'Title Status',
  occupancyStatus:     'Occupancy',
  monthlyRent:         'Monthly Rent',
  applicantName:       'Applicant Name',
  applicantPAN:        'PAN',
  applicantPhone:      'Phone',
  applicantEmail:      'Email',
  surveyNumber:        'Survey / Gat No.',
  mutationNumber:      'Mutation / Reg. No.',
  encumbranceStatus:   'Encumbrance Status',
  village:             'Village',
  taluka:              'Taluka / Tehsil',
  district:            'District',
};

const LAND_META = new Set([
  'surveyNumber', 'mutationNumber', 'encumbranceStatus', 'village', 'taluka', 'district',
]);

const LAND_FORM = new Set([
  'propertyType', 'city', 'locality', 'pincode', 'area',
  'yearOfConstruction', 'floorNumber', 'totalFloors', 'constructionQuality',
  'declaredValue', 'loanAmountRequired', 'applicantName', 'applicantPAN',
  'applicantPhone', 'applicantEmail', 'ownershipType', 'occupancyStatus', 'monthlyRent',
]);

const MAX_FILES = 5;
const MAX_BYTES = 15 * 1024 * 1024;

/* ─── Component ──────────────────────────────────────────────── */
export function DocumentUpload({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [loading,  setLoading]    = useState(false);
  const [files,    setFiles]      = useState<File[]>([]);
  const [result,   setResult]     = useState<MergedResult | null>(null);

  /* file management */
  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    const valid = arr.filter(f => {
      if (f.size > MAX_BYTES) { toast.error(`${f.name} exceeds 15 MB`); return false; }
      return true;
    });
    setFiles(prev => {
      const next = [...prev, ...valid].slice(0, MAX_FILES);
      if (prev.length + valid.length > MAX_FILES) toast.error(`Max ${MAX_FILES} files`);
      return next;
    });
    setResult(null);
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  /* extraction */
  async function runExtraction() {
    if (!files.length) return;
    setLoading(true);
    try {
      const res = await extractDocuments(files);
      if (res.success) {
        setResult(res.data);
        if (res.data.successfulFiles === 0) {
          toast.error('No fields could be extracted. Check document quality.');
        } else {
          toast.success(
            `✅ ${res.data.extractedCount} fields from ${res.data.successfulFiles}/${res.data.totalFiles} docs`
          );
        }
      } else {
        toast.error(res.message || 'Extraction failed');
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string; hint?: string } }; message?: string };
      const msg = errObj?.response?.data?.message || errObj?.message || 'Extraction failed';
      const hint = errObj?.response?.data?.hint;
      toast.error(hint ? `${msg} — ${hint}` : msg);
    } finally {
      setLoading(false);
    }
  }

  /* apply to form */
  function handleApply() {
    if (!result) return;
    if (result.isLandRecord) {
      const ff: Record<string, unknown>  = {};
      const fc: Record<string, ConfEntry> = {};
      for (const k of Object.keys(result.fields)) {
        if (LAND_FORM.has(k)) { ff[k] = result.fields[k]; fc[k] = result.confidenceMap[k]; }
      }
      onExtracted(ff, fc);
      toast.success('Land record fields applied');
    } else {
      onExtracted(result.fields, result.confidenceMap);
      toast.success('Fields applied — review highlighted entries');
    }
  }

  function reset() { setFiles([]); setResult(null); }

  /* derived */
  const formEntries = result
    ? Object.entries(result.fields).filter(([k]) => !LAND_META.has(k))
    : [];
  const metaEntries = result?.isLandRecord
    ? Object.entries(result.fields).filter(([k]) => LAND_META.has(k))
    : [];
  const isPdf = (f: File) => f.type === 'application/pdf';

  /* ─── render ─── */
  return (
    <div className="space-y-3">

      {/* Drop zone — only when no files queued */}
      {files.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            dragging ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={inputRef} type="file" className="hidden" multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.bmp"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
          />
          <div className="flex justify-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <Files className="w-4 h-4 text-[#111]" />
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-700">Auto-fill from Documents</p>
          <p className="text-xs text-gray-400 mt-1">
            Upload up to {MAX_FILES} files — Sale Deed, Aadhaar, PAN, 7/12, RTC, Khata…
          </p>
          <p className="text-[10px] text-gray-300 mt-1">PDF · JPG · PNG — max 15 MB each</p>
        </motion.div>
      )}

      {/* File queue */}
      {files.length > 0 && !loading && !result && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
              <div className="w-7 h-7 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
                {isPdf(f)
                  ? <FileText className="w-3.5 h-3.5 text-[#111]" />
                  : <Image    className="w-3.5 h-3.5 text-[#111]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{f.name}</p>
                <p className="text-[10px] text-gray-400">{(f.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => removeFile(i)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            {files.length < MAX_FILES && (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add more
              </button>
            )}
            <button
              onClick={runExtraction}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#111] hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Extract from {files.length} file{files.length > 1 ? 's' : ''}
            </button>
          </div>

          {/* hidden input reused for "add more" */}
          <input
            ref={inputRef} type="file" className="hidden" multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.bmp"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
          />
        </motion.div>
      )}

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="border border-gray-200 bg-gray-50 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#111]" />
              <span className="text-xs font-semibold text-gray-700">
                Extracting with Gemini AI — {files.length} document{files.length > 1 ? 's' : ''}…
              </span>
            </div>
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  {isPdf(f)
                    ? <FileText className="w-3 h-3 text-gray-400" />
                    : <Image    className="w-3 h-3 text-gray-400" />}
                </div>
                <span className="text-[11px] text-gray-500 flex-1 truncate">{f.name}</span>
                <Loader2 className="w-3 h-3 animate-spin text-gray-400 shrink-0" />
              </div>
            ))}
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gray-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '85%' }}
                transition={{ duration: files.length * 2.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="border border-gray-100 rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-semibold text-gray-700">
                  {result.extractedCount} fields merged from {result.successfulFiles}/{result.totalFiles} docs
                </span>
                {result.aiPowered && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Gemini AI
                  </span>
                )}
                {result.isLandRecord && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Land Record
                  </span>
                )}
              </div>
              <button onClick={reset} className="text-gray-300 hover:text-gray-500 transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Per-file status pills */}
            <div className="px-4 pt-3 flex flex-wrap gap-1.5">
              {result.perFile.map((pf, i) => {
                const di = DOC_LABELS[pf.documentType] || DOC_LABELS.UNKNOWN;
                return (
                  <div
                    key={i}
                    title={pf.error || `${pf.extractedCount} fields · ${pf.processingTime}ms`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium ${
                      pf.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}
                  >
                    {pf.success
                      ? <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                      : <AlertCircle  className="w-2.5 h-2.5 shrink-0" />}
                    <span className="truncate max-w-[90px]">{pf.fileName}</span>
                    {pf.success && (
                      <span className="opacity-60 shrink-0">{di.icon} {pf.extractedCount}f</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Overall confidence bar */}
            <div className="px-4 pt-2 pb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400">Overall extraction confidence</span>
                <span className="text-[10px] font-semibold text-gray-600">{result.extractionRate}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    result.extractionRate >= 70 ? 'bg-emerald-500' :
                    result.extractionRate >= 40 ? 'bg-amber-500'   : 'bg-red-400'
                  }`}
                  style={{ width: `${result.extractionRate}%` }}
                />
              </div>
            </div>

            {/* Merged form fields */}
            <div className="px-4 py-3 space-y-2 max-h-52 overflow-y-auto">
              {formEntries.map(([key, value]) => {
                const conf   = result.confidenceMap[key];
                const label  = FIELD_LABELS[key] || key;
                const src    = result.fieldSources[key];
                const disp   = key === 'declaredValue' || key === 'loanAmountRequired'
                  ? `₹${Number(value).toLocaleString('en-IN')}`
                  : Array.isArray(value)
                  ? (value as string[]).join(', ')
                  : String(value);

                return (
                  <div key={key} className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CONF_DOT[conf?.confidence || 'low']}`} />
                      <div className="min-w-0">
                        <span className="text-[11px] text-gray-500">{label}</span>
                        {src && (
                          <span className="text-[9px] text-gray-300 ml-1" title={src}>
                            ← {src.length > 14 ? src.slice(0, 12) + '…' : src}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold text-gray-800 truncate max-w-[110px]" title={disp}>
                        {disp}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${CONF_STYLE[conf?.confidence || 'low']}`}>
                        {conf?.confidence || 'low'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Land record metadata */}
            {result.isLandRecord && metaEntries.length > 0 && (
              <div className="px-4 pb-3">
                <div className="border border-amber-100 rounded-lg bg-amber-50/50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-amber-600" />
                    <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                      Land Record Details
                    </span>
                    <span className="text-[9px] text-amber-500 ml-auto">Reference only</span>
                  </div>
                  {metaEntries.map(([key, value]) => {
                    const conf  = result.confidenceMap[key];
                    const label = FIELD_LABELS[key] || key;
                    const disp  = String(value);

                    if (key === 'encumbranceStatus') {
                      const isNil = disp === 'nil';
                      return (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {isNil
                              ? <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                              : <ShieldAlert className="w-3 h-3 text-red-500     shrink-0" />}
                            <span className="text-[11px] text-amber-700">{label}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isNil ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isNil ? 'NIL — Clear Title' : 'ENCUMBERED'}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={key} className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Hash className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span className="text-[11px] text-amber-700 shrink-0">{label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-semibold text-gray-800 truncate max-w-[110px]" title={disp}>
                            {disp}
                          </span>
                          {conf && (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${CONF_STYLE[conf.confidence]}`}>
                              {conf.confidence}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="px-4 pb-2 flex items-center gap-3">
              {(['high', 'medium', 'low'] as const).map(c => (
                <span key={c} className="flex items-center gap-1 text-[9px] text-gray-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${CONF_DOT[c]}`} />
                  {c === 'high' ? 'Verified' : c === 'medium' ? 'Review' : 'Uncertain'}
                </span>
              ))}
              <span className="text-[9px] text-gray-300 ml-auto">← source file per field</span>
            </div>

            {/* Apply button */}
            <div className="px-4 pb-4">
              <button
                onClick={handleApply}
                className="w-full py-2.5 bg-[#111] hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Apply {result.isLandRecord ? formEntries.length : result.extractedCount} fields to form
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                {result.isLandRecord
                  ? 'Survey/mutation details shown above for lender reference'
                  : 'Low-confidence fields highlighted for review'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
