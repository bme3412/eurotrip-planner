/**
 * Core city data types for EuroTrip Planner.
 *
 * These types describe the shape of data in public/data/{Country}/{city}/ JSON files.
 * They are the source of truth for what city data looks like throughout the application.
 */

// ── Lightweight city entry (from generated/cities.json) ────────────

/** Used in listings, search, cards, and the explore map. */
export interface CityListItem {
  id: string;                          // URL slug: "paris", "barcelona"
  name: string;                        // Display name: "Paris", "Barcelona"
  country: string;                     // "France", "Spain"
  description: string;                 // Brief description (~160 chars)
  thumbnail: string;                   // Path to thumbnail image
  latitude: number | null;             // Geographic latitude
  longitude: number | null;            // Geographic longitude
  region: string;                      // Tourism region: "Mediterranean", "Alpine", etc.
  tourismCategories: string[];         // ["Cultural", "Food & Wine", "Romance"]
  linguisticCategories: string[];      // ["Romance", "Germanic"]
}

// ── Full city data (from index.json / getCityData()) ───────────────

/** The complete city data object returned by getCityData() in the city page. */
export interface CityData {
  cityName: string;
  country: string;
  overview: CityOverview | null;
  attractions: { sites: Attraction[] } | null;
  neighborhoods: { neighborhoods: Neighborhood[] } | null;
  culinaryGuide: CulinaryGuide | null;
  connections: TransportConnections | null;
  seasonalActivities: SeasonalActivities | null;
  monthlyEvents: Record<string, MonthlyData> | null;
  visitCalendar: VisitCalendar | null;
  summary: CitySummary | null;
}

// ── Overview ───────────────────────────────────────────────────────

export interface CityOverview {
  city_name: string;
  country: string;
  brief_description: string;
  nickname?: string;
  region?: string;
  population?: string;
  subtitle?: string;
  dataCountry?: string;              // Injected by getCityData for file path resolution

  why_visit?: string[];
  best_time_to_visit?: string;
  seasonal_notes?: Record<string, string>;
  practical_info?: Record<string, string>;
  sections?: CityOverviewSection[];
  things_to_do_tiers?: Record<string, string[]>;
  meta?: Record<string, string>;

  coordinates?: {
    latitude: number;
    longitude: number;
  } | [number, number];              // Some cities use [lon, lat] array format
}

export interface CityOverviewSection {
  title: string;
  content: string;
}

// ── Attractions ────────────────────────────────────────────────────

export interface Attraction extends Partial<GooglePlaceEnrichment> {
  name: string;
  type: string;                       // "monument", "museum", "park", etc.
  description: string;
  indoor: boolean;
  best_time?: string;
  price_range?: string;
  seasonal_notes?: Record<string, string>;
  booking_tips?: string;
  ratings?: Record<string, number>;
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
  opening_hours?: Record<string, string>;
  seasonal_hours?: Record<string, string>;
}

// ── Neighborhoods ──────────────────────────────────────────────────

export interface Neighborhood {
  name: string;
  alternate_names?: string[];
  character: string;
  location?: string;
  history?: string;
  practical_info?: Record<string, string>;
  appeal?: string[];
  categories?: string[];
  highlights?: string[];
  stay_here_if?: string[];
}

// ── Culinary Guide ─────────────────────────────────────────────────

export interface CulinaryGuide {
  restaurants?: CulinaryEntry[];
  bars_and_cafes?: CulinaryEntry[];
  food_experiences?: CulinaryEntry[];
  seasonal_specialties?: Record<string, string[]>;
}

export interface CulinaryEntry {
  name: string;
  type?: string;
  cuisine?: string;
  description?: string;
  price_range?: string;
  neighborhood?: string;
  specialty?: string;
  best_for?: string[];
}

// ── Transport Connections ──────────────────────────────────────────

export interface TransportConnections {
  destinations?: TransportDestination[];
}

export interface TransportDestination {
  city: string;
  country?: string;
  transport_types?: TransportOption[];
}

export interface TransportOption {
  type: string;                       // "train", "bus", "flight"
  duration?: string;
  frequency?: string;
  price_range?: string;
  operator?: string;
  notes?: string;
}

// ── Seasonal Activities ────────────────────────────────────────────

export interface SeasonalActivities {
  Spring?: SeasonActivity[];
  Summer?: SeasonActivity[];
  Autumn?: SeasonActivity[];
  Winter?: SeasonActivity[];
}

export interface SeasonActivity {
  name: string;
  type?: string;
  description?: string;
  best_months?: string[];
  location?: string;
  price?: string;
}

// ── Visit Calendar ─────────────────────────────────────────────────

export interface VisitCalendar {
  months: Record<string, VisitCalendarMonth>;
  activityTypes?: string[];
  scoreDescription?: Record<string, string>;
  travelerTypes?: string[];
  activityCategories?: string[];
  practicalConsiderations?: Record<string, string>;
  monthlyHighlights?: Record<string, string[]>;
  bestTimeRecommendations?: Record<string, string>;
}

export interface VisitCalendarMonth {
  name?: string;
  ranges: VisitCalendarRange[];
}

export interface VisitCalendarRange {
  days: number[];                     // Array of day numbers, e.g. [1, 2, 3, 4, 5]
  score: number;                      // 1-5 (1 = Avoid, 5 = Excellent)
  special?: boolean;                  // True for holiday/event days
  event?: string;                     // Event name if applicable
  notes?: string;                     // Human-readable notes
  location?: string;
  time?: string;
  price?: string;
  crowdLevel?: string;                // "Very Low" | "Low" | "Moderate" | "High" | "Very High" | "Extreme"
  travelerTypes?: Record<string, number>;  // { families: 3, couples: 4, solo: 3, ... }
  culturalTradition?: string;
  attractions?: Record<string, string>;
}

// ── Monthly Data ───────────────────────────────────────────────────

/** Data from public/data/{Country}/{city}/monthly/{month}.json */
export interface MonthlyData {
  reasons_to_visit?: string[];
  reasons_to_reconsider?: string[];
  first_half?: MonthHalf;
  second_half?: MonthHalf;
}

export interface MonthHalf {
  date_range?: string;
  weather?: MonthWeather;
  tourism?: MonthTourism;
  events?: MonthEvent[];
  daily_recommendations?: DailyRecommendation[];
}

export interface MonthWeather {
  average_temp?: { high: number; low: number };
  precipitation?: string;
  description?: string;
}

export interface MonthTourism {
  crowd_level?: string;
  pricing?: string;
  overall_atmosphere?: string;
}

export interface MonthEvent {
  name: string;
  date?: string;
  description?: string;
  type?: string;
}

export interface DailyRecommendation {
  time_of_day?: string;
  activity?: string;
  description?: string;
  location?: string;
  local_tip?: string;
}

// ── Google Places Enrichment ────────────────────────────────────────

export interface GooglePlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
}

export interface GooglePlaceEnrichment {
  googlePlaceId?: string;
  googleRating?: number;
  googleReviewCount?: number;
  googlePhotos?: GooglePlacePhoto[];
  currentlyOpen?: boolean;
  googleOpeningHours?: string[];
  googleUrl?: string;
  googleEditorialSummary?: string;
  googlePriceLevel?: string;
}

// ── Summary ────────────────────────────────────────────────────────

export interface CitySummary {
  [key: string]: unknown;
}
