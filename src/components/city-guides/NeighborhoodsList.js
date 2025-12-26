'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { MapPin, Clock, Train, X, Check, ChevronDown, Users, Utensils, ShoppingBag, Moon, Palette, Camera, Book, Heart, Sparkles, Scale } from 'lucide-react';

// Persona definitions with matching criteria
const PERSONAS = [
  { id: 'first-timer', label: 'First-timers', icon: Camera, keywords: ['first-time visitors', 'tourists', 'photographers'], color: 'blue' },
  { id: 'art-lover', label: 'Art Lovers', icon: Palette, keywords: ['art lovers', 'art enthusiasts', 'artists', 'art aficionados'], color: 'purple' },
  { id: 'foodie', label: 'Foodies', icon: Utensils, keywords: ['foodies', 'café enthusiasts', 'wine enthusiasts'], color: 'orange' },
  { id: 'history-buff', label: 'History Buffs', icon: Book, keywords: ['history buffs', 'history enthusiasts', 'history lovers'], color: 'amber' },
  { id: 'night-owl', label: 'Night Owls', icon: Moon, keywords: ['night owls', 'nightlife enthusiasts', 'young travelers'], color: 'indigo' },
  { id: 'shopper', label: 'Shoppers', icon: ShoppingBag, keywords: ['shoppers', 'shopaholics', 'fashionistas', 'fashion enthusiasts'], color: 'pink' },
  { id: 'romantic', label: 'Romantics', icon: Heart, keywords: ['romantics', 'couples'], color: 'rose' },
];

// Editor's picks for spotlight section
const EDITORS_PICKS = [
  { name: 'Le Marais', reason: 'Best all-rounder for first-time visitors' },
  { name: 'Montmartre', reason: 'Most romantic with stunning views' },
  { name: 'Saint-Germain-des-Prés', reason: 'Quintessential Parisian café culture' },
];

