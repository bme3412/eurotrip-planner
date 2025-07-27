'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCities } from '../hooks/useCityData';
import OptimizedVideo from '../components/common/OptimizedVideo';

export default function Home() {
  const [videoLoaded, setVideoLoaded] = useState({});
  const videoRefs = useRef({});
  const { cities, loading, error } = useCities({ limit: 20 });

  // Featured cities data matching the image design
  const featuredCities = [
    {
      id: 'pamplona',
      name: 'Pamplona',
      country: 'Spain',
      month: 'July',
      flag: '🇪🇸',
      videoSrc: '/videos/pamplona-runningofbulls.mp4',
      fallbackImage: '/images/madrid-thumbnail.jpeg' // Using Madrid as fallback for Pamplona
    },
    {
      id: 'venice',
      name: 'Venice',
      country: 'Italy',
      month: 'April',
      flag: '🇮🇹',
      videoSrc: '/videos/venice-gondola.mp4',
      fallbackImage: '/images/venice-thumbnail.jpeg'
    },
    {
      id: 'lisbon',
      name: 'Lisbon',
      country: 'Portugal',
      month: 'May',
      flag: '🇵🇹',
      videoSrc: '/videos/lisbon-tram.mp4',
      fallbackImage: '/images/lisbon-thumbnail.png'
    }
  ];

  const handleVideoLoad = (cityId) => {
    setVideoLoaded(prev => ({ ...prev, [cityId]: true }));
  };

  const handleVideoError = (cityId) => {
    // If video fails to load, we'll use the fallback image
    setVideoLoaded(prev => ({ ...prev, [cityId]: 'error' }));
  };

  const nextSlide = () => {
    // For now, just keep the current layout
    console.log('Next slide clicked');
  };

  const prevSlide = () => {
    // For now, just keep the current layout
    console.log('Previous slide clicked');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-2">Loading Your Perfect European Adventure</h2>
          <p className="text-lg opacity-90">Discovering amazing destinations...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Unable to Load Destinations
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 right-0 z-50 p-6">
        <div className="flex gap-3">
          <Link
            href="/city-guides"
            className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-30 transition-all duration-200 border border-white border-opacity-30"
          >
            City Guides
          </Link>
          <Link
            href="/explore"
            className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-30 transition-all duration-200 border border-white border-opacity-30"
          >
            Explore
          </Link>
          <Link
            href="/start-planning"
            className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-30 transition-all duration-200 border border-white border-opacity-30"
          >
            Start Planning
          </Link>
        </div>
      </nav>

      {/* Hero Section - Just Videos First */}
      <section className="relative h-screen overflow-hidden">
        {/* Three Column Layout - Videos Only */}
        <div className="flex h-full">
          
          {featuredCities.map((city, index) => (
            <div key={city.id} className="relative h-full w-1/3">
              {/* Video Background Only */}
              <video
                src={city.videoSrc}
                className="h-full w-full object-cover"
                muted
                loop
                autoPlay
                playsInline
              />
              
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>

              {/* City Information (Bottom Left) - show on all panels */}
              <div className="absolute bottom-4 left-8 text-white z-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">{city.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{city.flag}</span>
                </div>
              </div>

              {/* Central Text Overlay - only on center panel */}
              {index === 1 && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="text-center text-white px-4 max-w-4xl">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight animate-fade-in">
                      Your Perfect European Adventure
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl mb-8 opacity-90 max-w-2xl mx-auto animate-fade-in-delay">
                      Discover iconic cities, hidden gems, and seamless travel connections across Europe.
                    </p>
                    
                    {/* Call to Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pointer-events-auto animate-fade-in-delay-2">
                      <Link
                        href="/start-planning"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Plan My Eurotrip
                      </Link>
                      <Link
                        href="/city-guides"
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-white border-opacity-30 transform hover:scale-105"
                      >
                        Explore City Guides
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Arrows */}
              {index === 0 && (
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              
              {index === 2 && (
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Additional Content Sections */}
      <div className="container mx-auto px-4 py-16">
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Why Choose Our Planner?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Personalized Itineraries</h3>
              <p className="text-gray-700">Create custom travel plans based on your interests, timeline, and budget.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Local Insights</h3>
              <p className="text-gray-700">Discover hidden gems and authentic experiences with our local recommendations.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Seasonal Guides</h3>
              <p className="text-gray-700">Travel at the perfect time with our month-by-month destination guides.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}