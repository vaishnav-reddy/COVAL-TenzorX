/**
 * Risk & Fraud Detection Engine
 * Flags anomalies, fraud signals, over-leveraging
 */

function run(property, marketData, valuationResult, distressResult, comparables) {
  const start = Date.now();
  const redFlags = [];
  let riskScore = 0;

  const { declaredValue, propertyType, yearOfConstruction, amenities = [] } = property;
  const { marketValue, overCircleRatePercent, pricePerSqft } = valuationResult;

  // 1. Declared value vs market value deviation
  const declaredVsMarket = ((declaredValue - marketValue) / marketValue) * 100;
  if (Math.abs(declaredVsMarket) > 25) {
    const severity = Math.abs(declaredVsMarket) > 50 ? 'critical' : 'medium';
    redFlags.push({
      code: 'VALUATION_DEVIATION',
      message: `Declared value deviates ${declaredVsMarket.toFixed(1)}% from assessed market value — potential fraud signal`,
      severity,
    });
    riskScore += severity === 'critical' ? 35 : 20;
  }

  // 2. Over circle rate flag (from valuation engine)
  if (overCircleRatePercent > 60) {
    redFlags.push({
      code: 'OVER_CIRCLE_RATE_CRITICAL',
      message: `Asking price is ${overCircleRatePercent.toFixed(1)}% above government circle rate — critically overpriced`,
      severity: 'critical',
    });
    riskScore += 30;
  } else if (overCircleRatePercent > 30) {
    redFlags.push({
      code: 'OVER_CIRCLE_RATE',
      message: `Asking price is ${overCircleRatePercent.toFixed(1)}% above circle rate — potentially overpriced`,
      severity: 'medium',
    });
    riskScore += 15;
  }

  // 3. RBI erosion flag from distress engine
  if (distressResult.rbiErosionFlag) {
    redFlags.push({
      code: 'RBI_SIGNIFICANT_EROSION',
      message: 'Realizable value falls below 50% of assessed value — RBI Significant Erosion threshold breached',
      severity: 'critical',
    });
    riskScore += 25;
  }

  // 4. Over-leveraged
  if (distressResult.overLeverageFlag) {
    redFlags.push({
      code: 'OVER_LEVERAGED',
      message: `Loan-to-distress-value ratio is ${distressResult.leverageRatio}x — property appears over-leveraged`,
      severity: 'medium',
    });
    riskScore += 15;
  }

  // 5. CERSAI multiple registration risk (simulated)
  const cersei = Math.random() > 0.85;
  if (cersei) {
    redFlags.push({
      code: 'CERSAI_MULTIPLE_REGISTRATION',
      message: 'Property may have existing encumbrance or multiple collateral registrations — CERSAI verification advised',
      severity: 'critical',
    });
    riskScore += 20;
  }

  // 6. Very old property
  if (yearOfConstruction && new Date().getFullYear() - yearOfConstruction > 40) {
    redFlags.push({
      code: 'AGED_PROPERTY',
      message: `Property is ${new Date().getFullYear() - yearOfConstruction} years old — structural risk assessment recommended`,
      severity: 'low',
    });
    riskScore += 8;
  }

  // 7. Price per sqft vs locality comps
  if (comparables.length > 0) {
    const avgCompPricePerSqft = comparables.reduce((acc, c) => acc + c.pricePerSqft, 0) / comparables.length;
    const compDeviation = ((pricePerSqft - avgCompPricePerSqft) / avgCompPricePerSqft) * 100;
    if (compDeviation > 30) {
      redFlags.push({
        code: 'COMP_PRICE_DEVIATION',
        message: `Assessed price/sqft deviates ${compDeviation.toFixed(1)}% above recent comparable transactions`,
        severity: 'medium',
      });
      riskScore += 12;
    }
  }

  // 8. Valuer bias indicator (low market data availability)
  if (marketData.propertyCount < 500) {
    redFlags.push({
      code: 'LOW_MARKET_DATA',
      message: 'Limited comparable transactions in this locality — valuation relies on extrapolated data',
      severity: 'low',
    });
    riskScore += 5;
  }

  riskScore = Math.min(riskScore, 100);

  let overallRiskLabel;
  if (riskScore <= 25) overallRiskLabel = 'safe';
  else if (riskScore <= 55) overallRiskLabel = 'caution';
  else overallRiskLabel = 'high_risk';

  return {
    engine: 'RiskEngine',
    duration: Date.now() - start,
    riskScore,
    redFlags,
    overallRiskLabel,
    declaredVsMarketDeviation: parseFloat(declaredVsMarket.toFixed(1)),
  };
}

module.exports = { run };
