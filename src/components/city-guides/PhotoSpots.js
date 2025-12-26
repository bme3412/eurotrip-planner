'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, MapPin, Clock, Sun, Sunrise, Sunset, Camera, Users, Star, Eye } from 'lucide-react';

// City-specific photo spots data
const CITY_PHOTO_DATA = {
  paris: {
    intro: `Paris is one of the most photogenic cities on Earth. From iconic landmarks to hidden corners, every arrondissement offers frame-worthy moments. Here's where to capture the city at its most beautiful—and when to go to avoid the crowds.`,
    
    spots: [
      {
        name: "Trocadéro Gardens",
        description: "The classic Eiffel Tower shot. The elevated plaza and fountains frame the tower perfectly. Arrive at sunrise for empty shots, or stay for the hourly sparkle show after dark.",
        neighborhood: "16th",
        bestTime: "Sunrise or after 11pm",
        crowdLevel: "Very crowded midday",
        tips: "Stand on the upper terrace wall for height. For sunset, the tower is backlit—beautiful but challenging.",
        iconic: true,
        coordinates: { lat: 48.8617, lng: 2.2885 }
      },
      {
        name: "Rue Crémieux",
        description: "A narrow street of pastel-painted houses that looks like it belongs in Notting Hill. Perfect for portraits and street photography.",
        neighborhood: "12th",
        bestTime: "Morning light",
        crowdLevel: "Can get crowded on weekends",
        tips: "Be respectful—this is a residential street. Residents have complained about influencer crowds.",
        iconic: false,
        coordinates: { lat: 48.8488, lng: 2.3714 }
      },
      {
        name: "Pont Alexandre III",
        description: "Paris's most ornate bridge, with golden statues, Art Nouveau lamps, and the Eiffel Tower in the background. Magic at golden hour.",
        neighborhood: "8th",
        bestTime: "Golden hour (1hr before sunset)",
        crowdLevel: "Moderate",
        tips: "Shoot from the bridge looking toward the Invalides, or from the banks below looking up at the ornate details.",
        iconic: true,
        coordinates: { lat: 48.8637, lng: 2.3135 }
      },
      {
        name: "Sacré-Cœur Steps",
        description: "Panoramic views over all of Paris from Montmartre's hilltop basilica. The steps themselves make a dramatic foreground.",
        neighborhood: "18th (Montmartre)",
        bestTime: "Sunset for city views, blue hour for drama",
        crowdLevel: "Very crowded, especially weekends",
        tips: "Climb to the dome for the highest viewpoint (small fee). The carousel at the base adds whimsy to night shots.",
        iconic: true,
        coordinates: { lat: 48.8867, lng: 2.3431 }
      },
      {
        name: "Palais Royal Gardens",
        description: "Striped Buren columns make for graphic, minimalist shots. The surrounding arcades have a timeless Parisian elegance.",
        neighborhood: "1st",
        bestTime: "Early morning for empty columns",
        crowdLevel: "Moderate",
        tips: "Wear something bold—the black and white stripes pop with color. The columns work for jumping shots too.",
        iconic: false,
        coordinates: { lat: 48.8638, lng: 2.3375 }
      },
      {
        name: "Bir-Hakeim Bridge",
        description: "The Inception bridge. Art Deco steel columns create a stunning perspective shot, with the Eiffel Tower behind.",
        neighborhood: "15th/16th",
        bestTime: "Early morning",
        crowdLevel: "Low (locals know it, tourists less so)",
        tips: "Shoot from the elevated walkway looking down the column rows. Works beautifully in rain or fog.",
        iconic: false,
        coordinates: { lat: 48.8537, lng: 2.2898 }
      },
      {
        name: "Louvre Pyramid",
        description: "The glass pyramid against the historic palace creates Paris's most striking architectural contrast. Reflections in rain are spectacular.",
        neighborhood: "1st",
        bestTime: "Blue hour, or sunrise",
        crowdLevel: "Empty before 7am, packed midday",
        tips: "The smaller pyramids nearby offer cleaner compositions with fewer people. Night illumination is magical.",
        iconic: true,
        coordinates: { lat: 48.8606, lng: 2.3376 }
      },
      {
        name: "Canal Saint-Martin",
        description: "Iron footbridges, tree-lined banks, and colorful boats. The quintessential 'young Paris' aesthetic.",
        neighborhood: "10th",
        bestTime: "Afternoon for dappled light through trees",
        crowdLevel: "Moderate, lively on weekends",
        tips: "The swing bridge at Rue de la Grange aux Belles is particularly photogenic. Bring a picnic to blend in.",
        iconic: false,
        coordinates: { lat: 48.8728, lng: 2.3653 }
      },
      {
        name: "Shakespeare and Company",
        description: "The legendary English bookshop with its weathered green facade. A must for bookstagram and vintage aesthetics.",
        neighborhood: "5th (Latin Quarter)",
        bestTime: "Early morning before opening",
        crowdLevel: "Crowded all day once open",
        tips: "Notre-Dame is directly behind—combine both in one morning shoot. The yellow 'Kilomètre Zéro' plaque is nearby.",
        iconic: true,
        coordinates: { lat: 48.8526, lng: 2.3471 }
      },
      {
        name: "Musée de l'Orangerie Steps",
        description: "Looking from the Tuileries toward Place de la Concorde and the Champs-Élysées. Perfect symmetry.",
        neighborhood: "1st",
        bestTime: "Sunset",
        crowdLevel: "Moderate",
        tips: "The view back toward the Louvre is equally stunning. Combine with a walk through the Tuileries gardens.",
        iconic: false,
        coordinates: { lat: 48.8638, lng: 2.3225 }
      },
      {
        name: "Café de Flore / Les Deux Magots",
        description: "The iconic Saint-Germain cafés with their wicker chairs and green awnings. Classic Parisian café culture.",
        neighborhood: "6th (Saint-Germain)",
        bestTime: "Morning, before the crowds",
        crowdLevel: "Very touristy, especially terraces",
        tips: "Shoot from across the street for the full facade. A coffee here is expensive but buys you the scene.",
        iconic: true,
        coordinates: { lat: 48.8540, lng: 2.3326 }
      },
      {
        name: "Montmartre's Pink House",
        description: "La Maison Rose—a pink-painted restaurant that's become an Instagram icon. Charming with spring blossoms.",
        neighborhood: "18th (Montmartre)",
        bestTime: "Early morning",
        crowdLevel: "Can be crowded with photographers",
        tips: "Visit on weekdays. The nearby Rue de l'Abreuvoir is equally picturesque with fewer crowds.",
        iconic: false,
        coordinates: { lat: 48.8869, lng: 2.3397 }
      }
    ],
    
    tips: [
      {
        title: "Chase the Light",
        content: "Paris faces roughly east-west, so sunrise lights the Trocadéro and eastern landmarks, while sunset gilds the western side. Golden hour is magic everywhere, but blue hour (20-30 min after sunset) gives Paris its famous glow."
      },
      {
        title: "Beat the Crowds",
        content: "Most tourists don't wake up early. Sunrise shoots at major landmarks give you near-empty frames. Alternatively, shoot after 10pm when day-trippers have left and the city sparkles."
      },
      {
        title: "Weather Works",
        content: "Don't put your camera away in rain or fog. Wet cobblestones create beautiful reflections, and moody weather gives Paris a cinematic quality you can't get in sunshine."
      },
      {
        title: "Respect the Locals",
        content: "Streets like Rue Crémieux are residential. Don't block doorways, keep noise down, and be mindful that your 'content' is someone's home."
      }
    ]
  }
};

