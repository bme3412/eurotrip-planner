/**
 * V4 Scoring System
 *
 * Simplified 6-factor scoring system for date-specific city ranking.
 *
 * Factors (0-10 scale):
 * - culture: Museums, history, art, architecture richness
 * - beach: Beach/coastal appeal for the dates
 * - timing: Weather + events + seasonality for specific dates
 * - crowds: Tourist crowd levels (higher = fewer crowds)
 * - value: Value for money (higher = better value)
 * - logistics: Ease of getting there and around
 *
 * Output:
 * - Final score: 0-100
 * - Tiered results: Tier 1 (80+), Tier 2 (70-79), Tier 3 (60-69)
 * - Formatted: "Barcelona ES — 88 (culture 9, beach 8, timing 9, crowds 6, value 6, logistics 9)"
 */

export { ScoreEngine, createV4Engine } from './core/ScoreEngine.js';
export { BaseFactor } from './core/BaseFactor.js';
export {
  CultureFactor,
  BeachFactor,
  TimingFactor,
  CrowdsFactor,
  ValueFactor,
  LogisticsFactor,
  getFactorClasses,
  registerAllFactors,
} from './factors/index.js';

export * from './utils/index.js';

import config from './config/scoringConfig.json' with { type: 'json' };
export { config as scoringConfig };
