/**
 * ============================================================
 * SANCTION AMOUNT ENGINE
 * ============================================================
 * Computes the maximum sanctionable loan amount using RBI
 * LTV caps applied to the distress (forced-sale) value.
 *
 * WHY DISTRESS VALUE, NOT MARKET VALUE?
 *  RBI Circular DBR.No.BP.BC.2/21.04.048/2015-16 states that
 *  LTV should be computed on the "realizable value" of the
 *  security. For NBFCs, the conservative interpretation is
 *  to use the forced-sale / distress value as the base,
 *  ensuring the loan is recoverable even in a SARFAESI
 *  enforcement scenario.
 *
 * RBI LTV CAPS (Master Circular 2015-16):
 *  Home Loan / Mortgage:
 *    ≤ ₹30L  → 90% LTV
 *    ₹30L–75L → 80% LTV
 *    > ₹75L  → 75% LTV
 *  LAP (Loan Against Property): 65% LTV
 *  Working Capital (property-backed): 60% LTV
 *
 *  For NBFC (stricter than banks per RBI NBFC circular):
 *    Residential: max 75% (we use this as ceiling)
 *    Commercial:  max 65%
 *    Industrial:  max 60%
 *    Land:        max 50% (most conservative — no income,
 *                 speculative, harder to auction)
 *
 * SANCTION LOGIC:
 *  effectiveLTV = min(purposeLTV, propertyTypeLTV)
 *  sanctionAmount = distressValue × effectiveLTV
 *  Then apply confidence haircut: low confidence = lower sanction
 * ============================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   RBI LTV CAPS BY PURPOSE
   Source: RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16
───────────────────────────────────────────────────────────── */
const PURPOSE_LTV = {
  mortgage: 0.75,        // home loan / mortgage (>₹75L band)
  lap: 0.65,             // loan against property
  working_capital: 0.60, // working capital against property
};

/* ─────────────────────────────────────────────────────────────
   RBI LTV CAPS BY PROPERTY TYPE (NBFC conservative)
   Source: RBI NBFC Prudential Norms + SARFAESI enforceability
───────────────────────────────────────────────────────────── */
const PROPERTY_TYPE_LTV = {
  residential: 0.75,
  commercial: 0.65,
  industrial: 0.60,
  land: 0.50,
};

/* ─────────────────────────────────────────────────────────────
   CONFIDENCE HAIRCUT
   Low confidence = higher uncertainty in valuation = lower sanction.
   This is a prudential buffer, not a regulatory requirement,
   but consistent with RBI's principle of conservative valuation.
   confidence ≥ 80: no haircut
   confidence 65–79: -3%
   confidence 50–64: -7%
   confidence < 50: -12%
───────────────────────────────────────────────────────────── */
function getConfidenceHaircut(confidenceScore) {
  if (confidenceScore >= 80) return 0;
  if (confidenceScore >= 65) return 0.03;
  if (confidenceScore >= 50) return 0.07;
  return 0.12;
}

/* ─────────────────────────────────────────────────────────────
   MORTGAGE LTV SLAB (for mortgage purpose only)
   RBI has three slabs based on loan amount.
   We use distressValue as proxy for loan amount.
───────────────────────────────────────────────────────────── */
function getMortgageLTV(distressValue) {
  const thirtyLakh = 3000000;
  const seventyFiveLakh = 7500000;
  if (distressValue <= thirtyLakh) return 0.90;
  if (distressValue <= seventyFiveLakh) return 0.80;
  return 0.75;
}

/* ─────────────────────────────────────────────────────────────
   INR FORMATTER
───────────────────────────────────────────────────────────── */
function formatINR(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

/* ─────────────────────────────────────────────────────────────
   MAIN RUN FUNCTION
───────────────────────────────────────────────────────────── */
function run({ distressValue, marketValue, propertyType, purpose, confidenceScore, decision }) {
  // No sanction if REJECT
  if (decision === 'REJECT') {
    return {
      sanctionAmount: 0,
      sanctionAmountFormatted: '₹0',
      effectiveLTV: 0,
      ltvBasis: 'N/A — Application Rejected',
      breakdown: null,
    };
  }

  const purposeLTV = purpose === 'mortgage'
    ? getMortgageLTV(distressValue)
    : (PURPOSE_LTV[purpose] || 0.65);

  const propertyLTV = PROPERTY_TYPE_LTV[propertyType] || 0.65;

  // Take the more conservative (lower) of the two caps
  const baseLTV = Math.min(purposeLTV, propertyLTV);

  // Confidence haircut
  const haircut = getConfidenceHaircut(confidenceScore);
  const effectiveLTV = parseFloat((baseLTV - haircut).toFixed(4));

  const sanctionAmount = Math.round(distressValue * effectiveLTV);

  // LTV on market value (for reporting)
  const ltvOnMarket = marketValue > 0
    ? parseFloat(((sanctionAmount / marketValue) * 100).toFixed(1))
    : 0;

  return {
    sanctionAmount,
    sanctionAmountFormatted: formatINR(sanctionAmount),
    effectiveLTV: parseFloat((effectiveLTV * 100).toFixed(1)),
    ltvBasis: `Distress value × ${(effectiveLTV * 100).toFixed(1)}% effective LTV`,
    ltvOnMarketValue: ltvOnMarket,
    breakdown: {
      distressValue,
      distressValueFormatted: formatINR(distressValue),
      purposeLTV: parseFloat((purposeLTV * 100).toFixed(1)),
      propertyTypeLTV: parseFloat((propertyLTV * 100).toFixed(1)),
      baseLTV: parseFloat((baseLTV * 100).toFixed(1)),
      confidenceHaircutPct: parseFloat((haircut * 100).toFixed(1)),
      effectiveLTV: parseFloat((effectiveLTV * 100).toFixed(1)),
      regulatoryBasis: `RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16 — ${purpose?.toUpperCase()} LTV cap ${(purposeLTV * 100).toFixed(0)}%, ${propertyType} property cap ${(propertyLTV * 100).toFixed(0)}%`,
    },
  };
}

module.exports = { run };
