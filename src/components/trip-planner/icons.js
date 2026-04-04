/**
 * Centralized icon exports for trip planner
 * Replaces emoji usage with consistent lucide-react icons
 */

import {
  Train,
  Plane,
  Bus,
  Ship,
  Zap,
  Clock,
  Route,
  Landmark,
  Wine,
  Frame,
  TreePine,
  Castle,
  Sparkles,
  ShoppingBag,
  Camera,
  Sun,
  CloudSun,
  CloudRain,
  Snowflake,
  Users,
  Ticket,
  Check,
  Star,
} from 'lucide-react';

// Transport type icons
export const TRANSPORT_ICONS = {
  train: Train,
  flight: Plane,
  bus: Bus,
  ferry: Ship,
  all: null, // No icon for "all"
};

// Time group icons
export const TIME_GROUP_ICONS = {
  quick: Zap,
  medium: Clock,
  further: Route,
  bestMatches: Star,
};

// Interest icons
export const INTEREST_ICONS = {
  'Culture & History': Landmark,
  'Food & Drink': Wine,
  'Art & Museums': Frame,
  'Nature & Outdoors': TreePine,
  'Architecture': Castle,
  'Nightlife': Sparkles,
  'Shopping': ShoppingBag,
  'Photography': Camera,
};

// Weather icons by condition
export const WEATHER_ICONS = {
  sunny: Sun,
  partlyCloudy: CloudSun,
  rainy: CloudRain,
  snowy: Snowflake,
};

// Badge icons
export const BADGE_ICONS = {
  weather: Sun,
  crowds: Users,
  events: Ticket,
};

// Utility icons
export const UTILITY_ICONS = {
  check: Check,
  star: Star,
};

// Re-export individual icons for direct imports
export {
  Train,
  Plane,
  Bus,
  Ship,
  Zap,
  Clock,
  Route,
  Landmark,
  Wine,
  Frame,
  TreePine,
  Castle,
  Sparkles,
  ShoppingBag,
  Camera,
  Sun,
  CloudSun,
  CloudRain,
  Snowflake,
  Users,
  Ticket,
  Check,
  Star,
};
