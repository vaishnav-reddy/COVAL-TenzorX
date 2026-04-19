/**
 * Liquidity Engine
 * Scores property liquidity 1–100 based on multiple factors
 */

function getPropertyTypeScore(propertyType) {
  const map = { residential: 85, commercial: 65, industrial: 45, land: 40 };
  return map[propertyType] || 60;
}

function getAgeScore(yearOfConstruction) {
  if (!yearOfConstruction) return 60;
  const age = new Date().getFullYear() - yearOfConstruction;
  if (age <= 5) return 100;
  if (age <= 10) return 85;
  if (age <= 15) return 70;
  if (age <= 20) return 55;
  if (age <= 30) return 40;
  return 25;
}

function getFloorScore(floor, totalFloors) {
  if (floor === undefined || floor === null) return 70;
  if (floor === 0 || floor === 1) return 85;
  if (floor <= 5) return 90;
  if (floor <= 10) return 75;
  if (floor <= 15) return 60;
  return 45;
}

function getSizeScore(area, propertyType) {
  const optimal = { residential: [600, 2000], commercial: [400, 3000], industrial: [2000, 10000], land: [1000, 5000] };
  const range = optimal[propertyType] || [500, 2500];
  if (area >= range[0] && area <= range[1]) return 100;
  if (area < range[0]) return Math.max(40, 100 - ((range[0] - area) / range[0]) * 60);
  return Math.max(40, 100 - ((area - range[1]) / range[1]) * 40);
}

function getAmenitiesScore(amenities) {
  const count = (amenities || []).length;
  return Math.min(count * 12, 100);
}

function getExitCertainty(score) {
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function getTimeToSell(score) {
  if (score >= 80) return '15–30 days';
  if (score >= 65) return '30–60 days';
  if (score >= 50) return '2–4 months';
  if (score >= 35) return '4–8 months';
  return '8–18 months';
}

function run(property, marketData) {
  const start = Date.now();
  const { propertyType, yearOfConstruction, floorNumber, totalFloors, area, amenities } = property;

  const demandScore = (marketData.demandIndex / 10) * 100;
  const connectivity = (marketData.connectivity / 10) * 100;
  const propertyTypeScore = getPropertyTypeScore(propertyType);
  const ageScore = getAgeScore(yearOfConstruction);
  const amenitiesScore = getAmenitiesScore(amenities);
  const floorScore = getFloorScore(floorNumber, totalFloors);
  const sizeScore = getSizeScore(area, propertyType);

  // Weighted formula per spec
  const liquidityScore = Math.round(
    demandScore * 0.10 +
    connectivity * 0.15 +
    propertyTypeScore * 0.20 +
    ageScore * 0.15 +
    amenitiesScore * 0.10 +
    floorScore * 0.10 +
    sizeScore * 0.20
  );

  const clampedScore = Math.min(Math.max(liquidityScore, 1), 100);
  const timeToSell = getTimeToSell(clampedScore);
  const exitCertainty = getExitCertainty(clampedScore);

  return {
    engine: 'LiquidityEngine',
    duration: Date.now() - start,
    liquidityScore: clampedScore,
    timeToSell,
    exitCertainty,
    breakdown: {
      demandScore: Math.round(demandScore),
      connectivity: Math.round(connectivity),
      propertyTypeScore,
      ageScore,
      amenitiesScore,
      floorScore,
      sizeScore: Math.round(sizeScore),
    },
  };
}

module.exports = { run };
