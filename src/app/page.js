'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {







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

      {/* Hero Section - Simple Clean Design */}
      <section className="relative h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="text-center text-white px-4 max-w-4xl">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
            Your Perfect European Adventure
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
            Discover iconic cities, hidden gems, and seamless travel connections across Europe.
          </p>
          
          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/start-planning"
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-white border-opacity-30 transform hover:scale-105"
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