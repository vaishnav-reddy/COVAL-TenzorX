import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Shield, Clock, AlertTriangle, Filter, ArrowRight } from 'lucide-react';
import { getHistory } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrencyShort, formatDate } from '../utils/format';

const CITIES = ['Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Ahmedabad', 'Kolkata', 'Jaipur', 'Surat'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ city: '', propertyType: '', riskLevel: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['history', filters],
    queryFn: () => getHistory({ ...filters, limit: 50 }),
  });

  const valuations = data?.data || [];
  const stats = data?.stats || {};

  const statCards = [
    { label: 'Total Valuations', value: stats.total || 0, icon: BarChart3, color: 'text-[#1a9eff]' },
    { label: 'Avg Confidence', value: `${stats.avgConfidence || 0}%`, icon: Shield, color: 'text-emerald-400' },
    { label: 'Avg Processing', value: `${stats.avgProcessingTime || 0}ms`, icon: Clock, color: 'text-amber-400' },
    { label: 'High Risk Count', value: stats.highRiskCount || 0, icon: AlertTriangle, color: 'text-red-400' },
  ];

  return (
    <div className="min-h-screen bg-[#040d1a] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">NBFC Admin Dashboard</h1>
            <p className="text-slate-400 text-sm">All valuation history and portfolio analytics</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a9eff] hover:bg-[#0080e6] text-white text-sm rounded-lg transition-colors"
          >
            New Valuation <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <div className="flex items-center gap-3">
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-[#1a9eff]" />
            <span className="text-sm font-semibold text-white">Filters</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <select
              className="bg-[#071428] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1a9eff]/50"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            >
              <option value="">All Cities</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="bg-[#071428] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1a9eff]/50"
              value={filters.propertyType}
              onChange={(e) => setFilters((f) => ({ ...f, propertyType: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="land">Land</option>
            </select>
            <select
              className="bg-[#071428] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1a9eff]/50"
              value={filters.riskLevel}
              onChange={(e) => setFilters((f) => ({ ...f, riskLevel: e.target.value }))}
            >
              <option value="">All Risk Levels</option>
              <option value="safe">Safe</option>
              <option value="caution">Caution</option>
              <option value="high_risk">High Risk</option>
            </select>
          </div>
        </Card>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-white/5 text-xs">
                  <th className="text-left py-2.5 pr-4">Property</th>
                  <th className="text-left pr-4">Location</th>
                  <th className="text-right pr-4">Value Range</th>
                  <th className="text-right pr-4">Confidence</th>
                  <th className="text-center pr-4">Risk</th>
                  <th className="text-right pr-4">Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">Loading...</td></tr>
                ) : valuations.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">No valuations found</td></tr>
                ) : (
                  valuations.map((v: {
                    _id: string;
                    propertySnapshot: { propertyType: string; locality: string; city: string; area: number };
                    valueRangeLow: number;
                    valueRangeHigh: number;
                    confidenceScore: number;
                    overallRiskLabel: 'safe' | 'caution' | 'high_risk';
                    createdAt: string;
                  }, i: number) => (
                    <motion.tr
                      key={v._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/5 hover:bg-white/2 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <span className="capitalize text-white font-medium">{v.propertySnapshot?.propertyType}</span>
                        <p className="text-xs text-slate-500">{v.propertySnapshot?.area?.toLocaleString('en-IN')} sqft</p>
                      </td>
                      <td className="pr-4 text-slate-300">{v.propertySnapshot?.locality}, {v.propertySnapshot?.city}</td>
                      <td className="text-right pr-4 text-[#4db8ff] font-medium">
                        {formatCurrencyShort(v.valueRangeLow)} – {formatCurrencyShort(v.valueRangeHigh)}
                      </td>
                      <td className="text-right pr-4 text-white">{v.confidenceScore}%</td>
                      <td className="text-center pr-4">
                        <Badge variant={v.overallRiskLabel}>{v.overallRiskLabel?.replace('_', ' ').toUpperCase()}</Badge>
                      </td>
                      <td className="text-right pr-4 text-slate-400 text-xs">{formatDate(v.createdAt)}</td>
                      <td className="text-right">
                        <button
                          onClick={() => navigate(`/dashboard/${v._id}`)}
                          className="text-xs text-[#1a9eff] hover:text-[#4db8ff] transition-colors"
                        >
                          View →
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
