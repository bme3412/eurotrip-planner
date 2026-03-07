/**
 * Culture Factor for V4 Scoring
 *
 * Calculates cultural richness based on:
 * - Tourism categories (museums, history, art, architecture)
 * - Attraction count and quality
 * - UNESCO sites and landmarks
 */

import { BaseFactor } from '../core/BaseFactor.js';

const CULTURE_CATEGORIES = [
  'museums', 'historical', 'art', 'architecture', 'cultural',
  'heritage', 'unesco', 'history', 'landmarks'
];

const CULTURE_ATTRACTION_TYPES = [
  'museum', 'palace', 'castle', 'cathedral', 'church', 'temple',
  'monument', 'historic', 'archaeological', 'gallery', 'opera',
  'theater', 'unesco', 'heritage', 'basilica', 'fortress'
];

export class CultureFactor extends BaseFactor {
  hasRequiredData(input) {
    const { cityData } = input;
    return !!(
      cityData?.tourismCategories ||
      cityData?.attractions ||
      cityData?.highlights
    );
  }

  calculate(input) {
    const { cityData } = input;

    if (!cityData) {
      return this.getFallbackResult('No city data available');
    }

    // Calculate component scores
    const categoryScore = this.calculateCategoryScore(cityData);
    const attractionScore = this.calculateAttractionScore(cityData);
    const highlightScore = this.calculateHighlightScore(cityData);

    // Weighted combination (0-10 scale)
    const rawScore =
      categoryScore * 0.35 +
      attractionScore * 0.45 +
      highlightScore * 0.20;

    // Confidence based on data availability
    const confidence = this.calculateConfidence(cityData);

    // Build reason
    const reasons = [];
    if (categoryScore >= 7) reasons.push('strong cultural identity');
    if (attractionScore >= 7) reasons.push('rich in landmarks');
    if (this.hasUNESCO(cityData)) reasons.push('UNESCO sites');

    const reason = reasons.length > 0
      ? reasons.join(', ')
      : rawScore >= 5 ? 'moderate cultural offerings' : 'limited cultural attractions';

    return this.buildResult(rawScore, confidence, reason, {
      categoryScore: Math.round(categoryScore * 10) / 10,
      attractionScore: Math.round(attractionScore * 10) / 10,
      highlightScore: Math.round(highlightScore * 10) / 10,
    });
  }

  calculateCategoryScore(cityData) {
    const categories = cityData.tourismCategories || [];
    if (categories.length === 0) return 4; // Neutral

    let score = 4;
    for (const category of categories) {
      const lower = category.toLowerCase();
      for (const cultureCat of CULTURE_CATEGORIES) {
        if (lower.includes(cultureCat)) {
          score += 1.5;
          break;
        }
      }
    }

    return Math.min(10, score);
  }

  calculateAttractionScore(cityData) {
    // Handle both array format and object format with .sites
    let attractions = cityData.attractions || [];
    if (!Array.isArray(attractions)) {
      attractions = attractions.sites || [];
    }
    if (attractions.length === 0) return 3;

    let score = 3;
    let culturalCount = 0;

    for (const attraction of attractions) {
      const name = (attraction.name || '').toLowerCase();
      const category = (attraction.category || attraction.type || '').toLowerCase();
      const description = (attraction.description || '').toLowerCase();
      const combined = `${name} ${category} ${description}`;

      for (const type of CULTURE_ATTRACTION_TYPES) {
        if (combined.includes(type)) {
          culturalCount++;
          break;
        }
      }

      // Bonus for high-rated attractions
      if (attraction.rating && attraction.rating >= 4.5) {
        score += 0.3;
      }

      // Bonus for must-see attractions
      if (attraction.mustSee) {
        score += 0.4;
      }
    }

    // Cultural density bonus
    score += Math.min(3, culturalCount * 0.5);

    return Math.min(10, score);
  }

  calculateHighlightScore(cityData) {
    const highlights = cityData.highlights || [];
    if (highlights.length === 0) return 5;

    let score = 5;
    for (const highlight of highlights) {
      const lower = (typeof highlight === 'string' ? highlight : highlight.name || '').toLowerCase();
      for (const type of CULTURE_ATTRACTION_TYPES) {
        if (lower.includes(type)) {
          score += 0.8;
          break;
        }
      }
    }

    return Math.min(10, score);
  }

  hasUNESCO(cityData) {
    const categories = cityData.tourismCategories || [];
    // Handle both array format and object format with .sites
    let attractions = cityData.attractions || [];
    if (!Array.isArray(attractions)) {
      attractions = attractions.sites || [];
    }

    return categories.some(c => c.toLowerCase().includes('unesco')) ||
      attractions.some(a =>
        (a.category || a.type || '').toLowerCase().includes('unesco') ||
        (a.name || '').toLowerCase().includes('unesco')
      );
  }

  calculateConfidence(cityData) {
    let confidence = 0.5;

    if (cityData.tourismCategories?.length >= 3) confidence += 0.15;

    // Handle both array format and object format with .sites
    let attractions = cityData.attractions || [];
    if (!Array.isArray(attractions)) {
      attractions = attractions.sites || [];
    }
    if (attractions.length >= 5) confidence += 0.2;

    if (cityData.highlights?.length >= 3) confidence += 0.1;
    if (cityData.description) confidence += 0.05;

    return Math.min(1, confidence);
  }
}
