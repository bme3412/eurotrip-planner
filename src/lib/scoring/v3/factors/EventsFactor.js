/**
 * Events Factor for V3 Scoring
 *
 * Calculates event bonus based on:
 * - Special events during trip dates
 * - Event type alignment with traveler preferences
 * - Event popularity/significance
 */

import { BaseFactor } from '../core/BaseFactor.js';
import { parseDate, getDayCount } from '../utils/parsers.js';

export class EventsFactor extends BaseFactor {
  /**
   * Check if we have event data.
   */
  hasRequiredData(input) {
    const { enrichmentData, cityData } = input;
    return !!(
      enrichmentData?.events ||
      cityData?.events ||
      cityData?.visitCalendar?.months
    );
  }

  /**
   * Calculate events score.
   */
  calculate(input) {
    const { enrichmentData, cityData, startDate, endDate, travelerProfile } = input;

    // Get events from various sources
    const events = this.collectEvents(enrichmentData, cityData, startDate, endDate);

    if (events.length === 0) {
      return this.buildResult(
        50, // Neutral - no events isn't bad
        0.7,
        'No special events during trip',
        'static',
        { events: [] }
      );
    }

    // Score based on event count and quality
    const eventScore = this.calculateEventScore(events, travelerProfile);

    // Get top events for display
    const topEvents = events
      .sort((a, b) => (b.significance || 0) - (a.significance || 0))
      .slice(0, 3)
      .map(e => e.name || e.title);

    const reason = topEvents.length === 1
      ? `Event: ${topEvents[0]}`
      : `${events.length} events including ${topEvents[0]}`;

    return this.buildResult(
      eventScore,
      0.8,
      reason,
      enrichmentData?.events ? 'api' : 'static',
      {
        events: topEvents,
        eventCount: events.length,
        topEvent: topEvents[0],
      }
    );
  }

  /**
   * Collect events from all sources that overlap with trip dates.
   */
  collectEvents(enrichmentData, cityData, startDate, endDate) {
    const start = parseDate(startDate);
    const end = endDate ? parseDate(endDate) : start;

    if (!start) return [];

    const events = [];

    // Add enrichment events
    if (enrichmentData?.events && Array.isArray(enrichmentData.events)) {
      for (const event of enrichmentData.events) {
        if (this.eventOverlapsTrip(event, start, end)) {
          events.push(event);
        }
      }
    }

    // Add city data events
    if (cityData?.events && Array.isArray(cityData.events)) {
      for (const event of cityData.events) {
        if (this.eventOverlapsTrip(event, start, end)) {
          events.push(event);
        }
      }
    }

    // Add visit calendar events (month-based)
    if (cityData?.visitCalendar?.months) {
      const startMonth = start.getMonth();
      const endMonth = end.getMonth();
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];

      for (let m = startMonth; m <= endMonth; m++) {
        const monthName = monthNames[m];
        const monthData = cityData.visitCalendar.months.find(
          md => md.name?.toLowerCase() === monthName || md.month?.toLowerCase() === monthName
        );

        if (monthData?.events && Array.isArray(monthData.events)) {
          for (const event of monthData.events) {
            // Calendar events are already for this month
            events.push({
              name: typeof event === 'string' ? event : event.name || event.title,
              month: monthName,
              significance: typeof event === 'string' ? 60 : (event.significance || 60),
              type: typeof event === 'string' ? 'festival' : event.type,
            });
          }
        }

        // Also check highlights
        if (monthData?.highlights && Array.isArray(monthData.highlights)) {
          for (const highlight of monthData.highlights) {
            if (typeof highlight === 'string' && this.isEventHighlight(highlight)) {
              events.push({
                name: highlight,
                month: monthName,
                significance: 70,
                type: 'highlight',
              });
            }
          }
        }
      }
    }

    // Deduplicate by name
    const seen = new Set();
    return events.filter(e => {
      const key = (e.name || e.title || '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Check if an event overlaps with trip dates.
   */
  eventOverlapsTrip(event, tripStart, tripEnd) {
    // If event has no dates, assume it might be relevant
    if (!event.startDate && !event.date && !event.month) {
      return true;
    }

    // Date-based event
    if (event.startDate || event.date) {
      const eventStart = parseDate(event.startDate || event.date);
      const eventEnd = event.endDate ? parseDate(event.endDate) : eventStart;

      if (!eventStart) return true; // Can't parse, assume relevant

      // Check overlap
      return eventStart <= tripEnd && eventEnd >= tripStart;
    }

    // Month-based event
    if (event.month) {
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const eventMonth = monthNames.indexOf(event.month.toLowerCase());
      if (eventMonth === -1) return true;

      const tripStartMonth = tripStart.getMonth();
      const tripEndMonth = tripEnd.getMonth();

      return eventMonth >= tripStartMonth && eventMonth <= tripEndMonth;
    }

    return true;
  }

  /**
   * Check if a highlight string represents an event.
   */
  isEventHighlight(highlight) {
    const lower = highlight.toLowerCase();
    const eventKeywords = [
      'festival', 'carnival', 'celebration', 'parade', 'concert',
      'fair', 'market', 'christmas', 'easter', 'new year', 'holiday',
      'fireworks', 'race', 'marathon', 'tournament', 'exhibition'
    ];
    return eventKeywords.some(kw => lower.includes(kw));
  }

  /**
   * Calculate event score based on quantity and quality.
   */
  calculateEventScore(events, travelerProfile) {
    if (events.length === 0) return 50;

    // Base score increases with events (diminishing returns)
    let score = 50 + Math.min(25, events.length * 8);

    // Add significance bonus
    const avgSignificance = events.reduce((sum, e) => sum + (e.significance || 60), 0) / events.length;
    score += (avgSignificance - 50) * 0.3;

    // Traveler type alignment bonus
    const travelerType = travelerProfile?.type || 'everyone';
    const typeBonus = this.getTypeAlignmentBonus(events, travelerType);
    score += typeBonus;

    return Math.min(100, Math.round(score));
  }

  /**
   * Get bonus for events matching traveler type.
   */
  getTypeAlignmentBonus(events, travelerType) {
    const typeEventPrefs = {
      families: ['family', 'children', 'fair', 'parade', 'christmas', 'market'],
      couples: ['romantic', 'wine', 'music', 'concert', 'valentine'],
      culture: ['art', 'museum', 'exhibition', 'heritage', 'historical'],
      foodie: ['food', 'wine', 'culinary', 'gastro', 'tasting'],
      adventure: ['sport', 'race', 'marathon', 'outdoor', 'competition'],
      budget: ['free', 'street', 'public'],
      luxury: ['gala', 'opera', 'premiere', 'exclusive'],
    };

    const prefs = typeEventPrefs[travelerType] || [];
    if (prefs.length === 0) return 0;

    let matchCount = 0;
    for (const event of events) {
      const eventStr = JSON.stringify(event).toLowerCase();
      if (prefs.some(pref => eventStr.includes(pref))) {
        matchCount++;
      }
    }

    // Up to 10 point bonus for matching events
    return Math.min(10, matchCount * 5);
  }
}
