/**
 * ============================================================
 * AUDIT ENGINE
 * ============================================================
 * Generates a structured, human-readable audit trail that
 * documents every step of the valuation process, which
 * methodology was used, which regulation was applied, and why.
 *
 * REGULATORY BASIS:
 *  - RBI Circular on Valuation of Properties (2010):
 *    "The valuation report should clearly state the basis
 *    of valuation, methodology adopted, and assumptions made."
 *  - RICS Red Book PS 2.3: Transparency of methodology
 *  - IVS 103: Reporting requirements for valuations
 *  - RBI Circular on Frauds: Audit trail for credit decisions
 * ============================================================
 */

'use strict';

function formatINR(amount) {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function run({
  property,
  marketData,
  valuationResult,
  liquidityResult,
  distressResult,
  riskResult,
  confidenceResult,
  decisionResult,
  sanctionResult,
  comparables,
  scenarioApplied,
}) {
  const steps = [];
  const now = new Date().toISOString();

  // ── 1. Data Collection ───────────────────────────────────
  steps.push({
    step: 1,
    phase: 'DATA_COLLECTION',
    title: 'Property & Market Data Collection',
    detail: `Property data collected for ${property.propertyType} in ${property.locality}, ${property.city}. Market data sourced from ${marketData.propertyCount || 'N/A'} comparable transactions in the locality. ${comparables.length} recent comparable transactions retrieved.`,
    regulation: 'RICS Red Book PS 2.3 — Minimum data requirements for valuation',
    timestamp: now,
  });

  // ── 2. Valuation Methodology ─────────────────────────────
  const methodology = valuationResult.methodology || {};
  const weights = methodology.weights || {};
  const dep = methodology.depreciationResult || {};

  steps.push({
    step: 2,
    phase: 'VALUATION',
    title: 'Market Value Assessment — Hybrid Approach',
    detail: [
      `Sales Comparison Approach (${(weights.sales * 100 || 0).toFixed(0)}% weight): ${comparables.length} comparable transactions adjusted for time, quality, floor, and size. Time adjustment applied using ${marketData.yoyAppreciation}% YoY appreciation rate.`,
      `Cost Approach (${(weights.cost * 100 || 0).toFixed(0)}% weight): Land value estimated at circle rate (₹${marketData.circleRate}/sqft). Replacement cost per CPWD Schedule of Rates 2023. NHB Residual Life depreciation applied: ${dep.constructionType?.toUpperCase() || 'RCC'} structure, ${dep.age || 'unknown'} years old, ${dep.usefulLife || 60}-year useful life → ${dep.depreciationPct || 0}% depreciation.`,
      `Reconciliation: Weighted blend per RICS Red Book PS 2.3 based on property age band.`,
      `Final Market Value: ${formatINR(valuationResult.marketValue)} (Range: ${formatINR(valuationResult.valueRangeLow)} – ${formatINR(valuationResult.valueRangeHigh)})`,
    ].join(' | '),
    regulation: 'RICS IVS 105, NHB Residual Life Method, CPWD Schedule of Rates 2023, NBC 2016',
    timestamp: now,
  });

  // ── 3. Liquidity Assessment ──────────────────────────────
  const bd = liquidityResult.breakdown || {};
  steps.push({
    step: 3,
    phase: 'LIQUIDITY',
    title: 'Liquidity Score Derivation',
    detail: `Market absorption rate of ${marketData.marketAbsorptionRate}%/month translates to ${liquidityResult.monthsOfInventory || 'N/A'} months of inventory. Weighted liquidity score: ${liquidityResult.liquidityScore}/100. Components: Absorption ${bd.absorptionScore}, Connectivity ${bd.connectivityScore}, Property Type ${bd.propertyTypeBase}, Age ${bd.ageScore}, Size ${bd.sizeScore}, Floor ${bd.floorScore}, Amenities ${bd.amenitiesScore}. Estimated time to sell: ${liquidityResult.timeToSell}. Exit certainty: ${liquidityResult.exitCertainty?.toUpperCase()}.`,
    regulation: 'NHB Housing Finance Report 2022, SARFAESI Act 2002 (liquidation timeline benchmarks), Anarock India Market Reports',
    timestamp: now,
  });

  // ── 4. Distress Value ────────────────────────────────────
  steps.push({
    step: 4,
    phase: 'DISTRESS',
    title: 'Distress / Forced-Sale Value Computation',
    detail: `Base distress multiplier derived from SARFAESI auction realisation data for ${property.propertyType} properties (avg ${(distressResult.regulatoryBasis?.avgAuctionRealisation * 100 || 0).toFixed(0)}%). Adjusted for: liquidity score (${liquidityResult.liquidityScore}/100), market condition (${distressResult.regulatoryBasis?.marketCondition || 'stable'}, YoY ${marketData.yoyAppreciation}%), and property age. Final multiplier: ${distressResult.distressMultiplier}x. Distress Value: ${formatINR(distressResult.distressValue)}. RBI Significant Erosion flag: ${distressResult.rbiErosionFlag ? 'TRIGGERED' : 'Clear'}. Effective LTV: ${distressResult.effectiveLTV}% vs RBI max ${distressResult.maxAllowedLTV}%.`,
    regulation: 'SARFAESI Act 2002 Section 13(4), RBI Circular DNBS.CC.PD.No.356/03.10.01/2013-14, IBBI Annual Report 2022-23',
    timestamp: now,
  });

  // ── 5. Risk Assessment ───────────────────────────────────
  const rb = riskResult.riskBreakdown || {};
  steps.push({
    step: 5,
    phase: 'RISK',
    title: 'Risk & Compliance Assessment',
    detail: `Risk score: ${riskResult.riskScore}/100 → ${riskResult.overallRiskLabel?.toUpperCase()}. ${riskResult.redFlags.length} flag(s) detected. Score breakdown: Valuation deviation ${rb.valuationDeviation || 0}, Circle rate ${rb.circleRateRisk || 0}, Distress risk ${rb.distressRisk || 0}, Purpose LTV ${rb.purposeLTVRisk || 0}, CERSAI ${rb.cersaiRisk || 0}, Structural ${rb.structuralRisk || 0}, Market condition ${rb.marketConditionRisk || 0}, Comp deviation ${rb.compDeviationRisk || 0}, Data quality ${rb.dataQualityRisk || 0}. CERSAI encumbrance prior: ${((riskResult.encumbrancePrior || 0) * 100).toFixed(0)}%.`,
    regulation: 'RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16, RBI Fraud Circular DBS.CO.CFMC.BC.No.1/23.04.001/2015-16, CERSAI Act 2002, PMLA 2002',
    timestamp: now,
  });

  // ── 6. Confidence Score ──────────────────────────────────
  const cb = confidenceResult.confidenceBreakdown || {};
  steps.push({
    step: 6,
    phase: 'CONFIDENCE',
    title: 'Valuation Confidence Assessment',
    detail: `Composite confidence score: ${confidenceResult.confidenceScore}%. Components: Data completeness ${cb.dataCompleteness?.score || 0}% (weight 30%), Comparable evidence ${cb.compAvailability?.score || 0}% (weight 25%), Location intelligence ${cb.locationIntelligence?.score || 0}% (weight 25%), Risk adjustment ${cb.riskAdjustment?.score || 0}% (weight 20%). Methodology bonus: ${confidenceResult.methodologyBonus > 0 ? '+' : ''}${confidenceResult.methodologyBonus || 0}pts (Sales vs Cost approach agreement).`,
    regulation: 'RICS Valuation Uncertainty Guidance Note 2021, IVS 105, RBI Circular on Collateral Valuation',
    timestamp: now,
  });

  // ── 7. Scenario (if applied) ─────────────────────────────
  if (scenarioApplied && scenarioApplied.scenario !== 'normal') {
    steps.push({
      step: 7,
      phase: 'SCENARIO',
      title: `Scenario Simulation — ${scenarioApplied.scenario.toUpperCase()}`,
      detail: `Market scenario "${scenarioApplied.scenario}" applied. Adjustment factor: ${scenarioApplied.adjustmentPct > 0 ? '+' : ''}${scenarioApplied.adjustmentPct}%. Original market value: ${formatINR(scenarioApplied.originalMarketValue)}. Adjusted market value: ${formatINR(scenarioApplied.adjustedMarketValue)}. This is a stress-test simulation, not the base valuation.`,
      regulation: 'RBI Circular on Stress Testing of Collateral (2013)',
      timestamp: now,
    });
  }

  // ── 8. Decision ──────────────────────────────────────────
  const stepNum = scenarioApplied && scenarioApplied.scenario !== 'normal' ? 8 : 7;
  steps.push({
    step: stepNum,
    phase: 'DECISION',
    title: `Credit Decision — ${decisionResult.decision}`,
    detail: `Decision: ${decisionResult.decision} (${decisionResult.decisionCode}). Urgency: ${decisionResult.urgency}. Reasons: ${decisionResult.decisionReasons.join('; ')}. ${decisionResult.conditions.length > 0 ? 'Conditions: ' + decisionResult.conditions.join('; ') : 'No conditions attached.'}`,
    regulation: 'RBI NBFC Prudential Norms DNBS.PD.CC.No.95/03.10.01/2006-07',
    timestamp: now,
  });

  // ── 9. Sanction ──────────────────────────────────────────
  if (decisionResult.decision !== 'REJECT') {
    steps.push({
      step: stepNum + 1,
      phase: 'SANCTION',
      title: 'Sanction Amount Computation',
      detail: `Sanction amount: ${sanctionResult.sanctionAmountFormatted}. Basis: ${sanctionResult.ltvBasis}. Purpose LTV cap: ${sanctionResult.breakdown?.purposeLTV}%, Property type cap: ${sanctionResult.breakdown?.propertyTypeLTV}%, Confidence haircut: -${sanctionResult.breakdown?.confidenceHaircutPct}%. Effective LTV on market value: ${sanctionResult.ltvOnMarketValue}%.`,
      regulation: sanctionResult.breakdown?.regulatoryBasis || 'RBI Master Circular 2015-16',
      timestamp: now,
    });
  }

  return {
    auditSteps: steps,
    totalSteps: steps.length,
    generatedAt: now,
    summary: {
      marketValue: formatINR(valuationResult.marketValue),
      distressValue: formatINR(distressResult.distressValue),
      liquidityScore: liquidityResult.liquidityScore,
      riskScore: riskResult.riskScore,
      confidenceScore: confidenceResult.confidenceScore,
      decision: decisionResult.decision,
      sanctionAmount: sanctionResult.sanctionAmountFormatted,
    },
  };
}

module.exports = { run };
