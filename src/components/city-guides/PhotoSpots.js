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
  },
  london: {
    intro: `London delivers the kind of visual drama that justifies the weather complaints. From medieval fortresses to modern glass towers, every borough offers frame-worthy moments—often with a red bus conveniently passing through. Here's where to capture the city at its most atmospheric, and when the light cooperates best.`,

    spots: [
      {
        name: "Tower Bridge at Sunrise",
        description: "London's most recognizable bridge, best shot from the south bank walkway near City Hall. The Victorian Gothic towers catch early light beautifully.",
        neighborhood: "Southwark/Tower Hill",
        bestTime: "Sunrise for empty shots",
        crowdLevel: "Empty early, packed midday",
        tips: "Stay for the glass floor viewing—worth the fee for overhead shots. Bridge lifts happen randomly but are spectacular if you catch one.",
        iconic: true,
        coordinates: { lat: 51.5055, lng: -0.0754 }
      },
      {
        name: "Big Ben & Westminster",
        description: "The Elizabeth Tower (Big Ben is technically just the bell) and the Houses of Parliament. Classic postcard London.",
        neighborhood: "Westminster",
        bestTime: "Blue hour, both sunrise and sunset work",
        crowdLevel: "Always crowded",
        tips: "Shoot from Westminster Bridge for the classic angle, or from the South Bank for a different perspective with the river. Night shots when the clock face glows are magical.",
        iconic: true,
        coordinates: { lat: 51.5007, lng: -0.1246 }
      },
      {
        name: "Neal's Yard",
        description: "A hidden courtyard explosion of color in Covent Garden. Rainbow buildings, fairy lights, and plants everywhere. Perfect for Instagram.",
        neighborhood: "Covent Garden",
        bestTime: "Midday for full light in the courtyard",
        crowdLevel: "Very crowded, especially weekends",
        tips: "Arrive before 10am on weekdays for empty shots. The balcony of one of the cafés offers a bird's eye view.",
        iconic: false,
        coordinates: { lat: 51.5143, lng: -0.1267 }
      },
      {
        name: "St. Paul's from Millennium Bridge",
        description: "The Millennium Bridge creates a stunning leading line straight to Wren's dome. Made famous by Harry Potter's dramatic bridge collapse.",
        neighborhood: "City of London",
        bestTime: "Blue hour, or foggy mornings",
        crowdLevel: "Moderate, commuters early morning",
        tips: "Shoot from the Tate Modern end looking north. Works beautifully in all weather—fog and rain add drama.",
        iconic: true,
        coordinates: { lat: 51.5095, lng: -0.0985 }
      },
      {
        name: "Leadenhall Market",
        description: "A magnificent Victorian covered market with cobblestones and painted ironwork. Doubled as Diagon Alley in Harry Potter.",
        neighborhood: "City of London",
        bestTime: "Early morning or Sunday when empty",
        crowdLevel: "Packed on weekdays (lunch crowd)",
        tips: "The blue and cream color scheme photographs beautifully. Optician's shop was used as the Leaky Cauldron entrance.",
        iconic: false,
        coordinates: { lat: 51.5127, lng: -0.0837 }
      },
      {
        name: "Primrose Hill",
        description: "London's most beloved viewpoint, offering panoramic views of the entire city skyline. Less touristy than alternatives.",
        neighborhood: "Primrose Hill",
        bestTime: "Sunset for golden light on skyline",
        crowdLevel: "Busy at sunset, peaceful otherwise",
        tips: "Bring a picnic—locals claim patches early on nice days. The view stretches from the Shard to Canary Wharf.",
        iconic: false,
        coordinates: { lat: 51.5393, lng: -0.1608 }
      },
      {
        name: "The Shard Viewing Platform",
        description: "London's highest viewing platform at 310 meters. The open-air deck offers unobstructed shots of the entire city.",
        neighborhood: "London Bridge",
        bestTime: "Sunset-blue hour (book the 6pm slot)",
        crowdLevel: "Managed—ticket controls crowd size",
        tips: "Book online for cheaper tickets. The outdoor platform (level 72) is weather-dependent but worth it if open.",
        iconic: true,
        coordinates: { lat: 51.5045, lng: -0.0865 }
      },
      {
        name: "Kyoto Garden, Holland Park",
        description: "A tranquil Japanese garden with waterfalls, koi ponds, and perfect reflections. A hidden gem most tourists miss.",
        neighborhood: "Holland Park",
        bestTime: "Early morning for stillness",
        crowdLevel: "Peaceful, even on weekends",
        tips: "Autumn colors (late October) and cherry blossom season (April) are spectacular. The peacocks roaming the park add whimsy.",
        iconic: false,
        coordinates: { lat: 51.5019, lng: -0.2055 }
      },
      {
        name: "Sky Garden",
        description: "Free rooftop garden at the top of the 'Walkie Talkie' building. Three floors of landscaped gardens with panoramic views.",
        neighborhood: "City of London",
        bestTime: "Sunset (book well ahead)",
        crowdLevel: "Busy but managed by bookings",
        tips: "Tickets are free but released weeks ahead—set a calendar reminder. The bar serves drinks with views.",
        iconic: false,
        coordinates: { lat: 51.5113, lng: -0.0836 }
      },
      {
        name: "Notting Hill Pastel Houses",
        description: "Rows of candy-colored Victorian townhouses. The most photographed streets include Lancaster Road and Westbourne Park Road.",
        neighborhood: "Notting Hill",
        bestTime: "Morning light on east-facing facades",
        crowdLevel: "Very crowded, especially Portobello days",
        tips: "These are private homes—be respectful. The Portobello Road area is most photogenic. Blue Door from the film is on Westbourne Park Road.",
        iconic: true,
        coordinates: { lat: 51.5175, lng: -0.2053 }
      },
      {
        name: "Camden Lock & Markets",
        description: "Eclectic street art, canal boats, and Victorian industrial architecture. The bridge and lock have a gritty authenticity.",
        neighborhood: "Camden",
        bestTime: "Weekday mornings before crowds",
        crowdLevel: "Packed weekends, moderate weekdays",
        tips: "Shoot the iconic market signs, canal reflections, and street art around Chalk Farm Road. Amy Winehouse statue nearby.",
        iconic: true,
        coordinates: { lat: 51.5417, lng: -0.1466 }
      },
      {
        name: "Greenwich Royal Observatory",
        description: "Stand on the Prime Meridian line with a foot in each hemisphere. The view over London is spectacular.",
        neighborhood: "Greenwich",
        bestTime: "Sunset for city views",
        crowdLevel: "Moderate, tourist attraction",
        tips: "The walk through Greenwich Park is beautiful. The Cutty Sark sailing ship nearby is another iconic shot.",
        iconic: true,
        coordinates: { lat: 51.4769, lng: -0.0005 }
      }
    ],

    tips: [
      {
        title: "Chase the Light",
        content: "London's latitude means soft, golden light lasts longer than Mediterranean cities. Overcast days (which you'll get plenty of) provide beautiful diffused light—embrace it."
      },
      {
        title: "Embrace the Weather",
        content: "Don't pack your camera in rain. Wet cobblestones create beautiful reflections, fog adds mystery to bridges and spires, and moody skies suit this dramatic city perfectly."
      },
      {
        title: "Wait for the Bus",
        content: "Red double-decker buses turn ordinary shots into 'London' shots. They're especially effective in front of historic buildings. Wait for one—they're frequent."
      },
      {
        title: "Go Underground",
        content: "Tube stations are surprisingly photogenic. Westminster's Jubilee Line has space-age escalators, and vintage stations like Gloucester Road have beautiful tilework."
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

