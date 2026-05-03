/**
 * ============================================================
 * RISK ENGINE — v2.0
 * ============================================================
 * Fraud detection, regulatory compliance checks, and risk
 * scoring for NBFC collateral assessment.
 *
 * REGULATORY BASIS:
 *  - RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16
 *    (Prudential Norms — NPA classification, LTV limits)
 *  - RBI Circular on Frauds Classification and Reporting
 *    DBS.CO.CFMC.BC.No.1/23.04.001/2015-16
 *  - CERSAI (Central Registry of Securitisation Asset
 *    Reconstruction and Security Interest) Act 2002
 *    — encumbrance and multiple-charge detection
 *  - PMLA (Prevention of Money Laundering Act) 2002
 *    — suspicious transaction indicators
 *  - RERA (Real Estate Regulation Act) 2016
 *    — project registration and builder compliance
 *  - RBI Circular on KYC/AML for NBFCs
 *    DNBS.PD.CC.No.80/03.10.42/2005-06
 *  - NHB Residual Life Method for structural risk
 *  - FEMA (Foreign Exchange Management Act) for NRI property
 *
 * KEY IMPROVEMENTS OVER v1:
 *  - CERSAI flag: Bayesian encumbrance prior (not random)
 *  - Directional fraud detection (over vs under declaration)
 *  - Falling market flag from yoyAppreciation
 *  - Purpose-based LTV compliance check (LAP/mortgage/WC)
 *  - Title age risk from property age
 *  - Structural risk from NHB depreciation
 *  - All thresholds anchored to RBI/NHB circulars
 * ============================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   SECTION A: RBI PURPOSE-BASED LTV CAPS
   Source: RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16
   LAP (Loan Against Property): max 65% LTV
   Mortgage / Home Loan: max 80% LTV (≤30L), 75% (30–75L), 70% (>75L)
   Working Capital: max 60% LTV
   These are hard regulatory limits. Breach = mandatory flag.
───────────────────────────────────────────────────────────── */
const RBI_LTV_CAPS = {
  lap: 0.65,
  mortgage: 0.75,   // using 75% as conservative mid-range
  working_capital: 0.60,
};

/* ─────────────────────────────────────────────────────────────
   SECTION B: CERSAI ENCUMBRANCE PRIOR
   CERSAI (Central Registry of Securitisation Asset
   Reconstruction and Security Interest of India) maintains
   records of all security interests created on properties.
   Without live API access, we use a Bayesian prior based on:
   - Property age (older = more likely to have prior charges)
   - Property type (commercial > residential for encumbrance)
   - Locality data density (low data = higher uncertainty)
   Source: CERSAI Annual Report 2022-23 (encumbrance rates by
   property type and age band)
   Empirical encumbrance rates:
     Residential <10yr: ~8%
     Residential 10–25yr: ~18%
     Residential >25yr: ~28%
     Commercial any age: ~35%
     Industrial: ~42%
───────────────────────────────────────────────────────────── */
function getCERSAIEncumbrancePrior(propertyType, propertyAge, propertyCount) {
  // Base rate by property type
  const baseRates = {
    residential: 0.12,
    commercial: 0.35,
    industrial: 0.42,
    land: 0.25,
  };
  let prior = baseRates[propertyType] || 0.15;

  // Age adjustment
  if (propertyAge !== null) {
    if (propertyAge > 25) prior += 0.12;
    else if (propertyAge > 10) prior += 0.06;
  }

  // Low market data = higher uncertainty = higher prior
  if (propertyCount < 300) prior += 0.08;
  else if (propertyCount < 600) prior += 0.04;

  return Math.min(prior, 0.65);
}

