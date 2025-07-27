import React from 'react';

const CityOverview = ({ overview, cityName }) => {
  // Get city-specific information
  const getCityInfo = (cityName) => {
    const cityNameLower = cityName.toLowerCase();
    
    if (cityNameLower.includes('paris')) {
      return {
        name: "Paris",
        nickname: "City of Light",
        icon: "💡",
        description: "Paris is the capital of France and a global icon of art, architecture, cuisine, and fashion. Known for its scenic riverbanks, historic monuments, and cultural treasures, the city embodies the French joie de vivre."
      };
    } else if (cityNameLower.includes('rome')) {
      return {
        name: "Rome",
        nickname: "Eternal City",
        icon: "🏛️",
        description: "Rome is the capital of Italy and a city where ancient history meets modern life. With its iconic Colosseum, Vatican City, and countless historic sites, Rome offers visitors a journey through millennia of human civilization."
      };
    } else if (cityNameLower.includes('barcelona')) {
      return {
        name: "Barcelona",
        nickname: "City of Counts",
        icon: "🏰",
        description: "Barcelona is the capital of Catalonia and a vibrant Mediterranean city known for its unique architecture, beautiful beaches, and rich cultural heritage. The city combines Gothic charm with modernist innovation."
      };
    } else if (cityNameLower.includes('amsterdam')) {
      return {
        name: "Amsterdam",
        nickname: "Venice of the North",
        icon: "🚲",
        description: "Amsterdam is the capital of the Netherlands and a city of canals, bicycles, and artistic heritage. Known for its liberal culture, historic architecture, and world-class museums, it offers a unique European experience."
      };
    } else if (cityNameLower.includes('berlin')) {
      return {
        name: "Berlin",
        nickname: "City of Freedom",
        icon: "🕊️",
        description: "Berlin is the capital of Germany and a city that has reinvented itself through history. Known for its vibrant arts scene, historic landmarks, and diverse culture, Berlin represents modern European dynamism."
      };
    } else if (cityNameLower.includes('venice')) {
      return {
        name: "Venice",
        nickname: "Floating City",
        icon: "🛶",
        description: "Venice is a unique city built on water, known for its romantic canals, historic architecture, and artistic heritage. The city's timeless beauty and cultural significance make it one of Europe's most enchanting destinations."
      };
    } else if (cityNameLower.includes('lisbon')) {
      return {
        name: "Lisbon",
        nickname: "City of Seven Hills",
        icon: "🌅",
        description: "Lisbon is the capital of Portugal and a city of hills, trams, and maritime history. Known for its warm climate, historic neighborhoods, and delicious cuisine, Lisbon offers a perfect blend of tradition and modernity."
      };
    } else if (cityNameLower.includes('pamplona')) {
      return {
        name: "Pamplona",
        nickname: "City of the Running of the Bulls",
        icon: "🐂",
        description: "Pamplona is the capital of Navarre and famous for the San Fermín festival and the Running of the Bulls. This historic city combines medieval charm with vibrant Spanish culture and traditions."
      };
    } else {
      return {
        name: cityName,
        nickname: "A City of Dreams",
        icon: "✨",
        description: overview?.brief_description || `${cityName} is a beautiful city waiting to be discovered. With its rich history, vibrant culture, and welcoming atmosphere, it offers visitors an unforgettable experience.`
      };
    }
  };

  const cityInfo = getCityInfo(cityName);
  
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{cityInfo.icon}</span>
          <h1 className="text-3xl font-bold text-gray-800">{cityInfo.name}</h1>
        </div>
        <p className="text-lg text-gray-600 font-medium mb-4">{cityInfo.nickname}</p>
        <p className="text-gray-700 leading-relaxed text-base">{cityInfo.description}</p>
      </div>
    </div>
  );
};

export default CityOverview;