import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
  MapPin, ChevronRight, ArrowRight, Building2, Ruler, Loader2, ChevronLeft,
  DollarSign, Target, User, Sparkles, Home, Store, Factory,
  TreePine, TrendingUp, TrendingDown, Minus, CheckCircle2,
} from 'lucide-react';
import { MapView } from '../components/ui/MapView';
import toast from 'react-hot-toast';
import { createValuation } from '../utils/api';
import { useValuation } from '../context/ValuationContext';
import { EngineLoader } from '../components/ui/EngineLoader';
import { DocumentUpload } from '../components/ui/DocumentUpload';
import CibilScorePopup from '../components/ui/CibilScorePopup';

/* ─── constants ─── */
const AMENITIES = [
  'Parking', 'Lift', 'Security', 'Gym', 'Swimming Pool',
  'Power Backup', 'Garden', 'Club House', 'CCTV', 'Intercom',
  'Fire Safety', 'Water Treatment', 'Solar Panels', 'Rain Water Harvesting',
];

const SUB_TYPES: Record<string, string[]> = {
  residential: ['Apartment', 'Villa', 'Row House', 'Bungalow', 'Studio', 'Penthouse', 'Builder Floor'],
  commercial:  ['Shop', 'Office', 'Showroom', 'Mall Unit', 'Business Center'],
  industrial:  ['Warehouse', 'Factory', 'Godown', 'Shed', 'Industrial Plot'],
  
};

// Property configuration requirements based on problem statement
const PROPERTY_CONFIG_REQUIREMENTS = {
  apartment: {
    requiredProximity: ['Police Station', 'Fire Station', 'Hospital', 'Electricity Substation', 'Railway Boundary'],
    maxDistanceKm: { police: 2, fire: 3, hospital: 5, electricity: 3, railway: 1 },
  },
  villa: {
    requiredProximity: ['Schools', 'Hospitals', 'Highways'],
    maxDistanceKm: { school: 3, hospital: 5, highway: 2 },
  },
  commercial: {
    requiredProximity: ['Commercial Hubs', 'Metro Station', 'Highways'],
    maxDistanceKm: { commercial: 2, metro: 1, highway: 2 },
  },
};

const DEFAULT_FORM_PCT = 40;
const MIN_FORM_PCT = 20;
const MAX_FORM_PCT = 60;

/* ─── form state type ─── */
interface FormState {
  // Core Property Information (Problem Statement Priority)
  propertyType: string;
  propertySubType: string;
  location: string;
  pincode: string;
  area: string;
  areaType: 'carpet' | 'builtup' | 'superbuiltup';
  yearOfConstruction: string;
  floorNumber: string;
  totalFloors: string;
  constructionQuality: string;
  amenities: string[];
  
  // Legal & Ownership Attributes (Problem Statement Priority)
  ownershipType: 'freehold' | 'leasehold';
  titleClarity: 'clear' | 'disputed' | 'litigation';
  
  // Income & Usage Signals (Problem Statement Priority)
  occupancyStatus: 'self_occupied' | 'rented' | 'vacant';
  monthlyRent: string;
  
  // Financial & Loan Information
  declaredValue: string;
  purpose: 'lap' | 'mortgage' | 'working_capital';
  marketScenario: 'normal' | 'growth' | 'crash';
  
  // Applicant Information
  applicantName: string;
  applicantPhone: string;
  applicantPAN: string;
  
  // Credit Information (New - CIBIL Integration)
  cibilScore?: string;
  existingLoans?: string;
  existingEMIs?: string;
  
  // Property Documents (Enhanced)
  hasMunicipalApproval: boolean;
  hasEncumbranceCertificate: boolean;
  hasSaleDeed: boolean;
  propertyTaxPaid: boolean;
  rentalYield: number;
  loanAmountRequired: string;
}

const INITIAL_FORM: FormState = {
  propertyType: '',
  propertySubType: '',
  location: '',
  pincode: '',
  area: '',
  areaType: 'builtup',
  yearOfConstruction: '',
  floorNumber: '',
  totalFloors: '',
  constructionQuality: 'good',
  amenities: [],
  ownershipType: 'freehold',
  titleClarity: 'clear',
  occupancyStatus: 'self_occupied',
  monthlyRent: '',
  declaredValue: '',
  purpose: 'lap',
  marketScenario: 'normal',
  applicantName: '',
  applicantPhone: '',
  applicantPAN: '',
  hasMunicipalApproval: true,
  hasEncumbranceCertificate: false,
  hasSaleDeed: true,
  propertyTaxPaid: true,
  rentalYield: 0,
  loanAmountRequired: '',
};

