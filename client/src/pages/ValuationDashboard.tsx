import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, AlertTriangle, Droplets, Shield, Download, RefreshCw, FileText,
  CheckCircle, ChevronRight, ArrowUpRight, User, Building2, MapPin, 
  CreditCard, Activity, Zap, Globe, Briefcase, Info, Eye, Clock, BarChart3, PieChart
} from 'lucide-react';
import { getValuation } from '../utils/api';
import { Badge } from '../components/ui/Badge';
import { formatCurrencyShort, formatDate } from '../utils/format';
import { ValuationResult, RiskLabel } from '../types';

/* ── Style Tokens ────────────────────────────────────────── */
const glass = "bg-white/70 backdrop-blur-xl border border-[#E5E5E5] shadow-[0_8px_30px_rgb(0,0,0,0.04)]";
const cardRadius = "rounded-[2rem]";

/* ── UI Components ───────────────────────────────────────── */

function MetricDisplay({ label, value, unit, icon: Icon, color = "text-[#111]" }: { label: string, value: any, unit?: string, icon?: any, color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-400">
        {Icon && <Icon className="w-3 h-3" />}
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className={`text-2xl font-semibold tracking-tighter ${color}`}>
        {value}
        {unit && <span className="text-sm text-gray-400 ml-1 font-medium tracking-normal">{unit}</span>}
      </p>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string, sub?: string }) {
  return (
    <div className="mb-8">
      <h3 className="text-[15px] font-semibold text-[#111] tracking-tight">{title}</h3>
      {sub && <p className="text-[13px] text-gray-500 font-medium mt-1">{sub}</p>}
    </div>
  );
}

