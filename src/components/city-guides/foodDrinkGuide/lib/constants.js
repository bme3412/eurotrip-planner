import { Utensils, Star, ShoppingBag, Coffee, Wine } from 'lucide-react';

export const DEFAULT_FOOD_DATA = {
  intro: `Every great city has its own food culture. Here's how to eat and drink like a local.`,
  sections: [
    {
      title: 'Getting Started',
      content: `Research local specialties before you arrive. Ask locals for recommendations—hotel staff, taxi drivers, and shopkeepers often know the best spots. Avoid restaurants with photos on the menu or aggressive hosts outside.`,
    },
    {
      title: 'Dining Tips',
      content: `Learn local meal times—they vary widely across cultures. Lunch is often the best value for quality dining. Make reservations for popular spots. Don't be afraid to eat where you don't see other tourists.`,
    },
  ],
  highlights: [],
};

export const RESTAURANT_CATEGORIES = [
  { id: 'all', label: 'All', icon: Utensils },
  { id: 'fine_dining', label: 'Fine Dining', icon: Star },
  { id: 'casual_dining', label: 'Casual', icon: Utensils },
  { id: 'street_food', label: 'Street Food', icon: ShoppingBag },
  { id: 'coffee_shops', label: 'Coffee', icon: Coffee },
  { id: 'bars', label: 'Bars', icon: Wine },
];

// Price filter options - support both € and £ currencies
export const PRICE_FILTERS = [
  { id: 'all', label: 'All Prices', match: null },
  { id: 'budget', label: '$ Budget', match: ['€', '£'] },
  { id: 'mid', label: '$$ Mid-range', match: ['€€', '££'] },
  { id: 'upscale', label: '$$$ Upscale', match: ['€€€', '£££'] },
  { id: 'luxury', label: '$$$$ Fine Dining', match: ['€€€€', '££££'] },
];

export const DEFAULT_RESTAURANT_PAGE_SIZE = 6;
