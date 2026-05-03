const Property = require('../models/Property');
const Valuation = require('../models/Valuation');
const MarketData = require('../models/MarketData');
const ComparableTransaction = require('../models/ComparableTransaction');

// ── Existing Engines ────────────────────────────
const valuationEngine = require('../engines/valuationEngine');
const distressEngine = require('../engines/distressEngine');
const liquidityEngine = require('../engines/liquidityEngine');
const riskEngine = require('../engines/riskEngine');
const confidenceEngine = require('../engines/confidenceEngine');

// ── New Real-Time Services (Problem Statement Integration) ───────────────────────────
const { integrateMarketData } = require('../services/marketDataIntegrator');

async function createValuation(req, res, next) {
  const globalStart = Date.now();
  try {
    const body = req.body;

    // Normalize property data with applicant information
    const propertyData = {
      // Applicant Information (NEW)
      applicantName: body.applicantName,
      applicantEmail: body.applicantEmail,
      applicantPhone: body.applicantPhone,
      applicantPAN: body.applicantPAN,
      
      // Property Information
      propertyType: body.propertyType?.toLowerCase(),
      propertySubType: body.propertySubType || null,
      city: body.city,
      locality: body.locality,
      pincode: body.pincode,
      area: parseFloat(body.area),
      areaType: body.areaType || 'builtup',
      yearOfConstruction: body.yearOfConstruction ? parseInt(body.yearOfConstruction) : null,
      floorNumber: body.floorNumber !== undefined ? parseInt(body.floorNumber) : 0,
      totalFloors: body.totalFloors ? parseInt(body.totalFloors) : 1,
      amenities: body.amenities || [],
      constructionQuality: body.constructionQuality?.toLowerCase() || 'good',
      // Loan Amount Required (NEW) - Use as primary value
      loanAmountRequired: parseFloat(body.loanAmountRequired),
      // Keep declaredValue for backward compatibility (set to loan amount or 0)
      declaredValue: parseFloat(body.loanAmountRequired) || 0,
      purpose: body.purpose || 'lap',
      ownershipType: body.ownershipType || 'freehold',
      titleClarity: body.titleClarity || 'clear',
      occupancyStatus: body.occupancyStatus || 'self_occupied',
      monthlyRent: body.monthlyRent ? parseFloat(body.monthlyRent) : null,
      marketScenario: body.marketScenario || 'normal',
      images: body.images || [],
      
      // New fields from enhanced form
      hasMunicipalApproval: body.hasMunicipalApproval || true,
      hasEncumbranceCertificate: body.hasEncumbranceCertificate || false,
      hasSaleDeed: body.hasSaleDeed || true,
      propertyTaxPaid: body.propertyTaxPaid || true,
    };

    // Credit Information (NEW)
    const creditData = {
      cibilScore: body.cibilScore ? parseInt(body.cibilScore) : null,
      existingLoans: body.existingLoans ? parseFloat(body.existingLoans) : null,
      existingEMIs: body.existingEMIs ? parseFloat(body.existingEMIs) : null,
    };

    // Save property
    const property = new Property(propertyData);
    await property.save();

    // ── NEW: Real-time Market Data Integration (Problem Statement Priority) ─────────────────────
    const marketDataResult = await integrateMarketData(propertyData);
    
    // Use real-time market data instead of static database
    const marketData = {
      city: marketDataResult.city || propertyData.city,
      locality: marketDataResult.locality || propertyData.locality,
      avgPricePerSqft: marketDataResult.avgPricePerSqft,
      circleRate: marketDataResult.circleRate,
      demandIndex: marketDataResult.demandIndex,
      yoyAppreciation: marketDataResult.yoyAppreciation,
      marketAbsorptionRate: marketDataResult.marketAbsorptionRate,
      connectivity: marketDataResult.connectivity,
      infrastructureScore: marketDataResult.infrastructureScore,
      propertyCount: marketDataResult.propertyCount,
      // Problem Statement Required: Market Activity Proxies
      marketActivityProxies: marketDataResult.marketActivityProxies,
      marketConfidence: marketDataResult.marketConfidence,
      dataSources: marketDataResult.dataSources
    };

    // Use real-time comparables instead of database
    const comparables = marketDataResult.comparables || [];

    const auditTrail = [];

    // ── ENHANCED Engine Pipeline with Real-time Data ──────────────────────────────

    // 1. Liquidity first — needed by distress engine (uses real-time market data)
    const liquidityResult = liquidityEngine.run(propertyData, marketData, null);
    auditTrail.push({ engine: 'LiquidityEngine', timestamp: new Date(), duration: liquidityResult.duration, output: liquidityResult });

    // 2. Valuation — uses real-time comparables for Sales Comparison Approach
    const valuationResult = valuationEngine.run(propertyData, marketData, comparables);
    auditTrail.push({ engine: 'ValuationEngine', timestamp: new Date(), duration: valuationResult.duration, output: valuationResult });

    // Safety check for valuation results
    if (!valuationResult || isNaN(valuationResult.marketValue) || !isFinite(valuationResult.marketValue)) {
      throw new Error('Valuation engine returned invalid results');
    }

    // 3. Re-run liquidity with actual market value for price-vs-median adjustment
    const liquidityResultFinal = liquidityEngine.run(propertyData, marketData, valuationResult.marketValue);
    auditTrail.push({ engine: 'LiquidityEngine(final)', timestamp: new Date(), duration: liquidityResultFinal.duration, output: liquidityResultFinal });

    // 4. Distress — needs liquidity score, real market data, and property age
    const distressResult = distressEngine.run(
      propertyData,
      valuationResult.marketValue,
      liquidityResultFinal.liquidityScore,
      marketData,
      valuationResult.propertyAge
    );
    auditTrail.push({ engine: 'DistressEngine', timestamp: new Date(), duration: distressResult.duration, output: distressResult });

    // 5. Risk — comprehensive regulatory checks (enhanced with location intelligence)
    const riskResult = riskEngine.run(propertyData, marketData, valuationResult, distressResult, comparables);
    auditTrail.push({ engine: 'RiskEngine', timestamp: new Date(), duration: riskResult.duration, output: riskResult });

    // 6. Confidence — uses methodology from valuation engine (enhanced with real-time data)
    const confidenceResult = confidenceEngine.run(
      propertyData,
      marketData,
      comparables,
      riskResult.riskScore,
      valuationResult.methodology
    );
    auditTrail.push({ engine: 'ConfidenceEngine', timestamp: new Date(), duration: confidenceResult.duration, output: confidenceResult });

    const processingTime = Date.now() - globalStart;

    // Build valuation document with safety checks
    const valuation = new Valuation({
      propertyId: property._id,
      propertySnapshot: {
        ...propertyData,
        applicantName: body.applicantName,
        applicantEmail: body.applicantEmail,
        applicantPhone: body.applicantPhone,
        loanAmountRequired: parseFloat(body.loanAmountRequired) || 0
      },
      marketValue: isNaN(valuationResult.marketValue) ? 0 : valuationResult.marketValue,
      valueRangeLow: isNaN(valuationResult.valueRangeLow) ? 0 : valuationResult.valueRangeLow,
      valueRangeHigh: isNaN(valuationResult.valueRangeHigh) ? 0 : valuationResult.valueRangeHigh,
      pricePerSqft: isNaN(valuationResult.pricePerSqft) ? 0 : valuationResult.pricePerSqft,
      valueDrivers: valuationResult.valueDrivers || {},
      distressValue: isNaN(distressResult.distressValue) ? 0 : distressResult.distressValue,
      distressMultiplier: distressResult.distressMultiplier || 1.0,
      rbiErosionFlag: distressResult.rbiErosionFlag || false,
      liquidationTimeline: distressResult.liquidationTimeline || 'N/A',
      resaleRisk: distressResult.resaleRisk || 'medium',
      liquidityScore: isNaN(liquidityResultFinal.liquidityScore) ? 0 : liquidityResultFinal.liquidityScore,
      timeToSell: liquidityResultFinal.timeToSell || 'N/A',
      exitCertainty: isNaN(liquidityResultFinal.exitCertainty) ? 'medium' : 
        liquidityResultFinal.exitCertainty > 0.7 ? 'high' : 
        liquidityResultFinal.exitCertainty > 0.4 ? 'medium' : 'low',
      riskScore: isNaN(riskResult.riskScore) ? 0 : riskResult.riskScore,
      redFlags: riskResult.redFlags || [],
      overallRiskLabel: riskResult.overallRiskLabel || 'medium',
      confidenceScore: isNaN(confidenceResult.confidenceScore) ? 0 : confidenceResult.confidenceScore,
      confidenceBreakdown: confidenceResult.confidenceBreakdown || {},
      
      // Borrower Credit & LTV (Problem Statement Requirement)
      creditScoring: riskResult.creditScoring || {},
      adjustedLTV: riskResult.creditScoring?.ltvAdjustment?.adjusted || 0.75,
      creditRiskAdjustment: riskResult.creditScoring?.riskAdjustment?.totalAdjustment || 0,
      loanRecommendations: riskResult.creditScoring?.loanRecommendations || [],

      // Market Data Snapshot (for dashboard display)
      marketData,
      marketActivityProxies: marketData.marketActivityProxies || null,
      compositeLocationScore: marketData.demandIndex ? Math.round((marketData.demandIndex / 10) * 100) : null,

      // Additional engine outputs
      propertyAge: valuationResult.propertyAge || null,
      declaredVsMarketDeviation: valuationResult.declaredVsMarketDeviation || 0,
      overCircleRatePercent: valuationResult.overCircleRatePercent || 0,
      overPricedFlag: valuationResult.overPricedFlag || false,
      liquidityBreakdown: liquidityResultFinal.breakdown || {},
      
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
        ...valuation.toObject()
      }
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