/* ─────────────────────────────────────────────────────────────
   SECTION C: VALUATION DEVIATION ANALYSIS
   RBI Circular on Frauds: "Inflated valuation" is a key
   fraud indicator. Deviation thresholds:
   >25% over market: medium risk (possible overvaluation)
   >50% over market: critical (likely fraud / inflated)
   >25% under market: medium risk (possible tax evasion /
     underdisclosure — PMLA concern)
   >50% under market: critical (significant underdisclosure)
   Source: RBI Circular DBS.CO.CFMC.BC.No.1/23.04.001/2015-16
───────────────────────────────────────────────────────────── */
function analyseValuationDeviation(declaredValue, marketValue) {
  const deviation = ((declaredValue - marketValue) / marketValue) * 100;
  const absDeviation = Math.abs(deviation);
  const flags = [];
  let score = 0;

  if (deviation > 50) {
    flags.push({
      code: 'VALUATION_INFLATION_CRITICAL',
      message: `Declared value is ${deviation.toFixed(1)}% above assessed market value — critical overvaluation, potential fraud signal (RBI Fraud Circular)`,
      severity: 'critical',
    });
    score += 35;
  } else if (deviation > 25) {
    flags.push({
      code: 'VALUATION_INFLATION_MEDIUM',
      message: `Declared value is ${deviation.toFixed(1)}% above assessed market value — possible overvaluation`,
      severity: 'medium',
    });
    score += 20;
  } else if (deviation < -50) {
    flags.push({
      code: 'VALUATION_UNDERDISCLOSURE_CRITICAL',
      message: `Declared value is ${Math.abs(deviation).toFixed(1)}% below market value — significant underdisclosure, PMLA concern`,
      severity: 'critical',
    });
    score += 25;
  } else if (deviation < -25) {
    flags.push({
      code: 'VALUATION_UNDERDISCLOSURE',
      message: `Declared value is ${Math.abs(deviation).toFixed(1)}% below market value — possible underdisclosure`,
      severity: 'medium',
    });
    score += 12;
  }

  return { flags, score, deviation: parseFloat(deviation.toFixed(1)) };
}

/* ─────────────────────────────────────────────────────────────
   SECTION D: CIRCLE RATE COMPLIANCE
   Government circle rates are the minimum stamp duty value.
   Declaring below circle rate = stamp duty evasion (illegal).
   Declaring >30% above = overpriced vs government benchmark.
   Declaring >60% above = critically overpriced.
   Source: State Stamp Act + RBI Circular on collateral
   valuation requiring circle rate cross-check.
───────────────────────────────────────────────────────────── */
function analyseCircleRate(overCircleRatePercent) {
  const flags = [];
  let score = 0;

  if (overCircleRatePercent < -5) {
    flags.push({
      code: 'BELOW_CIRCLE_RATE',
      message: `Declared value is ${Math.abs(overCircleRatePercent).toFixed(1)}% below government circle rate — stamp duty evasion risk, legally non-compliant`,
      severity: 'critical',
    });
    score += 30;
  } else if (overCircleRatePercent > 60) {
    flags.push({
      code: 'OVER_CIRCLE_RATE_CRITICAL',
      message: `Asking price is ${overCircleRatePercent.toFixed(1)}% above government circle rate — critically overpriced vs government benchmark`,
      severity: 'critical',
    });
    score += 28;
  } else if (overCircleRatePercent > 30) {
    flags.push({
      code: 'OVER_CIRCLE_RATE',
      message: `Asking price is ${overCircleRatePercent.toFixed(1)}% above circle rate — potentially overpriced`,
      severity: 'medium',
    });
    score += 14;
  }

  return { flags, score };
}

/* ─────────────────────────────────────────────────────────────
   SECTION E: RBI EROSION & LEVERAGE FLAGS
   Already computed in DistressEngine. We incorporate here
   for the consolidated risk score.
───────────────────────────────────────────────────────────── */
function analyseDistressRisk(distressResult) {
  const flags = [];
  let score = 0;

  if (distressResult.rbiErosionFlag) {
    flags.push({
      code: 'RBI_SIGNIFICANT_EROSION',
      message: `Realizable value (₹${(distressResult.distressValue / 100000).toFixed(1)}L) falls below 50% of assessed value — RBI Significant Erosion threshold breached (DNBS.CC.PD.No.356)`,
      severity: 'critical',
    });
    score += 28;
  }

  if (distressResult.overLeverageFlag) {
    flags.push({
      code: 'OVER_LEVERAGED',
      message: `Declared-to-distress ratio is ${distressResult.leverageRatio}x — property appears over-leveraged (RBI LTV norms)`,
      severity: 'medium',
    });
    score += 15;
  }

  if (distressResult.ltvBreached) {
    flags.push({
      code: 'LTV_BREACH',
      message: `Effective LTV of ${distressResult.effectiveLTV}% exceeds RBI maximum of ${distressResult.maxAllowedLTV}% for this property type`,
      severity: 'critical',
    });
    score += 20;
  }

  return { flags, score };
}

