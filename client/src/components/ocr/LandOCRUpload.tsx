import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';

const OCR_API = import.meta.env.VITE_OCR_API_URL || '/ocr-api';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const DOC_TYPES = [
  { value: '7/12',         label: '7/12 Satbara (Maharashtra/Gujarat)' },
  { value: 'Khatauni',     label: 'Khatauni (UP/Bihar)' },
  { value: 'Jamabandi',    label: 'Jamabandi (Punjab/Haryana)' },
  { value: 'Patta',        label: 'Patta (South India)' },
  { value: 'RTC',          label: 'RTC (Karnataka)' },
  { value: 'Adangal',      label: 'Adangal (AP/Telangana)' },
  { value: 'EC',           label: 'Encumbrance Certificate' },
  { value: 'MutationOrder',label: 'Mutation Order' },
];

const STAGES = [
  'Converting document to images...',
  'Running PaddleOCR PP-OCRv5...',
  'Extracting land record fields...',
  'Calculating confidence score...',
];

export interface OCRResult {
  status: string;
  document_type: string;
  confidence_score: number;
  processing_time_ms: number;
  pages_processed: number;
  extracted_fields: {
    survey_no?: string;
    owner_name?: string;
    co_owner?: string;
    land_area?: { hectare?: number; bigha?: number; acre?: number; guntha?: number; cent?: number };
    khasra_no?: string;
    khata_no?: string;
    land_type?: string;
    land_use?: string;
    mutation_no?: string;
    registration_date?: string;
    location?: { district?: string; tehsil?: string; village?: string; state?: string };
  };
  raw_ocr_text: string;
  tables_found: number;
  warnings: string[];
  cached: boolean;
}

interface Props {
  onResult: (result: OCRResult) => void;
}

export default function LandOCRUpload({ onResult }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState(-1);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setError('');
  }

  async function handleProcess() {
    if (!file) return;
    setError('');
    setStage(0);

    const formData = new FormData();
    formData.append('file', file);

    // Simulate stage progression while waiting
    let s = 0;
    const timer = setInterval(() => {
      s = Math.min(s + 1, 3);
      setStage(s);
    }, 1200);

    try {
      const res = await fetch(`${OCR_API}/ocr/upload`, { method: 'POST', body: formData });
      clearInterval(timer);
      setStage(3);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data: OCRResult = await res.json();
      setTimeout(() => { setStage(-1); onResult(data); }, 400);
    } catch (err: unknown) {
      clearInterval(timer);
      setStage(-1);
      setError((err as Error).message || 'Upload failed');
    }
  }

  const isProcessing = stage >= 0;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? 'border-gray-800 bg-gray-50' :
          file    ? 'border-emerald-400 bg-emerald-50/40' :
                    'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <FileText className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-emerald-500' : 'text-gray-300'}`} />
        {file ? (
          <p className="text-sm font-medium text-emerald-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-700">Drop land record document here</p>
            <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG, TIFF — max 10MB</p>
          </>
        )}
      </div>

      {/* Processing stages */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-800 rounded-full transition-all duration-500"
              style={{ width: `${((stage + 1) / 4) * 100}%` }}
            />
          </div>
          {STAGES.map((label, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${
              i < stage ? 'text-emerald-600' : i === stage ? 'text-gray-800 font-medium' : 'text-gray-300'
            }`}>
              {i < stage ? (
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">✓</span>
              ) : i === stage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-gray-200 flex items-center justify-center text-[10px] text-gray-300">{i + 1}</span>
              )}
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Process button */}
      <button
        type="button"
        disabled={!file || isProcessing}
        onClick={handleProcess}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {isProcessing ? STAGES[stage] : 'Extract Fields'}
      </button>
    </div>
  );
}
