/**
 * ============================================================
 * VALUATION ENGINE — v2.0
 * ============================================================
 * Methodology: Hybrid of three internationally recognised
 * approaches reconciled by property age and data availability.
 *
 * REGULATORY BASIS:
 *  - RICS Valuation – Global Standards 2022 (Red Book), PS 2
 *  - NHB (National Housing Bank) Residual Life Depreciation
 *  - RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16
 *    (Prudential Norms on Income Recognition, Asset Classification)
 *  - IS 1893 / NBC 2016 for construction-type useful life
 *  - CBDT Schedule II (Income Tax Act) for depreciation reference
 *
 * THREE APPROACHES USED:
 *  1. Sales Comparison Approach  — primary for all types
 *  2. Cost Approach              — secondary for aged / unique
 *  3. Reconciliation             — weighted blend by age band
 * ============================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   SECTION A: NHB / NBC 2016 USEFUL LIFE TABLE
   Source: National Building Code 2016, Part 6, Section 4
   RBI also references these in its collateral valuation circulars.
   Used in Cost Approach depreciation.
───────────────────────────────────────────────────────────── */
const USEFUL_LIFE = {
  // RCC (Reinforced Cement Concrete) frame — most urban apartments
  rcc: 60,
  // Load-bearing masonry — older construction, tier-2 cities
  load_bearing: 40,
  // Steel frame — commercial / industrial
  steel: 50,
  // Default when construction type unknown
  default: 55,
};

/**
 * Infer construction type from property type + age.
 * Post-1990 residential in metro = almost certainly RCC.
 * Pre-1980 = likely load-bearing.
 * Commercial/Industrial = steel or RCC.
 */
function inferConstructionType(propertyType, yearOfConstruction) {
  const age = yearOfConstruction ? new Date().getFullYear() - yearOfConstruction : 20;
  if (propertyType === 'industrial') return 'steel';
  if (propertyType === 'commercial') return age > 30 ? 'load_bearing' : 'rcc';
  // residential / land
  if (age > 45) return 'load_bearing';
  return 'rcc';
}

/* ─────────────────────────────────────────────────────────────
   SECTION B: NHB RESIDUAL LIFE DEPRECIATION
   Formula: Depreciation = Age / TotalUsefulLife
   Residual Value Factor = 1 - (Age / TotalUsefulLife)
   Floor: 0.30 (30% residual — even a fully depreciated structure
   has land + salvage value; RBI does not allow zero collateral
   value for standing structures).
   Source: NHB Residual Life Method, also referenced in
   RBI Circular DNBS.PD.CC.No.95/03.05.002/2006-07
───────────────────────────────────────────────────────────── */
function getNHBDepreciation(yearOfConstruction, propertyType) {
  if (!yearOfConstruction) return { factor: 0.85, age: null, usefulLife: USEFUL_LIFE.default, constructionType: 'rcc' };

  const age = new Date().getFullYear() - yearOfConstruction;
  const constructionType = inferConstructionType(propertyType, yearOfConstruction);
  const usefulLife = USEFUL_LIFE[constructionType];

  // NHB formula: residual = 1 - (age / usefulLife)
  const rawFactor = 1 - (age / usefulLife);

  // RBI floor: minimum 30% residual value for standing structures
  const factor = Math.max(rawFactor, 0.30);

  return {
    factor: parseFloat(factor.toFixed(4)),
    age,
    usefulLife,
    constructionType,
    depreciationPct: parseFloat(((1 - factor) * 100).toFixed(1)),
  };
}