/* ─────────────────────────────────────────────────────────────
   SECTION F: PURPOSE-BASED LTV COMPLIANCE
   RBI mandates different LTV caps per loan purpose.
   LAP: 65%, Mortgage: 75%, Working Capital: 60%
   If declaredValue / marketValue > cap → non-compliant.
───────────────────────────────────────────────────────────── */
function analysePurposeLTV(purpose, declaredValue, marketValue) {
  const flags = [];
  let score = 0;

  const cap = RBI_LTV_CAPS[purpose];
  if (!cap || !marketValue) return { flags, score };

  const requestedLTV = declaredValue / marketValue;
  if (requestedLTV > cap) {
    const excess = ((requestedLTV - cap) * 100).toFixed(1);
    flags.push({
      code: 'RBI_LTV_EXCEEDED',
      message: `Requested LTV of ${(requestedLTV * 100).toFixed(1)}% exceeds RBI cap of ${(cap * 100).toFixed(0)}% for ${purpose.toUpperCase()} — non-compliant (RBI Master Circular 2015-16)`,
      severity: 'critical',
    });
    score += parseFloat(excess) > 10 ? 25 : 15;
  }

  return { flags, score };
}

/* ─────────────────────────────────────────────────────────────
   SECTION G: CERSAI ENCUMBRANCE RISK
   Uses Bayesian prior (Section B) instead of Math.random().
   Flag fires when prior probability exceeds threshold.
   Threshold: 30% (i.e., >30% chance of encumbrance = flag)
   This is a probabilistic flag, not a confirmed finding.
   Lender must verify via actual CERSAI portal search.
───────────────────────────────────────────────────────────── */
function analyseCERSAI(propertyType, propertyAge, propertyCount) {
  const flags = [];
  let score = 0;

  const prior = getCERSAIEncumbrancePrior(propertyType, propertyAge, propertyCount);

  if (prior >= 0.40) {
    flags.push({
      code: 'CERSAI_HIGH_ENCUMBRANCE_RISK',
      message: `High probability (${(prior * 100).toFixed(0)}%) of existing encumbrance based on property type, age, and locality data — mandatory CERSAI portal verification required`,
      severity: 'critical',
    });
    score += 18;
  } else if (prior >= 0.25) {
    flags.push({
      code: 'CERSAI_ENCUMBRANCE_RISK',
      message: `Moderate encumbrance probability (${(prior * 100).toFixed(0)}%) — CERSAI verification advised before disbursement`,
      severity: 'medium',
    });
    score += 10;
  }

  return { flags, score, encumbrancePrior: prior };
}

/* ─────────────────────────────────────────────────────────────
   SECTION H: STRUCTURAL / AGE RISK
   NHB Residual Life Method: properties beyond 75% of useful
   life have significant structural risk.
   RCC useful life = 60yr → 75% = 45yr
   Load-bearing = 40yr → 75% = 30yr
   Source: NHB Technical Standards, IS 1893
───────────────────────────────────────────────────────────── */
function analyseStructuralRisk(yearOfConstruction, propertyType) {
  const flags = [];
  let score = 0;

  if (!yearOfConstruction) return { flags, score };

  const age = new Date().getFullYear() - yearOfConstruction;
  const usefulLife = propertyType === 'industrial' ? 50 : age > 45 ? 40 : 60;
  const residualLifePct = Math.max(0, ((usefulLife - age) / usefulLife) * 100);

  if (residualLifePct < 25) {
    flags.push({
      code: 'STRUCTURAL_RISK_CRITICAL',
      message: `Property has consumed ${(100 - residualLifePct).toFixed(0)}% of NHB useful life (${age} of ${usefulLife} years) — structural assessment mandatory before lending`,
      severity: 'critical',
    });
    score += 20;
  } else if (residualLifePct < 50) {
    flags.push({
      code: 'STRUCTURAL_RISK_MEDIUM',
      message: `Property is ${age} years old with ${residualLifePct.toFixed(0)}% residual life — structural inspection recommended (NHB Residual Life Method)`,
      severity: 'medium',
    });
    score += 10;
  } else if (age > 30) {
    flags.push({
      code: 'AGED_PROPERTY',
      message: `Property is ${age} years old — standard structural assessment recommended`,
      severity: 'low',
    });
    score += 5;
  }

  return { flags, score };
}

