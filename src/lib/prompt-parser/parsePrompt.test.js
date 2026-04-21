/**
 * Unit tests for parsePrompt
 * Run with: npx jest src/lib/prompt-parser/parsePrompt.test.js
 */

import { parsePrompt, buildPlanUrl } from './index';

// Sample cities for testing
const CITIES = [
  { id: 'paris', name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
  { id: 'lisbon', name: 'Lisbon', country: 'Portugal', latitude: 38.7223, longitude: -9.1393 },
  { id: 'rome', name: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964 },
  { id: 'barcelona', name: 'Barcelona', country: 'Spain', latitude: 41.3851, longitude: 2.1734 },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041 },
  { id: 'prague', name: 'Prague', country: 'Czechia', latitude: 50.0755, longitude: 14.4378 },
  { id: 'vienna', name: 'Vienna', country: 'Austria', latitude: 48.2082, longitude: 16.3738 },
  { id: 'berlin', name: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.405 },
  { id: 'athens', name: 'Athens', country: 'Greece', latitude: 37.9838, longitude: 23.7275 },
  { id: 'copenhagen', name: 'Copenhagen', country: 'Denmark', latitude: 55.6761, longitude: 12.5683 },
];

describe('parsePrompt', () => {
  describe('spec examples', () => {
    test('5 days in Paris over Christmas', () => {
      const result = parsePrompt('5 days in Paris over Christmas', { cities: CITIES });

      expect(result.cities).toHaveLength(1);
      expect(result.cities[0].id).toBe('paris');
      expect(result.duration).toEqual({ value: 5, unit: 'day' });
      expect(result.month).toBe('December');
      expect(result.season.name).toBe('Christmas');
    });

    test('Lisbon to Rome by train in late April', () => {
      const result = parsePrompt('Lisbon to Rome by train in late April', { cities: CITIES });

      expect(result.cities).toHaveLength(2);
      expect(result.cities[0].id).toBe('lisbon');
      expect(result.cities[1].id).toBe('rome');
      expect(result.month).toBe('April');
      expect(result.themes).toContainEqual(
        expect.objectContaining({ key: 'train', emoji: '🚆' })
      );
    });

    test('Family trip with kids 8 and 11, Amsterdam area', () => {
      const result = parsePrompt('Family trip with kids 8 and 11, Amsterdam area', { cities: CITIES });

      expect(result.cities).toHaveLength(1);
      expect(result.cities[0].id).toBe('amsterdam');
      expect(result.themes).toContainEqual(
        expect.objectContaining({ key: 'family', emoji: '👪' })
      );
    });

    test('10 nights in Spain, beach + tapas', () => {
      const result = parsePrompt('10 nights in Spain, beach + tapas, no cities I have already been', { cities: CITIES });

      // Note: "Spain" is not a city, so no cities extracted
      // But Barcelona is in Spain - this test verifies theme extraction
      expect(result.duration).toEqual({ value: 10, unit: 'night' });
      expect(result.themes).toContainEqual(
        expect.objectContaining({ key: 'beach', emoji: '🏖' })
      );
      expect(result.themes).toContainEqual(
        expect.objectContaining({ key: 'food', emoji: '🍝' })
      );
    });

    test('I am going to Rome in June for a week, want food and ancient history', () => {
      const result = parsePrompt('I am going to Rome in June for a week, want food and ancient history', { cities: CITIES });

      expect(result.cities).toHaveLength(1);
      expect(result.cities[0].id).toBe('rome');
      expect(result.month).toBe('June');
      expect(result.duration).toEqual({ value: 1, unit: 'week' });
      expect(result.themes).toContainEqual(
        expect.objectContaining({ key: 'food', emoji: '🍝' })
      );
      expect(result.themes).toContainEqual(
        expect.objectContaining({ key: 'history', emoji: '🏛' })
      );
    });
  });

  describe('city extraction', () => {
    test('extracts multiple cities in order', () => {
      const result = parsePrompt('Flying into Paris, then Rome, ending in Barcelona', { cities: CITIES });

      expect(result.cities).toHaveLength(3);
      expect(result.cities[0].id).toBe('paris');
      expect(result.cities[1].id).toBe('rome');
      expect(result.cities[2].id).toBe('barcelona');
    });

    test('case insensitive matching', () => {
      const result = parsePrompt('going to PARIS and rome', { cities: CITIES });

      expect(result.cities).toHaveLength(2);
      expect(result.cities[0].id).toBe('paris');
      expect(result.cities[1].id).toBe('rome');
    });

    test('respects word boundaries', () => {
      const result = parsePrompt('I love romantic vibes', { cities: CITIES });

      // "Rome" should NOT match within "romantic"
      expect(result.cities).toHaveLength(0);
    });

    test('includes city metadata', () => {
      const result = parsePrompt('Visit Paris', { cities: CITIES });

      expect(result.cities[0]).toMatchObject({
        id: 'paris',
        name: 'Paris',
        country: 'France',
        lat: 48.8566,
        lon: 2.3522
      });
    });
  });

  describe('duration extraction', () => {
    test('extracts days', () => {
      const result = parsePrompt('7 days exploring', { cities: CITIES });
      expect(result.duration).toEqual({ value: 7, unit: 'day' });
    });

    test('extracts nights', () => {
      const result = parsePrompt('staying 3 nights', { cities: CITIES });
      expect(result.duration).toEqual({ value: 3, unit: 'night' });
    });

    test('extracts weeks', () => {
      const result = parsePrompt('2 weeks backpacking', { cities: CITIES });
      expect(result.duration).toEqual({ value: 2, unit: 'week' });
    });

    test('handles singular forms', () => {
      const result = parsePrompt('1 week in Italy', { cities: CITIES });
      expect(result.duration).toEqual({ value: 1, unit: 'week' });
    });
  });

  describe('budget extraction', () => {
    test('extracts euro symbol', () => {
      const result = parsePrompt('budget €2000', { cities: CITIES });
      expect(result.budget).toEqual({ amount: 2000, currency: 'EUR' });
    });

    test('extracts dollar symbol', () => {
      const result = parsePrompt('$1500 budget', { cities: CITIES });
      expect(result.budget).toEqual({ amount: 1500, currency: 'USD' });
    });

    test('extracts pound symbol', () => {
      const result = parsePrompt('around £800', { cities: CITIES });
      expect(result.budget).toEqual({ amount: 800, currency: 'GBP' });
    });

    test('extracts word form', () => {
      const result = parsePrompt('budget of 3000 euros', { cities: CITIES });
      expect(result.budget).toEqual({ amount: 3000, currency: 'EUR' });
    });
  });

  describe('month extraction', () => {
    test('extracts full month names', () => {
      expect(parsePrompt('trip in September', { cities: CITIES }).month).toBe('September');
      expect(parsePrompt('visiting in march', { cities: CITIES }).month).toBe('March');
    });

    test('extracts month abbreviations', () => {
      expect(parsePrompt('in Oct', { cities: CITIES }).month).toBe('October');
    });
  });

  describe('season extraction', () => {
    test('extracts summer', () => {
      const result = parsePrompt('summer vacation', { cities: CITIES });
      expect(result.season.name).toBe('Summer');
      expect(result.month).toBe('June');
    });

    test('extracts winter', () => {
      const result = parsePrompt('winter getaway', { cities: CITIES });
      expect(result.season.name).toBe('Winter');
      expect(result.month).toBe('December');
    });
  });

  describe('theme extraction', () => {
    test('extracts food themes', () => {
      const result = parsePrompt('great restaurants and dining', { cities: CITIES });
      expect(result.themes).toContainEqual(
        expect.objectContaining({ key: 'food' })
      );
    });

    test('extracts multiple themes', () => {
      const result = parsePrompt('art museums and beach relaxation', { cities: CITIES });
      expect(result.themes).toHaveLength(2);
      expect(result.themes.map(t => t.key)).toContain('art');
      expect(result.themes.map(t => t.key)).toContain('beach');
    });

    test('deduplicates themes', () => {
      const result = parsePrompt('food and dining and restaurants', { cities: CITIES });
      // All map to 'food' theme, should only appear once
      expect(result.themes.filter(t => t.key === 'food')).toHaveLength(1);
    });
  });

  describe('buildPlanUrl', () => {
    test('builds URL with all parameters', () => {
      const text = 'Paris to Rome in April for 5 days';
      const parsed = parsePrompt(text, { cities: CITIES });
      const url = buildPlanUrl(text, parsed);

      expect(url).toContain('/plan?');
      expect(url).toContain('q=Paris+to+Rome+in+April+for+5+days');
      expect(url).toContain('cities=paris%2Crome');
      expect(url).toContain('month=april');
      expect(url).toContain('days=5');
    });

    test('converts weeks to days', () => {
      const text = '2 weeks in Vienna';
      const parsed = parsePrompt(text, { cities: CITIES });
      const url = buildPlanUrl(text, parsed);

      expect(url).toContain('days=14');
    });
  });

  describe('edge cases', () => {
    test('handles empty input', () => {
      const result = parsePrompt('', { cities: CITIES });
      expect(result.cities).toHaveLength(0);
      expect(result.duration).toBeNull();
      expect(result.budget).toBeNull();
      expect(result.month).toBeNull();
      expect(result.themes).toHaveLength(0);
    });

    test('handles null input', () => {
      const result = parsePrompt(null, { cities: CITIES });
      expect(result.cities).toHaveLength(0);
    });

    test('handles no cities option', () => {
      const result = parsePrompt('5 days in Paris', {});
      expect(result.cities).toHaveLength(0);
      expect(result.duration).toEqual({ value: 5, unit: 'day' });
    });
  });
});
