/**
 * ============================================================
 * DISTRESS ENGINE — v2.0
 * ============================================================
 * Computes forced-sale / liquidation value using regulatory
 * haircut frameworks and SARFAESI auction realisation data.
 *
 * REGULATORY BASIS:
 *  - RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16
 *    (Prudential Norms — LTV ratios define maximum lending,
 *    implying minimum distress recovery expectations)
 *  - SARFAESI Act 2002, Section 13(4) — Secured Asset
 *    Enforcement: Reserve price = 75% of DM-assessed value
 *  - RBI Circular DNBS.CC.PD.No.356/03.10.01/2013-14
 *    (NBFC Prudential Norms — Significant Erosion threshold)
 *  - IBC (Insolvency and Bankruptcy Code) 2016 — liquidation
 *    value definition for resolution plans
 *  - RBI Discussion Paper on Revised Regulatory Framework
 *    for NBFCs (2021) — collateral haircut guidance
 *
 * SARFAESI AUCTION REALISATION DATA (empirical):
 *  Residential: 72–85% of assessed value (high demand)
 *  Commercial:  58–72% (moderate demand, longer process)
 *  Industrial:  50–65% (specialised, fewer buyers)
 *  Land:        45–60% (speculative, title risk, no income)
 *  Source: IBBI (Insolvency and Bankruptcy Board of India)
 *  Annual Report 2022-23, CRISIL Distressed Asset Study 2022
 * ============================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   SECTION A: RBI LTV-BASED DISTRESS FLOOR
   RBI sets maximum LTV ratios. The inverse gives us the
   minimum equity cushion, which anchors distress recovery.
   LTV 80% → bank lends 80% → distress floor ~72–75%
   (bank needs to recover loan + costs in forced sale)
   LTV 65% → distress floor ~58–62%
   LTV 60% → distress floor ~54–58%
   Source: RBI Master Circular on Prudential Norms 2015-16
───────────────────────────────────────────────────────────── */
const RBI_LTV_DISTRESS_PARAMS = {
  residential: {
    maxLTV: 0.80,
    sarfaesiReserveRate: 0.75,   // SARFAESI Section 13(4)
    avgAuctionRealisation: 0.82, // empirical: 72–85%, use 82% mid
    distressFloor: 0.55,
    distressCeiling: 0.82,
  },
  commercial: {
    maxLTV: 0.65,
    sarfaesiReserveRate: 0.75,
    avgAuctionRealisation: 0.72,
    distressFloor: 0.48,
    distressCeiling: 0.72,
  },
  industrial: {
    maxLTV: 0.60,
    sarfaesiReserveRate: 0.75,
    avgAuctionRealisation: 0.65,
    distressFloor: 0.42,
    distressCeiling: 0.65,
  },
  land: {
    maxLTV: 0.60,
    sarfaesiReserveRate: 0.75,
    avgAuctionRealisation: 0.58,
    distressFloor: 0.38,
    distressCeiling: 0.60,
  },
};

/* ─────────────────────────────────────────────────────────────
   SECTION B: DISTRESS MULTIPLIER CALCULATION
   Formula:
   baseMultiplier = sarfaesiReserveRate × avgAuctionRealisation
   This represents: if bank enforces SARFAESI, sets reserve at
   75% of value, and achieves average auction realisation.
   Example (residential):
     0.75 × 0.82 = 0.615 → but empirical data shows 72–85%
   We use the auction realisation directly as it already
   incorporates the SARFAESI reserve price effect.

   Adjustments applied:
   1. Liquidity adjustment: ±4% based on liquidity score
   2. Market condition: falling market gets additional haircut
   3. Age adjustment: very old properties harder to auction
───────────────────────────────────────────────────────────── */
function computeDistressMultiplier(propertyType, liquidityScore, yoyAppreciation, propertyAge) {
  const params = RBI_LTV_DISTRESS_PARAMS[propertyType] || RBI_LTV_DISTRESS_PARAMS.residential;

  // Base: SARFAESI auction realisation rate
  let multiplier = params.avgAuctionRealisation;

  // 1. Liquidity adjustment (±5%)
  // High liquidity → more bidders in auction → better realisation
  if (liquidityScore >= 75) multiplier += 0.05;
  else if (liquidityScore >= 60) multiplier += 0.02;
  else if (liquidityScore <= 35) multiplier -= 0.05;
  else if (liquidityScore <= 50) multiplier -= 0.02;

  // 2. Market condition adjustment
  // Falling market: additional haircut (buyers expect further decline)
  // Source: CRISIL Distressed Asset Study 2022
  if (yoyAppreciation < 0) {
    // Falling market: -3% to -8% depending on severity
    const fallHaircut = Math.min(Math.abs(yoyAppreciation) * 0.008, 0.08);
    multiplier -= fallHaircut;
  } else if (yoyAppreciation > 10) {
    // Strong appreciation: buyers willing to pay more even in distress
    multiplier += 0.02;
  }

  // 3. Age adjustment
  // Very old properties: structural concerns reduce auction interest
  if (propertyAge !== null && propertyAge > 40) multiplier -= 0.04;
  else if (propertyAge !== null && propertyAge > 25) multiplier -= 0.02;

  // Clamp within regulatory floor and ceiling
  multiplier = Math.max(params.distressFloor, Math.min(params.distressCeiling, multiplier));

  return parseFloat(multiplier.toFixed(4));
}

