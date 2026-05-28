import { Book, Camera, Heart, Moon, Palette, ShoppingBag, Utensils } from 'lucide-react';

// Persona definitions with matching criteria. Each persona maps a user-facing
// label to a set of keywords that we match against `neighborhood.appeal.best_for`.
export const PERSONAS = [
  { id: 'first-timer', label: 'First-timers', icon: Camera, keywords: ['first-time visitors', 'tourists', 'photographers'], color: 'blue' },
  { id: 'art-lover', label: 'Art Lovers', icon: Palette, keywords: ['art lovers', 'art enthusiasts', 'artists', 'art aficionados'], color: 'purple' },
  { id: 'foodie', label: 'Foodies', icon: Utensils, keywords: ['foodies', 'café enthusiasts', 'wine enthusiasts'], color: 'orange' },
  { id: 'history-buff', label: 'History Buffs', icon: Book, keywords: ['history buffs', 'history enthusiasts', 'history lovers'], color: 'amber' },
  { id: 'night-owl', label: 'Night Owls', icon: Moon, keywords: ['night owls', 'nightlife enthusiasts', 'young travelers'], color: 'indigo' },
  { id: 'shopper', label: 'Shoppers', icon: ShoppingBag, keywords: ['shoppers', 'shopaholics', 'fashionistas', 'fashion enthusiasts'], color: 'pink' },
  { id: 'romantic', label: 'Romantics', icon: Heart, keywords: ['romantics', 'couples'], color: 'rose' },
];

// Editor's picks used by the spotlight section.
export const EDITORS_PICKS = [
  { name: 'Le Marais', reason: 'Best all-rounder for first-time visitors' },
  { name: 'Montmartre', reason: 'Most romantic with stunning views' },
  { name: 'Saint-Germain-des-Prés', reason: 'Quintessential Parisian café culture' },
];

// Pre-computed walking times + metro lines between popular Paris neighborhoods.
// Currently Paris-only; other cities fall back to no "nearby" chips.
export const NEIGHBORHOOD_CONNECTIONS = {
  'Le Marais': [
    { to: 'Bastille', walkTime: 10, metro: 'Line 1' },
    { to: 'Île de la Cité', walkTime: 12, metro: 'Line 1, 4' },
    { to: 'Latin Quarter', walkTime: 18, metro: 'Line 7' },
  ],
  'Saint-Germain-des-Prés': [
    { to: 'Latin Quarter', walkTime: 8, metro: 'Line 4' },
    { to: 'Île de la Cité', walkTime: 15, metro: 'Line 4' },
    { to: 'Montparnasse', walkTime: 15, metro: 'Line 4, 12' },
  ],
  'Montmartre': [
    { to: 'Pigalle', walkTime: 5, metro: 'Line 2, 12' },
    { to: 'Canal Saint-Martin', walkTime: 25, metro: 'Line 2 → 5' },
    { to: 'Le Marais', walkTime: 35, metro: 'Line 12 → 1' },
  ],
  'Latin Quarter': [
    { to: 'Saint-Germain-des-Prés', walkTime: 8, metro: 'Line 4' },
    { to: 'Île de la Cité', walkTime: 10, metro: 'Line 4' },
    { to: 'Le Marais', walkTime: 18, metro: 'Line 7' },
  ],
  'Champs-Élysées': [
    { to: 'Le Marais', walkTime: 35, metro: 'Line 1' },
    { to: 'Montmartre', walkTime: 30, metro: 'Line 2' },
    { to: 'La Défense', walkTime: 45, metro: 'Line 1' },
  ],
  'Montparnasse': [
    { to: 'Saint-Germain-des-Prés', walkTime: 15, metro: 'Line 4, 12' },
    { to: 'Latin Quarter', walkTime: 20, metro: 'Line 4' },
    { to: 'Bastille', walkTime: 30, metro: 'Line 6' },
  ],
  'La Défense': [
    { to: 'Champs-Élysées', walkTime: 45, metro: 'Line 1' },
    { to: 'Le Marais', walkTime: 50, metro: 'Line 1' },
  ],
  'Bastille': [
    { to: 'Le Marais', walkTime: 10, metro: 'Line 1, 8' },
    { to: 'Canal Saint-Martin', walkTime: 15, metro: 'Line 5' },
    { to: 'Belleville', walkTime: 20, metro: 'Line 11' },
  ],
  'Belleville': [
    { to: 'Canal Saint-Martin', walkTime: 12, metro: 'Line 2, 11' },
    { to: 'Bastille', walkTime: 20, metro: 'Line 11' },
    { to: 'Le Marais', walkTime: 25, metro: 'Line 11 → 1' },
  ],
  'Canal Saint-Martin': [
    { to: 'Belleville', walkTime: 12, metro: 'Line 2, 11' },
    { to: 'Bastille', walkTime: 15, metro: 'Line 5' },
    { to: 'Le Marais', walkTime: 20, metro: 'Line 5 → 1' },
  ],
  'Île de la Cité': [
    { to: 'Le Marais', walkTime: 12, metro: 'Line 1, 4' },
    { to: 'Latin Quarter', walkTime: 10, metro: 'Line 4' },
    { to: 'Saint-Germain-des-Prés', walkTime: 15, metro: 'Line 4' },
  ],
};

// Build the 3-tip "insider tips" overlay shown on neighborhood card hover.
// Combines authored `insider_tips` with synthesised tips from practical_info.
export function getInsiderTips(neighborhood) {
  const tips = [];

  if (neighborhood.insider_tips && neighborhood.insider_tips.length > 0) {
    tips.push(...neighborhood.insider_tips);
  }

  if (neighborhood.practical_info?.best_time_to_visit) {
    tips.push(`Best time: ${neighborhood.practical_info.best_time_to_visit}`);
  }

  if (
    neighborhood.practical_info?.safety &&
    neighborhood.practical_info.safety.toLowerCase().includes('pickpocket')
  ) {
    tips.push('Keep valuables secure - popular area for pickpockets');
  }

  return tips.slice(0, 3);
}
