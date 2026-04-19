/**
 * Confidence Scoring Engine
 * Aggregates data quality, comparables, location intelligence, risk
 */

function getDataCompleteness(property) {
  const fields = [
    property.propertyType,
    property.city,
    property.locality,
    property.area,
    property.yearOfConstruction,
    property.floorNumber !== undefined,
    property.constructionQuality,
    property.declaredValue,
    property.purpose,
    property.amenities?.length > 0,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

function getCompAvailability(comparables, marketData) {
  if (comparables.length >= 5) return 100;
  if (comparables.length >= 3) return 75;
  if (comparables.length >= 1) return 50;
  return 20;
}

function getLocationIntelligence(marketData) {
  const score =
    (marketData.demandIndex / 10) * 40 +
    (marketData.connectivity / 10) * 30 +
    (marketData.infrastructureScore / 10) * 30;
  return Math.round(score);
}

function run(property, marketData, comparables, riskScore) {
  const start = Date.now();

  const dataCompleteness = getDataCompleteness(property);
  const compAvailability = getCompAvailability(comparables, marketData);
  const locationIntelligence = getLocationIntelligence(marketData);
  const riskAdjustment = 100 - riskScore;

  // Per spec formula
  const confidenceScore = Math.round(
    dataCompleteness * 0.30 +
    compAvailability * 0.25 +
    locationIntelligence * 0.25 +
    riskAdjustment * 0.20
  );

  const clampedScore = Math.min(Math.max(confidenceScore, 10), 98);

  return {
    engine: 'ConfidenceEngine',
    duration: Date.now() - start,
    confidenceScore: clampedScore,
    confidenceBreakdown: {
      dataCompleteness: { score: dataCompleteness, weight: 30, label: 'Data Completeness' },
      compAvailability: { score: compAvailability, weight: 25, label: 'Comparable Availability' },
      locationIntelligence: { score: locationIntelligence, weight: 25, label: 'Location Intelligence' },
      riskAdjustment: { score: riskAdjustment, weight: 20, label: 'Risk Adjustment' },
    },
  };
}

module.exports = { run };
