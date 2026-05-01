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
  propertySnapshot: { propertyType: string; locality: string; city: string; area: number; purpose: string };
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

const RISK_ICON: Record<string, React.ReactNode> = {
  safe: <span className="text-emerald-500">✓</span>,
  caution: <span className="text-amber-500">⚠</span>,
  high_risk: <span className="text-red-500">✗</span>,
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

  const valuations: Valuation[] = (data?.data || []).filter((v: Valuation) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${showFilters ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filter
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => navigate('/app/new-applicant')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
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
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-indigo-400"
            value={filters.city}
            onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
          >
            <option value="">All Cities</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-indigo-400"
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
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-indigo-400"
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
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-500 min-w-[160px]">
                <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Property</div>
              </th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-500 min-w-[140px]">
                <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Location</div>
              </th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-500">Purpose</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-500 min-w-[140px]">
                <div className="flex items-center justify-end gap-1.5"><TrendingUp className="w-3 h-3" /> Value Range</div>
              </th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-500">Distress Value</th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-500">
                <div className="flex items-center justify-center gap-1.5"><Shield className="w-3 h-3" /> Confidence</div>
              </th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-500">Risk Status</th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-500">RBI Flag</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-500">
                <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Date</div>
              </th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-500">Open</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    Loading valuations...
                  </div>
                </td>
              </tr>
            ) : valuations.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="w-8 h-8 text-gray-200" />
                    <p>No valuations found</p>
                    <button
                      onClick={() => navigate('/app/new-applicant')}
                      className="text-indigo-600 hover:underline text-xs mt-1"
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
                  className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/app/dashboard/${v._id}`)}
                >
                  {/* Row number */}
                  <td className="px-4 py-2.5 text-gray-300 font-mono">{i + 1}</td>

                  {/* Property */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-3 h-3 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 capitalize">{v.propertySnapshot?.propertyType}</p>
                        <p className="text-gray-400">{v.propertySnapshot?.area?.toLocaleString('en-IN')} sqft</p>
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-3 py-2.5">
                    <p className="text-gray-700">{v.propertySnapshot?.locality}</p>
                    <p className="text-gray-400">{v.propertySnapshot?.city}</p>
                  </td>

                  {/* Purpose */}
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium uppercase">
                      {v.propertySnapshot?.purpose?.replace('_', ' ') || 'LAP'}
                    </span>
                  </td>

                  {/* Value Range */}
                  <td className="px-3 py-2.5 text-right">
                    <p className="font-semibold text-gray-800">
                      {formatCurrencyShort(v.valueRangeLow)} – {formatCurrencyShort(v.valueRangeHigh)}
                    </p>
                    <p className="text-gray-400">Base: {formatCurrencyShort(v.marketValue)}</p>
                  </td>

                  {/* Distress Value */}
                  <td className="px-3 py-2.5 text-right">
                    <p className="text-amber-600 font-medium">{formatCurrencyShort(v.distressValue)}</p>
                  </td>

                  {/* Confidence */}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-semibold ${v.confidenceScore >= 75 ? 'text-emerald-600' : v.confidenceScore >= 55 ? 'text-amber-600' : 'text-red-500'}`}>
                        {v.confidenceScore}%
                      </span>
                      <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${v.confidenceScore >= 75 ? 'bg-emerald-500' : v.confidenceScore >= 55 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${v.confidenceScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Risk Status */}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {RISK_ICON[v.overallRiskLabel]}
                      <Badge variant={v.overallRiskLabel}>
                        {v.overallRiskLabel?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </td>

                  {/* RBI Flag */}
                  <td className="px-3 py-2.5 text-center">
                    {v.rbiErosionFlag
                      ? <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[10px] font-semibold">TRIGGERED</span>
                      : <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-semibold">CLEAR</span>
                    }
                  </td>

                  {/* Date */}
                  <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">
                    {new Date(v.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Open */}
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/dashboard/${v._id}`); }}
                      className="p-1 rounded hover:bg-indigo-100 text-indigo-600 transition-colors"
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
