// src/components/city-guides/CulinaryGuide.js
'use client';

import React, { useState } from 'react';

const CulinaryGuide = ({ culinaryData }) => {
  const [activeTab, setActiveTab] = useState('specialties');
  
  if (!culinaryData) {
    return <div className="text-center py-8 text-gray-500">No culinary data available</div>;
  }
  
  const { local_specialties, dining_options, food_markets, drink_specialties, food_experiences } = culinaryData;
  
  const renderLocalSpecialties = () => {
    if (!local_specialties || local_specialties.length === 0) {
      return <p className="text-center text-gray-500 py-4">No local specialty information available</p>;
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {local_specialties.map((item, index) => (
          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
            <p className="text-gray-700 mb-3">{item.description}</p>
            {item.where_to_try && (
              <div>
                <h4 className="font-medium text-sm text-gray-600">Where to try:</h4>
                {Array.isArray(item.where_to_try) ? (
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                    {item.where_to_try.map((place, i) => (
                      <li key={i}>{place}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700 mt-1">{item.where_to_try}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  const renderDiningOptions = () => {
    if (!dining_options || dining_options.length === 0) {
      return <p className="text-center text-gray-500 py-4">No dining options information available</p>;
    }
    
    return (
      <div className="space-y-6">
        {dining_options.map((option, index) => (
          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{option.name}</h3>
                {option.type && <p className="text-sm text-gray-600">{option.type}</p>}
              </div>
              {option.price_range && (
                <div className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {typeof option.price_range === 'string' ? option.price_range : '€'.repeat(option.price_range)}
                </div>
              )}
            </div>
            <p className="text-gray-700 my-3">{option.description}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {option.address && (
                <div className="flex items-center">
                  <span className="mr-1">📍</span>
                  {option.address}
                </div>
              )}
              {option.neighborhood && (
                <div className="flex items-center">
                  <span className="mr-1">🏙️</span>
                  {option.neighborhood}
                </div>
              )}
              {option.specialty && (
                <div className="flex items-center">
                  <span className="mr-1">🍽️</span>
                  {option.specialty}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderFoodMarkets = () => {
    if (!food_markets || food_markets.length === 0) {
      return <p className="text-center text-gray-500 py-4">No food market information available</p>;
    }
    
    return (
      <div className="space-y-6">
        {food_markets.map((market, index) => (
          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-lg mb-2">{market.name}</h3>
            <p className="text-gray-700 mb-3">{market.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-gray-600">Location:</h4>
                <p className="text-gray-700">{market.location || 'Information not available'}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-600">Hours:</h4>
                <p className="text-gray-700">{market.hours || 'Information not available'}</p>
              </div>
              {market.specialties && (
                <div className="md:col-span-2">
                  <h4 className="font-medium text-sm text-gray-600">Specialties:</h4>
                  {Array.isArray(market.specialties) ? (
                    <ul className="list-disc list-inside text-gray-700 mt-1">
                      {market.specialties.map((specialty, i) => (
                        <li key={i}>{specialty}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700">{market.specialties}</p>
                  )}
                </div>
              )}
              {market.tips && (
                <div className="md:col-span-2">
                  <h4 className="font-medium text-sm text-gray-600">Tips:</h4>
                  {Array.isArray(market.tips) ? (
                    <ul className="list-disc list-inside text-gray-700 mt-1">
                      {market.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700">{market.tips}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderDrinkSpecialties = () => {
    if (!drink_specialties || drink_specialties.length === 0) {
      return <p className="text-center text-gray-500 py-4">No drink specialty information available</p>;
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {drink_specialties.map((item, index) => (
          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
            <p className="text-gray-700 mb-3">{item.description}</p>
            {item.where_to_try && (
              <div>
                <h4 className="font-medium text-sm text-gray-600">Where to try:</h4>
                {Array.isArray(item.where_to_try) ? (
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                    {item.where_to_try.map((place, i) => (
                      <li key={i}>{place}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700 mt-1">{item.where_to_try}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  const renderFoodExperiences = () => {
    if (!food_experiences || food_experiences.length === 0) {
      return <p className="text-center text-gray-500 py-4">No food experience information available</p>;
    }
    
    return (
      <div className="space-y-6">
        {food_experiences.map((exp, index) => (
          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-lg mb-2">{exp.name}</h3>
            <p className="text-gray-700 mb-3">{exp.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exp.location && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Location:</h4>
                  <p className="text-gray-700">{exp.location}</p>
                </div>
              )}
              {exp.cost && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Cost:</h4>
                  <p className="text-gray-700">{exp.cost}</p>
                </div>
              )}
              {exp.booking_info && (
                <div className="md:col-span-2">
                  <h4 className="font-medium text-sm text-gray-600">Booking Info:</h4>
                  <p className="text-gray-700">{exp.booking_info}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div>
      <div className="flex overflow-x-auto space-x-2 mb-6 pb-2">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors
            ${activeTab === 'specialties' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('specialties')}
        >
          Local Specialties
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors
            ${activeTab === 'dining' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('dining')}
        >
          Where to Eat
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors
            ${activeTab === 'markets' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('markets')}
        >
          Food Markets
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors
            ${activeTab === 'drinks' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('drinks')}
        >
          Drinks & Cafés
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors
            ${activeTab === 'experiences' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('experiences')}
        >
          Food Experiences
        </button>
      </div>
      
      <div className="mt-6">
        {activeTab === 'specialties' && renderLocalSpecialties()}
        {activeTab === 'dining' && renderDiningOptions()}
        {activeTab === 'markets' && renderFoodMarkets()}
        {activeTab === 'drinks' && renderDrinkSpecialties()}
        {activeTab === 'experiences' && renderFoodExperiences()}
      </div>
    </div>
  );
};

export default CulinaryGuide;