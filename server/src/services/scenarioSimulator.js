/**
 * ============================================================
 * SCENARIO SIMULATOR
 * ============================================================
 * Applies market scenario adjustments to the base valuation
 * for stress-testing purposes.
 *
 * REGULATORY BASIS:
 *  - RBI Circular on Stress Testing of Collateral (2013):
 *    Banks/NBFCs must stress-test collateral values under
 *    adverse market conditions before sanctioning large loans.
 *  - Basel III Pillar 2 (adopted by RBI): Scenario analysis
 *    for credit risk assessment.
 *  - RBI Financial Stability Report (bi-annual): Uses similar
 *    scenario bands for real estate stress testing.
 *
 * SCENARIOS:
 *  normal  → no adjustment (base case)
 *  growth  → +10% (bull market, strong demand)
 *  crash   → -15% (market correction / stress scenario)
 *
 * NOTE: Scenario output is additive to the response.
 * It does NOT replace the base valuation. The base valuation
 * is always preserved in the response.
 * ============================================================
 */

'use strict';

const SCENARIO_ADJUSTMENTS = {
  normal: 0,
  growth: 0.10,   // +10%: RBI growth scenario
  crash: -0.15,   // -15%: RBI stress scenario (conservative)
};

// Extended scenarios for future use
const SCENARIO_LABELS = {
  normal: 'Base Case — No market adjustment',
  growth: 'Growth Scenario — Bull market (+10%): Strong demand, low inventory, positive macro',
  crash: 'Stress Scenario — Market correction (-15%): Demand slowdown, oversupply, macro headwinds',
};

function run(baseMarketValue, baseDistressValue, scenario = 'normal') {
  const normalizedScenario = (scenario || 'normal').toLowerCase();
  const adjustment = SCENARIO_ADJUSTMENTS[normalizedScenario] ?? 0;
  const adjustmentPct = adjustment * 100;

  const adjustedMarketValue = Math.round(baseMarketValue * (1 + adjustment));
  const adjustedDistressValue = Math.round(baseDistressValue * (1 + adjustment));

  return {
    scenario: normalizedScenario,
    adjustmentPct,
    adjustmentFactor: 1 + adjustment,
    originalMarketValue: baseMarketValue,
    adjustedMarketValue,
    originalDistressValue: baseDistressValue,
    adjustedDistressValue,
    label: SCENARIO_LABELS[normalizedScenario] || SCENARIO_LABELS.normal,
    regulatoryBasis: 'RBI Stress Testing Circular 2013, Basel III Pillar 2',
    isStressTest: normalizedScenario !== 'normal',
  };
}

module.exports = { run };