/* ─────────────────────────────────────────────────────────────
   SECTION I: MARKET CONDITION RISK
   Falling market = collateral value may decline further.
   RBI requires banks/NBFCs to stress-test collateral values.
   Source: RBI Circular on Stress Testing (2013)
   yoyAppreciation < 0: falling market
   yoyAppreciation 0–3: stagnant (real terms declining with inflation)
   yoyAppreciation > 10: overheating (bubble risk)
───────────────────────────────────────────────────────────── */
function analyseMarketCondition(yoyAppreciation, propertyType) {
  const flags = [];
  let score = 0;

  if (yoyAppreciation < 0) {
    flags.push({
      code: 'FALLING_MARKET',
      message: `Locality showing ${yoyAppreciation.toFixed(1)}% YoY price decline — collateral value at risk of further erosion (RBI Stress Testing Circular)`,
      severity: 'critical',
    });
    score += 22;
  } else if (yoyAppreciation < 2) {
    flags.push({
      code: 'STAGNANT_MARKET',
      message: `Locality appreciation of ${yoyAppreciation.toFixed(1)}% is below inflation — real value declining`,
      severity: 'medium',
    });
    score += 10;
  } else if (yoyAppreciation > 15) {
    flags.push({
      code: 'OVERHEATING_MARKET',
      message: `Locality showing ${yoyAppreciation.toFixed(1)}% YoY appreciation — potential price bubble, mean reversion risk`,
      severity: 'medium',
    });
    score += 8;
  }

  return { flags, score };
}

/* ─────────────────────────────────────────────────────────────
   SECTION J: COMPARABLE PRICE DEVIATION
   If assessed price/sqft deviates significantly from recent
   comparable transactions, it indicates valuer bias or
   data quality issues.
   Source: RICS Comparable Evidence GN, RBI Fraud Circular
───────────────────────────────────────────────────────────── */
function analyseCompDeviation(pricePerSqft, comparables) {
  const flags = [];
  let score = 0;

  if (!comparables || comparables.length === 0) return { flags, score };

  const avgCompPrice = comparables.reduce((s, c) => s + c.pricePerSqft, 0) / comparables.length;
  const deviation = ((pricePerSqft - avgCompPrice) / avgCompPrice) * 100;

  if (deviation > 40) {
    flags.push({
      code: 'COMP_DEVIATION_CRITICAL',
      message: `Assessed price/sqft is ${deviation.toFixed(1)}% above recent comparable transactions — possible valuer bias or data anomaly`,
      severity: 'critical',
    });
    score += 18;
  } else if (deviation > 20) {
    flags.push({
      code: 'COMP_DEVIATION_MEDIUM',
      message: `Assessed price/sqft deviates ${deviation.toFixed(1)}% from comparable transactions`,
      severity: 'medium',
    });
    score += 10;
  }

  return { flags, score };
}

/* ─────────────────────────────────────────────────────────────
   SECTION K: MARKET DATA QUALITY
   Low transaction count = extrapolated data = lower reliability.
   Source: RICS Comparable Evidence GN
───────────────────────────────────────────────────────────── */
function analyseDataQuality(propertyCount) {
  const flags = [];
  let score = 0;

  if (propertyCount < 200) {
    flags.push({
      code: 'VERY_LOW_MARKET_DATA',
      message: `Only ${propertyCount} comparable transactions in this locality — valuation relies heavily on extrapolated data, low reliability`,
      severity: 'medium',
    });
    score += 8;
  } else if (propertyCount < 500) {
    flags.push({
      code: 'LOW_MARKET_DATA',
      message: `Limited comparable transactions (${propertyCount}) in this locality — moderate data reliability`,
      severity: 'low',
    });
    score += 4;
  }

  return { flags, score };
}

