/**
 * ============================================================
 * EXPLANATION ENGINE
 * ============================================================
 * Converts structured engine outputs into natural language
 * paragraphs that a loan officer or applicant can understand.
 *
 * Produces three levels:
 *  1. executiveSummary  — 2-3 sentences for senior management
 *  2. detailedReport    — full paragraph for loan officer
 *  3. applicantSummary  — plain language for the borrower
 * ============================================================
 */

'use strict';

function formatINR(amount) {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function getDemandLabel(demandIndex) {
  if (demandIndex >= 8) return 'high-demand';
  if (demandIndex >= 5) return 'moderate-demand';
  return 'low-demand';
}

function getMarketTrendLabel(yoy) {
  if (yoy > 10) return 'strongly appreciating';
  if (yoy > 5) return 'steadily appreciating';
  if (yoy > 0) return 'marginally appreciating';
  if (yoy === 0) return 'stagnant';
  return 'declining';
}

function getLiquidityLabel(score) {
  if (score >= 75) return 'highly liquid';
  if (score >= 55) return 'moderately liquid';
  if (score >= 35) return 'low liquidity';
  return 'illiquid';
}

function getRiskLabel(label) {
  const map = { safe: 'low risk', caution: 'moderate risk', high_risk: 'high risk' };
  return map[label] || label;
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
  scenarioApplied,
}) {
  const demandLabel = getDemandLabel(marketData.demandIndex);
  const trendLabel = getMarketTrendLabel(marketData.yoyAppreciation);
  const liquidityLabel = getLiquidityLabel(liquidityResult.liquidityScore);
  const riskLabelText = getRiskLabel(riskResult.overallRiskLabel);
  const dep = valuationResult.methodology?.depreciationResult || {};
  const age = dep.age ? `${dep.age}-year-old` : '';
  const constructionType = dep.constructionType ? `${dep.constructionType.replace('_', '-')} construction` : '';

  // ── Executive Summary ────────────────────────────────────
  const executiveSummary = [
    `The subject property is a ${age} ${property.propertyType} asset located in ${property.locality}, ${property.city}, a ${demandLabel} locality with a ${trendLabel} market (${marketData.yoyAppreciation}% YoY appreciation).`,
    `The assessed market value is ${formatINR(valuationResult.marketValue)}, with a distress recovery value of ${formatINR(distressResult.distressValue)} (${(distressResult.distressMultiplier * 100).toFixed(0)}% of market value).`,
    `Credit decision: ${decisionResult.decision}. ${decisionResult.decision !== 'REJECT' ? `Maximum sanctionable amount: ${sanctionResult.sanctionAmountFormatted} at ${sanctionResult.effectiveLTV}% effective LTV.` : `Reason: ${decisionResult.decisionReasons[0]}`}`,
  ].join(' ');

  // ── Detailed Report ──────────────────────────────────────
  const paragraphs = [];

  // Location & Market
  paragraphs.push(
    `This property is located in ${property.locality}, ${property.city}, which is classified as a ${demandLabel} area with a demand index of ${marketData.demandIndex}/10. The local real estate market is ${trendLabel}, recording ${marketData.yoyAppreciation}% year-on-year price appreciation. Market absorption rate stands at ${marketData.marketAbsorptionRate}% per month, translating to approximately ${liquidityResult.monthsOfInventory} months of inventory — a ${liquidityResult.monthsOfInventory <= 6 ? 'balanced to seller\'s' : 'buyer\'s'} market.`
  );

  // Valuation Methodology
  const weights = valuationResult.methodology?.weights || {};
  paragraphs.push(
    `The market value of ${formatINR(valuationResult.marketValue)} was derived using a hybrid valuation approach: ${(weights.sales * 100 || 0).toFixed(0)}% weight on the Sales Comparison Approach (based on ${valuationResult.methodology?.comparablesUsed || 0} comparable transactions adjusted for time, quality, floor, and size) and ${(weights.cost * 100 || 0).toFixed(0)}% weight on the Cost Approach (land value at circle rate plus depreciated replacement cost per CPWD Schedule of Rates 2023). The ${constructionType} structure has consumed ${dep.depreciationPct || 0}% of its ${dep.usefulLife || 60}-year NHB useful life, resulting in a residual value factor of ${dep.factor || 1}. The valuation range is ${formatINR(valuationResult.valueRangeLow)} to ${formatINR(valuationResult.valueRangeHigh)}.`
  );

  // Liquidity
  paragraphs.push(
    `The property is assessed as ${liquidityLabel} with a liquidity score of ${liquidityResult.liquidityScore}/100. Under normal market conditions, the estimated time to sell is ${liquidityResult.timeToSell}, with ${liquidityResult.exitCertainty} exit certainty. Under a SARFAESI enforcement scenario, the estimated liquidation timeline is ${distressResult.liquidationTimeline}.`
  );

  // Distress & Risk
  paragraphs.push(
    `The forced-sale (distress) value is ${formatINR(distressResult.distressValue)}, representing a ${(distressResult.distressMultiplier * 100).toFixed(0)}% recovery rate based on SARFAESI auction realisation data for ${property.propertyType} properties in ${distressResult.regulatoryBasis?.marketCondition || 'stable'} market conditions. ${distressResult.rbiErosionFlag ? 'The RBI Significant Erosion threshold has been breached — distress value falls below 50% of market value.' : 'The RBI Significant Erosion threshold is not breached.'} The overall risk profile is ${riskLabelText} (score: ${riskResult.riskScore}/100) with ${riskResult.redFlags.length} flag(s) identified.`
  );

  // Flags (if any)
  if (riskResult.redFlags.length > 0) {
    const flagSummary = riskResult.redFlags
      .map(f => `[${f.severity.toUpperCase()}] ${f.message}`)
      .join(' | ');
    paragraphs.push(`Risk flags identified: ${flagSummary}`);
  }

  // Confidence
  paragraphs.push(
    `The valuation confidence score is ${confidenceResult.confidenceScore}%, reflecting ${confidenceResult.confidenceScore >= 75 ? 'strong' : confidenceResult.confidenceScore >= 55 ? 'adequate' : 'limited'} data quality and market evidence. This score accounts for data completeness, comparable evidence quality (including recency of transactions), location intelligence, and risk-adjusted uncertainty.`
  );

  // Scenario (if applied)
  if (scenarioApplied && scenarioApplied.scenario !== 'normal') {
    paragraphs.push(
      `A "${scenarioApplied.scenario}" market scenario was simulated, applying a ${scenarioApplied.adjustmentPct > 0 ? '+' : ''}${scenarioApplied.adjustmentPct}% adjustment to the market value. Under this scenario, the adjusted market value is ${formatINR(scenarioApplied.adjustedMarketValue)}. This is a stress-test projection and does not replace the base valuation.`
    );
  }

  // Decision & Sanction
  paragraphs.push(
    `Based on the above assessment, the credit decision is ${decisionResult.decision} (${decisionResult.decisionCode}). ${decisionResult.decisionReasons.join(' ')}${decisionResult.conditions.length > 0 ? ' Conditions: ' + decisionResult.conditions.join('; ') + '.' : ''} ${decisionResult.decision !== 'REJECT' ? `The maximum sanctionable loan amount is ${sanctionResult.sanctionAmountFormatted}, computed as ${formatINR(distressResult.distressValue)} distress value × ${sanctionResult.effectiveLTV}% effective LTV (${sanctionResult.breakdown?.regulatoryBasis}).` : ''}`
  );

  // ── Applicant Summary (plain language) ──────────────────
  const applicantSummary = [
    `Your property at ${property.locality}, ${property.city} has been valued at ${formatINR(valuationResult.marketValue)}.`,
    decisionResult.decision === 'APPROVE'
      ? `Your application has been approved. The maximum loan amount you are eligible for is ${sanctionResult.sanctionAmountFormatted}.`
      : decisionResult.decision === 'REVIEW'
      ? `Your application requires additional review by our credit team. You will be contacted within 2–3 business days. ${decisionResult.conditions.length > 0 ? 'Please arrange: ' + decisionResult.conditions.join(', ') + '.' : ''}`
      : `We are unable to process your application at this time. ${decisionResult.decisionReasons[0]}`,
    `The property market in ${property.locality} is currently ${trendLabel} with ${marketData.yoyAppreciation}% annual appreciation.`,
  ].join(' ');

  return {
    executiveSummary,
    detailedReport: paragraphs.join('\n\n'),
    applicantSummary,
    paragraphs, // structured array for frontend rendering
  };
}

module.exports = { run };
