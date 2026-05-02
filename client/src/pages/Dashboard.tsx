import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, Shield, AlertTriangle, TrendingUp,
  ArrowRight, Building2, MapPin, Activity,
  CheckCircle2, XCircle, Zap, ChevronUp, ChevronDown,
  FileText, Clock,
} from 'lucide-react';
import { getHistory } from '../utils/api';
import { Badge } from '../components/ui/Badge';
import { formatCurrencyShort, formatDate, getRiskColor } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { ValuationResult } from '../types';

/* ── helpers ─────────────────────────────────────────────── */
function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function buildMonthlyTrend(items: ValuationResult[]) {
  const map: Record<string, { month: string; count: number; total: number }> = {};
  items.forEach((v) => {
    const d = new Date(v.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    if (!map[key]) map[key] = { month: label, count: 0, total: 0 };
    map[key].count += 1;
    map[key].total += v.confidenceScore;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, m]) => ({ month: m.month, count: m.count, avgConf: Math.round(m.total / m.count) }))
    .slice(-8);
}

// Confidence buckets for histogram + ogive
const CONF_BUCKETS = [
  { range: '0–40',  label: '0–40',  min: 0,  max: 40,  color: '#ef4444' },
  { range: '40–55', label: '40–55', min: 40, max: 55,  color: '#f97316' },
  { range: '55–70', label: '55–70', min: 55, max: 70,  color: '#f59e0b' },
  { range: '70–85', label: '70–85', min: 70, max: 85,  color: '#10b981' },
  { range: '85–100',label: '85+',   min: 85, max: 101, color: '#059669' },
];

function buildConfidenceBuckets(items: ValuationResult[]) {
  const buckets = CONF_BUCKETS.map(b => ({ ...b, count: 0 }));
  items.forEach((v) => {
    const b = buckets.find((b) => v.confidenceScore >= b.min && v.confidenceScore < b.max);
    if (b) b.count += 1;
  });
  return buckets;
}

// Ogive = cumulative frequency curve
function buildOgive(items: ValuationResult[]) {
  const buckets = buildConfidenceBuckets(items);
  let cumulative = 0;
  const total = items.length || 1;
  return buckets.map((b) => {
    cumulative += b.count;
    return {
      label: b.range,
      upperBound: b.max === 101 ? 100 : b.max,
      cumCount: cumulative,
      cumPct: Math.round((cumulative / total) * 100),
    };
  });
}

/* ═══════════════════════════════════════════════════════════
   SVG CHART PRIMITIVES
═══════════════════════════════════════════════════════════ */

function GridLines({ w, h, steps = 4 }: { w: number; h: number; steps?: number }) {
  return (
    <>
      {Array.from({ length: steps + 1 }).map((_, i) => {
        const y = (i / steps) * h;
        return <line key={i} x1={0} y1={y} x2={w} y2={y} stroke="#f1f5f9" strokeWidth={0.8} />;
      })}
    </>
  );
}

/* ── Area Chart ──────────────────────────────────────────── */
interface LinePoint { label: string; value: number; value2?: number }

function AreaChartSVG({
  data,
  color1 = '#111111',
  color2,
  height = 180,
}: {
  data: LinePoint[];
  color1?: string;
  color2?: string;
  height?: number;
}) {
  const PAD = { top: 12, right: 8, bottom: 28, left: 32 };
  const W = 500; const H = height;
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  if (data.length < 2) return <div className="flex items-center justify-center h-full text-gray-300 text-xs">Not enough data</div>;
  const vals1 = data.map(d => d.value);
  const vals2 = color2 ? data.map(d => d.value2 ?? 0) : [];
  const maxV = Math.max(...vals1, ...vals2, 1);
  const steps = data.length - 1;
  const px = (i: number) => PAD.left + (i / steps) * cW;
  const py = (v: number) => PAD.top + cH - (v / maxV) * cH;
  const line1 = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');
  const area1 = `${px(0)},${PAD.top + cH} ${line1} ${px(steps)},${PAD.top + cH}`;
  const line2 = color2 ? data.map((d, i) => `${px(i)},${py(d.value2 ?? 0)}`).join(' ') : '';
  const area2 = color2 ? `${px(0)},${PAD.top + cH} ${line2} ${px(steps)},${PAD.top + cH}` : '';
  const yTicks = Array.from({ length: 5 }).map((_, i) => ({ v: Math.round((maxV / 4) * i), y: py((maxV / 4) * i) }));
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`ag1-${color1.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color1} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color1} stopOpacity="0.01" />
        </linearGradient>
        {color2 && (
          <linearGradient id={`ag2-${color2.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color2} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color2} stopOpacity="0.01" />
          </linearGradient>
        )}
      </defs>
      <g transform={`translate(${PAD.left},${PAD.top})`}><GridLines w={cW} h={cH} steps={4} /></g>
      {yTicks.map((t, i) => <text key={i} x={PAD.left - 4} y={t.y + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{t.v}</text>)}
      <polygon points={area1} fill={`url(#ag1-${color1.slice(1)})`} />
      {color2 && area2 && <polygon points={area2} fill={`url(#ag2-${color2.slice(1)})`} />}
      <polyline points={line1} fill="none" stroke={color1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {color2 && line2 && <polyline points={line2} fill="none" stroke={color2} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5,3" />}
      {data.map((d, i) => <circle key={i} cx={px(i)} cy={py(d.value)} r={3} fill="white" stroke={color1} strokeWidth={1.5} />)}
      {color2 && data.map((d, i) => <circle key={i} cx={px(i)} cy={py(d.value2 ?? 0)} r={3} fill="white" stroke={color2} strokeWidth={1.5} />)}
      {data.map((d, i) => <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.label}</text>)}
    </svg>
  );
}

