import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, AlertTriangle, Droplets, Shield, Download, RefreshCw, FileText,
  Clock, CheckCircle, ChevronRight, ArrowUpRight, ArrowDownRight, Minus, Info
} from 'lucide-react';
import { getValuation } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { GaugeChart } from '../components/ui/GaugeChart';
import { formatCurrency, formatCurrencyShort, formatDate, getRiskColor, getSeverityColor, getConfidenceColor, getLiquidityColor } from '../utils/format';
import { ValuationResult, FlagSeverity, RiskLabel } from '../types';

function ValueRangeCard({ data }: { data: ValuationResult }) {
  return (
    <Card glowing className="col-span-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 mb-1 uppercase tracking-widest">AI-Assessed Market Value Range</p>
          <div className="flex items-end gap-3 flex-wrap">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-4xl font-extrabold text-white"
            >
              {formatCurrencyShort(data.valueRangeLow)}
            </motion.div>
            <span className="text-2xl text-slate-400 mb-1">—</span>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className="text-4xl font-extrabold text-[#4db8ff]"
            >
              {formatCurrencyShort(data.valueRangeHigh)}
            </motion.div>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-sm text-slate-400">Base: <span className="text-white font-medium">{formatCurrencyShort(data.marketValue)}</span></span>
            <span className="text-slate-600">|</span>
            <span className="text-sm text-slate-400">₹{data.pricePerSqft?.toLocaleString('en-IN')}/sqft</span>
            {data.overPricedFlag && (
              <Badge variant="critical">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Overpriced by {data.overCircleRatePercent}%
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-0.5">Declared Value</p>
            <p className="text-lg font-bold text-white">{formatCurrencyShort(data.propertySnapshot?.declaredValue || 0)}</p>
            <p className={`text-xs font-medium ${data.declaredVsMarketDeviation > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {data.declaredVsMarketDeviation > 0 ? <ArrowUpRight className="inline w-3 h-3" /> : <ArrowDownRight className="inline w-3 h-3" />}
              {Math.abs(data.declaredVsMarketDeviation)}% vs assessed
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ConfidenceCard({ data }: { data: ValuationResult }) {
  const color = getConfidenceColor(data.confidenceScore);
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-[#1a9eff]" />
        <span className="text-sm font-semibold text-white">Confidence Score</span>
      </div>
      <div className="flex flex-col items-center relative mb-4">
        <GaugeChart value={data.confidenceScore} color={color} label="confidence" size={150} />
      </div>
      <div className="space-y-2 mt-2">
        {Object.values(data.confidenceBreakdown || {}).map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-36 shrink-0">{item.label}</span>
            <div className="flex-1 h-1.5 bg-[#1a2d4a] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#1a9eff] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <span className="text-xs text-white w-8 text-right">{item.score}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DistressCard({ data }: { data: ValuationResult }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-white">Distress Value</span>
        {data.rbiErosionFlag && (
          <Badge variant="critical" className="ml-auto">RBI Flag</Badge>
        )}
      </div>
      <div className="text-3xl font-bold text-amber-400 mb-1">{formatCurrency(data.distressValue)}</div>
      <p className="text-xs text-slate-400 mb-3">Liquidation multiple: {data.distressMultiplier}x of market value</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Timeline</span>
          <span className="text-white font-medium">{data.liquidationTimeline}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Resale Risk</span>
          <Badge variant={data.resaleRisk as 'low' | 'medium' | 'high'}>{data.resaleRisk?.toUpperCase()}</Badge>
        </div>
      </div>
      {data.rbiErosionFlag && (
        <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <AlertTriangle className="inline w-3 h-3 mr-1" />
          RBI Significant Erosion: Realizable value below 50% threshold
        </div>
      )}
    </Card>
  );
}

function LiquidityCard({ data }: { data: ValuationResult }) {
  const color = getLiquidityColor(data.liquidityScore);
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="w-4 h-4 text-[#1a9eff]" />
        <span className="text-sm font-semibold text-white">Liquidity Score</span>
      </div>
      <div className="flex flex-col items-center relative mb-4">
        <GaugeChart value={data.liquidityScore} color={color} label="/ 100" size={150} />
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Time to Sell</span>
          <span className="text-white font-medium">{data.timeToSell}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Exit Certainty</span>
          <Badge variant={data.exitCertainty as 'high' | 'medium' | 'low'}>{data.exitCertainty?.toUpperCase()}</Badge>
        </div>
      </div>
    </Card>
  );
}

function RiskCard({ data }: { data: ValuationResult }) {
  const riskColorClass = getRiskColor(data.overallRiskLabel);
  return (
    <Card className="col-span-full lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <span className="text-sm font-semibold text-white">Risk & Fraud Detection</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-2xl font-bold ${riskColorClass}`}>{data.riskScore}</span>
          <span className="text-slate-400 text-sm">/100</span>
          <Badge variant={data.overallRiskLabel as RiskLabel}>
            {data.overallRiskLabel?.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>
      {data.redFlags?.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-400 text-sm py-2">
          <CheckCircle className="w-4 h-4" />
          No risk flags detected
        </div>
      ) : (
        <div className="space-y-2">
          {data.redFlags?.map((flag, i) => (
            <motion.div
              key={flag.code}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-3 rounded-lg border text-xs ${getSeverityColor(flag.severity as FlagSeverity)}`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold uppercase text-xs opacity-70">{flag.severity}</span>
                  <p className="mt-0.5">{flag.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ValueDriversCard({ data }: { data: ValuationResult }) {
  return (
    <Card className="col-span-full lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-[#1a9eff]" />
        <span className="text-sm font-semibold text-white">Value Drivers</span>
      </div>
      <div className="space-y-3">
        {Object.values(data.valueDrivers || {}).map((driver, i) => (
          <div key={driver.label}>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-400">{driver.label}</span>
              <span className="text-xs text-white font-medium">{driver.value} {driver.unit}</span>
            </div>
            <div className="h-2 bg-[#1a2d4a] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#1a9eff] to-[#4db8ff] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${driver.weight}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-0.5">Weight: {driver.weight}%</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ComparablesCard({ data }: { data: ValuationResult }) {
  return (
    <Card className="col-span-full">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-[#1a9eff]" />
        <span className="text-sm font-semibold text-white">Comparable Transactions</span>
        <span className="ml-auto text-xs text-slate-500">{data.comparables?.length || 0} comps found</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-white/5">
              <th className="text-left py-2 pr-4">Property</th>
              <th className="text-right pr-4">Area (sqft)</th>
              <th className="text-right pr-4">Price/sqft</th>
              <th className="text-right pr-4">Total Price</th>
              <th className="text-right pr-4">Age (yr)</th>
              <th className="text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {(data.comparables || []).map((comp, i) => (
              <tr key={i} className="border-b border-white/5 text-white hover:bg-white/2 transition-colors">
                <td className="py-2 pr-4 text-slate-300 capitalize">{comp.propertyType} – {comp.quality}</td>
                <td className="text-right pr-4">{comp.area?.toLocaleString('en-IN')}</td>
                <td className="text-right pr-4 text-[#1a9eff]">₹{comp.pricePerSqft?.toLocaleString('en-IN')}</td>
                <td className="text-right pr-4">{formatCurrencyShort(comp.price)}</td>
                <td className="text-right pr-4">{comp.age}</td>
                <td className="text-right text-slate-400">{comp.transactionDate ? new Date(comp.transactionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AuditTrailCard({ data }: { data: ValuationResult }) {
  return (
    <Card className="col-span-full">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-[#1a9eff]" />
        <span className="text-sm font-semibold text-white">Audit Trail</span>
        <span className="ml-auto text-xs text-slate-500">Total: {data.processingTime}ms</span>
      </div>
      <div className="space-y-2">
        {data.auditTrail?.map((entry, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#071428] border border-white/5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <span className="text-sm text-white font-medium">{entry.engine}</span>
              <span className="text-xs text-slate-500 ml-2">{formatDate(entry.timestamp)}</span>
            </div>
            <span className="text-xs text-[#1a9eff] bg-[#1a9eff]/10 px-2 py-0.5 rounded-full">{entry.duration}ms</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ValuationDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['valuation', id],
    queryFn: () => getValuation(id!),
    enabled: !!id,
  });

  const valuation: ValuationResult = data?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#040d1a] flex items-center justify-center">
        <div className="text-slate-400">Loading valuation...</div>
      </div>
    );
  }

  if (isError || !valuation) {
    return (
      <div className="min-h-screen bg-[#040d1a] flex items-center justify-center">
        <div className="text-red-400">Failed to load valuation. <button className="text-[#1a9eff] underline" onClick={() => navigate('/')}>Go back</button></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040d1a] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm transition-colors">← New Valuation</button>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-300 text-sm capitalize">
                {valuation.propertySnapshot?.propertyType} — {valuation.propertySnapshot?.locality}, {valuation.propertySnapshot?.city}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">Valuation Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">ID: {id} • {formatDate(valuation.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/report/${id}`)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white border border-white/10 transition-colors">
              <FileText className="w-4 h-4" />
              Full Report
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a9eff]/15 hover:bg-[#1a9eff]/25 text-sm text-[#1a9eff] border border-[#1a9eff]/30 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Re-evaluate
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a9eff] hover:bg-[#0080e6] text-sm text-white transition-colors">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Market Context Strip */}
        {valuation.marketData && (
          <div className="mb-5 p-3 rounded-xl border border-white/5 bg-white/2 flex flex-wrap gap-5 text-xs text-slate-400">
            <span>📍 {valuation.marketData.city} — {valuation.marketData.locality}</span>
            <span>Avg ₹{valuation.marketData.avgPricePerSqft?.toLocaleString('en-IN')}/sqft</span>
            <span>Circle Rate: ₹{valuation.marketData.circleRate?.toLocaleString('en-IN')}/sqft</span>
            <span>Demand Index: {valuation.marketData.demandIndex}/10</span>
            <span className="text-emerald-400">YoY Appreciation: +{valuation.marketData.yoyAppreciation}%</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <ValueRangeCard data={valuation} />
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ConfidenceCard data={valuation} />
            <LiquidityCard data={valuation} />
          </div>
          <DistressCard data={valuation} />
          <RiskCard data={valuation} />
          <ValueDriversCard data={valuation} />
          <ComparablesCard data={valuation} />
          <AuditTrailCard data={valuation} />
        </div>
      </div>
    </div>
  );
}