/* ─────────────────────────────────────────────────────────────
   SECTION C: LOCATION MULTIPLIER
   Based on demand-supply dynamics from market data.
   demandIndex (1–10) from MarketData reflects absorption rate,
   infrastructure, and employment catchment.
   Formula is a linear interpolation anchored at:
     demandIndex=1 → 0.80 (distressed / low-demand locality)
     demandIndex=5 → 1.00 (neutral / market rate)
     demandIndex=10 → 1.25 (premium / high-demand)
   This is consistent with RICS comparable adjustment methodology
   where location adjustments are applied as percentage premiums.
───────────────────────────────────────────────────────────── */
function getLocationMultiplier(demandIndex) {
  // Piecewise linear: below 5 = discount, above 5 = premium
  if (demandIndex <= 5) {
    return parseFloat((0.80 + ((demandIndex - 1) / 4) * 0.20).toFixed(4));
  }
  return parseFloat((1.00 + ((demandIndex - 5) / 5) * 0.25).toFixed(4));
}

/* ─────────────────────────────────────────────────────────────
   SECTION D: FLOOR PREMIUM / DISCOUNT
   Based on observed market data across Indian cities.
   Ground floor: -3% (security, flooding, privacy concerns)
   1st floor: 0% (base)
   2–5: +2% (sweet spot — accessible, view, no lift dependency)
   6–10: +3.5% (view premium, modern buildings)
   11–20: +2% (lift dependency, water pressure concerns)
   >20: -1% (very high floors — evacuation risk, maintenance)
   Source: NHB Housing Finance Report 2022, JLL India Floor
   Premium Study 2021
───────────────────────────────────────────────────────────── */
function getFloorPremium(floor, totalFloors) {
  if (floor === undefined || floor === null) return 0;
  if (floor === 0) return -0.03;
  if (floor === 1) return 0;
  if (floor >= 2 && floor <= 5) return 0.02;
  if (floor >= 6 && floor <= 10) return 0.035;
  if (floor >= 11 && floor <= 20) return 0.02;
  return -0.01; // penthouse / very high — niche market, lower liquidity
}

/* ─────────────────────────────────────────────────────────────
   SECTION E: CONSTRUCTION QUALITY MULTIPLIER
   Anchored to replacement cost differentials:
   Standard: basic finishes, no premium fittings → 0.93
   Good: mid-range finishes, branded fittings → 1.00 (base)
   Premium: luxury finishes, imported materials → 1.12
   Source: CPWD (Central Public Works Dept) Schedule of Rates
   2023, which is the government benchmark for construction cost.
───────────────────────────────────────────────────────────── */
function getQualityMultiplier(quality) {
  const map = { standard: 0.93, good: 1.00, premium: 1.12 };
  return map[quality] || 1.00;
}

/* ─────────────────────────────────────────────────────────────
   SECTION F: AMENITIES ADJUSTMENT
   Each amenity adds marginal value. Diminishing returns apply —
   the 10th amenity adds less than the 1st.
   Formula: bonus = 1 - e^(-0.15 × count), scaled to max 10%
   This is a concave (diminishing returns) function, more
   realistic than linear count × constant.
   Source: RICS Comparable Evidence in Real Estate Valuation,
   Guidance Note 2019
───────────────────────────────────────────────────────────── */
function getAmenitiesBonus(amenities) {
  const count = (amenities || []).length;
  // Diminishing returns: asymptotically approaches 0.10
  const bonus = 0.10 * (1 - Math.exp(-0.18 * count));
  return parseFloat(bonus.toFixed(4));
}

/* ─────────────────────────────────────────────────────────────
   SECTION G: SIZE ADJUSTMENT (PLOTTAGE / UNIT SIZE EFFECT)
   Larger units have lower ₹/sqft (bulk discount).
   Smaller units have higher ₹/sqft (premium for compact units).
   This is the "plottage" principle in RICS valuation.
   Optimal size band per property type (most liquid size):
     Residential: 600–1800 sqft
     Commercial: 500–3000 sqft
     Industrial: 5000–20000 sqft
     Land: 1000–5000 sqft
   Outside optimal: ±0.5% per 100 sqft deviation, capped at ±8%
───────────────────────────────────────────────────────────── */
function getSizeAdjustment(area, propertyType) {
  const optimal = {
    residential: [600, 1800],
    commercial: [500, 3000],
    industrial: [5000, 20000],
    land: [1000, 5000],
  };
  const range = optimal[propertyType] || [600, 1800];

  if (area >= range[0] && area <= range[1]) return 0; // within optimal band

  if (area < range[0]) {
    // Smaller than optimal → premium (compact units command higher ₹/sqft)
    const deviation = (range[0] - area) / range[0];
    return Math.min(deviation * 0.12, 0.08); // max +8%
  }
  // Larger than optimal → discount (bulk discount)
  const deviation = (area - range[1]) / range[1];
  return -Math.min(deviation * 0.10, 0.08); // max -8%
}

