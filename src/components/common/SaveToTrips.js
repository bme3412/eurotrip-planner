'use client';

import React, { useState, useEffect } from 'react';
import { BookmarkIcon as BookmarkOutline } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';

export default function SaveToTrips({ 
  cityName, 
  cityData,
  className = '',
  showLabel = true 
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Check if city is already saved
    const savedTrips = getSavedTrips();
    setIsSaved(savedTrips.some(trip => trip.cityName === cityName));
  }, [cityName]);

  const getSavedTrips = () => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('savedTrips');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading saved trips:', error);
      return [];
    }
  };

  const handleSaveToggle = () => {
    const savedTrips = getSavedTrips();
    
    if (isSaved) {
      // Remove from saved trips
      const updatedTrips = savedTrips.filter(trip => trip.cityName !== cityName);
      localStorage.setItem('savedTrips', JSON.stringify(updatedTrips));
      setIsSaved(false);
      showNotificationMessage('Removed from your trips');
    } else {
      // Add to saved trips
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
  };

  const showNotificationMessage = (message) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <>
      <button
        onClick={handleSaveToggle}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
          isSaved
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        } ${className}`}
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

// Component to view saved trips
export function SavedTripsList() {
  const [savedTrips, setSavedTrips] = useState([]);

  useEffect(() => {
    loadSavedTrips();
  }, []);

  const loadSavedTrips = () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('savedTrips');
      setSavedTrips(saved ? JSON.parse(saved) : []);
    } catch (error) {
      console.error('Error loading saved trips:', error);
    }
  };

  const removeTrip = (cityName) => {
    const updated = savedTrips.filter(trip => trip.cityName !== cityName);
    localStorage.setItem('savedTrips', JSON.stringify(updated));
    setSavedTrips(updated);
  };

  if (savedTrips.length === 0) {
    return (
      <div className="text-center py-12">
        <BookmarkOutline className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No saved trips yet</h3>
        <p className="text-gray-600">Start exploring cities and save them to plan your trip!</p>
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
                onClick={() => removeTrip(trip.cityName)}
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

