import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, Calendar, MapPin, Building2,
  TrendingUp, Shield, AlertTriangle, ExternalLink, ChevronDown
} from 'lucide-react';
import { getHistory } from '../utils/api';
import { Badge } from '../components/ui/Badge';
import { formatCurrencyShort, formatDate } from '../utils/format';

const CITIES = ['Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Ahmedabad', 'Kolkata', 'Jaipur', 'Surat'];

type Valuation = {
  _id: string;
  propertySnapshot: { 
    propertyType: string; 
    locality: string; 
    city: string; 
    area: number; 
    purpose: string;
    applicantName?: string;
    applicantPhone?: string;
  };
  valueRangeLow: number;
  valueRangeHigh: number;
  marketValue: number;
  confidenceScore: number;
  liquidityScore: number;
  riskScore: number;
  overallRiskLabel: 'safe' | 'caution' | 'high_risk';
  distressValue: number;
  rbiErosionFlag: boolean;
  createdAt: string;
};



export default function AdminDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ city: '', propertyType: '', riskLevel: '' });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['history', filters],
    queryFn: () => getHistory({ ...filters, limit: 100 }),
  });

  const valuations: Valuation[] = (data?.data || [])
    .filter((v: Valuation) => !!v.propertySnapshot?.applicantName) // Filter out records without names
    .filter((v: Valuation) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        v.propertySnapshot?.applicantName?.toLowerCase().includes(q) ||
        v.propertySnapshot?.city?.toLowerCase().includes(q) ||
        v.propertySnapshot?.locality?.toLowerCase().includes(q) ||
        v.propertySnapshot?.propertyType?.toLowerCase().includes(q)
      );
    });

  const stats = data?.stats || {};

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-gray-100 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h1 className="text-sm font-semibold text-gray-800">Valuation History</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">
            {data?.stats?.total || 0} records
          </span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-56">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search city, locality..."
            className="flex-1 bg-transparent text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${showFilters ? 'border-gray-300 bg-gray-50 text-[#111]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filter
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => navigate('/app/new-applicant')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] hover:bg-black text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Valuation
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="border-b border-gray-100 px-6 py-2.5 flex items-center gap-3 bg-gray-50 shrink-0">
          <span className="text-xs text-gray-500 font-medium">Filter by:</span>
          <select
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-gray-900"
            value={filters.city}
            onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
          >
            <option value="">All Cities</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-gray-900"
            value={filters.propertyType}
            onChange={e => setFilters(f => ({ ...f, propertyType: e.target.value }))}
          >
            <option value="">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
            <option value="land">Land</option>
          </select>
          <select
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-gray-900"
            value={filters.riskLevel}
            onChange={e => setFilters(f => ({ ...f, riskLevel: e.target.value }))}
          >
            <option value="">All Risk Levels</option>
            <option value="safe">Safe</option>
            <option value="caution">Caution</option>
            <option value="high_risk">High Risk</option>
          </select>
          {(filters.city || filters.propertyType || filters.riskLevel) && (
            <button
              onClick={() => setFilters({ city: '', propertyType: '', riskLevel: '' })}
              className="text-xs text-red-500 hover:underline"
            >
              Clear all
            </button>
          )}
          {/* Stats pills */}
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500" /> Avg confidence: <strong className="text-gray-700">{stats.avgConfidence || 0}%</strong></span>
            <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> High risk: <strong className="text-gray-700">{stats.highRiskCount || 0}</strong></span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest w-8">#</th>
              <th className="text-left px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest min-w-[140px]">Applicant Name</th>
              <th className="text-left px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest min-w-[160px]">Property</th>
              <th className="text-left px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest">Contact</th>
              <th className="text-left px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest min-w-[140px]">Location</th>
              <th className="text-left px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest">Purpose</th>
              <th className="text-right px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest min-w-[140px]">Market Value</th>
              <th className="text-right px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest">Distress</th>
              <th className="text-center px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest">Confidence</th>
              <th className="text-center px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest">Risk</th>
              <th className="text-center px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap">RBI Compliance</th>
              <th className="text-left px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest">Date</th>
              <th className="text-center px-3 py-4 font-bold text-[10px] text-gray-400 uppercase tracking-widest w-12">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={13} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-[#111] rounded-full animate-spin" />
                    Loading valuations...
                  </div>
                </td>
              </tr>
            ) : valuations.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="w-8 h-8 text-gray-200" />
                    <p>No valuations found</p>
                    <button
                      onClick={() => navigate('/app/new-applicant')}
                      className="text-[#111] hover:underline text-xs mt-1"
                    >
                      + Add your first valuation
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              valuations.map((v, i) => (
                <motion.tr
                  key={v._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/app/dashboard/${v._id}`)}
                >
                  {/* Row number */}
                  <td className="px-4 py-4 text-gray-400 font-mono text-[10px]">{i + 1}</td>

                  {/* Applicant Name */}
                  <td className="px-3 py-4">
                    <p className="font-bold text-gray-900 text-[13px]">{v.propertySnapshot?.applicantName}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">Applicant</p>
                  </td>

                  {/* Property */}
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 capitalize text-[12px]">{v.propertySnapshot?.propertyType}</p>
                        <p className="text-[11px] text-gray-400">{v.propertySnapshot?.area?.toLocaleString('en-IN')} sqft</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-3 py-4 text-gray-600 font-medium">
                    {v.propertySnapshot?.applicantPhone}
                  </td>

                  {/* Location */}
                  <td className="px-3 py-4">
                    <p className="text-gray-700 font-medium">{v.propertySnapshot?.locality}</p>
                    <p className="text-gray-400 text-[11px]">{v.propertySnapshot?.city}</p>
                  </td>

                  {/* Purpose */}
                  <td className="px-3 py-4">
                    <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                      {v.propertySnapshot?.purpose?.replace('_', ' ') || 'LAP'}
                    </span>
                  </td>

                  {/* Value Range */}
                  <td className="px-3 py-4 text-right">
                    <p className="font-bold text-gray-900">
                      {formatCurrencyShort(v.valueRangeLow)} – {formatCurrencyShort(v.valueRangeHigh)}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">ESTIMATED VALUE</p>
                  </td>

                  {/* Distress Value */}
                  <td className="px-3 py-4 text-right">
                    <p className="text-gray-900 font-bold">{formatCurrencyShort(v.distressValue)}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase">Distress</p>
                  </td>

                  {/* Confidence */}
                  <td className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="font-bold text-gray-900 text-[12px]">
                        {v.confidenceScore}%
                      </span>
                      <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gray-900"
                          style={{ width: `${v.confidenceScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Risk Status */}
                  <td className="px-3 py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-100 bg-white">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        v.overallRiskLabel === 'safe' ? 'bg-emerald-500' : 
                        v.overallRiskLabel === 'caution' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                        {v.overallRiskLabel?.replace('_', ' ')}
                      </span>
                    </div>
                  </td>

                  {/* RBI Flag */}
                  <td className="px-3 py-4 text-center">
                    <span className={`text-[10px] font-bold tracking-widest ${v.rbiErosionFlag ? 'text-red-500 underline decoration-2 underline-offset-4' : 'text-gray-300'}`}>
                      {v.rbiErosionFlag ? 'TRIGGERED' : 'CLEAR'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-4 text-gray-500 font-medium whitespace-nowrap text-[11px]">
                    {new Date(v.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Open */}
                  <td className="px-3 py-4 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/dashboard/${v._id}`); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all border border-transparent hover:border-gray-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
