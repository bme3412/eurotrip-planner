'use client';

import React from 'react';
import { Umbrella, BookOpen, Utensils, Map, Building, Music } from 'lucide-react';

const InterestCategories = ({ setSelectedCategory }) => {
  const categories = [
    { id: 'beaches', name: 'Beaches & Coast', icon: Umbrella, description: 'Stunning coastlines and beach destinations' },
    { id: 'cultural', name: 'Cultural Sites', icon: BookOpen, description: 'Museums, historical landmarks, and cultural experiences' },
    { id: 'food', name: 'Food & Drink', icon: Utensils, description: 'Culinary adventures and wine regions' },
    { id: 'nature', name: 'Natural Wonders', icon: Map, description: 'National parks, scenic landscapes, and outdoor activities' },
    { id: 'urban', name: 'Urban Exploration', icon: Building, description: 'City breaks, architecture, and urban culture' },
    { id: 'events', name: 'Festivals & Events', icon: Music, description: 'Music festivals, cultural celebrations, and special events' }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setSelectedCategory(category.id)}
          className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow border-2 border-transparent hover:border-indigo-200"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-indigo-100 p-3 rounded-full">
              <category.icon className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{category.name}</h3>
          </div>
          <p className="text-sm text-slate-600">{category.description}</p>
        </button>
      ))}
    </div>
  );
};

export default InterestCategories;