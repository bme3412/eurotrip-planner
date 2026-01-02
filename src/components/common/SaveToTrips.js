'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function SaveToTrips({ 
  cityName, 
  cityData,
  className = '',
  showLabel = true,
  variant = 'default' // 'default' | 'hero'
}) {
  const { user, isSupabaseConfigured } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if city is saved (from Supabase if logged in, localStorage otherwise)
  const checkIfSaved = useCallback(async () => {
    if (user && isSupabaseConfigured) {
      // Check Supabase
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('saved_trips')
          .select('id')
          .eq('user_id', user.id)
          .eq('city_name', cityName);
        
        if (error) {
          console.error('Error checking saved status:', error);
        }
        // data is an array - check if it has any items
        setIsSaved(data && data.length > 0);
      }
    } else {
      // Check localStorage
      const savedTrips = getLocalSavedTrips();
      setIsSaved(savedTrips.some(trip => trip.cityName === cityName));
    }
    setLoading(false);
  }, [user, isSupabaseConfigured, cityName]);

  useEffect(() => {
    checkIfSaved();
  }, [checkIfSaved]);

  const getLocalSavedTrips = () => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('savedTrips');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading saved trips:', error);
      return [];
    }
  };

  const handleSaveToggle = async () => {
    setLoading(true);

    if (user && isSupabaseConfigured) {
      // Use Supabase
      const supabase = getSupabaseClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      if (isSaved) {
        // Remove from Supabase
        const { error } = await supabase
          .from('saved_trips')
          .delete()
          .eq('user_id', user.id)
          .eq('city_name', cityName);

        if (error) {
          console.error('Supabase delete error:', error);
        } else {
          setIsSaved(false);
          showNotificationMessage('Removed from wishlists');
        }
      } else {
        // Add to Supabase
        const insertData = {
          user_id: user.id,
          city_name: cityName,
          display_name: cityData?.displayName || cityName,
          country: cityData?.country || 'Unknown',
          image: cityData?.heroImage || null,
          description: cityData?.overview?.introduction || null,
        };
        
        const { error } = await supabase
          .from('saved_trips')
          .insert(insertData);

        if (error) {
          console.error('Supabase save error:', error);
          showNotificationMessage('Error saving');
        } else {
          setIsSaved(true);
          showNotificationMessage('Added to wishlists!');
        }
      }
    } else {
      // Use localStorage
      const savedTrips = getLocalSavedTrips();
      
      if (isSaved) {
        const updatedTrips = savedTrips.filter(trip => trip.cityName !== cityName);
        localStorage.setItem('savedTrips', JSON.stringify(updatedTrips));
        setIsSaved(false);
        showNotificationMessage('Removed from wishlists');
      } else {
        const tripData = {
          cityName,
          displayName: cityData?.displayName || cityName,
          country: cityData?.country || 'Unknown',
          savedAt: new Date().toISOString(),
          image: cityData?.heroImage || null,
          description: cityData?.overview?.introduction || null,
        };
        
        savedTrips.push(tripData);
        localStorage.setItem('savedTrips', JSON.stringify(savedTrips));
        setIsSaved(true);
        showNotificationMessage('Added to wishlists!');
      }
    }

    setLoading(false);
  };

  const showNotificationMessage = (message) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(false), 3000);
  };

  // Style variants
  const getButtonStyles = () => {
    if (variant === 'hero') {
      return isSaved
        ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg'
        : 'bg-white/20 backdrop-blur-sm text-white border border-white/40 hover:bg-white/30 hover:border-white/60';
    }
    return isSaved
      ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm'
      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-rose-300';
  };

  const iconSize = variant === 'hero' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <>
      <button
        onClick={handleSaveToggle}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${getButtonStyles()} ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {isSaved ? (
          <HeartSolid className={iconSize} />
        ) : (
          <HeartOutline className={iconSize} />
        )}
        {showLabel && (
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        )}
      </button>

      {showNotification && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            {isSaved ? (
              <HeartSolid className="w-5 h-5 text-rose-400" />
            ) : (
              <HeartOutline className="w-5 h-5 text-gray-400" />
            )}
            <span>{showNotification}</span>
          </div>
        </div>
      )}
    </>
  );
}

// Component to view saved trips - works with both Supabase and localStorage
export function SavedTripsList() {
  const { user, isSupabaseConfigured, loading: authLoading } = useAuth();
  const [savedTrips, setSavedTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSavedTrips = useCallback(async () => {
    setLoading(true);

    if (user && isSupabaseConfigured) {
      // Load from Supabase
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('saved_trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Transform to match the expected format
          setSavedTrips(data.map(trip => ({
            cityName: trip.city_name,
            displayName: trip.display_name,
            country: trip.country,
            savedAt: trip.created_at,
            image: trip.image,
            description: trip.description,
            id: trip.id,
          })));
        }
      }
    } else {
      // Load from localStorage
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('savedTrips');
          setSavedTrips(saved ? JSON.parse(saved) : []);
        } catch (error) {
          console.error('Error loading saved trips:', error);
        }
      }
    }

    setLoading(false);
  }, [user, isSupabaseConfigured]);

  useEffect(() => {
    if (authLoading) return;
    loadSavedTrips();
  }, [authLoading, loadSavedTrips]);

  const removeTrip = async (trip) => {
    if (user && isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase && trip.id) {
        await supabase
          .from('saved_trips')
          .delete()
          .eq('id', trip.id);
      }
    } else {
      const updated = savedTrips.filter(t => t.cityName !== trip.cityName);
      localStorage.setItem('savedTrips', JSON.stringify(updated));
    }
    
    setSavedTrips(savedTrips.filter(t => t.cityName !== trip.cityName));
  };

  if (loading || authLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-64" />
        ))}
      </div>
    );
  }

  if (savedTrips.length === 0) {
    return (
      <div className="text-center py-12">
        <HeartOutline className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No saved cities yet</h3>
        <p className="text-gray-600">
          {user 
            ? 'Start exploring cities and save them to plan your trip!'
            : 'Sign in to sync your wishlists across devices, or browse as a guest!'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {savedTrips.map((trip) => (
        <div key={trip.cityName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
          <div className="relative">
            {trip.image && (
              <Image 
                src={trip.image} 
                alt={trip.displayName}
                width={400}
                height={192}
                className="w-full h-48 object-cover"
              />
            )}
            <button
              onClick={() => removeTrip(trip)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
              title="Remove from wishlists"
            >
              <HeartSolid className="w-5 h-5 text-rose-500" />
            </button>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">{trip.displayName}</h3>
            <p className="text-sm text-gray-600 mb-3">{trip.country}</p>
            {trip.description && (
              <p className="text-sm text-gray-700 line-clamp-2 mb-4">{trip.description}</p>
            )}
            <div className="flex gap-2">
              <a
                href={`/city-guides/${trip.cityName.toLowerCase()}`}
                className="flex-1 text-center px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                View Guide
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Saved {new Date(trip.savedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
