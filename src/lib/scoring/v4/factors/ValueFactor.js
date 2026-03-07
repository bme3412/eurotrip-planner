/**
 * Value Factor for V4 Scoring
 *
 * Calculates value for money based on price levels.
 * Higher score = better value (lower cost cities score higher).
 */

import { BaseFactor } from '../core/BaseFactor.js';
import { normalizePriceLevel, getMonthName } from '../utils/index.js';

export class ValueFactor extends BaseFactor {
  hasRequiredData(input) {
    const { cityData } = input;
    return !!(
      cityData?.priceRange ||
      cityData?.price_range ||
      cityData?.costLevel
    );
  }

  calculate(input) {
    const { cityData, startDate } = input;

    // Get price level
    const priceLevel = this.getPriceLevel(cityData);

    if (!priceLevel) {
      return this.getFallbackResult('No pricing data available');
    }

    // Base score from price level
    let score = this.getScoreFromLevel(priceLevel);

    // Seasonal adjustment
    const seasonalAdjustment = this.getSeasonalAdjustment(cityData, startDate);
    score = Math.max(1, Math.min(10, score + seasonalAdjustment));

    const confidence = 0.75;
    const reason = this.getValueReason(priceLevel, score);

    return this.buildResult(score, confidence, reason, {
      priceLevel,
      seasonalAdjustment,
    });
  }

  getPriceLevel(cityData) {
    const raw = cityData.priceRange || cityData.price_range || cityData.costLevel;
    return normalizePriceLevel(raw);
  }

  getScoreFromLevel(level) {
    const levels = this.factorConfig.priceLevels || {
      'budget': 9,
      'moderate': 7,
      'expensive': 4,
      'luxury': 2
    };

    return levels[level] ?? 5;
  }

  getSeasonalAdjustment(cityData, startDate) {
    if (!startDate) return 0;

    const monthName = getMonthName(startDate);
    const monthData = this.getMonthData(cityData, monthName);

    // Check for pricing notes in month data
    if (monthData?.pricing) {
      const pricingNote = String(monthData.pricing).toLowerCase();
      if (pricingNote.includes('peak') || pricingNote.includes('expensive')) return -1;
      if (pricingNote.includes('low') || pricingNote.includes('cheap') || pricingNote.includes('deal')) return 1;
    }

    // Default seasonal patterns
    const peakMonths = ['june', 'july', 'august', 'december'];
    const lowMonths = ['january', 'february', 'november'];

    if (peakMonths.includes(monthName)) return -0.5;
    if (lowMonths.includes(monthName)) return 0.5;

    return 0;
  }

  getValueReason(priceLevel, score) {
    const labels = {
      'budget': 'budget-friendly',
      'moderate': 'moderately priced',
      'expensive': 'pricey destination',
      'luxury': 'premium pricing'
    };

    const label = labels[priceLevel] || 'average pricing';

    if (score >= 8) return `great value - ${label}`;
    if (score >= 6) return label;
    if (score >= 4) return `${label} - may stretch budget`;
    return `${label} - expensive`;
  }
}