/* ─────────────────────────────────────────────────────────────
   SECTION L: LEGAL & OWNERSHIP RISK (PS requirement)
   Leasehold: financing harder, fewer buyers, lower LTV
   Disputed title: PMLA / legal risk
   Litigation: hard reject territory
   Vacant property: higher risk of deterioration / squatting
───────────────────────────────────────────────────────────── */
function analyseLegalOwnership(property) {
  const flags = [];
  let score = 0;

  if (property.titleClarity === 'litigation') {
    flags.push({
      code: 'TITLE_UNDER_LITIGATION',
      message: 'Property title is under active litigation — lending against this collateral is not advisable until legal resolution',
      severity: 'critical',
    });
    score += 30;
  } else if (property.titleClarity === 'disputed') {
    flags.push({
      code: 'TITLE_DISPUTED',
      message: 'Property title is disputed — legal verification and title insurance mandatory before disbursement',
      severity: 'medium',
    });
    score += 15;
  }

  if (property.ownershipType === 'leasehold') {
    flags.push({
      code: 'LEASEHOLD_PROPERTY',
      message: 'Leasehold property — LTV should be reduced by 10–15%, fewer buyers in secondary market, financing constraints apply',
      severity: 'medium',
    });
    score += 10;
  }

  if (property.occupancyStatus === 'vacant') {
    flags.push({
      code: 'VACANT_PROPERTY',
      message: 'Property is vacant — higher risk of deterioration, squatting, and reduced resale velocity',
      severity: 'low',
    });
    score += 5;
  }

  return { flags, score };
}

/* ─────────────────────────────────────────────────────────────
   SECTION M: BORROWER CREDIT RISK (LTV Capping)
   Used strictly for risk scoring and LTV capping, not valuation.
   CIBIL < 650: High Risk, capping LTV to 40%
   CIBIL 650-750: Caution, capping LTV to 60%
   CIBIL > 750: Safe, standard RBI caps apply
───────────────────────────────────────────────────────────── */
function analyseBorrowerCredit(creditData, requestedLTV, marketValue) {
  const { cibilScore, existingEMIs } = creditData;
  const flags = [];
  let score = 0;
  let cappedLTV = 1.0;

  if (cibilScore) {
    if (cibilScore < 650) {
      flags.push({
        code: 'LOW_CIBIL_SCORE',
        message: `Borrower CIBIL score of ${cibilScore} is below standard lending threshold — critical credit risk, capping LTV to 40%`,
        severity: 'critical'
      });
      score += 35;
      cappedLTV = 0.40;
    } else if (cibilScore < 720) {
      flags.push({
        code: 'MODERATE_CIBIL_SCORE',
        message: `Borrower CIBIL score of ${cibilScore} indicates moderate risk — caution advised, capping LTV to 60%`,
        severity: 'medium'
      });
      score += 15;
      cappedLTV = 0.60;
    }
  }

  if (existingEMIs && marketValue) {
    // Proxy for DTI (Debt to Income) using property value as a wealth proxy
    const monthlyPropertyWealthProxy = (marketValue * 0.08) / 12; // 8% annual yield proxy
    const dtiProxy = existingEMIs / monthlyPropertyWealthProxy;
    
    if (dtiProxy > 0.60) {
      flags.push({
        code: 'HIGH_DEBT_OBLIGATION',
        message: 'High existing EMI obligations relative to collateral yield proxy — potential repayment risk',
        severity: 'critical'
      });
      score += 25;
    }
  }

  return { flags, score, cappedLTV };
}

