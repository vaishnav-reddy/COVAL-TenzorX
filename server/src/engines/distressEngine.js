/**
 * Distress Value Engine
 * Computes liquidation/distress value and RBI erosion flags
 */

function getDistressMultiplier(propertyType, liquidityScore) {
  const baseMap = { residential: 0.74, commercial: 0.68, industrial: 0.65, land: 0.60 };
  let base = baseMap[propertyType] || 0.70;
  // Adjust by liquidity score: higher liquidity → slightly better distress multiple
  if (liquidityScore >= 75) base = Math.min(base + 0.04, 0.82);
  else if (liquidityScore <= 40) base = Math.max(base - 0.04, 0.55);
  return parseFloat(base.toFixed(3));
}

function getLiquidationTimeline(propertyType, liquidityScore) {
  if (liquidityScore >= 75) return '30–60 days';
  if (liquidityScore >= 55) return '60–120 days';
  if (liquidityScore >= 40) return '4–8 months';
  return '8–18 months';
}

function getResaleRisk(liquidityScore, distressMultiplier) {
  if (liquidityScore >= 70 && distressMultiplier >= 0.70) return 'low';
  if (liquidityScore >= 50) return 'medium';
  return 'high';
}

function run(property, marketValue, liquidityScore) {
  const start = Date.now();
  const { propertyType } = property;

  const distressMultiplier = getDistressMultiplier(propertyType, liquidityScore);
  const distressValue = Math.round(marketValue * distressMultiplier);
  const liquidationTimeline = getLiquidationTimeline(propertyType, liquidityScore);
  const resaleRisk = getResaleRisk(liquidityScore, distressMultiplier);

  // RBI Significant Erosion: if realizable value < 50% of originally assessed
  const rbiErosionFlag = distressValue < marketValue * 0.50;

  // Over-leveraging check: if declared value is much higher than distress value
  const leverageRatio = property.declaredValue / distressValue;
  const overLeverageFlag = leverageRatio > 1.5;

  return {
    engine: 'DistressEngine',
    duration: Date.now() - start,
    distressValue,
    distressMultiplier,
    liquidationTimeline,
    resaleRisk,
    rbiErosionFlag,
    leverageRatio: parseFloat(leverageRatio.toFixed(2)),
    overLeverageFlag,
  };
}

module.exports = { run };
