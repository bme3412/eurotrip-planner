'use client';

import React from 'react';
import InteractiveHeader from '../components/common/InteractiveHeader';
import { useTravelData } from '../context/TravelDataProvider';
import Link from 'next/link';

export default function Home() {
  const { popularCities } = useTravelData();
  
  // Get a smaller list of featured cities
  const featuredCities = popularCities.slice(0, 6).map(city => ({
    id: city.toLowerCase().replace(/\s+/g, '-'),
    name: city,
    country: getCountryForCity(city),
    imageUrl: `/images/${city.toLowerCase().replace(/\s+/g, '-')}.jpg`
  }));

  // Helper function to determine country for a city
  function getCountryForCity(city) {
    const cityMap = {
      'Paris': 'France',
      'Barcelona': 'Spain',
      'Rome': 'Italy',
      'Venice': 'Italy',
      'Florence': 'Italy',
      'Amsterdam': 'Netherlands',
      'Berlin': 'Germany',
      'Prague': 'Czech Republic',
      'Vienna': 'Austria',
      'Athens': 'Greece',
      'Lisbon': 'Portugal',
      'Madrid': 'Spain',
      'London': 'United Kingdom',
      'Dublin': 'Ireland',
      'Copenhagen': 'Denmark',
      'Stockholm': 'Sweden',
      'Budapest': 'Hungary',
      'Zurich': 'Switzerland',
      'Ljubljana': 'Slovenia',
      'Pamplona': 'Spain',
      'Piran': 'Slovenia',
      'Côte d\'Azur': 'France'
    };
    
    return cityMap[city] || 'Europe';
  }
  
  // Inline SVG placeholder for missing images
  const placeholderImage = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 400' preserveAspectRatio='none'%3E%3Cdefs%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0' x2='0' y1='0' y2='100%25' gradientTransform='rotate(240)'%3E%3Cstop offset='0' stop-color='%23506C8B'/%3E%3Cstop offset='1' stop-color='%232E4057'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23a)'/%3E%3C/svg%3E`;
  
  return (
    <main className="bg-gray-50">
      {/* --- Header Section --- */}
      <div className="relative h-screen overflow-hidden">
        {/* Header Content - Positioned above videos */}
        {/* The InteractiveHeader component likely handles its own internal z-index for content and background videos */}
        <InteractiveHeader /> 
      </div>
      {/* --- End Header Section --- */}
      
      {/* --- Main Content Section --- */}
      {/* Removed relative z-10 and semi-transparent background */}
      <div className="container mx-auto px-4 py-16">
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Featured Destinations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCities.map((city) => (
              <Link 
                href={`/city-guides/${city.id}`} 
                key={city.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-48 overflow-hidden">
                  <img 
                    src={city.imageUrl || placeholderImage} 
                    alt={city.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = placeholderImage;
                    }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-800">{city.name}</h3>
                  <p className="text-gray-600">{city.country}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link 
              href="/city-guides" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg"
            >
              View All Destinations
            </Link>
          </div>
        </section>
        
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Why Choose Our Planner?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Personalized Itineraries</h3>
              <p className="text-gray-700">Create custom travel plans based on your interests, timeline, and budget.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Local Insights</h3>
              <p className="text-gray-700">Discover hidden gems and authentic experiences with our local recommendations.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Seasonal Guides</h3>
              <p className="text-gray-700">Travel at the perfect time with our month-by-month destination guides.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}