/* ── Bar Chart ───────────────────────────────────────────── */
interface BarItem { label: string; value: number; color: string }

function BarChartSVG({
  data,
  height = 180,
}: {
  data: BarItem[];
  height?: number;
}) {
  const PAD = { top: 20, right: 8, bottom: 28, left: 32 };
  const W = 500; const H = height;
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxV = Math.max(...data.map(d => d.value), 1);
  const barW = (cW / data.length) * 0.55;
  const gap = cW / data.length;
  const yTicks = Array.from({ length: 5 }).map((_, i) => ({
    v: Math.round((maxV / 4) * i),
    y: PAD.top + cH - ((maxV / 4) * i / maxV) * cH,
  }));
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${PAD.left},${PAD.top})`}><GridLines w={cW} h={cH} steps={4} /></g>
      {yTicks.map((t, i) => <text key={i} x={PAD.left - 4} y={t.y + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{t.v}</text>)}
      {data.map((d, i) => {
        const bH = Math.max((d.value / maxV) * cH, 2);
        const x = PAD.left + i * gap + (gap - barW) / 2;
        const y = PAD.top + cH - bH;
        return (
          <g key={i}>
            <rect x={x + 2} y={y + 2} width={barW} height={bH} rx={4} fill={d.color} opacity={0.1} />
            <rect x={x} y={y} width={barW} height={bH} rx={4} fill={d.color} opacity={0.88} />
            {d.value > 0 && <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={9} fontWeight="600" fill={d.color}>{d.value}</text>}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Ogive (Cumulative Frequency Curve) ─────────────────── */
interface OgivePoint { label: string; upperBound: number; cumPct: number; cumCount: number }

function OgiveSVG({ data, total, height = 200 }: { data: OgivePoint[]; total: number; height?: number }) {
  const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
  const W = 500; const H = height;
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const rawPoints = [
    { x: 0, y: 0, pct: 0 },
    ...data.map(d => ({ x: d.upperBound, y: d.cumPct, pct: d.cumPct })),
  ];
  const px = (xVal: number) => PAD.left + (xVal / 100) * cW;
  const py = (yVal: number) => PAD.top + cH - (yVal / 100) * cH;
  const pathD = rawPoints.reduce((acc, pt, i) => {
    if (i === 0) return `M ${px(pt.x)},${py(pt.y)}`;
    const prev = rawPoints[i - 1];
    const cpX = (px(prev.x) + px(pt.x)) / 2;
    return acc + ` C ${cpX},${py(prev.y)} ${cpX},${py(pt.y)} ${px(pt.x)},${py(pt.y)}`;
  }, '');
  const areaClose = pathD + ` L ${px(rawPoints[rawPoints.length - 1].x)},${PAD.top + cH} L ${px(0)},${PAD.top + cH} Z`;
  const medianX = (() => {
    for (let i = 1; i < rawPoints.length; i++) {
      if (rawPoints[i].pct >= 50) {
        const prev = rawPoints[i - 1];
        const curr = rawPoints[i];
        const t = (50 - prev.pct) / ((curr.pct - prev.pct) || 1);
        return prev.x + t * (curr.x - prev.x);
      }
    }
    return 70;
  })();
  const yTicks = [0, 25, 50, 75, 100];
  const xTicks = [0, 40, 55, 70, 85, 100];
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="ogive-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111111" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#111111" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {yTicks.map(t => (
        <line key={t} x1={PAD.left} y1={py(t)} x2={PAD.left + cW} y2={py(t)}
          stroke={t === 50 ? '#e0e7ff' : '#f1f5f9'} strokeWidth={t === 50 ? 1.2 : 0.8}
          strokeDasharray={t === 50 ? '4,3' : undefined} />
      ))}
      {xTicks.map(t => (
        <line key={t} x1={px(t)} y1={PAD.top} x2={px(t)} y2={PAD.top + cH} stroke="#f1f5f9" strokeWidth={0.8} />
      ))}
      <path d={areaClose} fill="url(#ogive-grad)" />
      <line x1={px(medianX)} y1={py(50)} x2={px(medianX)} y2={PAD.top + cH} stroke="#111111" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
      <line x1={PAD.left} y1={py(50)} x2={px(medianX)} y2={py(50)} stroke="#111111" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
      <text x={px(medianX) + 4} y={py(50) - 5} fontSize={8} fill="#111111" fontWeight="600">P50 ≈ {Math.round(medianX)}</text>
      <path d={pathD} fill="none" stroke="#111111" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {rawPoints.slice(1).map((pt, i) => (
        <g key={i}>
          <circle cx={px(pt.x)} cy={py(pt.y)} r={5} fill="white" stroke="#111111" strokeWidth={2} />
          <text x={px(pt.x)} y={py(pt.y) - 9} textAnchor="middle" fontSize={8} fontWeight="700" fill="#4f46e5">{pt.pct}%</text>
        </g>
      ))}
      {yTicks.map(t => <text key={t} x={PAD.left - 5} y={py(t) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{t}%</text>)}
      {xTicks.map(t => <text key={t} x={px(t)} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{t}</text>)}
      <text x={PAD.left + cW / 2} y={H - 1} textAnchor="middle" fontSize={9} fill="#cbd5e1">Confidence Score</text>
      <text x={10} y={PAD.top + cH / 2} textAnchor="middle" fontSize={9} fill="#cbd5e1" transform={`rotate(-90, 10, ${PAD.top + cH / 2})`}>Cumulative %</text>
      <text x={PAD.left + cW - 2} y={PAD.top + 10} textAnchor="end" fontSize={8} fill="#94a3b8">n = {total}</text>
    </svg>
  );
}

/* ── Donut Chart ─────────────────────────────────────────── */
function DonutChart({
  data, size = 130, centerLabel, centerSub,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number; centerLabel?: string; centerSub?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2; const cy = size / 2;
  const r = size * 0.34; const strokeW = size * 0.16;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
      {data.map((d, i) => {
        const dash = (d.value / total) * circumference;
        const gap = circumference - dash;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color}
            strokeWidth={strokeW - 2} strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
        );
        offset += dash;
        return seg;
      })}
      <text x={cx} y={cy - (centerSub ? 5 : 0)} textAnchor="middle" fontSize={size * 0.15} fontWeight="700" fill="#1e293b">
        {centerLabel ?? total}
      </text>
      {centerSub && <text x={cx} y={cy + size * 0.12} textAnchor="middle" fontSize={size * 0.09} fill="#94a3b8">{centerSub}</text>}
    </svg>
  );
}

/* ── Progress Bar ────────────────────────────────────────── */
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div className="h-full rounded-full" style={{ background: color }}
        initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
    </div>
  );
}

/* ── KPI Card ────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon: Icon, iconColor, iconBg, trend, trendLabel, delay = 0,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
  trend?: 'up' | 'down' | null; trendLabel?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon style={{ width: 18, height: 18 }} className={iconColor} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
          }`}>
            {trend === 'up' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {trendLabel}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-1.5">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </motion.div>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['history-dashboard'],
    queryFn: () => getHistory({ limit: 200 }),
  });

  const all: ValuationResult[] = data?.data || [];
  const stats = data?.stats || {};
  const recent = all.slice(0, 5);

  const total = stats.total ?? all.length ?? 0;
  const avgConf = stats.avgConfidence || 0;
  const safeCount = all.filter(v => v.overallRiskLabel === 'safe').length;
  const cautionCount = all.filter(v => v.overallRiskLabel === 'caution').length;
  const highRiskCount = all.filter(v => v.overallRiskLabel === 'high_risk').length;
  const overpricedCount = all.filter(v => v.overPricedFlag).length;
  const avgMarketValue = all.length
    ? Math.round(all.reduce((s, v) => s + (v.marketValue || 0), 0) / all.length)
    : 0;
  const avgProcessing = stats.avgProcessingTime || 0;

  const monthlyTrend = buildMonthlyTrend(all);
  const confBuckets = buildConfidenceBuckets(all);
  const ogiveData = buildOgive(all);

  const riskDist = [
    { name: 'Safe', value: safeCount, color: '#10b981' },
    { name: 'Caution', value: cautionCount, color: '#f59e0b' },
    { name: 'High Risk', value: highRiskCount, color: '#ef4444' },
  ];

  const barData: BarItem[] = confBuckets.map(b => ({ label: b.label, value: b.count, color: b.color }));
  const trendData: LinePoint[] = monthlyTrend.map(m => ({ label: m.month, value: m.count, value2: m.avgConf }));

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6 pb-12">
      <div className="max-w-6xl mx-auto space-y-7">

        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-[#111] uppercase tracking-widest mb-1">Overview</p>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}<span className="text-[#111] font-medium">{total} valuations</span> in portfolio
            </p>
          </div>
          <button
            onClick={() => navigate('/app/new-applicant')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#111] hover:bg-black text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-gray-200"
          >
            + New Valuation
          </button>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Valuations" value={isLoading ? '—' : total} sub="All time submissions"
            icon={BarChart3} iconColor="text-[#111]" iconBg="bg-gray-50" delay={0} />
          <KpiCard label="Avg Confidence Score" value={isLoading ? '—' : `${avgConf}%`} sub="Engine model accuracy"
            icon={Shield} iconColor="text-emerald-600" iconBg="bg-emerald-50" trend="up" trendLabel="Good" delay={0.06} />
          <KpiCard label="Avg Market Value" value={isLoading ? '—' : formatCurrencyShort(avgMarketValue)} sub="Across all properties"
            icon={TrendingUp} iconColor="text-violet-600" iconBg="bg-violet-50" trend="up" trendLabel="Rising" delay={0.12} />
          <KpiCard label="Avg Processing Time" value={isLoading ? '—' : `${avgProcessing}ms`} sub="Engine latency"
            icon={Zap} iconColor="text-sky-600" iconBg="bg-sky-50" delay={0.18} />
        </div>

        {/* RISK STRIP */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Safe Cases', value: safeCount, color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2, iconCls: 'text-emerald-600' },
            { label: 'Caution Cases', value: cautionCount, color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-100', icon: AlertTriangle, iconCls: 'text-amber-600' },
            { label: 'High Risk Cases', value: highRiskCount, color: '#ef4444', bg: 'bg-red-50', border: 'border-red-100', icon: XCircle, iconCls: 'text-red-500' },
          ].map((r, i) => (
            <motion.div key={r.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
              className={`bg-white rounded-2xl border ${r.border} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl ${r.bg} flex items-center justify-center`}>
                  <r.icon style={{ width: 17, height: 17 }} className={r.iconCls} />
                </div>
                <span className="text-xs text-gray-400 font-medium">{pct(r.value, total)}% of total</span>
              </div>
              <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{isLoading ? '—' : r.value}</p>
              <p className="text-sm font-medium text-gray-500 mt-1.5">{r.label}</p>
              <div className="mt-3"><ProgressBar value={r.value} max={total} color={r.color} /></div>
            </motion.div>
          ))}
        </div>

        {/* CHARTS ROW 1 — Full-width trend */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Monthly Valuation Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Submissions (solid) vs Avg Confidence % (dashed)</p>
            </div>
            <span className="text-xs bg-gray-50 text-[#111] font-semibold px-2.5 py-1 rounded-lg">Last 8 months</span>
          </div>
          <div className="h-40">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-300 text-sm">Loading…</div>
            ) : trendData.length < 2 ? (
              <div className="h-full flex items-center justify-center text-gray-300 text-sm">No data yet</div>
            ) : (
              <AreaChartSVG data={trendData} color1="#111111" color2="#10b981" height={160} />
            )}
          </div>
          <div className="flex items-center gap-5 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-4 h-0.5 bg-gray-500 inline-block rounded" /> Valuations
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-4 border-t border-dashed border-emerald-500 inline-block" /> Avg Confidence
            </span>
          </div>
        </div>

        {/* CHARTS ROW 2 — Risk Distribution | Confidence Histogram | Ogive side by side */}
        <div className="grid grid-cols-3 gap-4">

          {/* Risk Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800">Risk Distribution</h2>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">Portfolio breakdown</p>
            {isLoading || all.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-gray-300 text-sm">
                {isLoading ? 'Loading…' : 'No data yet'}
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <DonutChart data={riskDist} size={110} centerLabel={String(total)} centerSub="total" />
                </div>
                <div className="space-y-2.5">
                  {riskDist.map(r => (
                    <div key={r.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                          <span className="text-xs font-medium text-gray-600">{r.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-800">
                          {r.value} <span className="text-gray-400 font-normal">({pct(r.value, total)}%)</span>
                        </span>
                      </div>
                      <ProgressBar value={r.value} max={total} color={r.color} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Confidence Distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Confidence Distribution</h2>
                <p className="text-xs text-gray-400 mt-0.5">Cases per score band</p>
              </div>
              <Activity className="w-3.5 h-3.5 text-gray-300 mt-0.5" />
            </div>
            <div className="h-40">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-gray-300 text-sm">Loading…</div>
              ) : all.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-300 text-sm">No data yet</div>
              ) : (
                <BarChartSVG data={barData} height={160} />
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {confBuckets.map(b => (
                <span key={b.range} className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: b.color }} />
                  {b.range}
                </span>
              ))}
            </div>
          </div>

          {/* Confidence Ogive */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Confidence Ogive</h2>
                <p className="text-xs text-gray-400 mt-0.5">Cumulative frequency S-curve</p>
              </div>
              <span className="text-[9px] bg-gray-50 text-[#111] font-bold px-1.5 py-0.5 rounded">S-CURVE</span>
            </div>
            <div className="h-40">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-gray-300 text-sm">Loading…</div>
              ) : all.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-300 text-sm">No data yet</div>
              ) : (
                <OgiveSVG data={ogiveData} total={all.length} height={160} />
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className="w-3 h-0.5 bg-gray-500 inline-block rounded" /> Cum. %
              </span>
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className="w-3 border-t border-dashed border-gray-900 inline-block" /> P50
              </span>
            </div>
          </div>
        </div>

        {/* SECONDARY METRICS — compact inline strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Overpriced Flags', value: overpricedCount, sub: `${pct(overpricedCount, total)}% flagged`, icon: XCircle, iconColor: 'text-amber-500', iconBg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Caution Cases', value: cautionCount, sub: `${pct(cautionCount, total)}% of total`, icon: AlertTriangle, iconColor: 'text-amber-600', iconBg: 'bg-amber-50', border: 'border-amber-100' },
            { label: 'Reports Generated', value: total, sub: 'Full valuation reports', icon: FileText, iconColor: 'text-[#111]', iconBg: 'bg-gray-50', border: 'border-gray-200' },
            { label: 'Avg Processing', value: `${avgProcessing}ms`, sub: 'Engine response time', icon: Clock, iconColor: 'text-sky-600', iconBg: 'bg-sky-50', border: 'border-sky-100' },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              className={`bg-white rounded-xl border ${s.border} px-4 py-3.5 flex items-center gap-3`}>
              <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
                <s.icon style={{ width: 15, height: 15 }} className={s.iconColor} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-gray-900 leading-none">{isLoading ? '—' : s.value}</p>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5 truncate">{s.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{s.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* RECENT VALUATIONS */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#111]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Recent Valuations</h2>
                <p className="text-xs text-gray-400">Latest 5 submissions</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app/history')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#111] hover:text-black bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400">No valuations yet</p>
              <button onClick={() => navigate('/app/new-applicant')} className="mt-3 text-xs text-[#111] hover:underline font-medium">
                + Add your first applicant
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-4 px-6 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="col-span-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Property</span>
                <span className="col-span-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Value Range</span>
                <span className="col-span-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Risk</span>
                <span className="col-span-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Confidence</span>
                <span className="col-span-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Date</span>
              </div>
              <div className="divide-y divide-gray-50">
                {recent.map((v, i) => (
                  <motion.div key={v._id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/app/dashboard/${v._id}`)}
                    className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-[#111]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 capitalize truncate">
                          {v.propertySnapshot?.propertyType}
                          <span className="text-gray-400 font-normal"> · {v.propertySnapshot?.area?.toLocaleString('en-IN')} sqft</span>
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {v.propertySnapshot?.locality}, {v.propertySnapshot?.city}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm font-bold text-gray-800">
                        {formatCurrencyShort(v.valueRangeLow)} – {formatCurrencyShort(v.valueRangeHigh)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Market: {formatCurrencyShort(v.marketValue)}</p>
                    </div>
                    <div className="col-span-2">
                      <Badge variant={v.overallRiskLabel}>
                        {v.overallRiskLabel?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className={`text-sm font-extrabold ${getRiskColor(v.overallRiskLabel)}`}>{v.confidenceScore}%</p>
                      <div className="mt-1 w-16">
                        <ProgressBar value={v.confidenceScore} max={100}
                          color={v.overallRiskLabel === 'safe' ? '#10b981' : v.overallRiskLabel === 'caution' ? '#f59e0b' : '#ef4444'} />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs text-gray-400 whitespace-nowrap">{formatDate(v.createdAt).split(',')[0]}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