/* ─────────────────────────────────────────────────────────────
   SECTION C: RBI SIGNIFICANT EROSION FLAG
   RBI Circular DNBS.CC.PD.No.356/03.10.01/2013-14:
   "Significant Erosion in value of security" is defined as
   realizable value falling below 50% of the value assessed
   at the time of last inspection.
   This triggers mandatory NPA classification review and
   additional provisioning requirements for NBFCs/banks.
───────────────────────────────────────────────────────────── */
function checkRBIErosion(distressValue, marketValue) {
  return distressValue < marketValue * 0.50;
}

/* ─────────────────────────────────────────────────────────────
   SECTION D: LEVERAGE RATIO CHECK
   RBI Prudential Norms: LTV ratio at origination should not
   exceed prescribed limits. If declared value >> distress value,
   the effective LTV (loan / distress value) may breach limits.
   Threshold: leverageRatio > 1.5x = over-leveraged
   (i.e., declared value is 50% more than what can be recovered)
───────────────────────────────────────────────────────────── */
function checkLeverage(declaredValue, distressValue) {
  const ratio = distressValue > 0 ? declaredValue / distressValue : 999;
  return {
    leverageRatio: parseFloat(ratio.toFixed(2)),
    overLeverageFlag: ratio > 1.5,
  };
}

/* ─────────────────────────────────────────────────────────────
   SECTION E: LIQUIDATION TIMELINE
   Based on SARFAESI enforcement timelines and
   IBC liquidation process benchmarks.
   Source: IBBI Annual Report 2022-23
   SARFAESI: 60-day notice + auction = 3–6 months typical
   IBC: 270-day resolution period
───────────────────────────────────────────────────────────── */
function getLiquidationTimeline(liquidityScore, propertyType) {
  const typeMultiplier = { residential: 1.0, commercial: 1.5, industrial: 2.2, land: 2.8 };
  const mult = typeMultiplier[propertyType] || 1.0;

  let baseDays;
  if (liquidityScore >= 75) baseDays = 45;
  else if (liquidityScore >= 60) baseDays = 90;
  else if (liquidityScore >= 45) baseDays = 150;
  else if (liquidityScore >= 30) baseDays = 240;
  else baseDays = 365;

  const days = Math.round(baseDays * mult);

  if (days <= 60) return '30–60 days';
  if (days <= 120) return '2–4 months';
  if (days <= 240) return '4–8 months';
  if (days <= 365) return '8–12 months';
  return '12–24 months';
}

/* ─────────────────────────────────────────────────────────────
   SECTION F: RESALE RISK
   Composite of liquidity score and distress multiplier.
   Low risk: high liquidity AND good distress recovery
   Medium risk: moderate on either dimension
   High risk: low liquidity OR poor distress recovery
───────────────────────────────────────────────────────────── */
function getResaleRisk(liquidityScore, distressMultiplier, yoyAppreciation) {
  const marketTrend = yoyAppreciation >= 5 ? 1 : yoyAppreciation >= 0 ? 0 : -1;

  if (liquidityScore >= 70 && distressMultiplier >= 0.72 && marketTrend >= 0) return 'low';
  if (liquidityScore >= 50 && distressMultiplier >= 0.60) return 'medium';
  if (liquidityScore < 35 || distressMultiplier < 0.55 || marketTrend < 0) return 'high';
  return 'medium';
}

/* ─────────────────────────────────────────────────────────────
   MAIN RUN FUNCTION
───────────────────────────────────────────────────────────── */
function run(property, marketValue, liquidityScore, marketData, propertyAge) {
  const start = Date.now();
  const { propertyType, declaredValue } = property;
  const yoyAppreciation = marketData?.yoyAppreciation ?? 5;

  const distressMultiplier = computeDistressMultiplier(
    propertyType,
    liquidityScore,
    yoyAppreciation,
    propertyAge
  );

  const distressValue = Math.round(marketValue * distressMultiplier);
  const liquidationTimeline = getLiquidationTimeline(liquidityScore, propertyType);
  const resaleRisk = getResaleRisk(liquidityScore, distressMultiplier, yoyAppreciation);
  const rbiErosionFlag = checkRBIErosion(distressValue, marketValue);
  const { leverageRatio, overLeverageFlag } = checkLeverage(declaredValue, distressValue);

  // Effective LTV if loan = declaredValue
  const effectiveLTV = parseFloat(((declaredValue / marketValue) * 100).toFixed(1));
  const params = RBI_LTV_DISTRESS_PARAMS[propertyType] || RBI_LTV_DISTRESS_PARAMS.residential;
  const maxAllowedLTV = params.maxLTV * 100;
  const ltvBreached = effectiveLTV > maxAllowedLTV;

  return {
    engine: 'DistressEngine',
    duration: Date.now() - start,
    distressValue,
    distressMultiplier,
    liquidationTimeline,
    resaleRisk,
    rbiErosionFlag,
    leverageRatio,
    overLeverageFlag,
    effectiveLTV,
    maxAllowedLTV,
    ltvBreached,
    regulatoryBasis: {
      sarfaesiReserveRate: params.sarfaesiReserveRate,
      avgAuctionRealisation: params.avgAuctionRealisation,
      rbiMaxLTV: params.maxLTV,
      marketCondition: yoyAppreciation >= 5 ? 'appreciating' : yoyAppreciation >= 0 ? 'stable' : 'declining',
    },
  };
}

module.exports = { run };
