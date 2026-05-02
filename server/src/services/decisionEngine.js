/**
 * ============================================================
 * DECISION ENGINE
 * ============================================================
 * Translates engine outputs into a final NBFC lending decision.
 *
 * REGULATORY BASIS:
 *  - RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16
 *    (Prudential Norms — NPA triggers, LTV compliance)
 *  - RBI Circular on Frauds Classification DBS.CO.CFMC.BC.No.1
 *  - NBFC Prudential Norms DNBS.PD.CC.No.95/03.10.01/2006-07
 *  - SARFAESI Act 2002 — enforceability of security interest
 *
 * DECISION LOGIC:
 *  REJECT  — any hard regulatory breach (LTV, RBI erosion,
 *             critical fraud signal, falling market + high risk)
 *  APPROVE — clean file: no critical flags, confidence ≥ 70,
 *             risk score ≤ 22 (safe band), liquidity ≥ 50
 *  REVIEW  — everything else (human underwriter needed)
 *
 * OUTPUTS:
 *  decision        : "APPROVE" | "REVIEW" | "REJECT"
 *  decisionCode    : machine-readable reason code
 *  decisionReasons : array of human-readable reasons
 *  conditions      : conditions attached to APPROVE/REVIEW
 *  urgency         : "STANDARD" | "PRIORITY" | "ESCALATE"
 * ============================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   HARD REJECT CODES
   These flag codes from riskEngine trigger automatic REJECT.
   No human override possible without senior credit committee.
───────────────────────────────────────────────────────────── */
const HARD_REJECT_CODES = new Set([
  'RBI_SIGNIFICANT_EROSION',      // distress < 50% of market (RBI circular)
  'LTV_BREACH',                   // exceeds RBI LTV cap
  'RBI_LTV_EXCEEDED',             // purpose-based LTV breach
  'VALUATION_INFLATION_CRITICAL', // >50% overvaluation (fraud signal)
  'BELOW_CIRCLE_RATE',            // stamp duty evasion (illegal)
  'FALLING_MARKET',               // market in decline (RBI stress test)
  'STRUCTURAL_RISK_CRITICAL',     // <25% residual life (NHB)
  'TITLE_UNDER_LITIGATION',       // active litigation — cannot lend (PS requirement)
]);

/* ─────────────────────────────────────────────────────────────
   SOFT REJECT CODES
   Two or more of these together → REJECT
   One alone → REVIEW
───────────────────────────────────────────────────────────── */
const SOFT_REJECT_CODES = new Set([
  'CERSAI_HIGH_ENCUMBRANCE_RISK',
  'OVER_LEVERAGED',
  'VALUATION_INFLATION_MEDIUM',
  'OVER_CIRCLE_RATE_CRITICAL',
  'COMP_DEVIATION_CRITICAL',
  'VALUATION_UNDERDISCLOSURE_CRITICAL',
]);

