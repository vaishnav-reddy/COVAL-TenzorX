/**
 * ============================================================
 * CONFIDENCE ENGINE — v2.0
 * ============================================================
 * Produces a composite confidence score (10–98) reflecting
 * how reliable the valuation is, based on data quality,
 * market evidence, and risk factors.
 *
 * REGULATORY / INDUSTRY BASIS:
 *  - RICS Red Book PS 2.3: Valuer must disclose uncertainty
 *    and limitations of evidence used
 *  - IVS 105 (Valuation Approaches and Methods): Comparable
 *    evidence quality directly affects reliability
 *  - RBI Circular on Collateral Valuation: Valuations with
 *    insufficient market data require additional provisioning
 *  - RICS Valuation Uncertainty Guidance Note 2021
 *
 * FOUR COMPONENTS:
 *  1. Data Completeness (30%) — property data quality
 *  2. Comparable Evidence (25%) — transaction data quality
 *     NOW uses: count + recency + proximity + market depth
 *  3. Location Intelligence (25%) — market data richness
 *     NOW uses: demand, connectivity, infra, absorption rate
 *  4. Risk Adjustment (20%) — inverse of risk score
 * ============================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   SECTION A: DATA COMPLETENESS
   Weighted field completeness — not all fields are equal.
   Critical fields (higher weight): area, type, city, value
   Important fields (medium weight): year, quality, purpose
   Supplementary (lower weight): floor, amenities, pincode
   Source: RICS Minimum Data Requirements for Valuation
───────────────────────────────────────────────────────────── */
function getDataCompleteness(property) {
  const checks = [
    // Critical fields — weight 3 each
    { value: property.propertyType, weight: 3 },
    { value: property.city, weight: 3 },
    { value: property.locality, weight: 3 },
    { value: property.area && property.area > 0, weight: 3 },
    { value: property.declaredValue && property.declaredValue > 0, weight: 3 },
    // Important fields — weight 2 each
    { value: property.yearOfConstruction, weight: 2 },
    { value: property.constructionQuality, weight: 2 },
    { value: property.purpose, weight: 2 },
    // New PS fields — weight 2 each (improve completeness score)
    { value: property.ownershipType, weight: 2 },
    { value: property.titleClarity, weight: 2 },
    { value: property.occupancyStatus, weight: 2 },
    { value: property.propertySubType, weight: 1 },
    // Supplementary — weight 1 each
    { value: property.floorNumber !== undefined && property.floorNumber !== null, weight: 1 },
    { value: property.totalFloors && property.totalFloors > 0, weight: 1 },
    { value: property.amenities && property.amenities.length > 0, weight: 1 },
    { value: property.pincode, weight: 1 },
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const filledWeight = checks.reduce((s, c) => s + (c.value ? c.weight : 0), 0);

  return Math.round((filledWeight / totalWeight) * 100);
}

/* ─────────────────────────────────────────────────────────────
   SECTION B: COMPARABLE EVIDENCE QUALITY
   RICS IVS 105 Para 50–80: Comparable evidence quality depends
   on: (1) number of comparables, (2) recency, (3) similarity.
   
   Count score: ≥5 = 100, 3–4 = 75, 1–2 = 50, 0 = 15
   Recency score: avg months since transaction
     <3 months = 100, 3–6 = 85, 6–12 = 65, 12–18 = 45, >18 = 25
   Market depth: propertyCount from MarketData
     >2000 = 100, 1000–2000 = 80, 500–1000 = 60, <500 = 35
   
   Final = count×0.40 + recency×0.35 + depth×0.25
───────────────────────────────────────────────────────────── */
function getComparableEvidenceScore(comparables, marketData) {
  // Count score
  let countScore;
  if (comparables.length >= 5) countScore = 100;
  else if (comparables.length >= 3) countScore = 75;
  else if (comparables.length >= 1) countScore = 50;
  else countScore = 15;

  // Recency score — average age of comparables in months
  let recencyScore = 50; // default if no comps
  if (comparables.length > 0) {
    const now = new Date();
    const avgMonths = comparables.reduce((sum, c) => {
      const months = (now - new Date(c.transactionDate)) / (1000 * 60 * 60 * 24 * 30.44);
      return sum + months;
    }, 0) / comparables.length;

    if (avgMonths <= 3) recencyScore = 100;
    else if (avgMonths <= 6) recencyScore = Math.round(100 - ((avgMonths - 3) / 3) * 15);
    else if (avgMonths <= 12) recencyScore = Math.round(85 - ((avgMonths - 6) / 6) * 20);
    else if (avgMonths <= 18) recencyScore = Math.round(65 - ((avgMonths - 12) / 6) * 20);
    else recencyScore = Math.max(15, Math.round(45 - (avgMonths - 18) * 1.5));
  }

  // Market depth score
  const propertyCount = marketData.propertyCount || 0;
  let depthScore;
  if (propertyCount >= 2000) depthScore = 100;
  else if (propertyCount >= 1000) depthScore = Math.round(80 + ((propertyCount - 1000) / 1000) * 20);
  else if (propertyCount >= 500) depthScore = Math.round(60 + ((propertyCount - 500) / 500) * 20);
  else if (propertyCount >= 200) depthScore = Math.round(35 + ((propertyCount - 200) / 300) * 25);
  else depthScore = Math.max(10, Math.round(propertyCount / 20));

  const score = Math.round(countScore * 0.40 + recencyScore * 0.35 + depthScore * 0.25);
  return {
    score,
    breakdown: { countScore, recencyScore, depthScore },
  };
}

/* ─────────────────────────────────────────────────────────────
   SECTION C: LOCATION INTELLIGENCE
   Richer market data = more reliable valuation.
   Components:
   - Demand index (1–10): market activity
   - Connectivity (1–10): accessibility
   - Infrastructure (1–10): amenity richness
   - Absorption rate: market velocity (new — was unused before)
   - YoY appreciation: price trend reliability
   
   Absorption rate contribution: higher absorption = more
   transactions = better price discovery = higher confidence.
───────────────────────────────────────────────────────────── */
function getLocationIntelligence(marketData) {
  const demandScore = (marketData.demandIndex / 10) * 100;
  const connectivityScore = (marketData.connectivity / 10) * 100;
  const infraScore = (marketData.infrastructureScore / 10) * 100;

  // Absorption rate: 0–15% per month → 0–100 score
  const absorptionScore = Math.min((marketData.marketAbsorptionRate || 0) * 7, 100);

  // YoY appreciation reliability: 2–12% is "normal" range
  // Very low or very high appreciation = less predictable market
  const yoy = marketData.yoyAppreciation || 5;
  const yoyReliability = yoy >= 2 && yoy <= 12
    ? 100
    : yoy < 0
    ? 40
    : yoy < 2
    ? 60
    : Math.max(40, 100 - (yoy - 12) * 4); // overheating penalty

  const score = Math.round(
    demandScore       * 0.25 +
    connectivityScore * 0.20 +
    infraScore        * 0.20 +
    absorptionScore   * 0.20 +
    yoyReliability    * 0.15
  );

  return {
    score,
    breakdown: { demandScore, connectivityScore, infraScore, absorptionScore, yoyReliability },
  };
}

/* ─────────────────────────────────────────────────────────────
   SECTION D: RISK ADJUSTMENT
   Higher risk = lower confidence in the valuation.
   Non-linear: risk score 0–30 has small impact,
   30–70 has moderate impact, 70–100 has large impact.
   This reflects that high-risk properties have more
   uncertainty in their assessed values.
───────────────────────────────────────────────────────────── */
function getRiskAdjustment(riskScore) {
  // Non-linear penalty: confidence drops faster at high risk
  if (riskScore <= 30) return Math.round(100 - riskScore * 0.3);
  if (riskScore <= 60) return Math.round(91 - (riskScore - 30) * 0.8);
  return Math.round(67 - (riskScore - 60) * 1.2);
}

/* ─────────────────────────────────────────────────────────────
   SECTION E: METHODOLOGY RELIABILITY BONUS
   If both Sales Comparison and Cost Approach were used and
   they agree within 15%, confidence gets a bonus.
   Source: RICS Red Book — reconciliation of approaches
   increases reliability.
───────────────────────────────────────────────────────────── */
function getMethodologyBonus(valuationMethodology) {
  if (!valuationMethodology) return 0;
  const { salesCompValue, costValue } = valuationMethodology;
  if (!salesCompValue || !costValue) return 0;

  const deviation = Math.abs(salesCompValue - costValue) / Math.max(salesCompValue, costValue);
  if (deviation <= 0.10) return 5;  // both approaches agree within 10%
  if (deviation <= 0.15) return 3;  // agree within 15%
  if (deviation <= 0.25) return 0;  // moderate divergence
  return -3;                         // large divergence = uncertainty
}

/* ─────────────────────────────────────────────────────────────
   MAIN RUN FUNCTION
───────────────────────────────────────────────────────────── */
function run(property, marketData, comparables, riskScore, valuationMethodology) {
  const start = Date.now();

  const dataCompleteness = getDataCompleteness(property);
  const compEvidence = getComparableEvidenceScore(comparables, marketData);
  const locationIntel = getLocationIntelligence(marketData);
  const riskAdjustment = getRiskAdjustment(riskScore);
  const methodologyBonus = getMethodologyBonus(valuationMethodology);

  // Weighted composite
  const rawScore =
    dataCompleteness          * 0.30 +
    compEvidence.score        * 0.25 +
    locationIntel.score       * 0.25 +
    riskAdjustment            * 0.20;

  const confidenceScore = Math.min(Math.max(Math.round(rawScore + methodologyBonus), 10), 98);

  return {
    engine: 'ConfidenceEngine',
    duration: Date.now() - start,
    confidenceScore,
    confidenceBreakdown: {
      dataCompleteness: {
        score: dataCompleteness,
        weight: 30,
        label: 'Data Completeness',
      },
      compAvailability: {
        score: compEvidence.score,
        weight: 25,
        label: 'Comparable Evidence Quality',
        detail: compEvidence.breakdown,
      },
      locationIntelligence: {
        score: locationIntel.score,
        weight: 25,
        label: 'Location Intelligence',
        detail: locationIntel.breakdown,
      },
      riskAdjustment: {
        score: riskAdjustment,
        weight: 20,
        label: 'Risk Adjustment',
      },
    },
    methodologyBonus,
  };
}

module.exports = { run };
