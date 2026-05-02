import { AlertTriangle, CheckCircle2, Clock, FileText, MapPin } from 'lucide-react';
import type { OCRResult } from './LandOCRUpload';

interface Props {
  result: OCRResult;
  onReset?: () => void;
}

function ConfidenceBadge({ score }: { score: number }) {
  const cls = score >= 80
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : score >= 50
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200';
  const label = score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      {score}% — {label} Confidence
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value}</p>
    </div>
  );
}

export default function LandOCRResult({ result, onReset }: Props) {
  const f = result.extracted_fields;
  const loc = f.location;
  const area = f.land_area;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-bold text-gray-900">{result.document_type}</span>
            {result.cached && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">Cached</span>}
          </div>
          <ConfidenceBadge score={result.confidence_score} />
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
            <Clock className="w-3 h-3" />
            {(result.processing_time_ms / 1000).toFixed(1)}s
          </div>
          <p className="text-[10px] text-gray-400">{result.pages_processed} page{result.pages_processed !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-1.5">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Extracted fields */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <Field label="Owner Name"        value={f.owner_name} />
        <Field label="Co-owner"          value={f.co_owner} />
        <Field label="Survey No."        value={f.survey_no} />
        <Field label="Khasra No."        value={f.khasra_no} />
        <Field label="Khata No."         value={f.khata_no} />
        <Field label="Mutation No."      value={f.mutation_no} />
        <Field label="Land Type"         value={f.land_type} />
        <Field label="Land Use"          value={f.land_use} />
        <Field label="Registration Date" value={f.registration_date} />

        {/* Area */}
        {area && (
          <div className="col-span-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Land Area</p>
            <div className="flex flex-wrap gap-2">
              {area.hectare != null && <span className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium">{area.hectare} ha</span>}
              {area.acre    != null && <span className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium">{area.acre} ac</span>}
              {area.bigha   != null && <span className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium">{area.bigha} bigha</span>}
              {area.guntha  != null && <span className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium">{area.guntha} guntha</span>}
              {area.cent    != null && <span className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium">{area.cent} cent</span>}
            </div>
          </div>
        )}

        {/* Location */}
        {loc && (loc.district || loc.state) && (
          <div className="col-span-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location
            </p>
            <p className="text-sm text-gray-800 font-medium">
              {[loc.village, loc.tehsil, loc.district, loc.state].filter(Boolean).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Tables found */}
      {result.tables_found > 0 && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {result.tables_found} table{result.tables_found !== 1 ? 's' : ''} detected in document
        </p>
      )}

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
        >
          Upload another document
        </button>
      )}
    </div>
  );
}