/* ─── small reusable primitives ─── */
const inp = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-[14px] font-medium focus:outline-none focus:border-[#1A1A1A] focus:ring-2 focus:ring-[#1A1A1A]/10 transition-all placeholder:text-gray-400 shadow-sm';
const lbl = 'block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5';

function confBorder(c?: 'high' | 'medium' | 'low') {
  if (!c) return '';
  if (c === 'high')   return 'border-emerald-200 bg-emerald-50/20';
  if (c === 'medium') return 'border-amber-200 bg-amber-50/20';
  return 'border-red-200 bg-red-50/20';
}

/* ─── Pill toggle (2 or 3 options) ─── */
function PillToggle<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl border border-gray-100 overflow-hidden bg-gray-50/50 p-1 gap-1">
      {options.map(o => (
        <button
          key={o.value} type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${
            value === o.value
              ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >{o.label}</button>
      ))}
    </div>
  );
}

/* ─── Section wrapper ─── */
function Sec({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-6 space-y-4 transition-all hover:border-gray-200 hover:shadow-lg">
      <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
        <div className="p-2 rounded-xl bg-gray-50 text-gray-900 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
          {icon}
        </div>
        <p className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">{title}</p>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function PropertyForm() {
  const navigate = useNavigate();
  const { setCurrentValuation } = useValuation();

  const [panelOpen,  setPanelOpen]  = useState(true);
  const [formPct,    setFormPct]    = useState(DEFAULT_FORM_PCT);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapPanelRef    = useRef<HTMLDivElement>(null);
  const mapResizeFnRef = useRef<(() => void) | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [fieldConf, setFieldConf] = useState<Record<string, 'high' | 'medium' | 'low'>>({});
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [searchingLoc, setSearchingLoc] = useState(false);
  const [mapTarget, setMapTarget] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // NEW: CIBIL Score Popup State
  const [showCibilPopup, setShowCibilPopup] = useState(false);
  const [cibilData, setCibilData] = useState({
    cibilScore: '',
    existingLoans: '',
    existingEMIs: ''
  });

  const MAPBOX_TOKEN = 'pk.eyJ1IjoiZ2FuZXNoLWFpIiwiYSI6ImNtb25manBraTA0djIycHF5ZmNoaHc1d3oifQ.9t0phnsdsFubQao7PN-hHQ';

  /* resize observer */
  useEffect(() => {
    if (!mapPanelRef.current) return;
    const ro = new ResizeObserver(() => mapResizeFnRef.current?.());
    ro.observe(mapPanelRef.current);
    return () => ro.disconnect();
  }, []);

  /* drag */
  const onDividerDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onMouseMove   = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct  = ((e.clientX - rect.left) / rect.width) * 100;
    setFormPct(Math.min(MAX_FORM_PCT, Math.max(MIN_FORM_PCT, pct)));
  }, [isDragging]);
  const onMouseUp = useCallback(() => setIsDragging(false), []);

  /* location search */
  function handleLocSearch(val: string) {
    setForm(f => ({ ...f, location: val }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 3) { setLocationSuggestions([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingLoc(true);
      try {
        const res  = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=in`);
        const data = await res.json();
        setLocationSuggestions(data.features || []);
      } catch { setLocationSuggestions([]); }
      finally  { setSearchingLoc(false); }
    }, 400);
  }

  function selectLoc(feature: any) {
    setForm(f => ({
      ...f,
      location: feature.place_name,
      pincode: feature.context?.find((c: any) => c.id.startsWith('postcode'))?.text || f.pincode,
    }));
    setLocationSuggestions([]);
    setMapTarget(feature.place_name);
  }

  /* mutation */
  const mutation = useMutation({
    mutationFn: createValuation,
    onSuccess: (data) => {
      setCurrentValuation(data.data);
      toast.success('Valuation completed');
      navigate(`/app/dashboard/${data.data.valuationId || data.data._id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Valuation failed';
      toast.error(msg);
    },
  });

  /* NEW: Handle CIBIL score submission */
  const handleCibilSubmit = (creditData: typeof cibilData) => {
    setCibilData(creditData);
    setShowCibilPopup(false);
    
    if (creditData.cibilScore) {
      toast.success(`CIBIL score ${creditData.cibilScore} captured`);
    }
    
    // Auto-submit after CIBIL data is captured
    setTimeout(() => {
      submitValuation();
    }, 500);
  };

  /* Enhanced submit with CIBIL popup */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields with user-friendly names
    const requiredChecks: { field: keyof FormState; label: string }[] = [
      { field: 'propertyType',       label: 'Property Type' },
      { field: 'location',           label: 'Full Address' },
      { field: 'area',               label: 'Area (sqft)' },
      { field: 'loanAmountRequired', label: 'Loan Amount Required' },
      { field: 'applicantName',      label: 'Full Legal Name' },
      { field: 'applicantPhone',     label: 'Contact Phone' },
    ];

    const missing = requiredChecks.filter(({ field }) => {
      const val = form[field];
      return !val || (typeof val === 'string' && val.trim() === '');
    });

    if (missing.length > 0) {
      toast.error(`Please fill: ${missing.map(m => m.label).join(', ')}`);
      return;
    }

    // Show CIBIL popup before submission
    setShowCibilPopup(true);
  };

  /* Final submission after CIBIL popup */
  const submitValuation = useCallback(() => {
    // Parse city/locality from location string
    const parts = form.location.split(',').map(s => s.trim());
    const locality = parts[0] || form.location;
    const city     = parts[parts.length - 2] || parts[parts.length - 1] || '';

    mutation.mutate({
      ...form,
      ...cibilData, // Include CIBIL data
      city,
      locality,
      area:          parseFloat(form.area),
      declaredValue: parseFloat(form.declaredValue),
      monthlyRent:   form.monthlyRent ? parseFloat(form.monthlyRent) : undefined,
      floorNumber:   form.floorNumber ? parseInt(form.floorNumber) : 0,
      totalFloors:   form.totalFloors ? parseInt(form.totalFloors) : 1,
      yearOfConstruction: form.yearOfConstruction ? parseInt(form.yearOfConstruction) : undefined,
    });
  }, [form, cibilData, mutation]);

  /* amenity toggle */
  const toggleAmenity = (a: string) =>
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));

  /* OCR auto-fill — maps ALL extracted fields to form */
  function handleExtracted(
    fields: Record<string, unknown>,
    confidenceMap: Record<string, { confidence: 'high' | 'medium' | 'low'; source: string }>
  ) {
    // Build location string from city + locality
    const locality = fields.locality as string | undefined;
    const city     = fields.city     as string | undefined;
    const locationStr = locality
      ? `${locality}${city ? `, ${city}` : ''}`
      : city || '';

    setForm(f => ({
      ...f,
      // Property classification
      ...(fields.propertyType        ? { propertyType:        fields.propertyType as string }        : {}),
      ...(fields.propertySubType     ? { propertySubType:     fields.propertySubType as string }     : {}),
      ...(fields.purpose             ? { purpose:             fields.purpose as FormState['purpose'] } : {}),
      ...(fields.loanAmountRequired  ? { loanAmountRequired:  String(fields.loanAmountRequired) }    : {}),
      // Location
      ...(locationStr                ? { location: locationStr }                                      : {}),
      ...(fields.pincode             ? { pincode:             fields.pincode as string }              : {}),
      // Structural
      ...(fields.area                ? { area:                String(fields.area) }                   : {}),
      ...(fields.areaType            ? { areaType:            fields.areaType as FormState['areaType'] } : {}),
      ...(fields.yearOfConstruction  ? { yearOfConstruction:  String(fields.yearOfConstruction) }     : {}),
      ...(fields.floorNumber !== undefined && fields.floorNumber !== null ? { floorNumber: String(fields.floorNumber) } : {}),
      ...(fields.totalFloors         ? { totalFloors:         String(fields.totalFloors) }            : {}),
      ...(fields.constructionQuality ? { constructionQuality: fields.constructionQuality as string }  : {}),
      ...(fields.amenities && Array.isArray(fields.amenities) && (fields.amenities as string[]).length > 0
          ? { amenities: fields.amenities as string[] } : {}),
      // Legal
      ...(fields.ownershipType       ? { ownershipType:       fields.ownershipType as FormState['ownershipType'] } : {}),
      ...(fields.titleClarity        ? { titleClarity:        fields.titleClarity as FormState['titleClarity'] }   : {}),
      ...(fields.occupancyStatus     ? { occupancyStatus:     fields.occupancyStatus as FormState['occupancyStatus'] } : {}),
      ...(fields.monthlyRent         ? { monthlyRent:         String(fields.monthlyRent) }            : {}),
      // Applicant
      ...(fields.applicantName       ? { applicantName:       fields.applicantName as string }        : {}),
      ...(fields.applicantPAN        ? { applicantPAN:        fields.applicantPAN as string }         : {}),
      ...(fields.applicantPhone      ? { applicantPhone:      fields.applicantPhone as string }       : {}),
    }));

    const conf: Record<string, 'high' | 'medium' | 'low'> = {};
    for (const [k, v] of Object.entries(confidenceMap)) conf[k] = v.confidence;
    setFieldConf(conf);

    if (locationStr) setMapTarget(locationStr);
  }

  /* helpers */
  const iCls = (field: string) => `${inp} ${confBorder(fieldConf[field])}`;
  const hasConf = Object.keys(fieldConf).length > 0;

  /* vintage band label */
  const vintageBand = () => {
    if (!form.yearOfConstruction) return null;
    const age = new Date().getFullYear() - parseInt(form.yearOfConstruction);
    if (age < 5)  return { label: 'New', color: 'text-emerald-600 bg-emerald-50' };
    if (age <= 15) return { label: 'Mid-age', color: 'text-amber-600 bg-amber-50' };
    return { label: 'Old', color: 'text-red-500 bg-red-50' };
  };

  const vb = vintageBand();

  /* declared value display */
  const fmtValue = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  /* ─── render ─── */
  return (
    <div
      ref={containerRef}
      className="flex h-screen bg-gray-50 overflow-hidden"
      style={{ userSelect: isDragging ? 'none' : 'auto', cursor: isDragging ? 'col-resize' : 'auto' }}
      onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
    >
      {mutation.isPending && <EngineLoader />}

      {/* ══ FORM PANEL ══ */}
      <AnimatePresence initial={false}>
        {panelOpen && (
          <motion.div
            key="form"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: `${formPct}%`, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden relative z-10"
          >
            {/* collapse */}
            <button
              onClick={() => setPanelOpen(false)}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-4 h-10 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center text-gray-400 hover:text-gray-800 shadow-sm transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            {/* header */}
            <div className="px-8 pl-20 py-6 border-b border-gray-50 shrink-0">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Collateral Valuation</h1>
              <p className="text-[11px] text-gray-400 mt-1.5 font-medium">AI powered property assessment for lending</p>
            </div>

            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30">
              <form id="vform" onSubmit={handleSubmit}>

                {/* ── AUTO-FILL ── */}
                <div className="px-8 pl-20 py-6 border-b border-gray-100 bg-white">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <DocumentUpload onExtracted={handleExtracted} />
                    </div>
                    {hasConf && (
                      <div className="flex flex-col gap-2 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Verified</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Review</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Uncertain</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-8 pl-20 py-6 space-y-6">

                  {/* ══ 1. PROPERTY ══ */}
                  <Sec icon={<Building2 className="w-4 h-4" />} title="Property Classification">
                    {/* Type */}
                    <div>
                      <label className={lbl}>Type *</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { v: 'residential', icon: <Home className="w-3.5 h-3.5" />,    label: 'Residential' },
                          { v: 'commercial',  icon: <Store className="w-3.5 h-3.5" />,   label: 'Commercial' },
                          { v: 'industrial',  icon: <Factory className="w-3.5 h-3.5" />, label: 'Industrial' },
                          
                        ].map(t => (
                          <button
                            key={t.v} type="button"
                            onClick={() => setForm(f => ({ ...f, propertyType: t.v, propertySubType: '' }))}
                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-semibold transition-all ${
                              form.propertyType === t.v
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {t.icon}
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sub-type */}
                    <div>
                      <label className={lbl}>Sub-type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {SUB_TYPES[form.propertyType]?.map(s => (
                          <button
                            key={s} type="button"
                            onClick={() => setForm(f => ({ ...f, propertySubType: f.propertySubType === s ? '' : s }))}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                              form.propertySubType === s
                                ? 'border-gray-800 bg-gray-50 text-gray-900'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>

                    {/* Loan Purpose and Amount */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>Loan Purpose *</label>
                        <select className={inp} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value as FormState['purpose'] }))}>
                          <option value="lap">Loan Against Property (LAP)</option>
                          <option value="mortgage">Mortgage / Home Loan</option>
                          <option value="working_capital">Working Capital</option>
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Loan Amount Required (₹) *</label>
                        <input
                          type="number"
                          className={iCls('loanAmountRequired')}
                          value={form.loanAmountRequired}
                          onChange={e => setForm(f => ({ ...f, loanAmountRequired: e.target.value }))}
                          placeholder="e.g. 5000000"
                        />
                        {form.loanAmountRequired && (
                          <p className="text-xs text-gray-400 mt-1">{fmtValue(form.loanAmountRequired)}</p>
                        )}
                      </div>
                    </div>
                  </Sec>

                  {/* ══ 2. LOCATION ══ */}
                  <Sec icon={<MapPin className="w-4 h-4" />} title="Location Intelligence">
                    <div className="relative">
                      <label className={lbl}>Full Address *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          className={`${iCls('location')} pl-9`}
                          value={form.location}
                          onChange={e => handleLocSearch(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (locationSuggestions.length > 0) selectLoc(locationSuggestions[0]);
                              else setMapTarget(form.location);
                            }
                          }}
                          placeholder="e.g. Flat 4B, Bandra West, Mumbai"
                          autoComplete="off"
                        />
                        {searchingLoc && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                      </div>
                      {locationSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                          {locationSuggestions.map(s => (
                            <button key={s.id} type="button" onClick={() => selectLoc(s)}
                              className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                              <span className="font-semibold block truncate">{s.text}</span>
                              <span className="text-[10px] text-gray-400 block truncate">{s.place_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </Sec>

                  {/* ══ 3. PROPERTY DETAILS ══ */}
                  <Sec icon={<Ruler className="w-4 h-4" />} title="Structural Metrics">
                    {/* Area */}
                    <div>
                      <label className={lbl}>Area *</label>
                      <div className="flex gap-2">
                        <input type="number" className={`${iCls('area')} flex-1`} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. 1200" />
                        <select
                          className="border border-gray-200 rounded-lg px-2.5 py-2.5 text-xs text-gray-600 bg-gray-50 focus:outline-none focus:border-gray-800 shrink-0"
                          value={form.areaType}
                          onChange={e => setForm(f => ({ ...f, areaType: e.target.value as FormState['areaType'] }))}
                        >
                          <option value="carpet">Carpet</option>
                          <option value="builtup">Built-up</option>
                          <option value="superbuiltup">Super Built-up</option>
                        </select>
                      </div>
                    </div>

                    {/* Year + vintage band */}
                    <div>
                      <label className={lbl}>Year of Construction</label>
                      <div className="flex items-center gap-2">
                        <input type="number" className={`${iCls('yearOfConstruction')} flex-1`} value={form.yearOfConstruction} onChange={e => setForm(f => ({ ...f, yearOfConstruction: e.target.value }))} placeholder="e.g. 2010" />
                        {vb && (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${vb.color}`}>{vb.label}</span>
                        )}
                      </div>
                    </div>

                    {/* Floor */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Floor No.</label>
                        <input type="number" className={iCls('floorNumber')} value={form.floorNumber} onChange={e => setForm(f => ({ ...f, floorNumber: e.target.value }))} placeholder="e.g. 3" />
                      </div>
                      <div>
                        <label className={lbl}>Total Floors</label>
                        <input type="number" className={iCls('totalFloors')} value={form.totalFloors} onChange={e => setForm(f => ({ ...f, totalFloors: e.target.value }))} placeholder="e.g. 14" />
                      </div>
                    </div>

                    {/* Construction quality */}
                    <div>
                      <label className={lbl}>Construction Quality</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { v: 'standard', l: 'Standard', d: '0.95×' },
                          { v: 'good',     l: 'Good',     d: '1.00×' },
                          { v: 'premium',  l: 'Premium',  d: '1.10×' },
                        ].map(q => (
                          <button key={q.v} type="button"
                            onClick={() => setForm(f => ({ ...f, constructionQuality: q.v }))}
                            className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                              form.constructionQuality === q.v
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <div>{q.l}</div>
                            <div className="opacity-60 text-[10px] mt-0.5">{q.d}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amenities */}
                    <div>
                      <label className={lbl}>Amenities {form.amenities.length > 0 && <span className="normal-case font-normal text-gray-400">({form.amenities.length} selected)</span>}</label>
                      <div className="flex flex-wrap gap-1.5">
                        {AMENITIES.map(a => (
                          <button key={a} type="button" onClick={() => toggleAmenity(a)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                              form.amenities.includes(a)
                                ? 'border-gray-800 bg-gray-800 text-white'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >{a}</button>
                        ))}
                      </div>
                    </div>
                  </Sec>

                  {/* ══ 6. LEGAL & DOCUMENTS ══ */}
                  <Sec icon={<CheckCircle2 className="w-4 h-4" />} title="Legal Compliance">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={lbl}>Ownership Type</label>
                          <PillToggle
                            options={[{ value: 'freehold', label: 'Freehold' }, { value: 'leasehold', label: 'Leasehold' }]}
                            value={form.ownershipType}
                            onChange={v => setForm(f => ({ ...f, ownershipType: v }))}
                          />
                        </div>
                        <div>
                          <label className={lbl}>Title Status</label>
                          <PillToggle
                            options={[
                              { value: 'clear', label: 'Clear' },
                              { value: 'disputed', label: 'Disputed' },
                              { value: 'litigation', label: 'Litigation' },
                            ]}
                            value={form.titleClarity}
                            onChange={v => setForm(f => ({ ...f, titleClarity: v }))}
                          />
                        </div>
                      </div>
                      
                      {/* Document Checklist */}
                      <div>
                        <label className={lbl}>Property Documents</label>
                        <div className="space-y-2">
                          {[
                            { key: 'hasMunicipalApproval', label: 'Municipal Approval', required: true },
                            { key: 'hasEncumbranceCertificate', label: 'Encumbrance Certificate', required: false },
                            { key: 'hasSaleDeed', label: 'Sale Deed', required: true },
                            { key: 'propertyTaxPaid', label: 'Property Tax Paid', required: true },
                          ].map(doc => (
                            <label key={doc.key} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={form[doc.key as keyof FormState] as boolean}
                                onChange={e => setForm(f => ({ ...f, [doc.key]: e.target.checked }))}
                                className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                              />
                              <span className={doc.required ? 'font-medium' : ''}>
                                {doc.label}
                                {doc.required && <span className="text-red-500 ml-1">*</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* Title clarity indicator */}
                      {form.titleClarity !== 'clear' && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                          form.titleClarity === 'litigation' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <span>{form.titleClarity === 'litigation' ? '⚠️ Litigation will significantly reduce LTV and liquidity score' : '⚠️ Disputed title may affect resale and lending eligibility'}</span>
                        </div>
                      )}
                    </div>
                  </Sec>

                  {/* ══ 5. USAGE & INCOME ══ */}
                  <Sec icon={<TrendingUp className="w-4 h-4" />} title="Yield & Market Signals">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-visible">
                      {/* Left Column - Yield Signals */}
                      <div className="space-y-4 overflow-visible min-h-0">
                        <div>
                          <label className={lbl}>Occupancy Status</label>
                          <PillToggle
                            options={[
                              { value: 'self_occupied', label: 'Self-occupied' },
                              { value: 'rented', label: 'Rented' },
                              { value: 'vacant', label: 'Vacant' },
                            ]}
                            value={form.occupancyStatus}
                            onChange={v => setForm(f => ({ ...f, occupancyStatus: v }))}
                          />
                        </div>
                        {/* conditional rent field */}
                        <AnimatePresence>
                          {form.occupancyStatus === 'rented' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-visible"
                            >
                              <label className={lbl}>Monthly Rent (₹)</label>
                              <input
                                type="number"
                                className={iCls('monthlyRent')}
                                value={form.monthlyRent}
                                onChange={e => setForm(f => ({ ...f, monthlyRent: e.target.value }))}
                                placeholder="e.g. 45000"
                              />
                              {form.monthlyRent && (
                                <div className="mt-2 text-[10px] text-emerald-600 leading-tight break-words">
                                  <div className="flex items-start gap-1">
                                    <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                                    <span className="flex-1">Rental yield improves resale certainty and liquidity score</span>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* Right Column - Market Scenario */}
                      <div>
                        <label className={lbl}>Market Scenario (Stress Test)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { v: 'normal', l: 'Base Case',    icon: <Minus className="w-3.5 h-3.5" />,       color: 'text-gray-600' },
                            { v: 'growth', l: 'Growth +10%',  icon: <TrendingUp className="w-3.5 h-3.5" />,  color: 'text-emerald-600' },
                            { v: 'crash',  l: 'Stress −15%',  icon: <TrendingDown className="w-3.5 h-3.5" />, color: 'text-red-500' },
                          ].map(s => (
                            <button key={s.v} type="button"
                              onClick={() => setForm(f => ({ ...f, marketScenario: s.v as FormState['marketScenario'] }))}
                              className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-[10px] font-bold transition-all ${
                                form.marketScenario === s.v
                                  ? 'border-gray-900 bg-gray-900 text-white shadow-lg shadow-gray-200'
                                  : 'border-gray-100 bg-gray-50/50 text-gray-400 hover:border-gray-200'
                              }`}
                            >
                              <span className={form.marketScenario === s.v ? '' : s.color}>{s.icon}</span>
                              <span>{s.l}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Sec>

                  {/* ══ 6. APPLICANT ══ */}
                  <Sec icon={<User className="w-4 h-4" />} title="Applicant Contact">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className={lbl}>Full Legal Name *</label>
                        <input type="text" className={iCls('applicantName')} value={form.applicantName} onChange={e => setForm(f => ({ ...f, applicantName: e.target.value }))} placeholder="e.g. Rahul Sharma" />
                      </div>
                      <div>
                        <label className={lbl}>Contact Phone *</label>
                        <input type="tel" className={iCls('applicantPhone')} value={form.applicantPhone} onChange={e => setForm(f => ({ ...f, applicantPhone: e.target.value }))} placeholder="9876543210" />
                      </div>
                      <div>
                        <label className={lbl}>PAN Number</label>
                        <input type="text" className={iCls('applicantPAN')} value={form.applicantPAN} onChange={e => setForm(f => ({ ...f, applicantPAN: e.target.value.toUpperCase() }))} placeholder="e.g. ABCDE1234F" maxLength={10} />
                      </div>
                    </div>
                  </Sec>

                  <div className="h-2" />
                </div>
              </form>
            </div>

            {/* ── PINNED FOOTER ── */}
            <div className="shrink-0 border-t border-gray-100 bg-white px-8 pl-20 py-4">
              <motion.button
                form="vform" type="button"
                onClick={handleSubmit}
                disabled={mutation.isPending}
                whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
                className="w-full px-8 py-4 bg-[#1A1A1A] hover:bg-black text-white text-[15px] font-medium rounded-full flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:transform-none"
              >
                <span>Verify Property</span>
                <ArrowRight className="w-4 h-4 opacity-80" />
              </motion.button>
              <p className="text-center text-[13px] text-gray-500 mt-3 font-medium">COVAL AI Engine · Real-time Market Data · RBI Compliant</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ DIVIDER ══ */}
      {panelOpen && (
        <div onMouseDown={onDividerDown} className="relative w-1.5 shrink-0 cursor-col-resize group z-20">
          <div className={`absolute inset-0 transition-colors ${isDragging ? 'bg-gray-400' : 'bg-gray-200 group-hover:bg-gray-400'}`} />
          <div className="absolute -left-2 -right-2 inset-y-0" />
        </div>
      )}

      {/* ══ MAP PANEL ══ */}
      <div ref={mapPanelRef} className="flex-1 relative overflow-hidden min-w-0" style={{ minWidth: '40%' }}>
        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-md transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <MapView
          searchLocation={mapTarget || undefined}
          onResizeReady={fn => { mapResizeFnRef.current = fn; }}
          onLocationConfirm={loc => {
            setForm(f => ({ ...f, location: loc.placeName }));
            toast.success(`Location set: ${loc.placeName.split(',')[0]}`);
          }}
        />
      </div>
      
      {/* CIBIL Score Popup */}
      <CibilScorePopup
        isOpen={showCibilPopup}
        onClose={() => setShowCibilPopup(false)}
        onSubmit={(data) => handleCibilSubmit({
          cibilScore: data.score,
          existingLoans: data.existingLoans,
          existingEMIs: data.existingEMIs
        })}
        loading={mutation.isPending}
      />
    </div>
  );
}
