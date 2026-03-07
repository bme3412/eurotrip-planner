/**
 * Pricing Factor for V3 Scoring
 *
 * Calculates value score based on:
 * - City cost level relative to budget
 * - Seasonal pricing variations
 * - Price-to-quality ratio
 */

import { BaseFactor } from '../core/BaseFactor.js';
import { normalizePriceRange } from '../utils/normalizers.js';
import { parseDate } from '../utils/parsers.js';

export class PricingFactor extends BaseFactor {
  /**
   * Check if we have pricing data.
   */
  hasRequiredData(input) {
    const { enrichmentData, cityData } = input;
    return !!(
      enrichmentData?.pricing ||
      cityData?.priceRange ||
      cityData?.price_range ||
      cityData?.costLevel
    );
  }

  /**
   * Calculate pricing/value score.
   * Higher score = better value for the traveler's budget.
   */
  calculate(input) {
    const { enrichmentData, cityData, startDate, travelerProfile } = input;

    // Get price level
    const priceLevel = this.getPriceLevel(enrichmentData, cityData);
    const budgetType = this.getProfileValue(travelerProfile, 'budget', 'medium');

    if (!priceLevel) {
      return this.getFallbackResult('No pricing data available');
    }

    // Calculate match between city price and traveler budget
    const matchScore = this.calculateBudgetMatch(priceLevel, budgetType);

    // Check for seasonal pricing variations
    const seasonalAdjustment = this.getSeasonalAdjustment(cityData, startDate);

    // Final score
    const rawScore = Math.round(matchScore + seasonalAdjustment);

    return this.buildResult(
      rawScore,
      0.75,
      this.getValueReason(priceLevel, budgetType, rawScore),
      enrichmentData?.pricing ? 'api' : 'static',
      {
        priceLevel,
        budgetType,
        seasonalAdjustment,
        matchScore,
      }
    );
  }

  /**
   * Get normalized price level from data sources.
   */
  getPriceLevel(enrichmentData, cityData) {
    // Try enrichment data first
    if (enrichmentData?.pricing) {
      const pricing = enrichmentData.pricing;
      if (pricing.level) return normalizePriceRange(pricing.level);
      if (pricing.priceLevel) return normalizePriceRange(pricing.priceLevel);
      if (pricing.dailyCost) return this.levelFromDailyCost(pricing.dailyCost);
    }

    // Try city data
    if (cityData?.priceRange || cityData?.price_range) {
      return normalizePriceRange(cityData.priceRange || cityData.price_range);
    }

    if (cityData?.costLevel) {
      return normalizePriceRange(cityData.costLevel);
    }

    // Try to infer from budget-friendly trait
    if (this.hasCityTrait(cityData?.cityId, 'budgetFriendly')) {
      return 'budget';
    }
    if (this.hasCityTrait(cityData?.cityId, 'luxuryDestination')) {
      return 'luxury';
    }

    return null;
  }

  /**
   * Convert daily cost to price level.
   */
  levelFromDailyCost(dailyCost) {
    if (dailyCost < 60) return 'budget';
    if (dailyCost < 100) return 'moderate';
    if (dailyCost < 150) return 'expensive';
    return 'luxury';
  }

  /**
   * Calculate how well the city price matches traveler budget.
   */
  calculateBudgetMatch(priceLevel, budgetType) {
    // Price levels: budget, moderate, expensive, luxury
    // Budget types: low (budget), medium, high (luxury)

    const priceLevels = { budget: 0, moderate: 1, expensive: 2, luxury: 3 };
    const budgetTypes = { low: 0, budget: 0, medium: 1, high: 2, luxury: 2 };

    const priceIndex = priceLevels[priceLevel] ?? 1;
    const budgetIndex = budgetTypes[budgetType] ?? 1;

    // Perfect match = 85
    // Each level difference = -15 penalty
    const diff = Math.abs(priceIndex - budgetIndex);

    // Special case: budget traveler in expensive/luxury city
    if (budgetIndex === 0 && priceIndex >= 2) {
      return 30 - (priceIndex - 2) * 10; // Heavy penalty
    }

    // Special case: luxury traveler in budget city (might not have desired amenities)
    if (budgetIndex === 2 && priceIndex === 0) {
      return 60; // Moderate - cheap but might lack quality
    }

    return Math.max(20, 85 - diff * 15);
  }

  /**
   * Get seasonal pricing adjustment.
   */
  getSeasonalAdjustment(cityData, startDate) {
    if (!startDate) return 0;

    const start = parseDate(startDate);
    if (!start) return 0;

    const month = start.getMonth();
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const monthName = monthNames[month];

    // Check for seasonal pricing in visit calendar
    const monthData = cityData?.visitCalendar?.months?.find(
      m => m.name?.toLowerCase() === monthName || m.month?.toLowerCase() === monthName
    );

    if (monthData?.pricing) {
      const pricingNote = String(monthData.pricing).toLowerCase();
      if (pricingNote.includes('peak') || pricingNote.includes('expensive') || pricingNote.includes('high')) {
        return -10;
      }
      if (pricingNote.includes('low') || pricingNote.includes('cheap') || pricingNote.includes('deal')) {
        return 10;
      }
    }

    // Infer from season
    // Peak travel months typically have higher prices
    const peakMonths = [5, 6, 7, 11]; // June, July, August, December
    const lowMonths = [0, 1, 10]; // January, February, November

    if (peakMonths.includes(month)) {
      return -5;
    }
    if (lowMonths.includes(month)) {
      return 8;
    }

    return 0;
  }

  /**
   * Generate human-readable value reason.
   */
  getValueReason(priceLevel, budgetType, score) {
    const priceLabels = {
      budget: 'Budget-friendly',
      moderate: 'Moderately priced',
      expensive: 'Above average pricing',
      luxury: 'Premium pricing',
    };

    const priceLabel = priceLabels[priceLevel] || 'Unknown pricing';

    if (score >= 80) {
      return `Great value: ${priceLabel}`;
    }
    if (score >= 60) {
      return priceLabel;
    }
    if (score >= 40) {
      return `${priceLabel} - may stretch budget`;
    }
    return `${priceLabel} - above target budget`;
  }
}
