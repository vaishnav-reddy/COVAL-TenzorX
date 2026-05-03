/**
 * MARKET SERVICE
 * Real-world property price benchmarks and market activity proxies.
 * Data simulated from 99acres, Housing.com, and PropEquity benchmarks (2023-24).
 */

const MARKET_BENCHMARKS = {
  mumbai: {
    bandra: { avgPrice: 45000, circleRate: 38000, demandIndex: 9.5, yoyAppreciation: 8.2, brokerDensity: 92, infrastructure: 94 },
    andheri: { avgPrice: 28000, circleRate: 22000, demandIndex: 8.8, yoyAppreciation: 6.5, brokerDensity: 85, infrastructure: 82 },
    borivali: { avgPrice: 18000, circleRate: 15000, demandIndex: 7.2, yoyAppreciation: 5.4, brokerDensity: 65, infrastructure: 75 },
    worli: { avgPrice: 65000, circleRate: 52000, demandIndex: 9.2, yoyAppreciation: 9.1, brokerDensity: 78, infrastructure: 96 },
    powai: { avgPrice: 32000, circleRate: 25000, demandIndex: 8.5, yoyAppreciation: 7.8, brokerDensity: 72, infrastructure: 88 },
  },
  pune: {
    hinjewadi: { avgPrice: 7500, circleRate: 5200, demandIndex: 8.2, yoyAppreciation: 6.8, brokerDensity: 58, infrastructure: 72 },
    baner: { avgPrice: 9500, circleRate: 6800, demandIndex: 8.9, yoyAppreciation: 7.5, brokerDensity: 74, infrastructure: 85 },
    kothrud: { avgPrice: 12000, circleRate: 9500, demandIndex: 7.8, yoyAppreciation: 5.2, brokerDensity: 62, infrastructure: 80 },
    wakad: { avgPrice: 7800, circleRate: 5500, demandIndex: 8.5, yoyAppreciation: 7.2, brokerDensity: 68, infrastructure: 70 },
  },
  bengaluru: {
    whitefield: { avgPrice: 8500, circleRate: 6200, demandIndex: 8.7, yoyAppreciation: 8.5, brokerDensity: 82, infrastructure: 78 },
    koramangala: { avgPrice: 15000, circleRate: 11000, demandIndex: 9.2, yoyAppreciation: 7.2, brokerDensity: 76, infrastructure: 90 },
    indiranagar: { avgPrice: 18000, circleRate: 13500, demandIndex: 9.4, yoyAppreciation: 8.8, brokerDensity: 80, infrastructure: 92 },
    sarjapur: { avgPrice: 7200, circleRate: 5000, demandIndex: 8.4, yoyAppreciation: 9.2, brokerDensity: 70, infrastructure: 65 },
  },
  delhi: {
    dwarka: { avgPrice: 12000, circleRate: 9000, demandIndex: 7.9, yoyAppreciation: 5.8, brokerDensity: 72, infrastructure: 84 },
    saket: { avgPrice: 22000, circleRate: 18000, demandIndex: 8.6, yoyAppreciation: 6.2, brokerDensity: 68, infrastructure: 88 },
    rohini: { avgPrice: 9500, circleRate: 7500, demandIndex: 6.8, yoyAppreciation: 4.5, brokerDensity: 54, infrastructure: 70 },
    gurgaon: { avgPrice: 14000, circleRate: 11000, demandIndex: 9.1, yoyAppreciation: 12.5, brokerDensity: 88, infrastructure: 82 },
    noida: { avgPrice: 6500, circleRate: 4800, demandIndex: 8.8, yoyAppreciation: 14.2, brokerDensity: 75, infrastructure: 86 },
  },
  hyderabad: {
    jubileehills: { avgPrice: 18000, circleRate: 14000, demandIndex: 9.5, yoyAppreciation: 10.2, brokerDensity: 65, infrastructure: 95 },
    gachibowli: { avgPrice: 9500, circleRate: 7200, demandIndex: 9.2, yoyAppreciation: 12.8, brokerDensity: 84, infrastructure: 88 },
    kukatpally: { avgPrice: 7500, circleRate: 5800, demandIndex: 8.5, yoyAppreciation: 8.4, brokerDensity: 78, infrastructure: 80 },
  }
};

const DEFAULT_BENCHMARK = {
  avgPrice: 6500,
  circleRate: 4500,
  demandIndex: 5,
  yoyAppreciation: 5,
  brokerDensity: 40,
  infrastructure: 60
};

/**
 * Get market benchmarks for a city and locality.
 * Matches using fuzzy-ish logic (substring or exact).
 */
function getBenchmarks(city, locality) {
  const c = (city || '').toLowerCase().replace(/\s/g, '');
  const l = (locality || '').toLowerCase().replace(/\s/g, '');

  // Try to find the city
  const cityKey = Object.keys(MARKET_BENCHMARKS).find(key => c.includes(key) || key.includes(c));
  
  if (cityKey) {
    const cityData = MARKET_BENCHMARKS[cityKey];
    // Try to find locality within city
    const localityKey = Object.keys(cityData).find(key => l.includes(key) || key.includes(l));
    
    if (localityKey) {
      return { ...cityData[localityKey], city: cityKey, locality: localityKey };
    }
    
    // Fallback: average of city localities if locality not found
    const localities = Object.values(cityData);
    const avg = localities.reduce((acc, curr) => ({
      avgPrice: acc.avgPrice + curr.avgPrice / localities.length,
      circleRate: acc.circleRate + curr.circleRate / localities.length,
      demandIndex: acc.demandIndex + curr.demandIndex / localities.length,
      yoyAppreciation: acc.yoyAppreciation + curr.yoyAppreciation / localities.length,
      brokerDensity: acc.brokerDensity + curr.brokerDensity / localities.length,
      infrastructure: acc.infrastructure + curr.infrastructure / localities.length
    }), { avgPrice: 0, circleRate: 0, demandIndex: 0, yoyAppreciation: 0, brokerDensity: 0, infrastructure: 0 });
    
    return { ...avg, city: cityKey, locality: 'General' };
  }

  return DEFAULT_BENCHMARK;
}

/**
 * Simulate "Scraped Data" from multiple portals.
 * Returns a set of mock listings similar to what would be found on 99acres.
 */
function getScrapedComparables(city, locality, propertyType, area) {
  const benchmark = getBenchmarks(city, locality);
  const comps = [];
  
  // Generate 5-8 random comparables around the benchmark price
  const count = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const variance = 0.85 + (Math.random() * 0.3); // ±15% variance
    const compArea = area * (0.9 + Math.random() * 0.2);
    comps.push({
      id: `comp_${i}`,
      source: Math.random() > 0.5 ? '99acres' : 'Housing.com',
      pricePerSqft: Math.round(benchmark.avgPrice * variance),
      area: Math.round(compArea),
      totalPrice: Math.round(benchmark.avgPrice * variance * compArea),
      quality: Math.random() > 0.7 ? 'premium' : (Math.random() > 0.3 ? 'good' : 'standard'),
      floor: Math.floor(Math.random() * 15),
      transactionDate: new Date(Date.now() - (Math.random() * 180 * 24 * 60 * 60 * 1000)).toISOString() // Last 6 months
    });
  }
  
  return comps;
}

module.exports = {
  getBenchmarks,
  getScrapedComparables
};
