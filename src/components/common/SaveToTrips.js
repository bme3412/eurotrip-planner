'use client';

import React, { useCallback, useState } from 'react';
import Image from 'next/image';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist, useWishlistList } from '@/hooks/useWishlist';

export default function SaveToTrips({
  cityName,
  cityData,
  className = '',
  showLabel = true,
  variant = 'default', // 'default' | 'hero'
}) {
  const { isSaved, loading, toggle } = useWishlist(cityName, cityData);
  const [notification, setNotification] = useState(null);

  const showNotificationMessage = useCallback((message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleSaveToggle = useCallback(async () => {
    const { action } = await toggle();
    if (action === 'added') showNotificationMessage('Added to wishlists!');
    else if (action === 'removed') showNotificationMessage('Removed from wishlists');
    else if (action === 'noop') showNotificationMessage('Error saving');
  }, [toggle, showNotificationMessage]);

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

      {notification && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            {isSaved ? (
              <HeartSolid className="w-5 h-5 text-rose-400" />
            ) : (
              <HeartOutline className="w-5 h-5 text-gray-400" />
            )}
            <span>{notification}</span>
          </div>
        </div>
      )}
    </>
  );
}

// Component to view saved trips - works with both Supabase and localStorage
export function SavedTripsList() {
  const { user } = useAuth();
  const { savedTrips, loading, remove } = useWishlistList();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
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
              onClick={() => remove(trip)}
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
