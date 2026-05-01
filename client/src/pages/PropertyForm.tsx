import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Upload, MapPin, X, ChevronRight, Building2, Ruler,
  Wrench, Layers, DollarSign, Target, ChevronLeft, ChevronDown, User, TrendingUp, GripVertical, Sparkles
} from 'lucide-react';
import { MapView } from '../components/ui/MapView';
import toast from 'react-hot-toast';
import { createValuation, getCities, getCityLocalities } from '../utils/api';
import { useValuation } from '../context/ValuationContext';
import { EngineLoader } from '../components/ui/EngineLoader';
import { DocumentUpload } from '../components/ui/DocumentUpload';

const AMENITIES_LIST = ['Parking', 'Lift', 'Security', 'Gym', 'Swimming Pool', 'Power Backup', 'Garden', 'Club House', 'CCTV', 'Intercom'];

export default function PropertyForm() {
  const navigate = useNavigate();
  const { setCurrentValuation } = useValuation();
  const [showMap, setShowMap] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState({
    propertyType: 'residential',
    city: '',
    locality: '',
    pincode: '',
    area: '',
    yearOfConstruction: '',
    floorNumber: '',
    totalFloors: '',
    amenities: [] as string[],
    constructionQuality: 'good',
    declaredValue: '',
    purpose: 'lap',
    marketScenario: 'normal',
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    applicantPAN: '',
    applicantOccupation: '',
  });
  const [selectedCity, setSelectedCity] = useState('');
  // Tracks which fields were auto-filled and their confidence
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, 'high' | 'medium' | 'low'>>({});

  const { data: citiesData } = useQuery({ queryKey: ['cities'], queryFn: getCities });
  const { data: localitiesData } = useQuery({
    queryKey: ['localities', selectedCity],
    queryFn: () => getCityLocalities(selectedCity),
    enabled: !!selectedCity,
  });

  const cities: string[] = citiesData?.data || [];
  const localities: { locality: string }[] = localitiesData?.data || [];

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

  function toggleAmenity(amenity: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  }

  function handleExtracted(
    fields: Record<string, unknown>,
    confidenceMap: Record<string, { confidence: 'high' | 'medium' | 'low'; source: string }>
  ) {
    // Map extracted fields onto form state
    setForm(f => ({
      ...f,
      ...(fields.propertyType ? { propertyType: fields.propertyType as string } : {}),
      ...(fields.city ? { city: fields.city as string } : {}),
      ...(fields.locality ? { locality: fields.locality as string } : {}),
      ...(fields.pincode ? { pincode: fields.pincode as string } : {}),
      ...(fields.area ? { area: String(fields.area) } : {}),
      ...(fields.yearOfConstruction ? { yearOfConstruction: String(fields.yearOfConstruction) } : {}),
      ...(fields.floorNumber !== undefined ? { floorNumber: String(fields.floorNumber) } : {}),
      ...(fields.totalFloors ? { totalFloors: String(fields.totalFloors) } : {}),
      ...(fields.constructionQuality ? { constructionQuality: fields.constructionQuality as string } : {}),
      ...(fields.declaredValue ? { declaredValue: String(fields.declaredValue) } : {}),
      ...(fields.applicantName ? { applicantName: fields.applicantName as string } : {}),
      ...(fields.applicantPAN ? { applicantPAN: fields.applicantPAN as string } : {}),
      ...(fields.applicantPhone ? { applicantPhone: fields.applicantPhone as string } : {}),
      ...(fields.applicantEmail ? { applicantEmail: fields.applicantEmail as string } : {}),
    }));

    // If city was extracted, update selectedCity for locality dropdown
    if (fields.city) setSelectedCity(fields.city as string);

    // Store confidence per field for highlighting
    const conf: Record<string, 'high' | 'medium' | 'low'> = {};
    for (const [key, val] of Object.entries(confidenceMap)) {
      conf[key] = val.confidence;
    }
    setFieldConfidence(conf);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.city || !form.locality || !form.area || !form.declaredValue || !form.applicantName || !form.applicantEmail || !form.applicantPhone) {
      toast.error('Please fill all required fields');
      return;
    }
    mutation.mutate({
      ...form,
      area: parseFloat(form.area),
      declaredValue: parseFloat(form.declaredValue),
    });
  }

  const inputClass = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-colors placeholder:text-gray-400';
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5';

  // Returns extra border class based on OCR confidence for that field
  function confidenceBorder(field: string) {
    const c = fieldConfidence[field];
    if (!c) return '';
    if (c === 'high') return 'border-emerald-300 bg-emerald-50/30';
    if (c === 'medium') return 'border-amber-300 bg-amber-50/30';
    return 'border-red-300 bg-red-50/30';
  }

  function inputCls(field: string) {
    return `${inputClass} ${confidenceBorder(field)}`;
  }

  // Handle resizable panel
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newWidth = e.clientX;
    if (newWidth > 250 && newWidth < 600) {
      setSidebarWidth(newWidth);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {mutation.isPending && <EngineLoader />}

      {/* Left form panel */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            key="form-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: sidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden relative"
          >
            {/* Close sidebar arrow — positioned at right edge */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute -right-5 top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-gray-100 hover:bg-indigo-50 border-l border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 overflow-y-auto">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <h1 className="text-base font-bold text-gray-900">Property Valuation</h1>
                <p className="text-xs text-gray-400 mt-0.5">Fill details to run AI valuation</p>
              </div>

              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                {/* Property Type */}
                <Section icon={<Building2 className="w-4 h-4 text-indigo-500" />} title="Property Type">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {['residential', 'commercial', 'industrial', 'land'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, propertyType: type }))}
                        className={`py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                          form.propertyType === type
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className={labelClass}>Purpose *</label>
                    <select className={inputClass} value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}>
                      <option value="lap">Loan Against Property (LAP)</option>
                      <option value="mortgage">Mortgage</option>
                      <option value="working_capital">Working Capital</option>
                    </select>
                  </div>
                </Section>

                {/* Location */}
                <Section icon={<MapPin className="w-4 h-4 text-indigo-500" />} title="Location">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>City *</label>
                      <select
                        className={inputCls('city')}
                        value={form.city}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, city: e.target.value, locality: '' }));
                          setSelectedCity(e.target.value);
                        }}
                      >
                        <option value="">Select city</option>
                        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Locality *</label>
                      <select
                        className={inputCls('locality')}
                        value={form.locality}
                        onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))}
                        disabled={!form.city}
                      >
                        <option value="">{form.city ? 'Select locality' : 'Select city first'}</option>
                        {localities.map((l) => <option key={l.locality} value={l.locality}>{l.locality}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Pincode</label>
                      <input className={inputCls('pincode')} value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} placeholder="e.g. 400001" />
                    </div>
                  </div>
                </Section>

                {/* Specs */}
                <Section icon={<Ruler className="w-4 h-4 text-indigo-500" />} title="Specifications">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Area (sq ft) *</label>
                      <input type="number" className={inputCls('area')} value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} placeholder="e.g. 1200" />
                    </div>
                    <div>
                      <label className={labelClass}>Year Built</label>
                      <input type="number" className={inputCls('yearOfConstruction')} value={form.yearOfConstruction} onChange={(e) => setForm((f) => ({ ...f, yearOfConstruction: e.target.value }))} placeholder="e.g. 2010" />
                    </div>
                    <div>
                      <label className={labelClass}>Floor No.</label>
                      <input type="number" className={inputCls('floorNumber')} value={form.floorNumber} onChange={(e) => setForm((f) => ({ ...f, floorNumber: e.target.value }))} placeholder="e.g. 3" />
                    </div>
                    <div>
                      <label className={labelClass}>Total Floors</label>
                      <input type="number" className={inputCls('totalFloors')} value={form.totalFloors} onChange={(e) => setForm((f) => ({ ...f, totalFloors: e.target.value }))} placeholder="e.g. 10" />
                    </div>
                  </div>
                </Section>

                {/* Quality */}
                <Section icon={<Wrench className="w-4 h-4 text-indigo-500" />} title="Construction Quality">
                  <div className="grid grid-cols-3 gap-2">
                    {[{ value: 'standard', label: 'Standard', desc: '0.95x' }, { value: 'good', label: 'Good', desc: '1.00x' }, { value: 'premium', label: 'Premium', desc: '1.10x' }].map((q) => (
                      <button
                        key={q.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, constructionQuality: q.value }))}
                        className={`py-2.5 rounded-lg border text-xs font-medium transition-all ${
                          form.constructionQuality === q.value
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <div>{q.label}</div>
                        <div className="opacity-60 mt-0.5">{q.desc}</div>
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Amenities */}
                <Section icon={<Layers className="w-4 h-4 text-indigo-500" />} title="Amenities" badge={`${form.amenities.length} selected`}>
                  <div className="flex flex-wrap gap-1.5">
                    {AMENITIES_LIST.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAmenity(a)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          form.amenities.includes(a)
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Declared Value */}
                <Section icon={<DollarSign className="w-4 h-4 text-indigo-500" />} title="Declared Value">
                  <label className={labelClass}>Value declared by borrower (₹) *</label>
                  <input
                    type="number"
                    className={inputCls('declaredValue')}
                    value={form.declaredValue}
                    onChange={(e) => setForm((f) => ({ ...f, declaredValue: e.target.value }))}
                    placeholder="e.g. 8500000"
                  />
                  {form.declaredValue && (
                    <p className="text-xs text-gray-400 mt-1">
                      ≈ ₹{parseFloat(form.declaredValue) >= 10000000
                        ? `${(parseFloat(form.declaredValue) / 10000000).toFixed(2)} Cr`
                        : `${(parseFloat(form.declaredValue) / 100000).toFixed(2)} L`}
                    </p>
                  )}
                </Section>

                {/* Applicant Details */}
                <Section icon={<User className="w-4 h-4 text-indigo-500" />} title="Applicant Details">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={labelClass}>Full Name *</label>
                      <input
                        type="text"
                        className={inputCls('applicantName')}
                        value={form.applicantName}
                        onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email *</label>
                      <input
                        type="email"
                        className={inputCls('applicantEmail')}
                        value={form.applicantEmail}
                        onChange={(e) => setForm((f) => ({ ...f, applicantEmail: e.target.value }))}
                        placeholder="e.g. john@example.com"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone *</label>
                      <input
                        type="tel"
                        className={inputCls('applicantPhone')}
                        value={form.applicantPhone}
                        onChange={(e) => setForm((f) => ({ ...f, applicantPhone: e.target.value }))}
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>PAN</label>
                      <input
                        type="text"
                        className={inputCls('applicantPAN')}
                        value={form.applicantPAN}
                        onChange={(e) => setForm((f) => ({ ...f, applicantPAN: e.target.value }))}
                        placeholder="e.g. ABCDE1234F"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Occupation</label>
                      <select
                        className={inputClass}
                        value={form.applicantOccupation}
                        onChange={(e) => setForm((f) => ({ ...f, applicantOccupation: e.target.value }))}
                      >
                        <option value="">Select occupation</option>
                        <option value="salaried">Salaried</option>
                        <option value="self_employed">Self Employed</option>
                        <option value="business">Business</option>
                        <option value="professional">Professional</option>
                        <option value="retired">Retired</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Document Auto-fill */}
                <Section icon={<Sparkles className="w-4 h-4 text-indigo-500" />} title="Auto-fill from Document">
                  <DocumentUpload onExtracted={handleExtracted} />
                  {Object.keys(fieldConfidence).length > 0 && (
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Auto-filled (verified)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Review needed</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Uncertain</span>
                    </div>
                  )}
                </Section>

                <motion.button
                  type="submit"
                  disabled={mutation.isPending}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm"
                >
                  <Target className="w-4 h-4" />
                  Generate Valuation
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </form>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-white">
              <button
                onClick={() => setShowMap(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
              <span className="text-xs text-gray-300">COVAL AI Engine</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resizable divider */}
      {sidebarOpen && (
        <div
          onMouseDown={handleMouseDown}
          className={`w-1 bg-gray-200 hover:bg-indigo-400 transition-colors cursor-col-resize ${isDragging ? 'bg-indigo-400' : ''}`}
        />
      )}

      {/* Right — Map */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Open sidebar arrow — only when form is hidden */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-gray-100 hover:bg-indigo-50 border-r border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">Map View</h2>
          {!showMap && (
            <button onClick={() => setShowMap(true)} className="text-xs text-indigo-600 hover:underline">Show map</button>
          )}
          {showMap && (
            <button onClick={() => setShowMap(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showMap ? (
          <MapView
            searchLocation={
              form.locality && form.city
                ? `${form.locality}, ${form.city}`
                : form.city || undefined
            }
            onLocationConfirm={(loc) => {
              toast.success(`Location set: ${loc.placeName.split(',')[0]}`);
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <button
              onClick={() => setShowMap(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-white transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Open Map View
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Collapsible section component
function Section({
  icon, title, badge, children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {icon}
        <span className="text-xs font-semibold text-gray-700 flex-1">{title}</span>
        {badge && <span className="text-[10px] text-gray-400 mr-1">{badge}</span>}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}
