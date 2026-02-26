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
  user_id?: string;
  user_email?: string;
  city: string;
  country?: string;
  title?: string;
  start_date: string;
  end_date: string;
  interests: string[];
  pace: number;
  budget: string;
  status: 'planning' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  weather_adaptation_enabled: boolean;
  initial_plan?: unknown;
  created_at: string;
  days: TripDay[];
}

export interface TripDay {
  id: string;
  day_number: number;
  date: string;
  theme?: string;
  notes?: string;
  weather_forecast?: WeatherForecast;
  activities: TripActivity[];
}

export interface TripActivity {
  id: string;
  time_block: 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';
  sort_order: number;
  start_time?: string;
  end_time?: string;
  name: string;
  type?: string;
  description?: string;
  duration_minutes?: number;
  price_range?: string;
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
  google_place_id?: string;
  google_rating?: number;
  google_photo_name?: string;
  indoor: boolean;
  booking_required: boolean;
  booking_url?: string;
  status: 'planned' | 'confirmed' | 'skipped' | 'completed' | 'weather_swapped';
  swap_reason?: string;
}

export interface WeatherForecast {
  high_c: number;
  low_c: number;
  condition: string;
  precipitation_chance: number;
  wind_kph: number;
}