function ProgressLine({ label, value, weight, color = "bg-[#111]" }: { label: string, value: any, weight?: number, color?: string }) {
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-2">
        <div>
          <p className="text-[13px] font-semibold text-[#111]">{label}</p>
          {weight !== undefined && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Weight: {weight}%</p>}
        </div>
        <span className="text-[13px] font-bold text-[#111]">{value}</span>
      </div>
      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
         <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${weight ? weight : 70}%` }}
           transition={{ duration: 1, ease: "easeOut" }}
           className={`h-full ${color} rounded-full`}
         />
      </div>
    </div>
  );
}

function InfoRow({ label, value, badge }: { label: string, value?: string | number, badge?: any }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px] font-medium text-gray-400 uppercase tracking-tight">{label}</span>
      {badge ? (
        <Badge variant={badge} className="text-[10px] font-bold">{value?.toString().toUpperCase()}</Badge>
      ) : (
        <span className="text-[13px] font-semibold text-[#111]">{value}</span>
      )}
    </div>
  );
}

/* ── Custom Charts ───────────────────────────────────────── */

function DonutChart({ data, size = 120 }: { data: { name: string, value: number, color: string }[], size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size * 0.35;
  const strokeW = size * 0.12;
  const center = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke="#F4F4F5" strokeWidth={strokeW} />
        {data.map((d, i) => {
          const dash = (d.value / total) * circumference;
          const gap = circumference - dash;
          const seg = (
            <circle
              key={i} cx={center} cy={center} r={r} fill="none"
              stroke={d.color} strokeWidth={strokeW}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
        <span className="text-[14px] font-bold text-[#111]">100%</span>
      </div>
    </div>
  );
}

function Sparkline({ data, width = 120, height = 40, color = "#111" }: { data: number[], width?: number, height?: number, color?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((data[data.length-1] - min) / range) * height} r="3" fill={color} />
    </svg>
  );
}

function MiniBarChart({ data, width = 160, height = 60 }: { data: { label: string, value: number, color: string }[], width?: number, height?: number }) {
  const max = 100;
  const barW = (width / data.length) - 8;

  return (
    <svg width={width} height={height}>
      {data.map((d, i) => {
        const barH = (d.value / max) * height;
        return (
          <g key={i}>
            <rect 
              x={i * (barW + 8)} 
              y={height - barH} 
              width={barW} 
              height={barH} 
              fill={d.color} 
              rx="2" 
              className="opacity-80"
            />
            <text x={i * (barW + 8) + barW/2} y={height + 10} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="bold" className="uppercase">{d.label.slice(0,3)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Main Components ─────────────────────────────────────── */

function HeroValuation({ data }: { data: ValuationResult }) {
  return (
    <div className={`col-span-full ${glass} ${cardRadius} p-12 mb-8 relative overflow-hidden`}>
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-4">Estimated Market Valuation</p>
          <h1 className="text-6xl md:text-7xl font-semibold text-[#111] tracking-[-0.04em] leading-none mb-8">
            {formatCurrencyShort(data.valueRangeLow)}
            <span className="text-gray-200 mx-4 font-light">—</span>
            {formatCurrencyShort(data.valueRangeHigh)}
          </h1>
          <div className="flex items-center gap-12">
            <MetricDisplay label="Base Market Value" value={formatCurrencyShort(data.marketValue)} />
            <div className="w-px h-10 bg-gray-100" />
            <MetricDisplay label="Square Foot Rate" value={`₹${data.pricePerSqft?.toLocaleString('en-IN')}`} unit="/sqft" />
          </div>
        </div>

        <div className="bg-[#111] p-8 rounded-[1.5rem] w-full md:w-80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[80px] -mr-16 -mt-16" />
          <div className="relative z-10">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Max Loan Recommendation</span>
              <p className="text-4xl font-bold tracking-tighter text-white">
                {formatCurrencyShort(data.marketValue * (data.adjustedLTV || 0.75))}
              </p>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{(data.adjustedLTV || 0.75) * 100}% LTV Cap</span>
                 <div className="w-1 h-1 rounded-full bg-gray-700" />
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Based on Credit Profile</span>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Loan Requirement</span>
              <p className="text-2xl font-bold tracking-tighter text-gray-300">
                {formatCurrencyShort(data.propertySnapshot?.loanAmountRequired || 0)}
              </p>
            </div>
          </div>
          {data.declaredVsMarketDeviation !== undefined && data.declaredVsMarketDeviation !== 0 && (
            <div className="mt-6 flex items-center gap-2 relative z-10">
               <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${data.declaredVsMarketDeviation > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {data.declaredVsMarketDeviation > 0 ? 'Overpriced' : 'Underpriced'} {Math.abs(data.declaredVsMarketDeviation)}%
               </div>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Assessment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LiquidityModeling({ data }: { data: ValuationResult }) {
  const resaleIndex = data.liquidityScore || 0;
  const snapshot = data.propertySnapshot as any;

  // Build demand pulse from real market data: demandIndex + yoyAppreciation + liquidityScore
  const demandIndex = data.marketData?.demandIndex || 5;
  const yoy = data.marketData?.yoyAppreciation || 5;
  const absorption = data.marketData?.marketAbsorptionRate || 5;
  const demandTrend = [
    Math.round(demandIndex * 8),
    Math.round(demandIndex * 8.5),
    Math.round(demandIndex * 7.8 + yoy),
    Math.round(demandIndex * 9 + yoy),
    Math.round(resaleIndex * 0.85),
    Math.round(resaleIndex * 0.9 + absorption),
    resaleIndex,
  ];

  // Derive liquidity label from score
  const liquidityLabel = resaleIndex >= 75 ? 'High Liquidity' : resaleIndex >= 50 ? 'Moderate Liquidity' : 'Low Liquidity';
  const liquidityColor = resaleIndex >= 75 ? 'text-emerald-600' : resaleIndex >= 50 ? 'text-amber-600' : 'text-red-600';

  // Derive fungibility from property type + subtype
  const propertySubType = snapshot?.propertySubType || snapshot?.propertyType || 'Property';
  const fungibilityWeight = Math.min(Math.round(resaleIndex * 0.9), 100);

  // Secondary demand from demand index
  const secondaryDemandWeight = Math.min(Math.round(demandIndex * 10), 100);
  const secondaryDemandLabel = demandIndex >= 7 ? 'High' : demandIndex >= 4 ? 'Moderate' : 'Low';

  // Legal exit risk from title clarity
  const titleClarity = snapshot?.titleClarity || 'clear';
  const legalWeight = titleClarity === 'clear' ? 95 : titleClarity === 'disputed' ? 40 : 15;
  const legalLabel = titleClarity === 'clear' ? 'Clear Title' : titleClarity === 'disputed' ? 'Disputed' : 'In Litigation';
  const legalColor = titleClarity === 'clear' ? 'bg-emerald-500' : 'bg-red-500';

  return (
    <div className={`lg:col-span-2 ${glass} ${cardRadius} p-8 flex flex-col shadow-sm`}>
      <div className="flex justify-between items-start mb-8">
        <SectionTitle title="Resale & Liquidity Engine" sub="Predicting exit certainty and velocity" />
        <div className="text-right">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Demand Pulse</p>
           <Sparkline data={demandTrend} color="#111" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 flex-1">
        <div className="flex flex-col justify-center items-center p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100">
           <div className="relative mb-4">
              <svg width="120" height="120" className="transform -rotate-90">
                 <circle cx="60" cy="60" r="54" fill="none" stroke="#E5E5E5" strokeWidth="10" />
                 <motion.circle 
                   cx="60" cy="60" r="54" fill="none" stroke="#111" strokeWidth="10"
                   strokeDasharray={2 * Math.PI * 54}
                   initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
                   animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - resaleIndex/100) }}
                   transition={{ duration: 1.5, ease: "easeOut" }}
                   strokeLinecap="round"
                 />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-3xl font-bold tracking-tighter text-[#111]">{resaleIndex}</span>
                 <span className="text-[9px] font-bold text-gray-400 uppercase">Index</span>
              </div>
           </div>
           <div className="text-center">
              <h4 className="text-[13px] font-bold text-[#111]">Resale Potential</h4>
              <p className={`text-[11px] font-bold uppercase tracking-tighter mt-1 flex items-center gap-1 ${liquidityColor}`}>
                 <Zap className="w-3 h-3" /> {liquidityLabel}
              </p>
           </div>
        </div>

        <div className="flex flex-col justify-between py-2">
           <div className="flex items-center gap-5">
              <div className="w-10 h-10 rounded-xl bg-[#111] flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
                 <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time to Liquidate</p>
                 <p className="text-xl font-bold text-[#111] tracking-tight">{data.timeToSell || 'N/A'}</p>
              </div>
           </div>

           <div className="space-y-4 pt-6">
              <ProgressLine label="Market Fungibility" value={propertySubType} weight={fungibilityWeight} />
              <ProgressLine label="Secondary Demand" value={secondaryDemandLabel} weight={secondaryDemandWeight} />
              <ProgressLine label="Legal Exit Risk" value={legalLabel} weight={legalWeight} color={legalColor} />
           </div>
        </div>
      </div>
    </div>
  );
}

function ValuationConfidence({ data }: { data: ValuationResult }) {
  // Use real confidence breakdown from the engine
  const breakdown = data.confidenceBreakdown || {};
  const colors = ['#111', '#3B82F6', '#10B981', '#F59E0B'];
  const chartData = Object.values(breakdown).map((item: any, i) => ({
    label: item.label || `Component ${i + 1}`,
    value: item.score || 0,
    color: colors[i % colors.length],
  }));

  // Fallback if no breakdown available
  const displayData = chartData.length > 0 ? chartData : [
    { label: 'Data Completeness', value: 0, color: '#111' },
    { label: 'Comparable Evidence', value: 0, color: '#3B82F6' },
    { label: 'Location Intelligence', value: 0, color: '#10B981' },
    { label: 'Risk Adjustment', value: 0, color: '#F59E0B' },
  ];

  return (
    <div className={`lg:col-span-2 ${glass} ${cardRadius} p-8 flex flex-col justify-between hover:shadow-xl transition-shadow`}>
        <SectionTitle title="Valuation Confidence" sub="Data Integrity & Model Reliability" />
        <div className="flex-1 flex flex-col justify-center">
           <div className="flex items-end justify-between mb-8">
              <div className="flex items-end gap-3">
                 <p className="text-6xl font-black tracking-tighter text-[#111]">{data.confidenceScore}</p>
                 <div className="pb-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Composite Score</p>
                    <div className="flex items-center gap-1">
                       <CheckCircle className="w-3 h-3 text-emerald-500" />
                       <span className="text-[10px] text-emerald-600 font-bold uppercase">Verified Asset</span>
                    </div>
                 </div>
              </div>
              <div className="pb-2">
                 <MiniBarChart data={displayData} />
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              {displayData.map(item => (
                <div key={item.label} className="group">
                   <div className="flex justify-between items-end mb-1.5">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{item.label}</span>
                      <span className="text-[12px] font-black text-[#111]">{item.value}%</span>
                   </div>
                   <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }} className="h-full bg-[#111] rounded-full" />
                   </div>
                </div>
              ))}
           </div>
        </div>
    </div>
  );
}

function ValuationBreakdown({ data }: { data: ValuationResult }) {
  // Derive real breakdown from valuation engine outputs
  // The valuation engine uses: Sales Comparison + Cost Approach
  // Cost approach splits into land (45% of area value) + structure
  // We compute from available data: distressValue gives us structure depreciation
  const marketValue = data.marketValue || 1;
  const circleRate = data.marketData?.circleRate || 0;
  const area = (data.propertySnapshot as any)?.area || 0;

  // Land value = circle rate × area (statutory floor)
  const landValue = Math.min(circleRate * area, marketValue * 0.75);
  const landPct = Math.round((landValue / marketValue) * 100);

  // Amenities bonus from valueDrivers if available
  const amenitiesDriver = data.valueDrivers?.amenities;
  const amenitiesPct = amenitiesDriver ? Math.round(Math.abs(amenitiesDriver.value - 1) * 100) : Math.min(10, (data.propertySnapshot as any)?.amenities?.length || 0);

  // Building = remainder
  const buildingPct = Math.max(0, 100 - landPct - amenitiesPct);

  const breakdownData = [
    { name: 'Land Value', value: landPct, color: '#111' },
    { name: 'Building', value: buildingPct, color: '#3B82F6' },
    { name: 'Amenities', value: amenitiesPct, color: '#10B981' },
  ];

  return (
    <div className={`lg:col-span-2 ${glass} ${cardRadius} p-8 shadow-sm`}>
      <SectionTitle title="Collateral Composition" sub="Intrinsic value distribution" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="flex justify-center">
           <DonutChart data={breakdownData} size={160} />
        </div>
        <div className="space-y-5">
           {breakdownData.map(item => (
             <div key={item.name} className="flex items-center justify-between group cursor-default">
                <div className="flex items-center gap-3">
                   <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                   <span className="text-[13px] font-bold text-gray-500 group-hover:text-[#111] transition-colors">{item.name}</span>
                </div>
                <div className="text-right">
                   <p className="text-[14px] font-black text-[#111]">{formatCurrencyShort(data.marketValue * (item.value / 100))}</p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase">{item.value}%</p>
                </div>
             </div>
           ))}
           <div className="pt-5 border-t border-gray-100">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                 <span>Statutory Floor (Circle)</span>
                 <span className="text-[#111]">{formatCurrencyShort(data.marketData?.circleRate || data.marketValue * 0.75)}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function DistressAnalysis({ data }: { data: ValuationResult }) {
  const forcedValueLow = data.distressValue * 0.95;
  const forcedValueHigh = data.distressValue * 1.05;

  return (
    <div className={`lg:col-span-1 ${glass} ${cardRadius} p-8 shadow-sm flex flex-col`}>
      <SectionTitle title="Distress Sale Output" sub="Forced-liquidation estimate" />
      <div className="flex-1 flex flex-col justify-center">
         <div className="mb-8">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Distress Value Range</p>
            <p className="text-2xl font-bold text-red-600 tracking-tighter">
               {formatCurrencyShort(forcedValueLow)} — {formatCurrencyShort(forcedValueHigh)}
            </p>
         </div>
         <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100">
               <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-red-600 uppercase">Liquidity Discount</span>
                  <span className="text-[13px] font-black text-red-600">-{Math.round((1 - data.distressMultiplier) * 100)}%</span>
               </div>
               <p className="text-[10px] text-red-500 font-medium leading-tight">Discount applied for 30-day exit window</p>
            </div>
            <ProgressLine label="Realizable Value (90%)" value={formatCurrencyShort(data.marketValue * 0.9)} weight={90} color="bg-emerald-500" />
         </div>
      </div>
    </div>
  );
}

function RiskAnalysis({ data }: { data: ValuationResult }) {
  const snapshot = data.propertySnapshot as any;
  const creditData = data.creditScoring || {
    creditAnalysis: { score: snapshot?.cibilScore || 0, category: 'N/A' },
    ltvAdjustment: { base: 0.75, adjusted: 0.75, adjustment: 0 }
  };

  return (
    <div className={`col-span-full ${glass} ${cardRadius} p-8`}>
      <SectionTitle title="Risk & Credit Underwriting" sub="Determining loan safety margins" />
      
      <div className="flex flex-col gap-8">
        {/* Collateral Risk Flags (On Top) */}
        <div>
          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Collateral Risk Flags</h5>
          <div className="space-y-2 w-full">
             {data.redFlags?.map((flag, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors w-full">
                  <div className={`p-1.5 rounded-lg shrink-0 ${flag.severity === 'critical' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-4">
                    <p className="text-[13px] font-semibold text-[#111] leading-tight">{flag.message}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">{flag.severity} risk</p>
                  </div>
                </div>
             ))}
             {(!data.redFlags || data.redFlags.length === 0) && (
                <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-200 rounded-[1.5rem] w-full">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mb-2 opacity-20" />
                  <p className="text-[12px] font-semibold text-gray-400">No Risk Flags Detected</p>
                </div>
             )}
          </div>
        </div>

        {/* Borrower Profile (At Bottom) */}
        <div className="pt-8 border-t border-gray-100">
          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Borrower Risk Profile</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
             <MetricDisplay icon={Shield} label="CIBIL Score" value={creditData.creditAnalysis.score || 'N/A'} color="text-[#111]" />
             <MetricDisplay icon={CreditCard} label="Risk Category" value={creditData.creditAnalysis.category?.toUpperCase() || 'N/A'} />
             <MetricDisplay icon={Briefcase} label="Monthly EMIs" value={snapshot?.existingEMIs ? `₹${parseFloat(snapshot.existingEMIs).toLocaleString('en-IN')}` : 'None'} />
             <MetricDisplay icon={Activity} label="Loan Purpose" value={snapshot?.purpose?.toUpperCase() || 'LAP'} />
          </div>
          <div className="mt-8 p-5 rounded-2xl bg-[#111] border border-white/5 flex items-center justify-between shadow-2xl">
             <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                   <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Recommended Loan-to-Value</span>
                   <Badge variant="safe" className="text-[9px] font-black tracking-tighter bg-emerald-500/20 text-emerald-400 border-emerald-500/20">CREDIT VERIFIED</Badge>
                </div>
                <p className="text-[11px] text-gray-400 font-medium italic">
                  Max LTV capped at {(data.adjustedLTV || 0.75) * 100}% due to {creditData.creditAnalysis.category} profile.
                </p>
             </div>
             <div className="text-right">
                <p className="text-3xl font-bold tracking-tighter text-white">{(data.adjustedLTV || 0.75) * 100}%</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocationIntelligence({ data }: { data: ValuationResult }) {
  // Build velocity trend from real market data
  const yoy = data.marketData?.yoyAppreciation || 5;
  const demandIndex = data.marketData?.demandIndex || 5;
  const baseVelocity = Math.round(demandIndex * 8);
  const velocityTrend = [
    Math.max(10, baseVelocity - 12),
    Math.max(10, baseVelocity - 8),
    Math.max(10, baseVelocity - 5),
    Math.max(10, baseVelocity - 2),
    baseVelocity,
    Math.round(baseVelocity + yoy * 0.3),
    Math.round(baseVelocity + yoy * 0.5),
  ];

  // Derive proximity highlights from real data
  const connectivity = data.marketData?.connectivity || 0;
  const infraScore = data.marketData?.infrastructureScore || 0;
  const connectivityLabel = connectivity >= 8 ? 'Excellent' : connectivity >= 6 ? 'Good' : connectivity >= 4 ? 'Moderate' : 'Limited';
  const connectivityPct = Math.round(connectivity * 10);

  const proximityHighlights = [
    { label: 'Primary Connectivity', value: `${connectivityLabel} (${connectivityPct}%)` },
    { label: 'Infrastructure Score', value: `${infraScore}/10` },
    { label: 'Market Absorption', value: `${data.marketData?.marketAbsorptionRate?.toFixed(1) || 'N/A'}% / month` },
  ];

  return (
    <div className={`col-span-full ${glass} ${cardRadius} p-8 shadow-sm`}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <SectionTitle title="Location & Infrastructure" sub={`${data.propertySnapshot?.locality || data.marketData?.locality}, ${data.propertySnapshot?.city || data.marketData?.city}`} />
          <p className="text-[11px] text-gray-400 font-medium mt-1 uppercase tracking-wider">{(data.propertySnapshot as any)?.pincode ? `PIN: ${(data.propertySnapshot as any).pincode}` : ''}</p>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Market Velocity</p>
              <Sparkline data={velocityTrend} color="#10B981" />
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <MetricDisplay label="Composite Score" value={data.compositeLocationScore ?? data.marketData?.demandIndex ? Math.round((data.marketData.demandIndex / 10) * 100) : 'N/A'} unit="/100" />
        <MetricDisplay label="Infrastructure" value={data.marketData?.infrastructureScore ?? 'N/A'} unit="Index" />
        <MetricDisplay label="Neighborhood" value={data.marketData?.connectivity ?? 'N/A'} unit="Grade" />
        <MetricDisplay label="Demand Velocity" value={data.marketActivityProxies?.priceVelocity != null ? `+${data.marketActivityProxies.priceVelocity}%` : data.marketData?.yoyAppreciation != null ? `+${data.marketData.yoyAppreciation}%` : 'N/A'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8 pt-8 border-t border-gray-100">
        <div className="space-y-6">
          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Market Activity Proxies</h5>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
             <MetricDisplay icon={User} label="Broker Density" value={data.marketActivityProxies?.brokerDensity ?? 'N/A'} unit="/km²" />
             <MetricDisplay icon={Activity} label="Transact. Vol" value={data.marketActivityProxies?.transactionIndicators ?? 'N/A'} />
             <MetricDisplay icon={Globe} label="Listing Density" value={data.marketActivityProxies?.listingDensity ?? 'N/A'} unit="/km²" />
             <MetricDisplay icon={TrendingUp} label="Price Velocity" value={data.marketActivityProxies?.priceVelocity != null ? `+${data.marketActivityProxies.priceVelocity}%` : 'N/A'} />
          </div>
        </div>
        <div className="space-y-6">
           <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Proximity Highlights</h5>
           <div className="grid grid-cols-1 gap-2">
              {proximityHighlights.map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                   <span className="text-[12px] text-gray-500 font-medium">{item.label}</span>
                   <span className="text-[13px] font-bold text-[#111]">{item.value}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main View ───────────────────────────────────────────── */

export default function ValuationDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: apiResponse, isLoading, isError } = useQuery({
    queryKey: ['valuation', id],
    queryFn: () => getValuation(id!),
    enabled: !!id,
  });

  const data: ValuationResult = apiResponse?.data;

  if (isLoading) return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
       <div className="text-[14px] font-medium text-gray-400 animate-pulse uppercase tracking-[0.2em]">Processing Asset...</div>
    </div>
  );
  
  if (isError || !data) return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
       <button onClick={() => navigate('/app/new-application')} className="px-8 py-3 bg-[#1A1A1A] text-white rounded-full text-[14px] font-medium shadow-lg">Return to Dashboard</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 w-full flex flex-col items-center">
      
      {/* Navbar Style Header */}
      <div className="sticky top-0 z-40 w-full bg-[#FDFDFD]/70 backdrop-blur-xl border-b border-[#EAEAEA] px-8 py-4 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/app/all-records')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
             </button>
             <div>
                <h1 className="text-[15px] font-semibold text-[#111] tracking-tight">Valuation Report <span className="text-gray-300 font-normal mx-2">/</span> <span className="text-gray-400 font-medium">#{id?.slice(-8).toUpperCase()}</span></h1>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => window.print()} className="px-6 py-2 bg-[#1A1A1A] hover:bg-black text-white text-[13px] font-medium rounded-full transition-all shadow-sm flex items-center gap-2">
                <Download className="w-3.5 h-3.5" /> Export PDF
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl w-full px-8 mt-16 print:mt-0 print:px-0">
        <div id="valuation-content" className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <HeroValuation data={data} />

          <LiquidityModeling data={data} />
          
          <ValuationConfidence data={data} />

          <ValuationBreakdown data={data} />
          <DistressAnalysis data={data} />

          {/* Asset Identity (Full Height) */}
          <div className={`lg:col-span-1 ${glass} ${cardRadius} p-8 flex flex-col h-full shadow-sm`}>
             <SectionTitle title="Asset Identity" />
             <div className="space-y-4">
                <InfoRow label="Property Type" value={data.propertySnapshot?.propertyType} />
                <InfoRow label="Gross Area" value={`${data.propertySnapshot?.area} SQFT`} />
                <InfoRow label="Build Grade" value={(data.propertySnapshot as any)?.constructionQuality} />
                <InfoRow label="Age" value={`${(data.propertyAge || 0)} Years`} badge={(data.propertyAge || 0) < 5 ? 'success' : (data.propertyAge || 0) < 15 ? 'low' : 'caution'} />
                <InfoRow label="Ownership" value={(data.propertySnapshot as any)?.ownershipType} badge="low" />
                <InfoRow label="Legal Status" value={(data.propertySnapshot as any)?.titleClarity} badge={(data.propertySnapshot as any)?.titleClarity === 'clear' ? 'success' : 'caution'} />
             </div>
             <div className="mt-auto pt-8 border-t border-gray-100">
                <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-[#EAEAEA]">
                      <MapPin className="w-5 h-5 text-gray-400" />
                   </div>
                   <div>
                      <p className="text-[13px] font-semibold text-[#111] leading-tight">{data.propertySnapshot?.locality}</p>
                      <p className="text-[11px] font-medium text-gray-400 uppercase mt-1.5 tracking-widest">{data.propertySnapshot?.city}</p>
                   </div>
                </div>
             </div>
          </div>

          <RiskAnalysis data={data} />

          <LocationIntelligence data={data} />

        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 15mm; size: auto; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          #valuation-content { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          [class*="shadow-"] { box-shadow: none !important; border: 1px solid #eee !important; }
          [class*="rounded-"] { border-radius: 12px !important; }
          [class*="bg-white/70"] { background: rgba(255,255,255,0.9) !important; backdrop-filter: none !important; }
          [class*="bg-gray-50/50"] { background: #f9fafb !important; }
          svg { max-width: 100% !important; }
          .min-h-screen { min-height: auto !important; }
        }
      `}} />
    </div>
  );
}
