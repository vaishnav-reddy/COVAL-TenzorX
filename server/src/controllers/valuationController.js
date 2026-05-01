const Property = require('../models/Property');
const Valuation = require('../models/Valuation');
const MarketData = require('../models/MarketData');
const ComparableTransaction = require('../models/ComparableTransaction');

// ── Existing Engines (unchanged) ────────────────────────────
const valuationEngine = require('../engines/valuationEngine');
const distressEngine = require('../engines/distressEngine');
const liquidityEngine = require('../engines/liquidityEngine');
const riskEngine = require('../engines/riskEngine');
const confidenceEngine = require('../engines/confidenceEngine');

// ── New Services (additive layer) ───────────────────────────
const decisionEngine = require('../services/decisionEngine');
const sanctionEngine = require('../services/sanctionEngine');
const auditEngine = require('../services/auditEngine');
const explanationEngine = require('../services/explanationEngine');
const scenarioSimulator = require('../services/scenarioSimulator');

async function createValuation(req, res, next) {
  const globalStart = Date.now();
  try {
    const body = req.body;

    // Normalize
    const propertyData = {
      propertyType: body.propertyType?.toLowerCase(),
      city: body.city,
      locality: body.locality,
      pincode: body.pincode,
      area: parseFloat(body.area),
      yearOfConstruction: body.yearOfConstruction ? parseInt(body.yearOfConstruction) : null,
      floorNumber: body.floorNumber !== undefined ? parseInt(body.floorNumber) : 0,
      totalFloors: body.totalFloors ? parseInt(body.totalFloors) : 1,
      amenities: body.amenities || [],
      constructionQuality: body.constructionQuality?.toLowerCase() || 'good',
      declaredValue: parseFloat(body.declaredValue),
      purpose: body.purpose || 'lap',
      images: body.images || [],
    };

    // Save property
    const property = new Property(propertyData);
    await property.save();

    // Get market data
    const marketDataQuery = {
      city: { $regex: new RegExp(`^${body.city}$`, 'i') },
      locality: { $regex: new RegExp(`^${body.locality}$`, 'i') },
    };
    let marketData = await MarketData.findOne(marketDataQuery);

    // Fuzzy fallback: just match city
    if (!marketData) {
      marketData = await MarketData.findOne({ city: { $regex: new RegExp(`^${body.city}$`, 'i') } });
    }

    if (!marketData) {
      return res.status(404).json({ success: false, message: `No market data found for ${body.city}. Please seed the database.` });
    }

    // Get comparables
    const comparables = await ComparableTransaction.find({
      city: { $regex: new RegExp(`^${body.city}$`, 'i') },
      locality: { $regex: new RegExp(`^${body.locality}$`, 'i') },
    }).limit(5).lean();

    const auditTrail = [];

    // ── Engine Pipeline ──────────────────────────────────────
    // Order matters: Liquidity → Valuation → Distress → Risk → Confidence
    // Each engine feeds data into the next.

    // 1. Liquidity first — needed by distress engine
    //    Pass null for marketValue on first run (no declared vs market yet)
    const liquidityResult = liquidityEngine.run(propertyData, marketData, null);
    auditTrail.push({ engine: 'LiquidityEngine', timestamp: new Date(), duration: liquidityResult.duration, output: liquidityResult });

    // 2. Valuation — uses comparables for Sales Comparison Approach
    const valuationResult = valuationEngine.run(propertyData, marketData, comparables);
    auditTrail.push({ engine: 'ValuationEngine', timestamp: new Date(), duration: valuationResult.duration, output: valuationResult });

    // 3. Re-run liquidity with actual market value for price-vs-median adjustment
    const liquidityResultFinal = liquidityEngine.run(propertyData, marketData, valuationResult.marketValue);
    auditTrail.push({ engine: 'LiquidityEngine(final)', timestamp: new Date(), duration: liquidityResultFinal.duration, output: liquidityResultFinal });

    // 4. Distress — needs liquidity score, market data (for yoy), and property age
    const distressResult = distressEngine.run(
      propertyData,
      valuationResult.marketValue,
      liquidityResultFinal.liquidityScore,
      marketData,
      valuationResult.propertyAge
    );
    auditTrail.push({ engine: 'DistressEngine', timestamp: new Date(), duration: distressResult.duration, output: distressResult });

    // 5. Risk — comprehensive regulatory checks
    const riskResult = riskEngine.run(propertyData, marketData, valuationResult, distressResult, comparables);
    auditTrail.push({ engine: 'RiskEngine', timestamp: new Date(), duration: riskResult.duration, output: riskResult });

    // 6. Confidence — uses methodology from valuation engine
    const confidenceResult = confidenceEngine.run(
      propertyData,
      marketData,
      comparables,
      riskResult.riskScore,
      valuationResult.methodology
    );
    auditTrail.push({ engine: 'ConfidenceEngine', timestamp: new Date(), duration: confidenceResult.duration, output: confidenceResult });

    const processingTime = Date.now() - globalStart;

    // ── Service Layer (additive — does not modify engine outputs) ──

    // Scenario simulation (optional input field)
    const marketScenario = body.marketScenario || 'normal';
    const scenarioResult = scenarioSimulator.run(
      valuationResult.marketValue,
      distressResult.distressValue,
      marketScenario
    );

    // Decision engine
    const decisionResult = decisionEngine.run({
      confidenceScore: confidenceResult.confidenceScore,
      riskScore: riskResult.riskScore,
      overallRiskLabel: riskResult.overallRiskLabel,
      redFlags: riskResult.redFlags,
      liquidityScore: liquidityResultFinal.liquidityScore,
      distressResult,
      propertyType: propertyData.propertyType,
      purpose: propertyData.purpose,
    });

    // Sanction engine
    const sanctionResult = sanctionEngine.run({
      distressValue: distressResult.distressValue,
      marketValue: valuationResult.marketValue,
      propertyType: propertyData.propertyType,
      purpose: propertyData.purpose,
      confidenceScore: confidenceResult.confidenceScore,
      decision: decisionResult.decision,
    });

    // Audit engine
    const auditEngineResult = auditEngine.run({
      property: propertyData,
      marketData,
      valuationResult,
      liquidityResult: liquidityResultFinal,
      distressResult,
      riskResult,
      confidenceResult,
      decisionResult,
      sanctionResult,
      comparables,
      scenarioApplied: scenarioResult,
    });

    // Explanation engine
    const explanationResult = explanationEngine.run({
      property: propertyData,
      marketData,
      valuationResult,
      liquidityResult: liquidityResultFinal,
      distressResult,
      riskResult,
      confidenceResult,
      decisionResult,
      sanctionResult,
      scenarioApplied: scenarioResult,
    });

    // Build valuation document
    const valuation = new Valuation({
      propertyId: property._id,
      propertySnapshot: propertyData,
      marketValue: valuationResult.marketValue,
      valueRangeLow: valuationResult.valueRangeLow,
      valueRangeHigh: valuationResult.valueRangeHigh,
      pricePerSqft: valuationResult.pricePerSqft,
      valueDrivers: valuationResult.valueDrivers,
      distressValue: distressResult.distressValue,
      distressMultiplier: distressResult.distressMultiplier,
      rbiErosionFlag: distressResult.rbiErosionFlag,
      liquidationTimeline: distressResult.liquidationTimeline,
      resaleRisk: distressResult.resaleRisk,
      liquidityScore: liquidityResultFinal.liquidityScore,
      timeToSell: liquidityResultFinal.timeToSell,
      exitCertainty: liquidityResultFinal.exitCertainty,
      riskScore: riskResult.riskScore,
      redFlags: riskResult.redFlags,
      overallRiskLabel: riskResult.overallRiskLabel,
      confidenceScore: confidenceResult.confidenceScore,
      confidenceBreakdown: confidenceResult.confidenceBreakdown,
      comparables,
      auditTrail,
      processingTime,
      status: 'completed',
    });

    await valuation.save();

    return res.status(201).json({
      success: true,
      data: {
        valuationId: valuation._id,
        propertyId: property._id,
        ...valuation.toObject(),
        marketData: {
          city: marketData.city,
          locality: marketData.locality,
          avgPricePerSqft: marketData.avgPricePerSqft,
          circleRate: marketData.circleRate,
          demandIndex: marketData.demandIndex,
          yoyAppreciation: marketData.yoyAppreciation,
        },
        // Extras from engines (existing — unchanged)
        overCircleRatePercent: valuationResult.overCircleRatePercent,
        overPricedFlag: valuationResult.overPricedFlag,
        propertyAge: valuationResult.propertyAge,
        declaredVsMarketDeviation: riskResult.declaredVsMarketDeviation,
        liquidityBreakdown: liquidityResultFinal.breakdown,
        valuationMethodology: valuationResult.methodology,
        riskBreakdown: riskResult.riskBreakdown,
        encumbrancePrior: riskResult.encumbrancePrior,
        distressRegulatory: distressResult.regulatoryBasis,

        // ── New service layer outputs ──────────────────────
        decision: decisionResult.decision,
        decisionDetail: decisionResult,
        sanctionAmount: sanctionResult.sanctionAmount,
        sanctionAmountFormatted: sanctionResult.sanctionAmountFormatted,
        sanctionDetail: sanctionResult,
        auditTrailEnhanced: auditEngineResult,
        explanation: explanationResult,
        scenario: scenarioResult,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getValuation(req, res, next) {
  try {
    const valuation = await Valuation.findById(req.params.id).lean();
    if (!valuation) return res.status(404).json({ success: false, message: 'Valuation not found' });
    res.json({ success: true, data: valuation });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const { city, propertyType, riskLevel, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (city) filter['propertySnapshot.city'] = { $regex: new RegExp(city, 'i') };
    if (propertyType) filter['propertySnapshot.propertyType'] = propertyType;
    if (riskLevel) filter['overallRiskLabel'] = riskLevel;

    const total = await Valuation.countDocuments(filter);
    const valuations = await Valuation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Stats
    const all = await Valuation.find({});
    const avgConfidence = all.length ? Math.round(all.reduce((s, v) => s + (v.confidenceScore || 0), 0) / all.length) : 0;
    const avgProcessingTime = all.length ? Math.round(all.reduce((s, v) => s + (v.processingTime || 0), 0) / all.length) : 0;
    const highRiskCount = all.filter((v) => v.overallRiskLabel === 'high_risk').length;

    res.json({
      success: true,
      data: valuations,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      stats: { avgConfidence, avgProcessingTime, highRiskCount, total: all.length },
    });
  } catch (err) {
    next(err);
  }
}

async function generateReport(req, res, next) {
  try {
    const valuation = await Valuation.findById(req.params.id).lean();
    if (!valuation) return res.status(404).json({ success: false, message: 'Valuation not found' });
    // Return structured report data (PDF generation would be done client-side or via puppeteer)
    res.json({ success: true, data: { reportGenerated: true, valuation, generatedAt: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createValuation, getValuation, getHistory, generateReport };
