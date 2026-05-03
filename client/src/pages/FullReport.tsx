import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { getValuation } from '../utils/api';
import type { ValuationResult, FlagSeverity } from '../types';
import { formatCurrency, formatCurrencyShort, formatDate, getSeverityColor } from '../utils/format';
import { Badge } from '../components/ui/Badge';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8 print:mb-6">
      <h2 className="text-base font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}

export default function FullReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['valuation', id],
    queryFn: () => getValuation(id!),
    enabled: !!id,
  });

  const v: ValuationResult = data?.data;

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading report...</div>;
  if (!v) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">Report not found</div>;

  const p = v.propertySnapshot;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button onClick={() => navigate(`/app/dashboard/${id}`)} className="flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-black text-white text-sm rounded-lg transition-colors">
            <Printer className="w-4 h-4" /> Print / Export PDF
          </button>
        </div>

        {/* Cover */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-gray-200 bg-white p-8 mb-6 shadow-sm">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="text-xs text-[#111] uppercase tracking-widest mb-2">COVAL Collateral Valuation Report</div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-1 capitalize">{p?.propertyType} Property</h1>
              <p className="text-gray-500">{p?.locality}, {p?.city}</p>
              <p className="text-xs text-gray-400 mt-1">Report ID: {id} • Generated: {formatDate(v.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">Assessed Value Range</p>
              <p className="text-2xl font-bold text-[#111]">{formatCurrencyShort(v.valueRangeLow)} – {formatCurrencyShort(v.valueRangeHigh)}</p>
              <Badge variant={v.overallRiskLabel}>{v.overallRiskLabel?.replace('_', ' ').toUpperCase()}</Badge>
            </div>
          </div>
        </motion.div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 space-y-1 shadow-sm">
          {/* Executive Summary */}
          <Section title="1. Executive Summary">
            <p className="text-sm text-gray-600 leading-relaxed">
              COVAL has assessed a <strong className="text-gray-900">{p?.area?.toLocaleString('en-IN')} sqft {p?.propertyType}</strong> property located at <strong className="text-gray-900">{p?.locality}, {p?.city}</strong>,
              constructed in <strong className="text-gray-900">{p?.yearOfConstruction || 'N/A'}</strong>, with <strong className="text-gray-900">{p?.constructionQuality}</strong> quality construction.
              The AI-assessed market value ranges from <strong className="text-[#111]">{formatCurrencyShort(v.valueRangeLow)}</strong> to <strong className="text-[#111]">{formatCurrencyShort(v.valueRangeHigh)}</strong> (base: {formatCurrencyShort(v.marketValue)}).
              Distress/liquidation value is estimated at <strong className="text-amber-600">{formatCurrency(v.distressValue)}</strong>.
              The overall risk classification is <strong className="text-gray-900 capitalize">{v.overallRiskLabel?.replace('_', ' ')}</strong> with a confidence score of <strong className="text-gray-900">{v.confidenceScore}%</strong>.
            </p>
          </Section>

          {/* Methodology */}
          <Section title="2. Valuation Methodology">
            <p className="text-sm text-gray-500 mb-3">The valuation uses a rule-based comparable analysis engine with the following formula:</p>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-[#111] mb-3 border border-gray-100">
              marketValue = (pricePerSqft × area) × locationMultiplier × ageDepreciation × qualityMultiplier
            </div>
            <div className="space-y-1">
              <Row label="Base Price/sqft (locality)" value={`₹${v.pricePerSqft?.toLocaleString('en-IN')}`} />
              {Object.values(v.valueDrivers || {}).map(d => (
                <Row key={d.label} label={d.label} value={`${d.value} ${d.unit}`} />
              ))}
            </div>
          </Section>

          {/* Market Context */}
          <Section title="3. Market Context">
            {v.marketData && (
              <div className="space-y-1">
                <Row label="City" value={v.marketData.city} />
                <Row label="Locality" value={v.marketData.locality} />
                <Row label="Avg Market Price/sqft" value={`₹${v.marketData.avgPricePerSqft?.toLocaleString('en-IN')}`} />
                <Row label="Government Circle Rate/sqft" value={`₹${v.marketData.circleRate?.toLocaleString('en-IN')}`} />
                <Row label="Demand Index" value={`${v.marketData.demandIndex}/10`} />
                <Row label="YoY Price Appreciation" value={`+${v.marketData.yoyAppreciation}%`} />
                <Row label="Declared Value vs Circle Rate" value={`${v.overCircleRatePercent > 0 ? '+' : ''}${v.overCircleRatePercent}%`} />
              </div>
            )}
          </Section>

          {/* Property Details */}
          <Section title="4. Property Details">
            <div className="space-y-1">
              <Row label="Property Type" value={<span className="capitalize">{p?.propertyType}</span>} />
              {p?.propertySubType && <Row label="Sub-type" value={p.propertySubType} />}
              <Row label="Total Area" value={`${p?.area?.toLocaleString('en-IN')} sq ft${p?.areaType ? ` (${p.areaType === 'builtup' ? 'Built-up' : p.areaType === 'carpet' ? 'Carpet' : 'Super Built-up'})` : ''}`} />
              <Row label="Year of Construction" value={p?.yearOfConstruction || 'N/A'} />
              <Row label="Property Age" value={v.propertyAge !== null ? `${v.propertyAge} years` : 'N/A'} />
              <Row label="Floor" value={`${p?.floorNumber ?? 'G'} / ${p?.totalFloors ?? 'N/A'}`} />
              <Row label="Construction Quality" value={<span className="capitalize">{p?.constructionQuality}</span>} />
              <Row label="Amenities" value={p?.amenities?.join(', ') || 'None'} />
              <Row label="Ownership Type" value={<span className="capitalize">{(p as any)?.ownershipType || 'Freehold'}</span>} />
              <Row label="Title Status" value={<span className="capitalize">{(p as any)?.titleClarity || 'Clear'}</span>} />
              <Row label="Occupancy" value={<span className="capitalize">{((p as any)?.occupancyStatus || 'self_occupied').replace('_', ' ')}</span>} />
              {(p as any)?.monthlyRent && <Row label="Monthly Rent" value={`₹${Number((p as any).monthlyRent).toLocaleString('en-IN')}`} />}
              <Row label="Purpose" value={p?.purpose?.toUpperCase()} />
              <Row label="Loan Amount Required" value={formatCurrency(p?.loanAmountRequired || 0)} />
            </div>
          </Section>

          {/* Risk Assessment */}
          <Section title="5. Risk Assessment">
            <div className="space-y-1 mb-4">
              <Row label="Risk Score" value={`${v.riskScore}/100`} />
              <Row label="Overall Classification" value={<Badge variant={v.overallRiskLabel}>{v.overallRiskLabel?.replace('_', ' ').toUpperCase()}</Badge>} />
              <Row label="Declared vs Assessed Deviation" value={`${v.declaredVsMarketDeviation > 0 ? '+' : ''}${v.declaredVsMarketDeviation}%`} />
            </div>
            {v.redFlags?.length > 0 && (
              <div className="space-y-2">
                {v.redFlags.map((flag) => (
                  <div key={flag.code} className={`p-3 rounded-lg border text-xs ${getSeverityColor(flag.severity as FlagSeverity)}`}>
                    <span className="font-bold uppercase mr-2">[{flag.severity}]</span>{flag.message}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Liquidity */}
          <Section title="6. Liquidity Assessment">
            <div className="space-y-1">
              <Row label="Liquidity Score" value={`${v.liquidityScore}/100`} />
              <Row label="Estimated Time to Sell" value={v.timeToSell} />
              <Row label="Exit Certainty" value={<Badge variant={v.exitCertainty as 'high' | 'medium' | 'low'}>{v.exitCertainty?.toUpperCase()}</Badge>} />
              <Row label="Resale Risk" value={<Badge variant={v.resaleRisk as 'low' | 'medium' | 'high'}>{v.resaleRisk?.toUpperCase()}</Badge>} />
            </div>
          </Section>

          {/* Distress */}
          <Section title="7. Distress Value Analysis">
            <div className="space-y-1">
              <Row label="Market Value" value={formatCurrency(v.marketValue)} />
              <Row label="Distress Multiplier" value={`${v.distressMultiplier}x`} />
              <Row label="Distress / Liquidation Value" value={<span className="text-amber-600">{formatCurrency(v.distressValue)}</span>} />
              <Row label="Liquidation Timeline" value={v.liquidationTimeline} />
              <Row label="RBI Erosion Flag" value={v.rbiErosionFlag ? <Badge variant="critical">TRIGGERED</Badge> : <Badge variant="safe">CLEAR</Badge>} />
            </div>
          </Section>

          {/* Fraud Summary */}
          <Section title="8. Fraud Detection Summary">
            <Row label="Total Flags" value={v.redFlags?.length || 0} />
            <Row label="Critical Flags" value={v.redFlags?.filter(f => f.severity === 'critical').length || 0} />
            <Row label="Medium Flags" value={v.redFlags?.filter(f => f.severity === 'medium').length || 0} />
            <Row label="Low Flags" value={v.redFlags?.filter(f => f.severity === 'low').length || 0} />
          </Section>

          {/* Comparables */}
          <Section title="9. Comparable Transaction Analysis">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-right pr-4">Area</th>
                    <th className="text-right pr-4">₹/sqft</th>
                    <th className="text-right pr-4">Price</th>
                    <th className="text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {v.comparables?.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50 text-gray-600">
                      <td className="py-2 pr-4 capitalize">{c.propertyType}</td>
                      <td className="text-right pr-4">{c.area?.toLocaleString('en-IN')}</td>
                      <td className="text-right pr-4">₹{c.pricePerSqft?.toLocaleString('en-IN')}</td>
                      <td className="text-right pr-4">{formatCurrencyShort(c.price)}</td>
                      <td className="text-right">{c.transactionDate ? new Date(c.transactionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Confidence */}
          <Section title="10. Confidence Score Breakdown">
            <div className="space-y-1 mb-3">
              <Row label="Overall Confidence" value={`${v.confidenceScore}%`} />
            </div>
            {Object.values(v.confidenceBreakdown || {}).map(item => (
              <Row key={item.label} label={`${item.label} (weight ${item.weight}%)`} value={`${item.score}/100`} />
            ))}
          </Section>

          {/* Recommendations */}
          <Section title="11. Recommendations for Lender">
            <div className="space-y-2 text-sm text-gray-600">
              {v.overallRiskLabel === 'safe' && <p className="text-emerald-600">✓ Property is suitable as collateral. Proceed with standard due diligence.</p>}
              {v.overallRiskLabel === 'caution' && <p className="text-amber-600">⚠ Exercise caution. Verify all flagged items before proceeding.</p>}
              {v.overallRiskLabel === 'high_risk' && <p className="text-red-600">✗ High risk classification. Independent valuation and legal verification strongly advised before disbursement.</p>}
              {v.rbiErosionFlag && <p>• RBI Erosion threshold triggered — ensure LTV does not exceed regulatory limits.</p>}
              {v.confidenceScore < 60 && <p>• Low confidence score — recommend field verification and additional data collection.</p>}
              {v.liquidityScore < 50 && <p>• Low liquidity property — factor extended recovery timelines in NPA provisioning.</p>}
              <p>• Maximum recommended LTV: {v.overallRiskLabel === 'safe' ? '75%' : v.overallRiskLabel === 'caution' ? '60%' : '50%'} of distress value ({formatCurrency(v.distressValue * (v.overallRiskLabel === 'safe' ? 0.75 : v.overallRiskLabel === 'caution' ? 0.60 : 0.50))})</p>
            </div>
          </Section>

          {/* RBI Compliance */}
          <Section title="12. RBI Compliance Notes">
            <div className="text-sm text-gray-600 space-y-1">
              <p>• This valuation follows RBI Master Circular on Loans and Advances – Statutory and Other Restrictions guidelines.</p>
              {v.rbiErosionFlag
                ? <p className="text-red-600">• RBI Significant Erosion Flag: Distress value ({formatCurrency(v.distressValue)}) is below 50% of assessed market value ({formatCurrency(v.marketValue)}). This must be reported per RBI NPA provisioning norms.</p>
                : <p className="text-emerald-600">• RBI Erosion threshold: CLEAR. Distress value is above 50% of assessed market value.</p>}
              <p>• CERSAI verification is mandatory prior to loan disbursement.</p>
              <p>• Panel valuer physical inspection is recommended for properties above ₹5 Cr.</p>
            </div>
          </Section>

          {/* Audit Trail */}
          <Section title="13. Audit Trail">
            <div className="space-y-2">
              {v.auditTrail?.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                  <span className="text-gray-800 font-medium">{entry.engine}</span>
                  <span className="text-gray-400">{formatDate(entry.timestamp)}</span>
                  <span className="text-[#111]">{entry.duration}ms</span>
                </div>
              ))}
              <div className="text-xs text-gray-400 pt-1">Total processing time: {v.processingTime}ms</div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