function run({
  confidenceScore,
  riskScore,
  overallRiskLabel,
  redFlags,
  liquidityScore,
  distressResult,
  propertyType,
  purpose,
}) {
  const reasons = [];
  const conditions = [];
  const flagCodes = new Set((redFlags || []).map(f => f.code));

  // ── Step 1: Hard REJECT checks ──────────────────────────
  const hardRejectHits = [...HARD_REJECT_CODES].filter(c => flagCodes.has(c));
  if (hardRejectHits.length > 0) {
    const flagMessages = redFlags
      .filter(f => HARD_REJECT_CODES.has(f.code))
      .map(f => f.message);
    return {
      decision: 'REJECT',
      decisionCode: 'HARD_REJECT_REGULATORY',
      decisionReasons: [
        `Hard regulatory breach detected (${hardRejectHits.length} critical flag${hardRejectHits.length > 1 ? 's' : ''})`,
        ...flagMessages,
      ],
      conditions: [],
      urgency: 'ESCALATE',
      triggeredBy: hardRejectHits,
    };
  }

  // ── Step 2: Soft REJECT (2+ soft flags) ─────────────────
  const softRejectHits = [...SOFT_REJECT_CODES].filter(c => flagCodes.has(c));
  if (softRejectHits.length >= 2) {
    return {
      decision: 'REJECT',
      decisionCode: 'SOFT_REJECT_MULTIPLE_FLAGS',
      decisionReasons: [
        `Multiple risk indicators present (${softRejectHits.length} medium-severity flags)`,
        ...redFlags.filter(f => SOFT_REJECT_CODES.has(f.code)).map(f => f.message),
      ],
      conditions: [],
      urgency: 'PRIORITY',
      triggeredBy: softRejectHits,
    };
  }

  // ── Step 3: Confidence too low ───────────────────────────
  if (confidenceScore < 45) {
    return {
      decision: 'REJECT',
      decisionCode: 'INSUFFICIENT_DATA_CONFIDENCE',
      decisionReasons: [
        `Confidence score of ${confidenceScore}% is below minimum threshold of 45% — insufficient data quality for lending decision`,
        'Obtain additional comparable transactions and complete property data before resubmission',
      ],
      conditions: [],
      urgency: 'STANDARD',
      triggeredBy: ['LOW_CONFIDENCE'],
    };
  }

  // ── Step 4: Liquidity too low for collateral ─────────────
  if (liquidityScore < 25) {
    return {
      decision: 'REJECT',
      decisionCode: 'ILLIQUID_COLLATERAL',
      decisionReasons: [
        `Liquidity score of ${liquidityScore}/100 indicates illiquid collateral — SARFAESI enforcement would be extremely difficult`,
        `Estimated liquidation timeline: ${distressResult?.liquidationTimeline || '>12 months'}`,
      ],
      conditions: [],
      urgency: 'STANDARD',
      triggeredBy: ['LOW_LIQUIDITY'],
    };
  }

  // ── Step 5: APPROVE conditions ───────────────────────────
  const isClean = redFlags.length === 0;
  const isHighConfidence = confidenceScore >= 70;
  const isSafeRisk = overallRiskLabel === 'safe' && riskScore <= 22;
  const isGoodLiquidity = liquidityScore >= 50;

  if (isClean && isHighConfidence && isSafeRisk && isGoodLiquidity) {
    // Clean APPROVE
    if (confidenceScore >= 85 && liquidityScore >= 70) {
      return {
        decision: 'APPROVE',
        decisionCode: 'CLEAN_APPROVE_HIGH_CONFIDENCE',
        decisionReasons: [
          `No risk flags detected`,
          `Confidence score ${confidenceScore}% exceeds threshold`,
          `Risk score ${riskScore}/100 — within safe band`,
          `Liquidity score ${liquidityScore}/100 — adequate collateral enforceability`,
        ],
        conditions: [],
        urgency: 'STANDARD',
        triggeredBy: [],
      };
    }
    // Conditional APPROVE
    conditions.push('Standard property insurance required');
    conditions.push('Title search and CERSAI verification mandatory before disbursement');
    return {
      decision: 'APPROVE',
      decisionCode: 'CONDITIONAL_APPROVE',
      decisionReasons: [
        `No critical flags detected`,
        `Confidence score ${confidenceScore}% meets threshold`,
        `Risk score ${riskScore}/100 — safe`,
      ],
      conditions,
      urgency: 'STANDARD',
      triggeredBy: [],
    };
  }

  // ── Step 6: REVIEW — everything else ────────────────────
  if (!isHighConfidence) reasons.push(`Confidence score ${confidenceScore}% is below 70% threshold — additional verification needed`);
  if (!isSafeRisk) reasons.push(`Risk score ${riskScore}/100 (${overallRiskLabel}) — underwriter review required`);
  if (!isGoodLiquidity) reasons.push(`Liquidity score ${liquidityScore}/100 — collateral enforceability concerns`);
  if (softRejectHits.length === 1) {
    const flag = redFlags.find(f => SOFT_REJECT_CODES.has(f.code));
    if (flag) reasons.push(flag.message);
  }

  // Conditions for REVIEW
  conditions.push('Senior credit officer review required');
  conditions.push('Physical property inspection mandatory');
  if (flagCodes.has('CERSAI_ENCUMBRANCE_RISK')) conditions.push('CERSAI portal verification required');
  if (flagCodes.has('STRUCTURAL_RISK_MEDIUM')) conditions.push('Structural engineer report required');
  if (flagCodes.has('LOW_MARKET_DATA') || flagCodes.has('VERY_LOW_MARKET_DATA')) {
    conditions.push('Independent valuer report required due to limited market data');
  }

  return {
    decision: 'REVIEW',
    decisionCode: 'MANUAL_REVIEW_REQUIRED',
    decisionReasons: reasons.length > 0 ? reasons : ['File requires standard underwriter review'],
    conditions,
    urgency: riskScore > 45 ? 'PRIORITY' : 'STANDARD',
    triggeredBy: softRejectHits,
  };
}

module.exports = { run };
