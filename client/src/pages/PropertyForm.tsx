import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Ruler, Calendar, Layers, Wrench, DollarSign, Target, Upload, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { createValuation, getCities, getCityLocalities } from '../utils/api';
import { useValuation } from '../context/ValuationContext';
import { EngineLoader } from '../components/ui/EngineLoader';
import { Card } from '../components/ui/Card';

const AMENITIES_LIST = ['Parking', 'Lift', 'Security', 'Gym', 'Swimming Pool', 'Power Backup', 'Garden', 'Club House', 'CCTV', 'Intercom'];

export default function PropertyForm() {
  const navigate = useNavigate();
  const { setCurrentValuation } = useValuation();
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
  });
  const [selectedCity, setSelectedCity] = useState('');

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
      toast.success('Valuation completed successfully');
      navigate(`/dashboard/${data.data.valuationId || data.data._id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Valuation failed';
      toast.error(msg);
    },
  });

  function toggleAmenity(amenity: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity) ? f.amenities.filter((a) => a !== amenity) : [...f.amenities, amenity],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.city || !form.locality || !form.area || !form.declaredValue) {
      toast.error('Please fill all required fields');
      return;
    }
    mutation.mutate({ ...form, area: parseFloat(form.area), declaredValue: parseFloat(form.declaredValue) });
  }

  const inputClass = 'w-full bg-[#071428] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1a9eff]/60 transition-colors';
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5';

  return (
    <div className="min-h-screen bg-[#040d1a] py-10 px-4">
      {mutation.isPending && <EngineLoader />}
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#1a9eff]/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#1a9eff]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Property Valuation</h1>
              <p className="text-slate-400 text-sm">AI-powered collateral assessment for NBFCs</p>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Property Type */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-[#1a9eff]" />
              <h2 className="text-sm font-semibold text-white">Property Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {['residential', 'commercial', 'industrial', 'land'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, propertyType: type }))}
                  className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${
                    form.propertyType === type
                      ? 'border-[#1a9eff] bg-[#1a9eff]/15 text-[#1a9eff]'
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={labelClass}>Purpose *</label>
                <select className={inputClass} value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}>
                  <option value="lap">Loan Against Property (LAP)</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="working_capital">Working Capital</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Location */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-[#1a9eff]" />
              <h2 className="text-sm font-semibold text-white">Location</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City *</label>
                <select
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => { setForm((f) => ({ ...f, city: e.target.value, locality: '' })); setSelectedCity(e.target.value); }}
                >
                  <option value="">Select City</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Locality *</label>
                {localities.length > 0 ? (
                  <select className={inputClass} value={form.locality} onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))}>
                    <option value="">Select Locality</option>
                    {localities.map((l: { locality: string }) => <option key={l.locality} value={l.locality}>{l.locality}</option>)}
                  </select>
                ) : (
                  <input className={inputClass} value={form.locality} onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))} placeholder="Enter locality" />
                )}
              </div>
              <div>
                <label className={labelClass}>Pincode</label>
                <input className={inputClass} value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} placeholder="e.g. 400001" />
              </div>
            </div>
          </Card>

          {/* Property Specs */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="w-4 h-4 text-[#1a9eff]" />
              <h2 className="text-sm font-semibold text-white">Property Specifications</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Total Area (sq ft) *</label>
                <input type="number" className={inputClass} value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} placeholder="e.g. 1200" />
              </div>
              <div>
                <label className={labelClass}>Year of Construction</label>
                <input type="number" className={inputClass} value={form.yearOfConstruction} onChange={(e) => setForm((f) => ({ ...f, yearOfConstruction: e.target.value }))} placeholder="e.g. 2010" />
              </div>
              <div>
                <label className={labelClass}>Floor Number</label>
                <input type="number" className={inputClass} value={form.floorNumber} onChange={(e) => setForm((f) => ({ ...f, floorNumber: e.target.value }))} placeholder="e.g. 3" />
              </div>
              <div>
                <label className={labelClass}>Total Floors in Building</label>
                <input type="number" className={inputClass} value={form.totalFloors} onChange={(e) => setForm((f) => ({ ...f, totalFloors: e.target.value }))} placeholder="e.g. 10" />
              </div>
            </div>
          </Card>

          {/* Quality */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-4 h-4 text-[#1a9eff]" />
              <h2 className="text-sm font-semibold text-white">Construction Quality</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'standard', label: 'Standard', desc: '0.95x' },
                { value: 'good', label: 'Good', desc: '1.00x' },
                { value: 'premium', label: 'Premium', desc: '1.10x' },
              ].map((q) => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, constructionQuality: q.value }))}
                  className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                    form.constructionQuality === q.value
                      ? 'border-[#1a9eff] bg-[#1a9eff]/15 text-[#1a9eff]'
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div>{q.label}</div>
                  <div className="text-xs opacity-60 mt-0.5">{q.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Amenities */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-[#1a9eff]" />
              <h2 className="text-sm font-semibold text-white">Amenities</h2>
              <span className="ml-auto text-xs text-slate-500">{form.amenities.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_LIST.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.amenities.includes(a)
                      ? 'border-[#1a9eff] bg-[#1a9eff]/15 text-[#1a9eff]'
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </Card>

          {/* Valuation */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-[#1a9eff]" />
              <h2 className="text-sm font-semibold text-white">Declared Value</h2>
            </div>
            <div>
              <label className={labelClass}>Value declared by borrower (₹) *</label>
              <input
                type="number"
                className={inputClass}
                value={form.declaredValue}
                onChange={(e) => setForm((f) => ({ ...f, declaredValue: e.target.value }))}
                placeholder="e.g. 8500000"
              />
              {form.declaredValue && (
                <p className="text-xs text-slate-500 mt-1">
                  ≈ ₹{parseFloat(form.declaredValue) >= 10000000
                    ? `${(parseFloat(form.declaredValue) / 10000000).toFixed(2)} Cr`
                    : `${(parseFloat(form.declaredValue) / 100000).toFixed(2)} L`}
                </p>
              )}
            </div>
          </Card>

          {/* Upload (mock) */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-[#1a9eff]" />
              <h2 className="text-sm font-semibold text-white">Property Images</h2>
              <span className="ml-auto text-xs text-slate-500">Optional</span>
            </div>
            <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center text-slate-500 text-sm hover:border-[#1a9eff]/30 transition-colors cursor-pointer">
              <Upload className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p>Drag and drop images or click to browse</p>
              <p className="text-xs mt-1 opacity-60">JPG, PNG up to 10MB each (mock processing)</p>
            </div>
          </Card>

          <motion.button
            type="submit"
            disabled={mutation.isPending}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-4 bg-gradient-to-r from-[#1a9eff] to-[#4db8ff] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(26,158,255,0.3)] disabled:opacity-50 transition-all"
          >
            <Target className="w-5 h-5" />
            Run COVAL Valuation
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
