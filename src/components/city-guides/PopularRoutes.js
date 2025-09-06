// src/components/city-guides/PopularRoutes.js
import React from 'react';
import Link from 'next/link';

const routes = [
  {
    id: 'classic-western-europe',
    name: 'Classic Western Europe',
    duration: '14 days',
    cities: ['Paris', 'Amsterdam', 'Brussels', 'Luxembourg'],
    description: 'The perfect introduction to Europe with iconic attractions, world-class museums, and beautiful city centers.',
    highlights: ['Eiffel Tower', 'Van Gogh Museum', 'Grand Place', 'Historic fortifications'],
    difficulty: 'Easy',
    bestTime: 'April-October',
    transportType: 'Train',
  },
  {
    id: 'southern-european-charm',
    name: 'Southern European Charm',
    duration: '16 days',
    cities: ['Barcelona', 'Nice', 'Rome', 'Florence', 'Venice'],
    description: 'Experience Mediterranean beauty with stunning coastlines, ancient history, and world-renowned cuisine.',
    highlights: ['Sagrada Familia', 'French Riviera', 'Colosseum', 'Tuscany', 'Canal cruises'],
    difficulty: 'Moderate',
    bestTime: 'May-September',
    transportType: 'Train & Flights',
  },
  {
    id: 'central-european-highlights',
    name: 'Central European Highlights',
    duration: '12 days',
    cities: ['Prague', 'Vienna', 'Budapest', 'Krakow'],
    description: 'Discover imperial grandeur, musical heritage, and stunning architecture across Central Europe.',
    highlights: ['Prague Castle', 'Schönbrunn Palace', 'Hungarian Parliament', 'Wawel Castle'],
    difficulty: 'Moderate',
    bestTime: 'April-June & September-October',
    transportType: 'Train',
  },
  {
    id: 'northern-europe-adventure',
    name: 'Northern Europe Adventure',
    duration: '10 days',
    cities: ['Copenhagen', 'Stockholm', 'Oslo', 'Helsinki'],
    description: 'Explore Scandinavian design, natural beauty, and progressive urban environments.',
    highlights: ['Nyhavn', 'Vasa Museum', 'Norwegian Fjords', 'Design Districts'],
    difficulty: 'Moderate',
    bestTime: 'May-September',
    transportType: 'Train & Ferry',
  },
  {
    id: 'eastern-european-gems',
    name: 'Eastern European Gems',
    duration: '14 days',
    cities: ['Tallinn', 'Riga', 'Vilnius', 'Warsaw', 'Krakow'],
    description: 'Discover colorful medieval towns, authentic local traditions, and landscapes unmarred by mass tourism.',
    highlights: ['Tallinn Old Town', 'Art Nouveau architecture', 'Baltic heritage', 'Polish castles'],
    difficulty: 'Moderate',
    bestTime: 'May-September',
    transportType: 'Bus & Train',
  },
  {
    id: 'british-isles-explorer',
    name: 'British Isles Explorer',
    duration: '12 days',
    cities: ['London', 'Edinburgh', 'Dublin', 'Belfast'],
    description: 'Experience rich history, literary heritage, and dramatic landscapes across the UK and Ireland.',
    highlights: ['Tower of London', 'Edinburgh Castle', 'Guinness Storehouse', 'Giant\'s Causeway'],
    difficulty: 'Easy',
    bestTime: 'May-September',
    transportType: 'Train & Ferry',
  },
];

const RouteCard = ({ route }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold">{route.name}</h3>
          <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {route.duration}
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          {route.description}
        </p>
        
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Cities
          </h4>
          <div className="flex flex-wrap gap-1">
            {route.cities.map((city) => (
              <span 
                key={city}
                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Highlights
          </h4>
          <div className="flex flex-wrap gap-1">
            {route.highlights.map((highlight, index) => (
              <span 
                key={index}
                className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-4">
          <div>
            <span className="font-medium">Difficulty:</span> {route.difficulty}
          </div>
          <div>
            <span className="font-medium">Best Time:</span> {route.bestTime}
          </div>
          <div>
            <span className="font-medium">Transport:</span> {route.transportType}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Link 
            href={`/itineraries/${route.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Itinerary →
          </Link>
        </div>
      </div>
    </div>
  );
};

const PopularRoutes = () => {
  return (
    <section className="mt-16 mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Popular European Routes</h2>
        <Link 
          href="/itineraries"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View All Itineraries →
        </Link>
      </div>
      
      <p className="text-gray-600 mb-8 max-w-3xl">
        Explore these curated multi-city itineraries that combine the best European destinations 
        into seamless journeys. Each route features efficient transportation connections, balanced 
        pacing, and complementary destinations.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.map((route) => (
          <RouteCard key={route.id} route={route} />
        ))}
      </div>
    </section>
  );
};

export default PopularRoutes;