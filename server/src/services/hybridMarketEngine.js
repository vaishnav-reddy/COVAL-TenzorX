const axios = require('axios');
const cheerio = require('cheerio');

// ── ENHANCED WEB SCRAPING ──────────────────────────────────
class EnhancedScraper {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
  }

  async scrape99Acres(city, locality, propertyType) {
    try {
      const searchQuery = `${locality} ${city} ${propertyType}`;
      const url = `https://www.99acres.com/search/property/${encodeURIComponent(searchQuery)}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const listings = [];

      $('.srpCard').each((i, element) => {
        try {
          const $card = $(element);
          const priceText = $card.find('.srpCard__price').text().trim();
          const areaText = $card.find('.srpCard__size').text().trim();
          const locationText = $card.find('.srpCard__location').text().trim();

          if (priceText && areaText) {
            const price = this.parsePrice(priceText);
            const area = this.parseArea(areaText);
            
            if (price > 0 && area > 0) {
              listings.push({
                price,
                area,
                pricePerSqft: price / area,
                location: locationText,
                source: '99acres',
                scrapedAt: new Date()
              });
            }
          }
        } catch (err) {
          // Skip invalid listings
        }
      });

      return listings;
    } catch (error) {
      console.warn('99acres scraping failed:', error.message);
      return [];
    }
  }

  async scrapeMagicbricks(city, locality, propertyType) {
    try {
      const searchQuery = `${locality} ${city} ${propertyType}`;
      const url = `https://www.magicbricks.com/property-for-sale/${encodeURIComponent(city)}/${encodeURIComponent(locality)}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const listings = [];

      $('.mb-srp__card').each((i, element) => {
        try {
          const $card = $(element);
          const priceText = $card.find('.mb-srp__card__price--amount').text().trim();
          const areaText = $card.find('.mb-srp__card__size').text().trim();

          if (priceText && areaText) {
            const price = this.parsePrice(priceText);
            const area = this.parseArea(areaText);
            
            if (price > 0 && area > 0) {
              listings.push({
                price,
                area,
                pricePerSqft: price / area,
                location: `${locality}, ${city}`,
                source: 'magicbricks',
                scrapedAt: new Date()
              });
            }
          }
        } catch (err) {
          // Skip invalid listings
        }
      });

      return listings;
    } catch (error) {
      console.warn('Magicbricks scraping failed:', error.message);
      return [];
    }
  }

  async scrapeHousing(city, locality, propertyType) {
    try {
      const searchQuery = `${locality} ${city} ${propertyType}`;
      const url = `https://www.housing.com/in/buy/${encodeURIComponent(city)}/${encodeURIComponent(locality)}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const listings = [];

      $('.listing-card').each((i, element) => {
        try {
          const $card = $(element);
          const priceText = $card.find('.price').text().trim();
          const areaText = $card.find('.area').text().trim();

          if (priceText && areaText) {
            const price = this.parsePrice(priceText);
            const area = this.parseArea(areaText);
            
            if (price > 0 && area > 0) {
              listings.push({
                price,
                area,
                pricePerSqft: price / area,
                location: `${locality}, ${city}`,
                source: 'housing',
                scrapedAt: new Date()
              });
            }
          }
        } catch (err) {
          // Skip invalid listings
        }
      });

      return listings;
    } catch (error) {
      console.warn('Housing scraping failed:', error.message);
      return [];
    }
  }

  parsePrice(priceText) {
    const cleanPrice = priceText.replace(/[₹,a-zA-Z\s]/g, '');
    const match = cleanPrice.match(/(\d+\.?\d*)([Ll][Aa][Cc][Rr]|[Cc][Rr]|[Tt][Hh][Aa][Nn][Dd])/);
    
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      
      if (unit.includes('lac') || unit.includes('lcr')) {
        return value * 100000; // Convert lakhs to rupees
      } else if (unit.includes('cr')) {
        return value * 10000000; // Convert crores to rupees
      } else if (unit.includes('thand')) {
        return value * 1000; // Convert thousands to rupees
      }
    }
    
    const numericValue = parseFloat(cleanPrice);
    return isNaN(numericValue) ? 0 : numericValue;
  }

  parseArea(areaText) {
    const cleanArea = areaText.replace(/[a-zA-Z\s]/g, '');
    const value = parseFloat(cleanArea);
    return isNaN(value) ? 0 : value;
  }
}

// ── ML PREDICTION ENGINE ──────────────────────────────────
class MLPredictionEngine {
  constructor() {
    this.models = {
      linear: null,
      randomForest: null,
      neural: null
    };
    this.trainingData = [];
  }

  // Simple Linear Regression
  trainLinearRegression(data) {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    data.forEach(point => {
      sumX += point.area;
      sumY += point.price;
      sumXY += point.area * point.price;
      sumX2 += point.area * point.area;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  // Simple Random Forest (Multiple Decision Trees)
  trainRandomForest(data, trees = 5) {
    const models = [];
    
    for (let i = 0; i < trees; i++) {
      // Bootstrap sample
      const sample = this.bootstrapSample(data);
      const tree = this.buildDecisionTree(sample, 3); // Max depth 3
      models.push(tree);
    }
    
    return models;
  }

  bootstrapSample(data) {
    const sample = [];
    for (let i = 0; i < data.length; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      sample.push(data[randomIndex]);
    }
    return sample;
  }

  buildDecisionTree(data, maxDepth) {
    if (maxDepth <= 0 || data.length < 2) {
      return { type: 'leaf', value: data.reduce((sum, d) => sum + d.price, 0) / data.length };
    }

    // Find best split
    let bestSplit = null;
    let bestVariance = Infinity;

    for (let i = 0; i < data.length - 1; i++) {
      const splitValue = (data[i].area + data[i + 1].area) / 2;
      const leftData = data.filter(d => d.area <= splitValue);
      const rightData = data.filter(d => d.area > splitValue);
      
      if (leftData.length > 0 && rightData.length > 0) {
        const variance = this.calculateVariance(leftData) + this.calculateVariance(rightData);
        if (variance < bestVariance) {
          bestVariance = variance;
          bestSplit = { splitValue, leftData, rightData };
        }
      }
    }

    if (!bestSplit) {
      return { type: 'leaf', value: data.reduce((sum, d) => sum + d.price, 0) / data.length };
    }

    return {
      type: 'node',
      splitValue: bestSplit.splitValue,
      left: this.buildDecisionTree(bestSplit.leftData, maxDepth - 1),
      right: this.buildDecisionTree(bestSplit.rightData, maxDepth - 1)
    };
  }

  calculateVariance(data) {
    const mean = data.reduce((sum, d) => sum + d.price, 0) / data.length;
    const variance = data.reduce((sum, d) => sum + Math.pow(d.price - mean, 2), 0) / data.length;
    return variance;
  }

  // Simple Neural Network (Single Layer)
  trainNeuralNetwork(data, epochs = 100) {
    const weights = {
      w1: Math.random(),
      w2: Math.random(),
      bias: Math.random()
    };

    const learningRate = 0.01;

    for (let epoch = 0; epoch < epochs; epoch++) {
      data.forEach(point => {
        // Forward pass
        const z = weights.w1 * point.area + weights.w2 * point.pricePerSqft + weights.bias;
        const prediction = z; // Linear activation

        // Backward pass
        const error = point.price - prediction;
        weights.w1 += learningRate * error * point.area;
        weights.w2 += learningRate * error * point.pricePerSqft;
        weights.bias += learningRate * error;
      });
    }

    return weights;
  }

  predictLinear(area, model) {
    return model.slope * area + model.intercept;
  }

  predictRandomForest(area, trees) {
    const predictions = trees.map(tree => this.predictTree(area, tree));
    return predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length;
  }

  predictTree(area, tree) {
    if (tree.type === 'leaf') {
      return tree.value;
    }
    
    if (area <= tree.splitValue) {
      return this.predictTree(area, tree.left);
    } else {
      return this.predictTree(area, tree.right);
    }
  }

  predictNeural(area, pricePerSqft, weights) {
    return weights.w1 * area + weights.w2 * pricePerSqft + weights.bias;
  }
}

// ── HYBRID ENGINE ────────────────────────────────────────
class HybridMarketEngine {
  constructor() {
    this.scraper = new EnhancedScraper();
    this.mlEngine = new MLPredictionEngine();
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  async getMarketData(city, locality, propertyType, propertyArea) {
    const cacheKey = `${city}-${locality}-${propertyType}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Step 1: Enhanced Scraping
    const [acresListings, magicListings, housingListings] = await Promise.allSettled([
      this.scraper.scrape99Acres(city, locality, propertyType),
      this.scraper.scrapeMagicbricks(city, locality, propertyType),
      this.scraper.scrapeHousing(city, locality, propertyType)
    ]);

    const allListings = [
      ...(acresListings.value || []),
      ...(magicListings.value || []),
      ...(housingListings.value || [])
    ];

    // Step 2: Train ML Models on scraped data
    let mlPredictions = [];
    
    if (allListings.length >= 3) {
      // Train models
      const linearModel = this.mlEngine.trainLinearRegression(allListings);
      const randomForestModel = this.mlEngine.trainRandomForest(allListings);
      const neuralModel = this.mlEngine.trainNeuralNetwork(allListings);

      // Make predictions
      const avgPricePerSqft = allListings.reduce((sum, l) => sum + l.pricePerSqft, 0) / allListings.length;
      
      mlPredictions.push({
        method: 'linear',
        value: this.mlEngine.predictLinear(propertyArea, linearModel),
        confidence: 0.7
      });
      
      mlPredictions.push({
        method: 'randomForest',
        value: this.mlEngine.predictRandomForest(propertyArea, randomForestModel),
        confidence: 0.8
      });
      
      mlPredictions.push({
        method: 'neural',
        value: this.mlEngine.predictNeural(propertyArea, avgPricePerSqft, neuralModel),
        confidence: 0.75
      });
    }

    // Step 3: Combine scraped data and ML predictions
    const result = {
      scrapedData: {
        listings: allListings,
        avgPricePerSqft: allListings.length > 0 ? 
          allListings.reduce((sum, l) => sum + l.pricePerSqft, 0) / allListings.length : 
          this.getFallbackPrice(city, locality),
        totalListings: allListings.length,
        dataSources: {
          '99acres': acresListings.value?.length || 0,
          'magicbricks': magicListings.value?.length || 0,
          'housing': housingListings.value?.length || 0
        }
      },
      mlPredictions: mlPredictions,
      hybridValue: this.calculateHybridValue(allListings, mlPredictions, propertyArea),
      marketConfidence: this.calculateMarketConfidence(allListings, mlPredictions)
    };

    // Cache result
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  }

  calculateHybridValue(listings, predictions, propertyArea) {
    if (listings.length === 0 && predictions.length === 0) {
      return { value: 0, confidence: 0 };
    }

    let weightedSum = 0;
    let totalWeight = 0;

    // Weight scraped data (60% weight)
    if (listings.length > 0) {
      const avgPricePerSqft = listings.reduce((sum, l) => sum + l.pricePerSqft, 0) / listings.length;
      const scrapedValue = avgPricePerSqft * propertyArea;
      weightedSum += scrapedValue * 0.6;
      totalWeight += 0.6;
    }

    // Weight ML predictions (40% weight)
    if (predictions.length > 0) {
      const avgPrediction = predictions.reduce((sum, p) => sum + p.value, 0) / predictions.length;
      const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
      weightedSum += avgPrediction * 0.4 * avgConfidence;
      totalWeight += 0.4 * avgConfidence;
    }

    return {
      value: totalWeight > 0 ? weightedSum / totalWeight : 0,
      confidence: Math.min(totalWeight, 1)
    };
  }

  calculateMarketConfidence(listings, predictions) {
    const dataPoints = listings.length + predictions.length;
    const baseConfidence = Math.min(dataPoints / 10, 1); // More data = higher confidence
    
    // Adjust based on data source diversity
    const sourceCount = new Set(listings.map(l => l.source)).size;
    const diversityBonus = Math.min(sourceCount / 3, 0.2); // Up to 20% bonus
    
    return Math.min(baseConfidence + diversityBonus, 1);
  }

  getFallbackPrice(city, locality) {
    // Fallback prices per sqft for major cities
    const fallbackPrices = {
      'mumbai': 15000,
      'delhi': 12000,
      'bangalore': 8000,
      'hyderabad': 6000,
      'chennai': 7000,
      'kolkata': 5000,
      'pune': 7000
    };

    const cityLower = city.toLowerCase();
    return fallbackPrices[cityLower] || 5000;
  }
}

module.exports = { HybridMarketEngine };
