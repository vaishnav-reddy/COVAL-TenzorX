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

    console.log('🌱 Database seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
