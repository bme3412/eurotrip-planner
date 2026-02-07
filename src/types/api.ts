/**
 * API request and response types for EuroTrip Planner.
 */

// ── Suggestions API (/api/suggestions) ─────────────────────────────

/** Response from /api/suggestions */
export interface SuggestionsResponse {
  items: ScoredCity[];
  meta: {
    startDate: string;
    endDate: string;
    travelerType: string | null;
    totalScored: number;
  };
}

/** A city scored for a specific date range */
export interface ScoredCity {
  id: string;                          // URL slug
  title: string;                       // "Paris, France"
  subtitle: string;                    // Brief description
  tags: string[];                      // Traveler type tags
  score: number;                       // Visit calendar score (1-5)
  popularity: number;                  // Derived popularity score
  value: number;                       // Value score (influenced by crowd level)
  image: string;                       // Thumbnail image path
  why: string;                         // Human-readable reason for these dates
  crowdLevel: string;                  // "Low", "Moderate", "High", etc.
  events: string[];                    // Special events during the date range
  cityId: string;                      // URL slug (same as id)
  cityName: string;                    // Display name
  country: string;                     // Country name
  coordinates: [number, number] | null; // [longitude, latitude]
}

// ── Cities API (/api/cities) ───────────────────────────────────────

export interface CitiesApiResponse {
  cities: CitiesApiCity[];
  count: number;
}

export interface CitiesApiCity {
  id: string;
  name: string;
  country: string;
  description?: string;
  thumbnail?: string;
  region?: string;
}

// ── Trips API (/api/trips) ─────────────────────────────────────────

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  cities: string[];
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}
