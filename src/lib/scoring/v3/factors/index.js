/**
 * V3 Scoring Factors
 *
 * All factor classes for the unified scoring system.
 */

import { BaselineFactor } from './BaselineFactor.js';
import { WeatherFactor } from './WeatherFactor.js';
import { EventsFactor } from './EventsFactor.js';
import { CrowdsFactor } from './CrowdsFactor.js';
import { PricingFactor } from './PricingFactor.js';
import { PersonalizationFactor } from './PersonalizationFactor.js';
import { EaseFactor } from './EaseFactor.js';

// Re-export individual factors
export {
  BaselineFactor,
  WeatherFactor,
  EventsFactor,
  CrowdsFactor,
  PricingFactor,
  PersonalizationFactor,
  EaseFactor,
};

/**
 * Get all factor classes as a map.
 * Use this when setting up the ScoreEngine.
 *
 * @returns {Object} Map of factor name to factor class
 */
export function getFactorClasses() {
  return {
    baseline: BaselineFactor,
    weather: WeatherFactor,
    events: EventsFactor,
    crowds: CrowdsFactor,
    pricing: PricingFactor,
    personalization: PersonalizationFactor,
    ease: EaseFactor,
  };
}

/**
 * Register all default factors with a ScoreEngine instance.
 *
 * @param {ScoreEngine} engine - The engine to register factors with
 */
export function registerAllFactors(engine) {
  engine.registerFactor('baseline', BaselineFactor);
  engine.registerFactor('weather', WeatherFactor);
  engine.registerFactor('events', EventsFactor);
  engine.registerFactor('crowds', CrowdsFactor);
  engine.registerFactor('pricing', PricingFactor);
  engine.registerFactor('personalization', PersonalizationFactor);
  engine.registerFactor('ease', EaseFactor);
}
