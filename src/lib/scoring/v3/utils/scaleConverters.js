/**
 * Scale Conversion Utilities for V3 Scoring
 *
 * Provides consistent conversion between different scoring scales:
 * - 0-5 (legacy V1/V2 scores)
 * - 0-10 (easeScoreCalculator)
 * - 0-100 (V3 unified scale)
 */

/**
 * Convert from 0-5 scale to 0-100 scale.
 *
 * @param {number} value - Value on 0-5 scale
 * @returns {number} Value on 0-100 scale (rounded)
 */
export function from5To100(value) {
  if (value === null || value === undefined) return null;
  return Math.round((value / 5) * 100);
}

/**
 * Convert from 0-10 scale to 0-100 scale.
 *
 * @param {number} value - Value on 0-10 scale
 * @returns {number} Value on 0-100 scale (rounded)
 */
export function from10To100(value) {
  if (value === null || value === undefined) return null;
  return Math.round((value / 10) * 100);
}

/**
 * Convert from 0-100 scale to 0-5 scale (backwards compatibility).
 *
 * @param {number} value - Value on 0-100 scale
 * @returns {number} Value on 0-5 scale (1 decimal place)
 */
export function from100To5(value) {
  if (value === null || value === undefined) return null;
  return Math.round((value / 100) * 5 * 10) / 10;
}

/**
 * Convert from 0-100 scale to 0-10 scale.
 *
 * @param {number} value - Value on 0-100 scale
 * @returns {number} Value on 0-10 scale (1 decimal place)
 */
export function from100To10(value) {
  if (value === null || value === undefined) return null;
  return Math.round((value / 100) * 10 * 10) / 10;
}

/**
 * Generic scale converter.
 *
 * @param {number} value - Input value
 * @param {number} fromMin - Input scale minimum
 * @param {number} fromMax - Input scale maximum
 * @param {number} toMin - Output scale minimum (default 0)
 * @param {number} toMax - Output scale maximum (default 100)
 * @returns {number} Converted value (rounded)
 */
export function convertScale(value, fromMin, fromMax, toMin = 0, toMax = 100) {
  if (value === null || value === undefined) return null;

  // Normalize to 0-1
  const normalized = (value - fromMin) / (fromMax - fromMin);

  // Scale to target range
  return Math.round(normalized * (toMax - toMin) + toMin);
}

/**
 * Clamp a value to a range.
 *
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum (default 0)
 * @param {number} max - Maximum (default 100)
 * @returns {number} Clamped value
 */
export function clamp(value, min = 0, max = 100) {
  if (value === null || value === undefined) return null;
  return Math.max(min, Math.min(max, value));
}

/**
 * Get score label for a 0-100 score.
 *
 * @param {number} score - Score on 0-100 scale
 * @returns {string} Human-readable label
 */
export function getScoreLabel(score) {
  if (score === null || score === undefined) return 'Unknown';
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Great';
  if (score >= 40) return 'Good';
  if (score >= 20) return 'Fair';
  return 'Poor';
}

/**
 * Get legacy 1-5 score label (for backwards compatibility).
 *
 * @param {number} score - Score on 0-5 scale
 * @returns {string} Human-readable label
 */
export function getLegacyScoreLabel(score) {
  if (score === null || score === undefined) return 'Unknown';
  const rounded = Math.round(score);
  const labels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };
  return labels[rounded] || 'Good';
}

/**
 * Normalize a raw score to 0-100 with confidence weighting.
 *
 * @param {number} rawScore - Raw score value
 * @param {number} confidence - Confidence level (0-1)
 * @param {number} fallback - Fallback score if confidence is too low
 * @param {number} minConfidence - Minimum confidence to use raw score (default 0.3)
 * @returns {Object} { score, usedFallback }
 */
export function normalizeWithConfidence(rawScore, confidence, fallback = 50, minConfidence = 0.3) {
  if (confidence < minConfidence || rawScore === null || rawScore === undefined) {
    return { score: fallback, usedFallback: true };
  }

  // Weight the score by confidence, blending with fallback
  const weightedScore = (rawScore * confidence) + (fallback * (1 - confidence));
  return { score: Math.round(weightedScore), usedFallback: false };
}
