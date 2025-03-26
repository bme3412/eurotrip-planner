import React from 'react';

// Icon mapping function
const getIcon = (name) => {
  const icons = {
    museum: <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    palette: <svg className="h-6 w-6 text-purple-600" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
    restaurant: <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    style: <svg className="h-6 w-6 text-pink-600" viewBox="0 0 24 24" stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  };
  return icons[name] || null;
};

/**
 * CityOverview Component - Displays city information and highlights
 */
const CityOverview = ({ cityData, cityDisplayName }) => {
  if (!cityData) return <div className="py-4 text-center text-gray-500">City information unavailable</div>;

  // Use hardcoded Paris data
  const cityInfo = {
    name: "Paris",
    nickname: "City of Light ✨",
    description: "The capital of France stands as a global icon of art, architecture, cuisine, and fashion. With its scenic riverbanks, historic monuments, and cultural treasures, Paris continues to enchant visitors with an atmosphere that balances historic grandeur with modern energy. From the iconic Eiffel Tower to charming café terraces, the city exemplifies joie de vivre. 🗼"
  };
  
  return (
    <>
      <h2 className="text-2xl font-bold">{cityInfo.name}</h2>
      <p className="text-gray-600 italic">{cityInfo.nickname}</p>
      <p className="text-gray-700 mt-2">{cityInfo.description}</p>
    </>
  );
};

export default CityOverview;