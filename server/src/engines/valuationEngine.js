/**
 * Valuation Engine
 * Computes market value using comparable-based logic, circle rate benchmarking
 */

function getLocationMultiplier(demandIndex) {
  // demandIndex 1–10 → multiplier 0.85–1.20
  return 0.85 + ((demandIndex - 1) / 9) * 0.35;
}

function getAgeDepreciation(yearOfConstruction) {
  if (!yearOfConstruction) return 0.90;
  const age = new Date().getFullYear() - yearOfConstruction;
  const depreciation = 1 - age * 0.01;
  return Math.max(depreciation, 0.60);
}

function getQualityMultiplier(quality) {
  const map = { standard: 0.95, good: 1.0, premium: 1.10 };
  return map[quality] || 1.0;
}

function getFloorPremium(floor, totalFloors) {
  if (!floor || floor === 0) return -0.02; // ground floor slight discount
  if (floor === 1) return 0;
  if (floor >= 2 && floor <= 5) return 0.02;
  if (floor > 5 && floor <= 10) return 0.03;
  return 0.01; // very high floors
}

function run(property, marketData) {
  const start = Date.now();
  const {
    area,
    yearOfConstruction,
    floorNumber,
    totalFloors,
    constructionQuality,
    declaredValue,
    propertyType,
    amenities = [],
  } = property;

  const pricePerSqft = marketData.avgPricePerSqft;
  const locationMultiplier = getLocationMultiplier(marketData.demandIndex);
  const ageDepreciation = getAgeDepreciation(yearOfConstruction);
  const qualityMultiplier = getQualityMultiplier(constructionQuality);
  const floorPremium = getFloorPremium(floorNumber, totalFloors);
  const amenitiesBonus = Math.min(amenities.length * 0.01, 0.08);

  const marketValue = Math.round(
    pricePerSqft * area * locationMultiplier * ageDepreciation * qualityMultiplier * (1 + floorPremium + amenitiesBonus)
  );

  const valueRangeLow = Math.round(marketValue * 0.92);
  const valueRangeHigh = Math.round(marketValue * 1.08);

  // Circle rate check
  const circleRateValue = marketData.circleRate * area;
  const overCircleRatePercent = ((declaredValue - circleRateValue) / circleRateValue) * 100;
  const overPricedFlag = overCircleRatePercent > 30;

  const propertyAge = yearOfConstruction ? new Date().getFullYear() - yearOfConstruction : null;

  const valueDrivers = {
    basePrice: { label: 'Base Price/sqft', value: pricePerSqft, unit: '₹/sqft', weight: 40 },
    locationMultiplier: { label: 'Location Multiplier', value: parseFloat(locationMultiplier.toFixed(3)), unit: 'x', weight: 25 },
    ageDepreciation: { label: 'Age Depreciation', value: parseFloat(ageDepreciation.toFixed(3)), unit: 'x', weight: 15 },
    qualityMultiplier: { label: 'Construction Quality', value: parseFloat(qualityMultiplier.toFixed(3)), unit: 'x', weight: 10 },
    floorPremium: { label: 'Floor Premium', value: parseFloat(floorPremium.toFixed(3)), unit: 'x', weight: 5 },
    amenitiesBonus: { label: 'Amenities Bonus', value: parseFloat(amenitiesBonus.toFixed(3)), unit: 'x', weight: 5 },
  };

  return {
    engine: 'ValuationEngine',
    duration: Date.now() - start,
    marketValue,
    valueRangeLow,
    valueRangeHigh,
    pricePerSqft,
    circleRateValue,
    overCircleRatePercent: parseFloat(overCircleRatePercent.toFixed(1)),
    overPricedFlag,
    propertyAge,
    valueDrivers,
  };
}

module.exports = { run };
