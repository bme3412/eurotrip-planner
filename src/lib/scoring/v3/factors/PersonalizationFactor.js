/**
 * Personalization Factor for V3 Scoring
 *
 * Calculates traveler type alignment based on:
 * - City traits matching traveler preferences
 * - Tourism categories alignment
 * - Special interest matching
 */

import { BaseFactor } from '../core/BaseFactor.js';

export class PersonalizationFactor extends BaseFactor {
  /**
   * Check if we have personalization data.
   */
  hasRequiredData(input) {
    // Need both traveler profile and some city trait data
    return !!(
      input.travelerProfile?.type &&
      input.travelerProfile.type !== 'everyone' &&
      (input.cityData || input.cityId)
    );
  }

  /**
   * Calculate personalization score.
   */
  calculate(input) {
    const { cityId, cityData, travelerProfile } = input;

    const travelerType = travelerProfile?.type || 'everyone';

    // Everyone type = neutral personalization
    if (travelerType === 'everyone') {
      return this.buildResult(
        70,
        0.5,
        'General appeal',
        'static',
        { travelerType: 'everyone' }
      );
    }

    // Calculate trait alignment score
    const traitScore = this.calculateTraitAlignment(cityId, travelerType);

    // Calculate category alignment score
    const categoryScore = this.calculateCategoryAlignment(cityData, travelerType);

    // Calculate interest alignment
    const interestScore = this.calculateInterestAlignment(cityData, travelerProfile);

    // Weighted combination
    const rawScore = Math.round(
      traitScore * 0.40 +
      categoryScore * 0.35 +
      interestScore * 0.25
    );

    // Confidence based on data availability
    const confidence = this.calculateConfidence(cityData, travelerProfile);

    return this.buildResult(
      rawScore,
      confidence,
      this.getPersonalizationReason(rawScore, travelerType, cityId),
      'static',
      {
        travelerType,
        traitScore,
        categoryScore,
        interestScore,
        matchedTraits: this.getMatchedTraits(cityId, travelerType),
      }
    );
  }

  /**
   * Calculate score from city traits matching traveler type.
   */
  calculateTraitAlignment(cityId, travelerType) {
    // Get traits that should boost this traveler type
    const typeTraitMapping = this.cityTraits?.travelerTypeMapping?.[travelerType] || [];

    if (typeTraitMapping.length === 0) {
      return 60; // Neutral if no mapping
    }

    // Count how many relevant traits this city has
    let matchCount = 0;
    let totalTraits = typeTraitMapping.length;

    for (const traitName of typeTraitMapping) {
      if (this.hasCityTrait(cityId, traitName)) {
        matchCount++;
      }
    }

    // Score based on match percentage
    const matchRatio = matchCount / totalTraits;

    // 0 matches = 40, 100% matches = 95
    return Math.round(40 + matchRatio * 55);
  }

  /**
   * Calculate score from tourism categories alignment.
   */
  calculateCategoryAlignment(cityData, travelerType) {
    const categories = cityData?.tourismCategories || [];
    if (categories.length === 0) return 50;

    // Define preferred categories per traveler type
    const categoryPrefs = {
      couples: ['Romance', 'Cultural', 'Fine Dining', 'Luxury Coastlines'],
      families: ['Family', 'Theme Parks', 'Nature', 'Educational'],
      solo: ['Urban Exploration', 'Nightlife', 'Adventure', 'Cultural Tourism Hubs'],
      budget: ['Budget-Friendly', 'Off The Beaten Path', 'Backpacking'],
      luxury: ['Luxury Coastlines', 'Shopping', 'Fine Dining', 'Wellness & Spa'],
      culture: ['Cultural', 'Historical Landmarks', 'Museums', 'Architecture'],
      foodie: ['Gastronomic Destinations', 'Food & Wine', 'Local Markets'],
      adventure: ['Adventure', 'Adventure Travel', 'Natural Landscapes', 'Hiking'],
    };

    const prefs = categoryPrefs[travelerType] || [];
    if (prefs.length === 0) return 60;

    // Count category matches
    const cityCategories = categories.map(c => c.toLowerCase());
    let matchCount = 0;

    for (const pref of prefs) {
      if (cityCategories.some(c => c.includes(pref.toLowerCase()))) {
        matchCount++;
      }
    }

    // Score based on matches
    if (matchCount === 0) return 40;
    if (matchCount === 1) return 60;
    if (matchCount === 2) return 75;
    return 90;
  }

  /**
   * Calculate score from specific interest alignment.
   */
  calculateInterestAlignment(cityData, travelerProfile) {
    const interests = travelerProfile?.interests || travelerProfile?.preferences?.interests || [];
    if (interests.length === 0) return 60;

    // Check if city data mentions any interests
    const cityText = JSON.stringify(cityData || {}).toLowerCase();

    let matchCount = 0;
    for (const interest of interests) {
      if (cityText.includes(interest.toLowerCase())) {
        matchCount++;
      }
    }

    // Score based on interest matches
    const matchRatio = matchCount / interests.length;
    return Math.round(50 + matchRatio * 40);
  }

  /**
   * Get matched traits for this city and traveler type.
   */
  getMatchedTraits(cityId, travelerType) {
    const typeTraitMapping = this.cityTraits?.travelerTypeMapping?.[travelerType] || [];
    return typeTraitMapping.filter(trait => this.hasCityTrait(cityId, trait));
  }

  /**
   * Calculate confidence based on available data.
   */
  calculateConfidence(cityData, travelerProfile) {
    let confidence = 0.5;

    // Boost for having city traits data
    if (this.cityTraits?.traits) confidence += 0.2;

    // Boost for having tourism categories
    if (cityData?.tourismCategories?.length > 0) confidence += 0.15;

    // Boost for having detailed traveler profile
    if (travelerProfile?.interests?.length > 0) confidence += 0.1;

    return Math.min(1, confidence);
  }

  /**
   * Generate human-readable personalization reason.
   */
  getPersonalizationReason(score, travelerType, cityId) {
    const typeLabels = {
      couples: 'couples',
      families: 'families',
      solo: 'solo travelers',
      budget: 'budget travelers',
      luxury: 'luxury seekers',
      culture: 'culture enthusiasts',
      foodie: 'food lovers',
      adventure: 'adventure seekers',
    };

    const label = typeLabels[travelerType] || travelerType;

    if (score >= 80) {
      return `Excellent match for ${label}`;
    }
    if (score >= 60) {
      return `Good fit for ${label}`;
    }
    if (score >= 40) {
      return `Average match for ${label}`;
    }
    return `May not suit ${label}`;
  }
}