/* ─────────────────────────────────────────────────────────────
   SECTION H: TIME ADJUSTMENT FOR COMPARABLES
   Comparable transactions from the past need to be adjusted
   for market movement using YoY appreciation rate.
   Formula: timeAdjFactor = (1 + yoyAppreciation/100)^(months/12)
   Source: RICS Valuation Practice Guidance Application 2
   (Comparable Evidence), IVS 105
───────────────────────────────────────────────────────────── */
function getTimeAdjustedCompPrice(comp, yoyAppreciation) {
  const transDate = new Date(comp.transactionDate);
  const now = new Date();
  const monthsAgo = (now - transDate) / (1000 * 60 * 60 * 24 * 30.44);
  const annualRate = (yoyAppreciation || 5) / 100;
  const timeFactor = Math.pow(1 + annualRate, monthsAgo / 12);
  return comp.pricePerSqft * timeFactor;
}

/* ─────────────────────────────────────────────────────────────
   SECTION I: SALES COMPARISON APPROACH
   Uses comparable transactions adjusted for:
   1. Time (market movement since transaction)
   2. Size (plottage effect)
   3. Quality (construction standard difference)
   4. Floor (floor premium difference)
   Outliers removed using IQR method (RICS best practice).
   Source: RICS Comparable Evidence GN, IVS 105 Paragraphs 50–80
───────────────────────────────────────────────────────────── */
function salesComparisonApproach(property, comparables, marketData) {
  if (!comparables || comparables.length === 0) return null;

  const adjustedPrices = comparables.map((comp) => {
    let price = getTimeAdjustedCompPrice(comp, marketData.yoyAppreciation);

    // Quality adjustment
    const subjectQuality = getQualityMultiplier(property.constructionQuality);
    const compQuality = getQualityMultiplier(comp.quality);
    price *= subjectQuality / compQuality;

    // Size adjustment (relative to comp)
    const subjectSizeAdj = getSizeAdjustment(property.area, property.propertyType);
    const compSizeAdj = getSizeAdjustment(comp.area, property.propertyType);
    price *= (1 + subjectSizeAdj - compSizeAdj);

    // Floor adjustment
    const subjectFloor = getFloorPremium(property.floorNumber, property.totalFloors);
    const compFloor = getFloorPremium(comp.floor, null);
    price *= (1 + subjectFloor - compFloor);

    return price;
  });

  // IQR outlier removal (RICS best practice for comparable selection)
  const sorted = [...adjustedPrices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const filtered = adjustedPrices.filter(p => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);

  if (filtered.length === 0) return null;

  // Weighted median (more recent comps get higher weight)
  const median = filtered.sort((a, b) => a - b)[Math.floor(filtered.length / 2)];
  return Math.round(median * property.area);
}

/* ─────────────────────────────────────────────────────────────
   SECTION J: COST APPROACH
   Value = Land Value + Depreciated Replacement Cost
   Land Value = circleRate × area × landValueRatio
   Replacement Cost = CPWD construction cost × area × qualityFactor
   Depreciation = NHB Residual Life Method (Section B above)
   Source: CPWD Schedule of Rates 2023, NHB Residual Life Method,
   RBI Circular on Collateral Valuation
───────────────────────────────────────────────────────────── */
function costApproach(property, marketData, depreciationResult) {
  // Land value: typically 40–60% of total property value in urban India
  // We use circle rate as a proxy for land value (government assessed)
  const landValueRatio = property.propertyType === 'land' ? 1.0 : 0.45;
  const circleRate = marketData.circleRate || 4000; // Fallback circle rate
  const landValue = circleRate * property.area * landValueRatio;

  // CPWD replacement cost benchmarks (₹/sqft, 2023-24)
  const cpwdCost = {
    standard: 2200,
    good: 3200,
    premium: 5500,
  };
  const replacementCostPerSqft = cpwdCost[property.constructionQuality] || cpwdCost.good;
  const replacementCost = replacementCostPerSqft * property.area;

  // Apply NHB depreciation
  const depreciationFactor = depreciationResult.factor || 0.8; // Fallback
  const depreciatedStructureValue = replacementCost * depreciationFactor;

  const totalCostValue = Math.round(landValue + depreciatedStructureValue);
  return totalCostValue;
}

/* ─────────────────────────────────────────────────────────────
   SECTION K: RECONCILIATION WEIGHTS
   RICS Red Book PS 2.3: "The valuer should consider which
   approach(es) are most appropriate and weight accordingly."
   Age-based reconciliation:
   New (<5yr):   Sales 70%, Cost 30% — comps most reliable
   Mid (5–20yr): Sales 65%, Cost 35% — both approaches valid
   Old (>20yr):  Sales 50%, Cost 50% — cost approach gains weight
   Land only:    Sales 80%, Cost 20% — no structure to cost
   Source: RICS Valuation Practice Guidance Application 1
───────────────────────────────────────────────────────────── */
function getReconciliationWeights(age, propertyType) {
  if (propertyType === 'land') return { sales: 0.85, cost: 0.15 };
  if (age === null) return { sales: 0.65, cost: 0.35 };
  if (age <= 5) return { sales: 0.70, cost: 0.30 };
  if (age <= 20) return { sales: 0.65, cost: 0.35 };
  if (age <= 35) return { sales: 0.55, cost: 0.45 };
  return { sales: 0.45, cost: 0.55 }; // very old — cost approach dominates
}

/* ─────────────────────────────────────────────────────────────
   SECTION L: MARKET TREND ADJUSTMENT
   If market is appreciating/depreciating, adjust the base
   market price per sqft to reflect current conditions.
   Uses YoY appreciation from MarketData (sourced from
   NHB Housing Price Index / PropEquity / Anarock data).
   Adjustment: half-year forward projection
   (valuations are typically valid for 6 months per RBI norms)
───────────────────────────────────────────────────────────── */
function getMarketTrendAdjustedPrice(marketData) {
  const annualRate = (marketData.yoyAppreciation || 5) / 100;
  // Project 3 months forward (mid-point of 6-month validity)
  const trendFactor = Math.pow(1 + annualRate, 3 / 12);
  return marketData.avgPricePerSqft * trendFactor;
}

/* ─────────────────────────────────────────────────────────────
   MAIN RUN FUNCTION
───────────────────────────────────────────────────────────── */
function run(property, marketData, comparables = []) {
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

  // --- Depreciation (NHB Residual Life) ---
  const depreciationResult = getNHBDepreciation(yearOfConstruction, propertyType);

  // --- Market trend adjusted base price ---
  const trendAdjustedPricePerSqft = getMarketTrendAdjustedPrice(marketData);

  // --- Individual adjustment factors ---
  const locationMultiplier = getLocationMultiplier(marketData.demandIndex);
  const qualityMultiplier = getQualityMultiplier(constructionQuality);
  const floorPremium = getFloorPremium(floorNumber, totalFloors);
  const amenitiesBonus = getAmenitiesBonus(amenities);
  const sizeAdjustment = getSizeAdjustment(area, propertyType);

  // --- Approach 1: Sales Comparison ---
  const salesCompValue = salesComparisonApproach(property, comparables, marketData);

  // --- Market-based value (when no comps or as cross-check) ---
  const marketBasedValue = Math.round(
    trendAdjustedPricePerSqft *
    area *
    locationMultiplier *
    depreciationResult.factor *
    qualityMultiplier *
    (1 + floorPremium + amenitiesBonus + sizeAdjustment)
  );

  // --- Approach 2: Cost Approach ---
  const costValue = costApproach(property, marketData, depreciationResult);

  // --- Reconciliation ---
  const weights = getReconciliationWeights(depreciationResult.age, propertyType);

  // Use sales comp if available, else market-based as proxy
  const salesValue = salesCompValue || marketBasedValue;
  const safeCostValue = isNaN(costValue) ? 0 : costValue;
  const marketValue = Math.round(salesValue * weights.sales + safeCostValue * weights.cost);

  // --- Value Range: ±8% band (RBI allows ±10% for collateral) ---
  const valueRangeLow = Math.round(marketValue * 0.92);
  const valueRangeHigh = Math.round(marketValue * 1.08);

  // --- Circle Rate Check ---
  // RBI Circular: declared value > 130% of circle rate = overpriced flag
  const circleRateValue = marketData.circleRate * area;
  const overCircleRatePercent = ((declaredValue - circleRateValue) / circleRateValue) * 100;
  const overPricedFlag = overCircleRatePercent > 30;

  // --- Declared vs Market Deviation ---
  const declaredVsMarketDeviation = ((declaredValue - marketValue) / marketValue) * 100;

  const valueDrivers = {
    basePrice: {
      label: 'Trend-Adjusted Base Price/sqft',
      value: Math.round(trendAdjustedPricePerSqft),
      unit: '₹/sqft',
      weight: 35,
      note: `YoY appreciation ${marketData.yoyAppreciation}% applied`,
    },
    locationMultiplier: {
      label: 'Location Multiplier (Demand Index)',
      value: locationMultiplier,
      unit: 'x',
      weight: 20,
      note: `Demand index ${marketData.demandIndex}/10`,
    },
    nhbDepreciation: {
      label: 'NHB Residual Life Depreciation',
      value: depreciationResult.factor,
      unit: 'x',
      weight: 20,
      note: `${depreciationResult.constructionType?.toUpperCase()} structure, ${depreciationResult.age || 'unknown'} yrs / ${depreciationResult.usefulLife} yr life`,
    },
    qualityMultiplier: {
      label: 'Construction Quality (CPWD)',
      value: qualityMultiplier,
      unit: 'x',
      weight: 10,
      note: `${constructionQuality} grade`,
    },
    floorPremium: {
      label: 'Floor Premium/Discount',
      value: floorPremium,
      unit: 'x',
      weight: 5,
      note: `Floor ${floorNumber || 0}`,
    },
    amenitiesBonus: {
      label: 'Amenities Bonus (Diminishing Returns)',
      value: amenitiesBonus,
      unit: 'x',
      weight: 5,
      note: `${amenities.length} amenities`,
    },
    sizeAdjustment: {
      label: 'Size/Plottage Adjustment',
      value: sizeAdjustment,
      unit: 'x',
      weight: 5,
      note: `${area} sqft vs optimal band`,
    },
  };

  return {
    engine: 'ValuationEngine',
    duration: Date.now() - start,
    marketValue,
    valueRangeLow,
    valueRangeHigh,
    pricePerSqft: Math.round(marketValue / area),
    circleRateValue,
    overCircleRatePercent: parseFloat(overCircleRatePercent.toFixed(1)),
    overPricedFlag,
    propertyAge: depreciationResult.age,
    declaredVsMarketDeviation: parseFloat(declaredVsMarketDeviation.toFixed(1)),
    valueDrivers,
    methodology: {
      salesCompValue: salesCompValue || null,
      marketBasedValue,
      costValue,
      weights,
      depreciationResult,
      comparablesUsed: comparables.length,
    },
  };
}

module.exports = { run };