const DEFAULT_PHOTO_DATA = {
  intro: `Every city has its photogenic spots. Here's how to capture this destination at its best.`,
  spots: [],
  tips: [
    {
      title: "Chase the Light",
      content: "Golden hour (the hour after sunrise and before sunset) provides the most flattering light for any subject."
    },
    {
      title: "Go Early",
      content: "Popular spots are usually empty at sunrise. You'll get better shots and a peaceful experience."
    }
  ]
};

export default function PhotoSpots({ cityName, cityData }) {
  const cityKey = cityName?.toLowerCase();
  const photoData = CITY_PHOTO_DATA[cityKey] || DEFAULT_PHOTO_DATA;
  const displayName = cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';
  
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'iconic', 'hidden'

  const filteredSpots = photoData.spots.filter(spot => {
    if (filter === 'iconic') return spot.iconic;
    if (filter === 'hidden') return !spot.iconic;
    return true;
  });

  const getBestTimeIcon = (time) => {
    const t = time?.toLowerCase() || '';
    if (t.includes('sunrise') || t.includes('morning')) return Sunrise;
    if (t.includes('sunset') || t.includes('golden')) return Sunset;
    return Sun;
  };

  return (
    <div className="space-y-10">
      {/* Intro */}
      <div className="max-w-4xl">
        <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-medium">
          {photoData.intro}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 mr-2">Show:</span>
        {[
          { id: 'all', label: 'All Spots' },
          { id: 'iconic', label: '📍 Iconic' },
          { id: 'hidden', label: '💎 Hidden Gems' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Spots Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSpots.map((spot, i) => {
          const TimeIcon = getBestTimeIcon(spot.bestTime);
          return (
            <div 
              key={i}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedSpot(spot)}
            >
              {/* Placeholder image area */}
              <div className="relative h-40 bg-gradient-to-br from-violet-100 via-purple-50 to-pink-100 flex items-center justify-center">
                <Camera className="w-10 h-10 text-violet-300" />
                {spot.iconic && (
                  <span className="absolute top-3 left-3 px-2 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> Iconic
                  </span>
                )}
                <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1">{spot.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{spot.description}</p>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    <MapPin className="w-3 h-3" /> {spot.neighborhood}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-full text-amber-700">
                    <TimeIcon className="w-3 h-3" /> {spot.bestTime}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Photo Tips */}
      {photoData.tips && photoData.tips.length > 0 && (
        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Photography Tips</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {photoData.tips.map((tip, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-2">{tip.title}</h3>
                <p className="text-gray-600 text-[15px] leading-relaxed">{tip.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Spot Detail Modal */}
      {selectedSpot && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedSpot(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-48 bg-gradient-to-br from-violet-200 via-purple-100 to-pink-200 flex items-center justify-center">
              <Camera className="w-16 h-16 text-violet-400" />
              {selectedSpot.iconic && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-amber-400 text-amber-900 text-sm font-bold rounded-full flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current" /> Iconic Spot
                </span>
              )}
              <button 
                onClick={() => setSelectedSpot(null)}
                className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 rotate-45" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-12rem)]">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedSpot.name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedSpot.neighborhood} arrondissement</span>
                </div>
              </div>
              
              <p className="text-gray-700 leading-relaxed">{selectedSpot.description}</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs text-amber-600 font-medium mb-1">Best Time</div>
                  <div className="text-sm text-amber-900 font-semibold">{selectedSpot.bestTime}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 font-medium mb-1">Crowd Level</div>
                  <div className="text-sm text-blue-900 font-semibold">{selectedSpot.crowdLevel}</div>
                </div>
              </div>
              
              {selectedSpot.tips && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-900 mb-1">💡 Pro Tip</div>
                  <p className="text-sm text-gray-600">{selectedSpot.tips}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <nav className="flex items-center text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gray-700 transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link href="/city-guides" className="hover:text-gray-700 transition-colors">City Guides</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link href={`/city-guides/${cityName?.toLowerCase()}`} className="hover:text-gray-700 transition-colors">{displayName}</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">Photo Spots</span>
          </nav>
        </div>
        
        <p className="mt-6 text-xs text-gray-400">
          Access to some locations may be restricted. Always respect local rules and private property.
        </p>
      </footer>
    </div>
  );
}

