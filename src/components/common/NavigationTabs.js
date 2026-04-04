'use client';

import React from 'react';
import { Map, Star, Sun, PlusCircle, Bookmark } from 'lucide-react';

const NavigationTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'Explore', icon: Map, label: 'Explore' },
    { id: 'By Interest', icon: Star, label: 'By Interest' },
    { id: 'Seasonal', icon: Sun, label: 'Seasonal' },
    { id: 'Custom', icon: PlusCircle, label: 'Custom' },
    { id: 'My Trip', icon: Bookmark, label: 'My Trip' }
  ];

  return (
    <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-8 py-4 rounded-xl transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 transform scale-105'
                : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default NavigationTabs;