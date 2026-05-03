require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const MarketData = require('../models/MarketData');
const ComparableTransaction = require('../models/ComparableTransaction');
const Property = require('../models/Property');
const Valuation = require('../models/Valuation');

const marketData = [
  // Mumbai
  { city: 'Mumbai', locality: 'Bandra West', avgPricePerSqft: 45000, circleRate: 32000, demandIndex: 9, liquidityScoreBase: 82, propertyCount: 1240, marketAbsorptionRate: 8.2, connectivity: 9, infrastructureScore: 9, yoyAppreciation: 7.5 },
  { city: 'Mumbai', locality: 'Andheri East', avgPricePerSqft: 22000, circleRate: 15000, demandIndex: 8, liquidityScoreBase: 75, propertyCount: 2100, marketAbsorptionRate: 7.1, connectivity: 9, infrastructureScore: 8, yoyAppreciation: 6.2 },
  { city: 'Mumbai', locality: 'Powai', avgPricePerSqft: 28000, circleRate: 19000, demandIndex: 8, liquidityScoreBase: 78, propertyCount: 980, marketAbsorptionRate: 6.8, connectivity: 8, infrastructureScore: 9, yoyAppreciation: 7.0 },
  { city: 'Mumbai', locality: 'Thane West', avgPricePerSqft: 14000, circleRate: 9500, demandIndex: 7, liquidityScoreBase: 70, propertyCount: 3200, marketAbsorptionRate: 6.5, connectivity: 8, infrastructureScore: 7, yoyAppreciation: 5.8 },
  // Pune
  { city: 'Pune', locality: 'Koregaon Park', avgPricePerSqft: 18000, circleRate: 11000, demandIndex: 9, liquidityScoreBase: 80, propertyCount: 870, marketAbsorptionRate: 7.5, connectivity: 8, infrastructureScore: 9, yoyAppreciation: 8.1 },
  { city: 'Pune', locality: 'Wakad', avgPricePerSqft: 9500, circleRate: 6500, demandIndex: 7, liquidityScoreBase: 68, propertyCount: 2400, marketAbsorptionRate: 6.2, connectivity: 7, infrastructureScore: 7, yoyAppreciation: 5.5 },
  { city: 'Pune', locality: 'Hinjewadi', avgPricePerSqft: 8500, circleRate: 5800, demandIndex: 8, liquidityScoreBase: 72, propertyCount: 3100, marketAbsorptionRate: 7.8, connectivity: 7, infrastructureScore: 8, yoyAppreciation: 9.2 },
  { city: 'Pune', locality: 'Kothrud', avgPricePerSqft: 13000, circleRate: 8500, demandIndex: 8, liquidityScoreBase: 74, propertyCount: 1100, marketAbsorptionRate: 6.0, connectivity: 8, infrastructureScore: 8, yoyAppreciation: 6.8 },
  // Delhi
  { city: 'Delhi', locality: 'Dwarka', avgPricePerSqft: 11000, circleRate: 8000, demandIndex: 7, liquidityScoreBase: 68, propertyCount: 4200, marketAbsorptionRate: 5.8, connectivity: 9, infrastructureScore: 8, yoyAppreciation: 5.2 },
  { city: 'Delhi', locality: 'Vasant Kunj', avgPricePerSqft: 22000, circleRate: 16000, demandIndex: 8, liquidityScoreBase: 76, propertyCount: 820, marketAbsorptionRate: 5.5, connectivity: 8, infrastructureScore: 9, yoyAppreciation: 4.8 },
  { city: 'Delhi', locality: 'Rohini', avgPricePerSqft: 9000, circleRate: 6200, demandIndex: 6, liquidityScoreBase: 62, propertyCount: 5600, marketAbsorptionRate: 5.0, connectivity: 8, infrastructureScore: 7, yoyAppreciation: 4.2 },
  { city: 'Delhi', locality: 'Saket', avgPricePerSqft: 25000, circleRate: 18000, demandIndex: 9, liquidityScoreBase: 80, propertyCount: 680, marketAbsorptionRate: 6.2, connectivity: 9, infrastructureScore: 9, yoyAppreciation: 6.0 },
  // Bengaluru
  { city: 'Bengaluru', locality: 'Whitefield', avgPricePerSqft: 9800, circleRate: 6500, demandIndex: 9, liquidityScoreBase: 80, propertyCount: 5200, marketAbsorptionRate: 9.5, connectivity: 7, infrastructureScore: 8, yoyAppreciation: 11.2 },
  { city: 'Bengaluru', locality: 'Indiranagar', avgPricePerSqft: 16000, circleRate: 11000, demandIndex: 9, liquidityScoreBase: 85, propertyCount: 1100, marketAbsorptionRate: 8.8, connectivity: 9, infrastructureScore: 9, yoyAppreciation: 10.5 },
  { city: 'Bengaluru', locality: 'Sarjapur Road', avgPricePerSqft: 8200, circleRate: 5500, demandIndex: 8, liquidityScoreBase: 74, propertyCount: 4800, marketAbsorptionRate: 8.2, connectivity: 7, infrastructureScore: 7, yoyAppreciation: 9.8 },
  { city: 'Bengaluru', locality: 'Koramangala', avgPricePerSqft: 18500, circleRate: 13000, demandIndex: 9, liquidityScoreBase: 86, propertyCount: 920, marketAbsorptionRate: 8.5, connectivity: 8, infrastructureScore: 9, yoyAppreciation: 10.0 },
  // Hyderabad
  { city: 'Hyderabad', locality: 'Gachibowli', avgPricePerSqft: 8500, circleRate: 5500, demandIndex: 9, liquidityScoreBase: 80, propertyCount: 3800, marketAbsorptionRate: 9.2, connectivity: 8, infrastructureScore: 9, yoyAppreciation: 12.5 },
  { city: 'Hyderabad', locality: 'Banjara Hills', avgPricePerSqft: 14000, circleRate: 9500, demandIndex: 8, liquidityScoreBase: 76, propertyCount: 1200, marketAbsorptionRate: 7.0, connectivity: 8, infrastructureScore: 9, yoyAppreciation: 8.8 },
  { city: 'Hyderabad', locality: 'Kondapur', avgPricePerSqft: 7800, circleRate: 5200, demandIndex: 8, liquidityScoreBase: 74, propertyCount: 4200, marketAbsorptionRate: 8.5, connectivity: 8, infrastructureScore: 8, yoyAppreciation: 10.2 },
  { city: 'Hyderabad', locality: 'Madhapur', avgPricePerSqft: 9200, circleRate: 6200, demandIndex: 9, liquidityScoreBase: 82, propertyCount: 2900, marketAbsorptionRate: 9.0, connectivity: 8, infrastructureScore: 9, yoyAppreciation: 11.8 },
  // Chennai
  { city: 'Chennai', locality: 'Anna Nagar', avgPricePerSqft: 12000, circleRate: 8000, demandIndex: 8, liquidityScoreBase: 74, propertyCount: 1800, marketAbsorptionRate: 6.5, connectivity: 8, infrastructureScore: 8, yoyAppreciation: 6.5 },
  { city: 'Chennai', locality: 'OMR', avgPricePerSqft: 7200, circleRate: 4800, demandIndex: 7, liquidityScoreBase: 68, propertyCount: 5500, marketAbsorptionRate: 7.2, connectivity: 7, infrastructureScore: 7, yoyAppreciation: 8.2 },
  { city: 'Chennai', locality: 'Velachery', avgPricePerSqft: 9500, circleRate: 6500, demandIndex: 7, liquidityScoreBase: 70, propertyCount: 2200, marketAbsorptionRate: 6.0, connectivity: 8, infrastructureScore: 7, yoyAppreciation: 5.8 },
  // Ahmedabad
  { city: 'Ahmedabad', locality: 'Prahlad Nagar', avgPricePerSqft: 7500, circleRate: 4800, demandIndex: 8, liquidityScoreBase: 72, propertyCount: 2100, marketAbsorptionRate: 7.0, connectivity: 8, infrastructureScore: 8, yoyAppreciation: 7.8 },
  { city: 'Ahmedabad', locality: 'SG Highway', avgPricePerSqft: 8200, circleRate: 5500, demandIndex: 8, liquidityScoreBase: 75, propertyCount: 3200, marketAbsorptionRate: 7.5, connectivity: 9, infrastructureScore: 8, yoyAppreciation: 8.5 },
  { city: 'Ahmedabad', locality: 'Satellite', avgPricePerSqft: 9000, circleRate: 6000, demandIndex: 8, liquidityScoreBase: 74, propertyCount: 1800, marketAbsorptionRate: 6.8, connectivity: 8, infrastructureScore: 8, yoyAppreciation: 7.2 },
  // Kolkata
  { city: 'Kolkata', locality: 'Salt Lake', avgPricePerSqft: 8500, circleRate: 5500, demandIndex: 7, liquidityScoreBase: 68, propertyCount: 2400, marketAbsorptionRate: 5.5, connectivity: 8, infrastructureScore: 8, yoyAppreciation: 4.5 },
  { city: 'Kolkata', locality: 'New Town', avgPricePerSqft: 7200, circleRate: 4500, demandIndex: 7, liquidityScoreBase: 66, propertyCount: 3800, marketAbsorptionRate: 6.2, connectivity: 7, infrastructureScore: 8, yoyAppreciation: 7.2 },
  { city: 'Kolkata', locality: 'Alipore', avgPricePerSqft: 15000, circleRate: 10000, demandIndex: 8, liquidityScoreBase: 72, propertyCount: 680, marketAbsorptionRate: 4.8, connectivity: 8, infrastructureScore: 9, yoyAppreciation: 5.2 },
  // Jaipur
  { city: 'Jaipur', locality: 'Malviya Nagar', avgPricePerSqft: 6500, circleRate: 4200, demandIndex: 7, liquidityScoreBase: 65, propertyCount: 1900, marketAbsorptionRate: 5.8, connectivity: 7, infrastructureScore: 7, yoyAppreciation: 6.2 },
  { city: 'Jaipur', locality: 'Vaishali Nagar', avgPricePerSqft: 5800, circleRate: 3800, demandIndex: 7, liquidityScoreBase: 63, propertyCount: 2600, marketAbsorptionRate: 5.5, connectivity: 7, infrastructureScore: 7, yoyAppreciation: 5.8 },
  { city: 'Jaipur', locality: 'C-Scheme', avgPricePerSqft: 9500, circleRate: 6500, demandIndex: 8, liquidityScoreBase: 72, propertyCount: 1100, marketAbsorptionRate: 6.0, connectivity: 8, infrastructureScore: 8, yoyAppreciation: 7.0 },
  // Surat
  { city: 'Surat', locality: 'Vesu', avgPricePerSqft: 6200, circleRate: 4000, demandIndex: 7, liquidityScoreBase: 66, propertyCount: 2200, marketAbsorptionRate: 6.5, connectivity: 7, infrastructureScore: 7, yoyAppreciation: 7.5 },
  { city: 'Surat', locality: 'Adajan', avgPricePerSqft: 6800, circleRate: 4500, demandIndex: 8, liquidityScoreBase: 70, propertyCount: 2800, marketAbsorptionRate: 7.0, connectivity: 8, infrastructureScore: 7, yoyAppreciation: 8.0 },
  { city: 'Surat', locality: 'Althan', avgPricePerSqft: 5500, circleRate: 3600, demandIndex: 7, liquidityScoreBase: 64, propertyCount: 1800, marketAbsorptionRate: 6.0, connectivity: 7, infrastructureScore: 6, yoyAppreciation: 6.8 },
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateComps(city, locality, avgPricePerSqft) {
  const types = ['residential', 'commercial'];
  const qualities = ['standard', 'good', 'premium'];
  const comps = [];
  for (let i = 0; i < 5; i++) {
    const area = randomBetween(600, 2500);
    const pricePerSqft = avgPricePerSqft * (0.88 + Math.random() * 0.24);
    const price = Math.round(area * pricePerSqft);
    const date = new Date();
    date.setMonth(date.getMonth() - randomBetween(1, 12));
    comps.push({
      city,
      locality,
      propertyType: types[randomBetween(0, 1)],
      area,
      price,
      pricePerSqft: Math.round(pricePerSqft),
      floor: randomBetween(0, 12),
      age: randomBetween(0, 20),
      quality: qualities[randomBetween(0, 2)],
      transactionDate: date,
      description: `${area} sqft ${types[randomBetween(0, 1)]} in ${locality}`,
    });
  }
  return comps;
}

const dummyValuations = [
  {
    applicantName: 'Rajesh Kumar Sharma', city: 'Mumbai', locality: 'Bandra West',
    propertyType: 'residential', propertySubType: 'apartment', area: 1200,
    declaredValue: 5200000, cibilScore: 780, purpose: 'lap',
    marketValue: 5400000, pricePerSqft: 45000, confidenceScore: 88,
    overallRiskLabel: 'safe', liquidityScore: 82, distressMultiplier: 0.78,
    adjustedLTV: 0.75, riskScore: 22,
  },
  {
    applicantName: 'Priya Venkataraman', city: 'Bengaluru', locality: 'Koramangala',
    propertyType: 'residential', propertySubType: 'villa', area: 2400,
    declaredValue: 18000000, cibilScore: 820, purpose: 'mortgage',
    marketValue: 17760000, pricePerSqft: 18500, confidenceScore: 91,
    overallRiskLabel: 'safe', liquidityScore: 86, distressMultiplier: 0.82,
    adjustedLTV: 0.80, riskScore: 15,
  },
  {
    applicantName: 'Mohammed Irfan Shaikh', city: 'Hyderabad', locality: 'Gachibowli',
    propertyType: 'commercial', propertySubType: 'office', area: 3200,
    declaredValue: 28000000, cibilScore: 710, purpose: 'working_capital',
    marketValue: 27200000, pricePerSqft: 8500, confidenceScore: 74,
    overallRiskLabel: 'caution', liquidityScore: 68, distressMultiplier: 0.72,
    adjustedLTV: 0.65, riskScore: 45,
  },
  {
    applicantName: 'Sunita Agarwal', city: 'Delhi', locality: 'Vasant Kunj',
    propertyType: 'residential', propertySubType: 'apartment', area: 1800,
    declaredValue: 39000000, cibilScore: 760, purpose: 'lap',
    marketValue: 39600000, pricePerSqft: 22000, confidenceScore: 85,
    overallRiskLabel: 'safe', liquidityScore: 76, distressMultiplier: 0.76,
    adjustedLTV: 0.75, riskScore: 28,
  },
  {
    applicantName: 'Arjun Nair', city: 'Pune', locality: 'Koregaon Park',
    propertyType: 'residential', propertySubType: 'apartment', area: 950,
    declaredValue: 16500000, cibilScore: 690, purpose: 'lap',
    marketValue: 17100000, pricePerSqft: 18000, confidenceScore: 68,
    overallRiskLabel: 'caution', liquidityScore: 72, distressMultiplier: 0.70,
    adjustedLTV: 0.60, riskScore: 52,
  },
  {
    applicantName: 'Kavitha Subramaniam', city: 'Chennai', locality: 'Anna Nagar',
    propertyType: 'residential', propertySubType: 'independent house', area: 2200,
    declaredValue: 25000000, cibilScore: 800, purpose: 'mortgage',
    marketValue: 26400000, pricePerSqft: 12000, confidenceScore: 90,
    overallRiskLabel: 'safe', liquidityScore: 74, distressMultiplier: 0.79,
    adjustedLTV: 0.78, riskScore: 18,
  },
  {
    applicantName: 'Deepak Mehta', city: 'Ahmedabad', locality: 'SG Highway',
    propertyType: 'commercial', propertySubType: 'shop', area: 600,
    declaredValue: 4800000, cibilScore: 640, purpose: 'working_capital',
    marketValue: 4920000, pricePerSqft: 8200, confidenceScore: 61,
    overallRiskLabel: 'high_risk', liquidityScore: 55, distressMultiplier: 0.62,
    adjustedLTV: 0.55, riskScore: 72,
  },
  {
    applicantName: 'Ananya Chatterjee', city: 'Kolkata', locality: 'Alipore',
    propertyType: 'residential', propertySubType: 'apartment', area: 1600,
    declaredValue: 23000000, cibilScore: 755, purpose: 'lap',
    marketValue: 24000000, pricePerSqft: 15000, confidenceScore: 79,
    overallRiskLabel: 'safe', liquidityScore: 72, distressMultiplier: 0.75,
    adjustedLTV: 0.72, riskScore: 30,
  },
  {
    applicantName: 'Vikram Singh Rathore', city: 'Jaipur', locality: 'C-Scheme',
    propertyType: 'residential', propertySubType: 'villa', area: 3000,
    declaredValue: 27000000, cibilScore: 730, purpose: 'mortgage',
    marketValue: 28500000, pricePerSqft: 9500, confidenceScore: 76,
    overallRiskLabel: 'safe', liquidityScore: 70, distressMultiplier: 0.74,
    adjustedLTV: 0.70, riskScore: 35,
  },
  {
    applicantName: 'Fatima Begum Ansari', city: 'Mumbai', locality: 'Andheri East',
    propertyType: 'residential', propertySubType: 'apartment', area: 750,
    declaredValue: 16000000, cibilScore: 670, purpose: 'lap',
    marketValue: 16500000, pricePerSqft: 22000, confidenceScore: 65,
    overallRiskLabel: 'caution', liquidityScore: 65, distressMultiplier: 0.68,
    adjustedLTV: 0.60, riskScore: 58,
  },
  {
    applicantName: 'Sanjay Kulkarni', city: 'Pune', locality: 'Hinjewadi',
    propertyType: 'commercial', propertySubType: 'office', area: 2800,
    declaredValue: 23000000, cibilScore: 790, purpose: 'working_capital',
    marketValue: 23800000, pricePerSqft: 8500, confidenceScore: 83,
    overallRiskLabel: 'safe', liquidityScore: 74, distressMultiplier: 0.77,
    adjustedLTV: 0.75, riskScore: 25,
  },
  {
    applicantName: 'Lakshmi Devi Reddy', city: 'Hyderabad', locality: 'Banjara Hills',
    propertyType: 'residential', propertySubType: 'independent house', area: 4000,
    declaredValue: 55000000, cibilScore: 840, purpose: 'mortgage',
    marketValue: 56000000, pricePerSqft: 14000, confidenceScore: 93,
    overallRiskLabel: 'safe', liquidityScore: 80, distressMultiplier: 0.83,
    adjustedLTV: 0.80, riskScore: 12,
  },
  {
    applicantName: 'Rohit Bansal', city: 'Delhi', locality: 'Rohini',
    propertyType: 'residential', propertySubType: 'apartment', area: 1100,
    declaredValue: 9500000, cibilScore: 610, purpose: 'lap',
    marketValue: 9900000, pricePerSqft: 9000, confidenceScore: 55,
    overallRiskLabel: 'high_risk', liquidityScore: 50, distressMultiplier: 0.60,
    adjustedLTV: 0.50, riskScore: 80,
  },
  {
    applicantName: 'Meera Iyer', city: 'Bengaluru', locality: 'Whitefield',
    propertyType: 'residential', propertySubType: 'apartment', area: 1350,
    declaredValue: 13000000, cibilScore: 810, purpose: 'lap',
    marketValue: 13230000, pricePerSqft: 9800, confidenceScore: 89,
    overallRiskLabel: 'safe', liquidityScore: 82, distressMultiplier: 0.80,
    adjustedLTV: 0.78, riskScore: 20,
  },
  {
    applicantName: 'Harpreet Singh Bedi', city: 'Surat', locality: 'Adajan',
    propertyType: 'residential', propertySubType: 'apartment', area: 1050,
    declaredValue: 6900000, cibilScore: 720, purpose: 'lap',
    marketValue: 7140000, pricePerSqft: 6800, confidenceScore: 72,
    overallRiskLabel: 'caution', liquidityScore: 66, distressMultiplier: 0.71,
    adjustedLTV: 0.65, riskScore: 42,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coval');
    console.log('Connected to MongoDB');

    await MarketData.deleteMany({});
    await ComparableTransaction.deleteMany({});
    await Property.deleteMany({});
    await Valuation.deleteMany({});
    console.log('🗑️  Cleared all collections');

    await MarketData.insertMany(marketData);
    console.log(`✅ Seeded ${marketData.length} market data records`);

    const allComps = marketData.flatMap((m) => generateComps(m.city, m.locality, m.avgPricePerSqft));
    await ComparableTransaction.insertMany(allComps);
    console.log(`✅ Seeded ${allComps.length} comparable transactions`);

    // Seed dummy valuation history
    const marketDataMap = {};
    marketData.forEach((m) => { marketDataMap[`${m.city}|${m.locality}`] = m; });

    const propertyDocs = [];
    const valuationDocs = [];

    for (const v of dummyValuations) {
      const md = marketDataMap[`${v.city}|${v.locality}`] || marketData[0];
      const daysAgo = randomBetween(1, 180);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      const property = new Property({
        applicantName: v.applicantName,
        applicantPhone: `98${randomBetween(10000000, 99999999)}`,
        propertyType: v.propertyType,
        propertySubType: v.propertySubType,
        city: v.city,
        locality: v.locality,
        pincode: `${randomBetween(100000, 999999)}`,
        area: v.area,
        yearOfConstruction: randomBetween(1995, 2022),
        floorNumber: randomBetween(0, 10),
        totalFloors: randomBetween(5, 20),
        constructionQuality: ['standard', 'good', 'premium'][randomBetween(0, 2)],
        declaredValue: v.declaredValue,
        purpose: v.purpose,
        ownershipType: 'freehold',
        titleClarity: 'clear',
        occupancyStatus: 'self_occupied',
        marketScenario: 'normal',
        cibilScore: v.cibilScore,
        existingLoans: randomBetween(0, 2),
        existingEMIs: randomBetween(0, 50000),
        createdAt,
        updatedAt: createdAt,
      });
      propertyDocs.push(property);

      const distressValue = Math.round(v.marketValue * v.distressMultiplier);
      const valuation = {
        propertyId: property._id,
        propertySnapshot: {
          applicantName: v.applicantName,
          propertyType: v.propertyType,
          propertySubType: v.propertySubType,
          city: v.city,
          locality: v.locality,
          area: v.area,
          declaredValue: v.declaredValue,
          cibilScore: v.cibilScore,
          purpose: v.purpose,
          titleClarity: 'clear',
          loanAmountRequired: Math.round(v.marketValue * v.adjustedLTV * 0.9),
        },
        marketValue: v.marketValue,
        valueRangeLow: Math.round(v.marketValue * 0.93),
        valueRangeHigh: Math.round(v.marketValue * 1.07),
        pricePerSqft: v.pricePerSqft,
        distressValue,
        distressMultiplier: v.distressMultiplier,
        liquidityScore: v.liquidityScore,
        timeToSell: v.liquidityScore >= 75 ? '2-4 weeks' : v.liquidityScore >= 55 ? '1-3 months' : '3-6 months',
        exitCertainty: v.liquidityScore >= 75 ? 'high' : v.liquidityScore >= 55 ? 'medium' : 'low',
        riskScore: v.riskScore,
        overallRiskLabel: v.overallRiskLabel,
        confidenceScore: v.confidenceScore,
        confidenceBreakdown: {
          dataCompleteness: { label: 'Data Completeness', score: Math.min(v.confidenceScore + 5, 100) },
          comparableEvidence: { label: 'Comparable Evidence', score: Math.max(v.confidenceScore - 8, 40) },
          locationIntelligence: { label: 'Location Intelligence', score: Math.min(v.confidenceScore + 2, 100) },
          riskAdjustment: { label: 'Risk Adjustment', score: Math.max(100 - v.riskScore, 30) },
        },
        adjustedLTV: v.adjustedLTV,
        creditScoring: {
          creditAnalysis: {
            score: v.cibilScore,
            category: v.cibilScore >= 750 ? 'prime' : v.cibilScore >= 700 ? 'near-prime' : 'subprime',
          },
          ltvAdjustment: { base: 0.75, adjusted: v.adjustedLTV, adjustment: v.adjustedLTV - 0.75 },
        },
        marketData: md,
        compositeLocationScore: Math.round((md.demandIndex / 10) * 100),
        marketActivityProxies: {
          brokerDensity: randomBetween(8, 45),
          transactionIndicators: randomBetween(50, 200),
          listingDensity: randomBetween(12, 80),
          priceVelocity: md.yoyAppreciation,
        },
        redFlags: v.overallRiskLabel === 'high_risk'
          ? [{ code: 'LOW_CIBIL', message: 'CIBIL score below acceptable threshold', severity: 'critical' }]
          : v.overallRiskLabel === 'caution'
          ? [{ code: 'MODERATE_RISK', message: 'Moderate credit risk detected', severity: 'medium' }]
          : [],
        status: 'completed',
        processingTime: randomBetween(800, 3200),
        declaredVsMarketDeviation: Math.round(((v.declaredValue - v.marketValue) / v.marketValue) * 100),
        resaleRisk: v.liquidityScore >= 75 ? 'low' : v.liquidityScore >= 55 ? 'medium' : 'high',
        rbiErosionFlag: v.distressMultiplier < 0.65,
        createdAt,
        updatedAt: createdAt,
      };
      valuationDocs.push(valuation);
    }

    await Property.insertMany(propertyDocs);
    await Valuation.insertMany(valuationDocs);
    console.log(`✅ Seeded ${valuationDocs.length} dummy valuation history records`);

    console.log('🌱 Database seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
