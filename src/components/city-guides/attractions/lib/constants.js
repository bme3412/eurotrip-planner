/**
 * Static configuration for the AttractionsList UI: months, sort options,
 * curated filter pills, and the score-factor display order.
 */

export const MONTHS = [
  { value: 'all', label: 'All Year', icon: '📅' },
  { value: 'january', label: 'January', icon: '❄️' },
  { value: 'february', label: 'February', icon: '❄️' },
  { value: 'march', label: 'March', icon: '🌸' },
  { value: 'april', label: 'April', icon: '🌸' },
  { value: 'may', label: 'May', icon: '🌺' },
  { value: 'june', label: 'June', icon: '☀️' },
  { value: 'july', label: 'July', icon: '☀️' },
  { value: 'august', label: 'August', icon: '☀️' },
  { value: 'september', label: 'September', icon: '🍂' },
  { value: 'october', label: 'October', icon: '🍂' },
  { value: 'november', label: 'November', icon: '🍁' },
  { value: 'december', label: 'December', icon: '❄️' },
];

export const SORT_OPTIONS = [
  { id: 'score-desc', label: 'Score: High to Low' },
  { id: 'score-asc', label: 'Score: Low to High' },
  { id: 'name-asc', label: 'Name: A → Z' },
  { id: 'name-desc', label: 'Name: Z → A' },
  { id: 'category-asc', label: 'Category A → Z' },
  { id: 'category-desc', label: 'Category Z → A' },
];

export const CURATED_FILTERS = [
  { id: 'all', label: 'All', icon: '✨', description: 'Show all experiences' },
  { id: 'must-do', label: 'Must Do', icon: '⭐', description: 'Essential experiences' },
  { id: 'free', label: 'Free', icon: '🆓', description: 'No cost to enjoy' },
  { id: 'summer', label: 'Best in Summer', icon: '☀️', description: 'Perfect for warm weather' },
  { id: 'winter', label: 'Best in Winter', icon: '❄️', description: 'Cozy indoor activities' },
  { id: 'rainy', label: 'Rainy Day', icon: '🌧️', description: 'Weather-proof options' },
  { id: 'family', label: 'Family Friendly', icon: '👨‍👩‍👧', description: 'Great for kids' },
];

// Time-of-day buckets the experiences payload is authored in (category keys,
// lowercased to match the filter pipeline). Display order for TimeOfDayNav;
// buckets absent from a city's data simply don't render.
export const EXPERIENCE_BUCKETS = [
  { key: 'morning', label: 'Morning', icon: '🌅' },
  { key: 'midday', label: 'Midday', icon: '☀️' },
  { key: 'afternoon', label: 'Afternoon', icon: '🌤️' },
  { key: 'evening', label: 'Evening', icon: '🌆' },
  { key: 'latenight', label: 'Late Night', icon: '🌙' },
  { key: 'fooddrink', label: 'Food & Drink', icon: '🍽️' },
  { key: 'parksgardens', label: 'Parks & Gardens', icon: '🌳' },
  { key: 'hiddencorners', label: 'Hidden Corners', icon: '💎' },
  { key: 'daytrips_seasonal', label: 'Day Trips', icon: '🚆' },
];

export const SCORE_FACTORS = [
  { key: 'uniqueness', label: 'Uniqueness to {city}', weight: 15, icon: '✨' },
  { key: 'visitor_experience_quality', label: 'Experience Quality', weight: 15, icon: '⭐' },
  { key: 'cultural_historical_significance', label: 'Cultural Significance', weight: 12, icon: '🏛️' },
  { key: 'value_for_money', label: 'Value for Money', weight: 12, icon: '💰' },
  { key: 'photo_instagram_appeal', label: 'Photo Appeal', weight: 10, icon: '📸' },
  { key: 'accessibility', label: 'Accessibility', weight: 10, icon: '♿' },
  { key: 'crowd_management', label: 'Crowd Levels', weight: 8, icon: '👥' },
  { key: 'weather_independence', label: 'Weather Proof', weight: 8, icon: '🌧️' },
  { key: 'family_friendliness', label: 'Family Friendly', weight: 5, icon: '👨‍👩‍👧' },
  { key: 'educational_value', label: 'Educational Value', weight: 5, icon: '📚' },
];

export const RANKING_LENSES = [
  { id: 'overall', label: 'Balanced', description: 'Blend of cultural impact, experience quality, and practical ease' },
  { id: 'cultural', label: 'Cultural Icons', description: 'Places with standout heritage, storytelling, and wow-factor moments' },
  { id: 'experience', label: 'Immersive Moments', description: 'Experiences with strong on-the-ground vibes and visit quality' },
  { id: 'practical', label: 'Easy Wins', description: 'Great value, easy logistics, and weather-resistant picks' },
];
