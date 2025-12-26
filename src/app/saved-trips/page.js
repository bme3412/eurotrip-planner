'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import AuthButton from '@/components/auth/AuthButton';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';

export default function SavedTripsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('cities');
  const [savedCities, setSavedCities] = useState([]);
  const [savedExperiences, setSavedExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    loadSavedItems();
  }, [user, authLoading]);

  const loadSavedItems = async () => {
    setLoading(true);

    if (user) {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Load saved cities
        const { data: cities } = await supabase
          .from('saved_trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (cities) setSavedCities(cities);

        // Load saved experiences
        const { data: experiences } = await supabase
          .from('saved_experiences')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (experiences) setSavedExperiences(experiences);
      }
    } else {
      // Load from localStorage
      try {
        const saved = localStorage.getItem('savedTrips');
        setSavedCities(saved ? JSON.parse(saved) : []);
      } catch (e) {
        console.error('Error loading saved trips:', e);
      }
    }

    setLoading(false);
  };

  const removeSavedCity = async (city) => {
    if (user) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('saved_trips')
          .delete()
          .eq('id', city.id);
      }
    } else {
      const updated = savedCities.filter(c => c.city_name !== city.city_name);
      localStorage.setItem('savedTrips', JSON.stringify(updated));
    }
    setSavedCities(savedCities.filter(c => c.id !== city.id && c.city_name !== city.city_name));
  };

  const removeSavedExperience = async (exp) => {
    if (user) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('saved_experiences')
          .delete()
          .eq('id', exp.id);
      }
    }
    setSavedExperiences(savedExperiences.filter(e => e.id !== exp.id));
  };

  // Group experiences by city
  const experiencesByCity = savedExperiences.reduce((acc, exp) => {
    const city = exp.city_name || 'Unknown';
    if (!acc[city]) acc[city] = [];
    acc[city].push(exp);
    return acc;
  }, {});

  const totalSaved = savedCities.length + savedExperiences.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Saved Items</h1>
                {!loading && (
                  <p className="text-sm text-gray-500">{totalSaved} saved</p>
                )}
              </div>
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Account Status Banner - Compact */}
        {!authLoading && (
          <div className={`mb-6 px-4 py-3 rounded-lg flex items-center justify-between ${
            user 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-lg">{user ? '✅' : '☁️'}</span>
              <span className={`text-sm font-medium ${user ? 'text-green-800' : 'text-amber-800'}`}>
                {user 
                  ? `Synced as ${user.email}` 
                  : 'Saved locally only'}
              </span>
            </div>
            {!user && <AuthButton />}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('cities')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'cities'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏙️ Cities ({savedCities.length})
          </button>
          <button
            onClick={() => setActiveTab('experiences')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'experiences'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⭐ Experiences ({savedExperiences.length})
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-48" />
            ))}
          </div>
        )}

        {/* Cities Tab */}
        {!loading && activeTab === 'cities' && (
          <>
            {savedCities.length === 0 ? (
              <div className="text-center py-16">
                <BookmarkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No saved cities yet</h3>
                <p className="text-gray-600 mb-6">Explore city guides and save your favorites!</p>
                <Link
                  href="/city-guides"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse City Guides
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedCities.map((city) => (
                  <div 
                    key={city.id || city.city_name} 
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
                  >
                    <div className="relative h-36 bg-gradient-to-br from-blue-100 to-indigo-100">
                      {city.image && (
                        <Image
                          src={city.image}
                          alt={city.display_name || city.city_name}
                          fill
                          className="object-cover"
                        />
                      )}
                      <button
                        onClick={() => removeSavedCity(city)}
                        className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                        title="Remove from saved"
                      >
                        <BookmarkSolid className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900">{city.display_name || city.city_name}</h3>
                      <p className="text-sm text-gray-500 mb-3">{city.country}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          Saved {new Date(city.created_at || city.savedAt).toLocaleDateString()}
                        </span>
                        <Link
                          href={`/city-guides/${(city.city_name || city.cityName || '').toLowerCase()}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          View Guide →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Experiences Tab */}
        {!loading && activeTab === 'experiences' && (
          <>
            {savedExperiences.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl mb-4 block">⭐</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No saved experiences yet</h3>
                <p className="text-gray-600 mb-6">
                  Visit a city guide and bookmark attractions you want to visit!
                </p>
                <Link
                  href="/city-guides"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse City Guides
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(experiencesByCity).map(([cityName, experiences]) => (
                  <div key={cityName}>
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 capitalize">{cityName}</h2>
                      <span className="text-sm text-gray-400">({experiences.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {experiences.map((exp) => (
                        <div 
                          key={exp.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {exp.experience_name}
                              </h3>
                              {exp.category && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  {exp.category}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeSavedExperience(exp)}
                              className="p-1.5 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                              title="Remove from saved"
                            >
                              <BookmarkSolid className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>
                          {exp.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                              {exp.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Saved {new Date(exp.created_at).toLocaleDateString()}</span>
                            <Link
                              href={`/city-guides/${cityName.toLowerCase()}`}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              View in guide →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Quick Links */}
        {!loading && totalSaved > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-500 mb-4">Discover more destinations</p>
            <Link
              href="/city-guides"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse All City Guides
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
