'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookmarkIcon as BookmarkOutline } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function SaveToTrips({ 
  cityName, 
  cityData,
  className = '',
  showLabel = true 
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
          showNotificationMessage('Removed from your trips');
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
        console.log('Attempting to save:', insertData);
        
        const { error } = await supabase
          .from('saved_trips')
          .insert(insertData);

        if (error) {
          console.error('Supabase save error:', error);
          showNotificationMessage('Error saving trip');
        } else {
          setIsSaved(true);
          showNotificationMessage('Saved to your trips!');
        }
      }
    } else {
      // Use localStorage
      const savedTrips = getLocalSavedTrips();
      
      if (isSaved) {
        const updatedTrips = savedTrips.filter(trip => trip.cityName !== cityName);
        localStorage.setItem('savedTrips', JSON.stringify(updatedTrips));
        setIsSaved(false);
        showNotificationMessage('Removed from your trips');
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
        showNotificationMessage('Saved to your trips!');
      }
    }

    setLoading(false);
  };

  const showNotificationMessage = (message) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <>
      <button
        onClick={handleSaveToggle}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
          isSaved
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {isSaved ? (
          <BookmarkSolid className="w-5 h-5" />
        ) : (
          <BookmarkOutline className="w-5 h-5" />
        )}
        {showLabel && (
          <span>{isSaved ? 'Saved' : 'Save to Trips'}</span>
        )}
      </button>

      {showNotification && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            {isSaved ? (
              <BookmarkSolid className="w-5 h-5 text-blue-400" />
            ) : (
              <BookmarkOutline className="w-5 h-5 text-gray-400" />
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

  useEffect(() => {
    if (authLoading) return;
    loadSavedTrips();
  }, [user, isSupabaseConfigured, authLoading]);

  const loadSavedTrips = async () => {
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
  };

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
          <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-64" />
        ))}
      </div>
    );
  }

  if (savedTrips.length === 0) {
    return (
      <div className="text-center py-12">
        <BookmarkOutline className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No saved trips yet</h3>
        <p className="text-gray-600">
          {user 
            ? 'Start exploring cities and save them to plan your trip!'
            : 'Sign in to sync your saved trips across devices, or browse as a guest!'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {savedTrips.map((trip) => (
        <div key={trip.cityName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
          {trip.image && (
            <img 
              src={trip.image} 
              alt={trip.displayName}
              className="w-full h-48 object-cover"
            />
          )}
          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">{trip.displayName}</h3>
            <p className="text-sm text-gray-600 mb-3">{trip.country}</p>
            {trip.description && (
              <p className="text-sm text-gray-700 line-clamp-2 mb-4">{trip.description}</p>
            )}
            <div className="flex gap-2">
              <a
                href={`/city-guides/${trip.cityName.toLowerCase()}`}
                className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View Guide
              </a>
              <button
                onClick={() => removeTrip(trip)}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <BookmarkSolid className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Saved {new Date(trip.savedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