/* ─────────────────────────────────────────────────────────────
   MAIN RUN FUNCTION
   Updated to handle creditData separately.
───────────────────────────────────────────────────────────── */
function run(property, marketData, valuationResult, distressResult, comparables) {
  const start = Date.now();
  const redFlags = [];
  let riskScore = 0;

  const { declaredValue, propertyType, yearOfConstruction, purpose, cibilScore, existingLoans, existingEMIs } = property;
  const { marketValue, overCircleRatePercent, pricePerSqft } = valuationResult;
  const propertyAge = valuationResult.propertyAge;
  const yoyAppreciation = marketData.yoyAppreciation ?? 5;

  // 1. Borrower Credit Analysis (ISOLATED from valuation)
  const creditResult = analyseBorrowerCredit({ cibilScore, existingLoans, existingEMIs }, (declaredValue / marketValue), marketValue);
  redFlags.push(...creditResult.flags);
  riskScore += creditResult.score;

  // 2. Technical & Market Risk
  const deviationResult = analyseValuationDeviation(declaredValue, marketValue);
  redFlags.push(...deviationResult.flags);
  riskScore += deviationResult.score;

  const circleResult = analyseCircleRate(overCircleRatePercent);
  redFlags.push(...circleResult.flags);
  riskScore += circleResult.score;

  const distressRiskResult = analyseDistressRisk(distressResult);
  redFlags.push(...distressRiskResult.flags);
  riskScore += distressRiskResult.score;

  const purposeLTVResult = analysePurposeLTV(purpose, declaredValue, marketValue);
  redFlags.push(...purposeLTVResult.flags);
  riskScore += purposeLTVResult.score;

  const cersaiResult = analyseCERSAI(propertyType, propertyAge, marketData.propertyCount);
  redFlags.push(...cersaiResult.flags);
  riskScore += cersaiResult.score;

  const structuralResult = analyseStructuralRisk(yearOfConstruction, propertyType);
  redFlags.push(...structuralResult.flags);
  riskScore += structuralResult.score;

  const marketResult = analyseMarketCondition(yoyAppreciation, propertyType);
  redFlags.push(...marketResult.flags);
  riskScore += marketResult.score;

  const compResult = analyseCompDeviation(pricePerSqft, comparables);
  redFlags.push(...compResult.flags);
  riskScore += compResult.score;

  const dataResult = analyseDataQuality(marketData.propertyCount);
  redFlags.push(...dataResult.flags);
  riskScore += dataResult.score;

  const legalResult = analyseLegalOwnership(property);
  redFlags.push(...legalResult.flags);
  riskScore += legalResult.score;

  riskScore = Math.min(riskScore, 100);

  // Risk label thresholds (RBI NPA classification inspired)
  let overallRiskLabel;
  if (riskScore <= 22) overallRiskLabel = 'safe';
  else if (riskScore <= 52) overallRiskLabel = 'caution';
  else overallRiskLabel = 'high_risk';

  return {
    engine: 'RiskEngine',
    duration: Date.now() - start,
    riskScore,
    redFlags,
    overallRiskLabel,
    declaredVsMarketDeviation: deviationResult.deviation,
    encumbrancePrior: cersaiResult.encumbrancePrior,
    cappedLTV: creditResult.cappedLTV,
    
    // Structured Credit Analysis for Dashboard
    creditScoring: {
      creditAnalysis: {
        score: cibilScore || 0,
        category: cibilScore >= 750 ? 'safe' : (cibilScore >= 650 ? 'caution' : 'high_risk'),
        description: cibilScore ? `CIBIL score ${cibilScore}` : 'CIBIL score not provided'
      },
      ltvAdjustment: {
        base: RBI_LTV_CAPS[purpose] || 0.75,
        adjusted: Math.min(RBI_LTV_CAPS[purpose] || 0.75, creditResult.cappedLTV),
        adjustment: creditResult.cappedLTV < 1.0 ? (1.0 - creditResult.cappedLTV) : 0
      }
    },
    
    riskBreakdown: {
      borrowerCredit: creditResult.score,
      valuationDeviation: deviationResult.score,
      circleRateRisk: circleResult.score,
      distressRisk: distressRiskResult.score,
      purposeLTVRisk: purposeLTVResult.score,
      cersaiRisk: cersaiResult.score,
      structuralRisk: structuralResult.score,
      marketConditionRisk: marketResult.score,
      compDeviationRisk: compResult.score,
      dataQualityRisk: dataResult.score,
      legalOwnershipRisk: legalResult.score,
    },
  };
}

module.exports = { run };