// Neighborhood connection data (walking times in minutes)
const NEIGHBORHOOD_CONNECTIONS = {
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

// Get insider tips based on neighborhood data
const getInsiderTips = (neighborhood) => {
  const tips = [];
  
  // Use stored insider tips
  if (neighborhood.insider_tips && neighborhood.insider_tips.length > 0) {
    tips.push(...neighborhood.insider_tips);
  }
  
  // Add practical tips based on data
  if (neighborhood.practical_info?.best_time_to_visit) {
    tips.push(`Best time: ${neighborhood.practical_info.best_time_to_visit}`);
  }
  
  if (neighborhood.practical_info?.safety && neighborhood.practical_info.safety.toLowerCase().includes('pickpocket')) {
    tips.push('Keep valuables secure - popular area for pickpockets');
  }
  
  return tips.slice(0, 3);
};

// Tips overlay component
const TipsOverlay = ({ tips }) => {
  if (!tips || tips.length === 0) return null;
  return (
    <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-t from-black/60 via-black/20 to-transparent">
      <div className="w-full">
        <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Insider Tips
        </div>
        <ul className="space-y-1.5">
          {tips.map((tip, i) => (
            <li key={i} className="text-sm text-white leading-relaxed flex items-start gap-2">
              <span className="text-amber-400 mt-0.5 shrink-0">💡</span>
              <span className="line-clamp-2">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Comparison modal component
const ComparisonModal = ({ neighborhoods, onClose }) => {
  if (!neighborhoods || neighborhoods.length < 2) return null;
  
  const categories = ['dining', 'shopping', 'nightlife', 'cultural', 'historic', 'green_spaces'];
  const categoryLabels = {
    dining: { label: 'Dining', icon: '🍽️' },
    shopping: { label: 'Shopping', icon: '🛍️' },
    nightlife: { label: 'Nightlife', icon: '🌃' },
    cultural: { label: 'Cultural', icon: '🎭' },
    historic: { label: 'Historic', icon: '🏛️' },
    green_spaces: { label: 'Green Spaces', icon: '🌳' },
  };
  
  const getScoreColor = (score, maxScore) => {
    if (score === maxScore && maxScore > 0) return 'bg-emerald-500';
    if (score >= 4) return 'bg-blue-500';
    if (score >= 3) return 'bg-amber-500';
    return 'bg-gray-400';
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Compare Neighborhoods</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Header Row */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${neighborhoods.length}, 1fr)` }}>
            <div></div>
            {neighborhoods.map((n, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl mb-2">{getNeighborhoodIcon(n.name)}</div>
                <h3 className="font-bold text-gray-900">{n.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.character}</p>
              </div>
            ))}
          </div>
          
          {/* Category Rows */}
          <div className="mt-6 space-y-3">
            {categories.map(cat => {
              const scores = neighborhoods.map(n => n.categories?.[cat] || 0);
              const maxScore = Math.max(...scores);
              
              return (
                <div key={cat} className="grid gap-4 items-center py-3 border-b border-gray-100" style={{ gridTemplateColumns: `200px repeat(${neighborhoods.length}, 1fr)` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryLabels[cat]?.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{categoryLabels[cat]?.label}</span>
                  </div>
                  {neighborhoods.map((n, i) => {
                    const score = n.categories?.[cat] || 0;
                    return (
                      <div key={i} className="flex items-center justify-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                          <div 
                            className={`h-full ${getScoreColor(score, maxScore)} transition-all`}
                            style={{ width: `${(score / 5) * 100}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${score === maxScore && maxScore > 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                          {score}/5
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          
          {/* Best For Row */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Best For</h4>
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${neighborhoods.length}, 1fr)` }}>
              <div></div>
              {neighborhoods.map((n, i) => (
                <div key={i} className="flex flex-wrap gap-1">
                  {(n.appeal?.best_for || []).slice(0, 3).map((item, j) => (
                    <span key={j} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Atmosphere Row */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Atmosphere</h4>
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${neighborhoods.length}, 1fr)` }}>
              <div></div>
              {neighborhoods.map((n, i) => (
                <div key={i} className="flex flex-wrap gap-1">
                  {(n.appeal?.atmosphere || []).slice(0, 3).map((item, j) => (
                    <span key={j} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Transit Row */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Metro Stations</h4>
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${neighborhoods.length}, 1fr)` }}>
              <div></div>
              {neighborhoods.map((n, i) => (
                <div key={i} className="text-sm text-gray-600">
                  {(n.practical_info?.transit || []).slice(0, 2).join(', ')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Get neighborhood icon based on name
const getNeighborhoodIcon = (name) => {
  const nameLower = name?.toLowerCase() || '';
  if (nameLower.includes('marais')) return '🏛️';
  if (nameLower.includes('montmartre')) return '⛪';
  if (nameLower.includes('latin')) return '📚';
  if (nameLower.includes('champs')) return '🛍️';
  if (nameLower.includes('eiffel')) return '🗼';
  if (nameLower.includes('louvre')) return '🖼️';
  if (nameLower.includes('seine')) return '🌊';
  if (nameLower.includes('opera') || nameLower.includes('opéra')) return '🎭';
  if (nameLower.includes('bastille')) return '🏰';
  if (nameLower.includes('republic') || nameLower.includes('république')) return '🏛️';
  if (nameLower.includes('germain')) return '☕';
  if (nameLower.includes('belleville')) return '🎨';
  if (nameLower.includes('canal')) return '🚣';
  if (nameLower.includes('île') || nameLower.includes('ile') || nameLower.includes('cité')) return '🏝️';
  if (nameLower.includes('défense') || nameLower.includes('defense')) return '🏢';
  if (nameLower.includes('montparnasse')) return '🗼';
  return '🏘️';
};

// Neighborhood card with tabbed content
const NeighborhoodCard = ({ neighborhood, isSelected, onToggleSelect, isCompareMode, connections }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isHovered, setIsHovered] = useState(false);
  
  const tips = getInsiderTips(neighborhood);
  const atmospheres = neighborhood.appeal?.atmosphere || [];
  const knownFor = neighborhood.appeal?.known_for || [];
  const bestFor = neighborhood.appeal?.best_for || [];
  
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'eat', label: 'Eat & Drink' },
    { id: 'see', label: 'See & Do' },
    { id: 'tips', label: 'Tips' },
  ];
  
  return (
    <div 
      className={`group bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 overflow-hidden ${
        isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:shadow-md hover:border-gray-300'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with image placeholder and tips overlay */}
      <div className="relative h-40 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 overflow-hidden">
        {/* Pattern overlay for visual interest */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }} />
        
        {/* Large icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl opacity-60">{getNeighborhoodIcon(neighborhood.name)}</span>
        </div>
        
        {/* Compare checkbox */}
        {isCompareMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-purple-600 border-purple-600 text-white' 
                : 'bg-white/90 border-gray-300 hover:border-purple-400'
            }`}
          >
            {isSelected && <Check className="w-4 h-4" />}
          </button>
        )}
        
        {/* Central badge */}
        {neighborhood.location?.central && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Central
          </div>
        )}
        
        {/* Tips overlay on hover */}
        <TipsOverlay tips={tips} />
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Title and character */}
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 text-lg">{neighborhood.name}</h3>
          {neighborhood.alternate_names && neighborhood.alternate_names.length > 0 && (
            <p className="text-xs text-gray-500">{neighborhood.alternate_names[0]}</p>
          )}
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{neighborhood.character}</p>
        </div>
        
        {/* Atmosphere tags */}
        {atmospheres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {atmospheres.slice(0, 3).map((atm, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                {atm}
              </span>
            ))}
          </div>
        )}
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-3">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Tab content */}
        <div className="min-h-[140px]">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* Category ratings */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'dining', icon: '🍽️', label: 'Dining' },
                  { key: 'shopping', icon: '🛍️', label: 'Shopping' },
                  { key: 'nightlife', icon: '🌃', label: 'Nightlife' },
                  { key: 'cultural', icon: '🎭', label: 'Cultural' },
                ].map(cat => (
                  <div key={cat.key} className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${((neighborhood.categories?.[cat.key] || 0) / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-6">{neighborhood.categories?.[cat.key] || 0}/5</span>
                  </div>
                ))}
              </div>
              
              {/* Best for */}
              {bestFor.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Best for</div>
                  <div className="flex flex-wrap gap-1">
                    {bestFor.slice(0, 3).map((item, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'eat' && (
            <div className="space-y-2">
              {(neighborhood.highlights?.dining || []).slice(0, 3).map((place, i) => (
                <div key={i} className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{place.name}</span>
                    <span className="text-xs text-gray-500">{place.price_range}</span>
                  </div>
                  <p className="text-xs text-gray-600">{place.cuisine} • {place.known_for}</p>
                </div>
              ))}
              {(!neighborhood.highlights?.dining || neighborhood.highlights.dining.length === 0) && (
                <p className="text-sm text-gray-500 italic">No dining info available</p>
              )}
            </div>
          )}
          
          {activeTab === 'see' && (
            <div className="space-y-2">
              {(neighborhood.highlights?.attractions || []).slice(0, 3).map((place, i) => (
                <div key={i} className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getNeighborhoodIcon(place.type)}</span>
                    <span className="font-medium text-sm text-gray-900">{place.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{place.appeal}</p>
                </div>
              ))}
              {(!neighborhood.highlights?.attractions || neighborhood.highlights.attractions.length === 0) && (
                <p className="text-sm text-gray-500 italic">No attractions info available</p>
              )}
            </div>
          )}
          
          {activeTab === 'tips' && (
            <div className="space-y-3">
              {/* Stay here if / Avoid if */}
              {neighborhood.stay_here_if && neighborhood.stay_here_if.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 mb-1">
                    <Check className="w-3 h-3" />
                    Stay here if
                  </div>
                  <ul className="space-y-0.5">
                    {neighborhood.stay_here_if.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-xs text-gray-600">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {neighborhood.avoid_if && neighborhood.avoid_if.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-medium text-red-600 mb-1">
                    <X className="w-3 h-3" />
                    Skip if
                  </div>
                  <ul className="space-y-0.5">
                    {neighborhood.avoid_if.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-xs text-gray-600">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Transit */}
              {neighborhood.practical_info?.transit && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                    <Train className="w-3 h-3" />
                    Metro Stations
                  </div>
                  <p className="text-xs text-gray-600">
                    {neighborhood.practical_info.transit.slice(0, 3).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Connections */}
        {connections && connections.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-2">
              <MapPin className="w-3 h-3" />
              Nearby Neighborhoods
            </div>
            <div className="flex flex-wrap gap-2">
              {connections.slice(0, 2).map((conn, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{conn.walkTime} min to {conn.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Spotlight card for editor's picks
const SpotlightCard = ({ neighborhood, reason, onClick }) => {
  const tips = getInsiderTips(neighborhood);
  
  return (
    <div 
      className="group relative bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={onClick}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="1" fill-rule="evenodd"%3E%3Cpath d="M0 40L40 0H20L0 20M40 40V20L20 40"/%3E%3C/g%3E%3C/svg%3E")'
      }} />
      
      {/* Badge */}
      <div className="absolute top-4 right-4 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Editor&apos;s Pick
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <span className="text-4xl mb-3 block">{getNeighborhoodIcon(neighborhood.name)}</span>
        <h3 className="text-xl font-bold mb-1">{neighborhood.name}</h3>
        <p className="text-purple-200 text-sm mb-3">{reason}</p>
        <p className="text-white/80 text-sm line-clamp-2">{neighborhood.character}</p>
        
        {/* Quick stats */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(neighborhood.appeal?.atmosphere || []).slice(0, 2).map((atm, i) => (
            <span key={i} className="px-2 py-1 bg-white/20 rounded-full text-xs">
              {atm}
            </span>
          ))}
        </div>
      </div>
      
      {/* Hover arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
      </div>
    </div>
  );
};

const NeighborhoodsList = ({ neighborhoods, cityName }) => {
  const neighborhoodsList = Array.isArray(neighborhoods) ? neighborhoods : (neighborhoods?.neighborhoods || []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // Add unique IDs
  const neighborhoodsWithIds = useMemo(() => 
    neighborhoodsList.map((neighborhood, index) => ({
      ...neighborhood,
      id: neighborhood.id || `neighborhood-${index}`
    })),
    [neighborhoodsList]
  );
  
  // Get unique neighborhoods (some might be duplicated in the data)
  const uniqueNeighborhoods = useMemo(() => {
    const seen = new Set();
    return neighborhoodsWithIds.filter(n => {
      if (seen.has(n.name)) return false;
      seen.add(n.name);
      return true;
    });
  }, [neighborhoodsWithIds]);
  
  // Check if neighborhood matches persona
  const matchesPersona = useCallback((neighborhood, persona) => {
    if (!persona) return true;
    const bestFor = (neighborhood.appeal?.best_for || []).map(s => s.toLowerCase());
    return persona.keywords.some(keyword => 
      bestFor.some(bf => bf.includes(keyword.toLowerCase()))
    );
  }, []);
  
  // Filter neighborhoods
  const filteredNeighborhoods = useMemo(() => {
    return uniqueNeighborhoods.filter(neighborhood => {
      // Search filter
      if (searchTerm) {
        const nameMatch = neighborhood.name.toLowerCase().includes(searchTerm.toLowerCase());
        const characterMatch = (neighborhood.character || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (!nameMatch && !characterMatch) return false;
      }
      
      // Persona filter
      if (selectedPersona && !matchesPersona(neighborhood, selectedPersona)) {
        return false;
      }
      
      return true;
    });
  }, [uniqueNeighborhoods, searchTerm, selectedPersona, matchesPersona]);
  
  // Get editor's picks neighborhoods
  const editorsPicks = useMemo(() => {
    return EDITORS_PICKS.map(pick => ({
      ...pick,
      neighborhood: uniqueNeighborhoods.find(n => n.name === pick.name)
    })).filter(pick => pick.neighborhood);
  }, [uniqueNeighborhoods]);
  
  // Toggle comparison selection
  const toggleCompareSelect = useCallback((neighborhood) => {
    setSelectedForCompare(prev => {
      const isSelected = prev.some(n => n.name === neighborhood.name);
      if (isSelected) {
        return prev.filter(n => n.name !== neighborhood.name);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), neighborhood];
      }
      return [...prev, neighborhood];
    });
  }, []);
  
  // Get connections for a neighborhood
  const getConnections = useCallback((neighborhoodName) => {
    return NEIGHBORHOOD_CONNECTIONS[neighborhoodName] || [];
  }, []);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedPersona(null);
  }, []);
  
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Explore {cityName} Neighborhoods
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredNeighborhoods.length} neighborhoods to discover
          </p>
        </div>
        
        {/* Compare mode toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsCompareMode(!isCompareMode);
              if (isCompareMode) {
                setSelectedForCompare([]);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isCompareMode
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            {isCompareMode ? 'Exit Compare' : 'Compare'}
          </button>
          
          {isCompareMode && selectedForCompare.length >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Compare {selectedForCompare.length}
            </button>
          )}
        </div>
      </div>
      
      {/* Compare mode hint */}
      {isCompareMode && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <Scale className="w-5 h-5 text-purple-600 shrink-0" />
          <p className="text-sm text-purple-800">
            Select 2-3 neighborhoods to compare side-by-side. 
            <span className="font-medium"> {selectedForCompare.length}/3 selected</span>
          </p>
        </div>
      )}
      
      {/* Persona quick filters */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-gray-800">I&apos;m a...</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map(persona => {
            const Icon = persona.icon;
            const isActive = selectedPersona?.id === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => setSelectedPersona(isActive ? null : persona)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-purple-100 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {persona.label}
              </button>
            );
          })}
          
          {(selectedPersona || searchTerm) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
        
        {/* Search */}
        <div className="mt-3">
          <input
            type="search"
            placeholder="Search neighborhoods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          />
        </div>
      </div>
      
      {/* Editor's Picks Spotlight */}
      {!searchTerm && !selectedPersona && editorsPicks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-gray-900">Editor&apos;s Picks</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {editorsPicks.map((pick, i) => (
              <SpotlightCard
                key={i}
                neighborhood={pick.neighborhood}
                reason={pick.reason}
                onClick={() => {
                  const element = document.getElementById(`neighborhood-${pick.neighborhood.name.replace(/\s+/g, '-').toLowerCase()}`);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Results count and active filter */}
      {(selectedPersona || searchTerm) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{filteredNeighborhoods.length} neighborhoods</span>
          {selectedPersona && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              for {selectedPersona.label}
            </span>
          )}
        </div>
      )}
      
      {/* Neighborhoods grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredNeighborhoods.map((neighborhood) => (
          <div 
            key={neighborhood.id}
            id={`neighborhood-${neighborhood.name.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <NeighborhoodCard
              neighborhood={neighborhood}
              isSelected={selectedForCompare.some(n => n.name === neighborhood.name)}
              onToggleSelect={() => toggleCompareSelect(neighborhood)}
              isCompareMode={isCompareMode}
              connections={getConnections(neighborhood.name)}
            />
          </div>
        ))}
      </div>
      
      {/* Empty state */}
      {filteredNeighborhoods.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <div className="text-4xl mb-4">🏘️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No neighborhoods found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters or search</p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}
      
      {/* Comparison Modal */}
      {showComparison && (
        <ComparisonModal
          neighborhoods={selectedForCompare}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
};

export default NeighborhoodsList;
