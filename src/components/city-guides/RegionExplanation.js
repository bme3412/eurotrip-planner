// src/components/city-guides/RegionExplanation.js
import React from 'react';

const regions = [
  {
    id: 'Western Europe',
    name: 'Western Europe',
    description: 'Western Europe features iconic cities like Paris and Amsterdam, known for world-class museums, historic architecture, and vibrant cultural scenes. This region offers an excellent mix of history, art, cuisine, and modern culture.',
    countries: ['France', 'Belgium', 'Netherlands', 'Luxembourg'],
    keyFeatures: ['Historic city centers', 'World-famous museums', 'Café culture', 'Excellent public transportation'],
    imageSrc: '/images/regions/western-europe.jpg',
  },
  {
    id: 'Central Europe',
    name: 'Central Europe',
    description: 'Central Europe is where Germanic and Slavic cultures meet, with stunning alpine scenery, fairytale castles, and cities like Vienna, Prague and Berlin that blend imperial grandeur with cutting-edge modernity.',
    countries: ['Germany', 'Austria', 'Switzerland', 'Czech Republic', 'Hungary', 'Poland', 'Slovakia'],
    keyFeatures: ['Alpine landscapes', 'Classical music heritage', 'Christmas markets', 'Medieval town squares'],
    imageSrc: '/images/regions/central-europe.jpg',
  },
  {
    id: 'Southern Europe',
    name: 'Southern Europe',
    description: 'The Mediterranean region of Southern Europe enchants visitors with its warm climate, coastal beauty, ancient ruins, and exceptional cuisine. From Barcelona to Rome, this region offers rich history alongside beautiful beaches.',
    countries: ['Spain', 'Italy', 'Portugal', 'Greece', 'Malta', 'Cyprus'],
    keyFeatures: ['Mediterranean beaches', 'Ancient Roman and Greek ruins', 'World-renowned cuisine', 'Island hopping'],
    imageSrc: '/images/regions/southern-europe.jpg',
  },
  {
    id: 'Northern Europe',
    name: 'Northern Europe',
    description: 'Northern Europe combines innovative design, pristine natural landscapes, and progressive societies. From the fjords of Norway to the design districts of Copenhagen, this region offers unique experiences in sustainable urban environments.',
    countries: ['Denmark', 'Finland', 'Sweden', 'Norway', 'Iceland'],
    keyFeatures: ['Fjords and northern lights', 'Progressive design', 'Outdoor activities', 'Scandinavian minimalism'],
    imageSrc: '/images/regions/northern-europe.jpg',
  },
  {
    id: 'British Isles',
    name: 'British Isles',
    description: 'The British Isles offer diverse experiences from the cosmopolitan energy of London to the rugged landscapes of the Scottish Highlands and the friendly pub culture of Ireland. Rich in literature, music, and history.',
    countries: ['United Kingdom', 'Ireland'],
    keyFeatures: ['Historic castles', 'Literary heritage', 'Pub culture', 'Dramatic countryside'],
    imageSrc: '/images/regions/british-isles.jpg',
  },
  {
    id: 'Eastern Europe',
    name: 'Eastern Europe',
    description: 'Eastern Europe reveals colorful medieval towns, authentic local traditions, and landscapes unmarred by mass tourism. Offering excellent value, this region combines rich history with emerging contemporary scenes.',
    countries: ['Estonia', 'Latvia', 'Lithuania', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia'],
    keyFeatures: ['Well-preserved medieval towns', 'Affordability', 'Folk traditions', 'Emerging creative scenes'],
    imageSrc: '/images/regions/eastern-europe.jpg',
  },
];

const RegionExplanation = ({ handleRegionChange }) => {
  return (
    <section className="mt-16 mb-12">
      <h2 className="text-2xl font-bold mb-6">European Regions Guide</h2>
      <p className="text-gray-600 mb-8 max-w-3xl">
        Europe is divided into several distinct regions, each with its own cultural character, 
        architectural styles, cuisine, and natural landscapes. Use this guide to explore the 
        unique characteristics of each region to plan your perfect European adventure.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regions.map((region) => (
          <div 
            key={region.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="h-40 bg-gray-200 relative">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${region.imageSrc || '/images/regions/placeholder.jpg'})` 
                }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                <div className="absolute bottom-0 p-4">
                  <h3 className="text-xl font-bold text-white">{region.name}</h3>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {region.description}
              </p>
              
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Countries
                </h4>
                <div className="flex flex-wrap gap-1">
                  {region.countries.map((country) => (
                    <span 
                      key={country}
                      className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                    >
                      {country}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Key Features
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {region.keyFeatures.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleRegionChange(region.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Browse {region.name} Cities →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RegionExplanation;