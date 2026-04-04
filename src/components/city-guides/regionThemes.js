"use client";

// Array of region themes, including associated countries
export const regionThemes = [
  {
    id: 'Western Europe',
    name: 'Western Europe',
    hex: '#3182CE', // Blue
    tailwind: 'bg-blue-500',
    description:
      'Includes France, Belgium, Netherlands, and Luxembourg. Known for its cultural landmarks and historic cities.',
    countries: ['France', 'Belgium', 'Netherlands', 'Luxembourg'],
    languages: ['French', 'Dutch', 'German', 'Luxembourgish', 'Frisian', 'Occitan', 'Breton', 'Alsatian', 'English'],
    languageFamilies: ['Romance', 'Germanic']
  },
  {
    id: 'Central Europe',
    name: 'Central Europe',
    hex: '#38A169', // Green
    tailwind: 'bg-green-500',
    description:
      'Encompasses Germany, Switzerland, Austria, Czech Republic, and Slovakia. Famous for its alpine scenery and historic centers.',
    countries: ['Germany', 'Switzerland', 'Austria', 'Czech Republic', 'Slovakia'],
    languages: ['German', 'French', 'Italian', 'Romansh', 'Czech', 'Slovak', 'Hungarian', 'Slovene', 'Croatian'],
    languageFamilies: ['Germanic', 'Romance', 'Slavic', 'Uralic']
  },
  {
    id: 'Southern Europe',
    name: 'Southern Europe',
    hex: '#DD6B20', // Orange
    tailwind: 'bg-orange-500',
    description:
      'Includes Italy, Spain, Portugal, Greece, and Malta. Offers Mediterranean climate, ancient ruins, and vibrant street life.',
    countries: ['Italy', 'Spain', 'Portugal', 'Greece', 'Malta'],
    languages: ['Italian', 'Spanish', 'Portuguese', 'Greek', 'Maltese', 'Catalan', 'Galician', 'Basque', 'Sardinian'],
    languageFamilies: ['Romance', 'Hellenic', 'Others']
  },
  {
    id: 'Eastern Europe',
    name: 'Eastern Europe',
    hex: '#E53E3E', // Red
    tailwind: 'bg-red-500',
    description:
      'Covers Poland, Hungary, Romania, Bulgaria, Croatia, and Slovenia. Known for its unique heritage and evolving tourism.',
    countries: ['Poland', 'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia'],
    languages: ['Polish', 'Hungarian', 'Romanian', 'Bulgarian', 'Croatian', 'Slovene', 'German', 'Italian', 'Romani'],
    languageFamilies: ['Slavic', 'Uralic', 'Romance', 'Others']
  },
  {
    id: 'Northern Europe',
    name: 'Northern Europe',
    hex: '#805AD5', // Purple
    tailwind: 'bg-purple-500',
    description:
      'Encompasses the Nordic and Baltic countries: Denmark, Sweden, Norway, Finland, Iceland, Estonia, Latvia, and Lithuania.',
    countries: ['Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland', 'Estonia', 'Latvia', 'Lithuania'],
    languages: ['Danish', 'Swedish', 'Norwegian', 'Finnish', 'Icelandic', 'Estonian', 'Latvian', 'Lithuanian', 'Russian', 'Sami'],
    languageFamilies: ['Germanic', 'Uralic', 'Baltic']
  },
  {
    id: 'British Isles',
    name: 'British Isles',
    hex: '#2C7A7B', // Teal
    tailwind: 'bg-teal-500',
    description:
      'Covers the United Kingdom and Ireland, celebrated for their rich cultural and historical contributions.',
    countries: ['United Kingdom', 'Ireland'],
    languages: ['English', 'Irish', 'Welsh', 'Scottish Gaelic', 'Scots'],
    languageFamilies: ['Germanic', 'Celtic']
  },
];

// Language data for European countries
export const languagesSpoken = {
  // Western Europe
  "France": ["French", "Occitan", "Breton", "Alsatian"],
  "Belgium": ["Dutch", "French", "German"],
  "Netherlands": ["Dutch", "Frisian", "English"],
  "Luxembourg": ["Luxembourgish", "French", "German", "English"],
  
  // Central Europe
  "Germany": ["German", "Low German", "Sorbian", "Danish", "Frisian"],
  "Switzerland": ["German", "French", "Italian", "Romansh"],
  "Austria": ["German", "Hungarian", "Slovene", "Croatian"],
  "Czech Republic": ["Czech", "Slovak"],
  "Slovakia": ["Slovak", "Hungarian", "Romani"],
  
  // Southern Europe
  "Italy": ["Italian", "German", "French", "Slovene", "Sardinian", "Sicilian"],
  "Spain": ["Spanish", "Catalan", "Galician", "Basque"],
  "Portugal": ["Portuguese", "Mirandese"],
  "Greece": ["Greek", "Turkish", "Macedonian", "Albanian"],
  "Malta": ["Maltese", "English"],
  
  // Eastern Europe
  "Poland": ["Polish", "Silesian", "Kashubian"],
  "Hungary": ["Hungarian", "German", "Romani", "Croatian"],
  "Romania": ["Romanian", "Hungarian", "Romani", "German"],
  "Bulgaria": ["Bulgarian", "Turkish", "Romani"],
  "Croatia": ["Croatian", "Italian", "Hungarian", "Serbian"],
  "Slovenia": ["Slovene", "Italian", "Hungarian", "Croatian"],
  
  // Northern Europe
  "Denmark": ["Danish", "Faroese", "Greenlandic", "German"],
  "Sweden": ["Swedish", "Finnish", "Sami"],
  "Norway": ["Norwegian", "Sami", "Finnish"],
  "Finland": ["Finnish", "Swedish", "Sami"],
  "Iceland": ["Icelandic", "English"],
  "Estonia": ["Estonian", "Russian", "Ukrainian"],
  "Latvia": ["Latvian", "Russian", "Lithuanian"],
  "Lithuania": ["Lithuanian", "Polish", "Russian"],
  
  // British Isles
  "United Kingdom": ["English", "Welsh", "Scottish Gaelic", "Irish", "Scots"],
  "Ireland": ["English", "Irish"]
};

// Additional themes for tourism filtering
export const tourismRegions = {
  "Cultural Tourism Hubs": "#9932CC",        // Dark Orchid
  "Beach Destinations": "#00BFFF",           // Deep Sky Blue
  "Mountain & Skiing": "#FFFAFA",            // Snow
  "Historical Landmarks": "#8B4513",         // Saddle Brown
  "Natural Landscapes": "#228B22",           // Forest Green
  "Gastronomic Destinations": "#FF8C00",     // Dark Orange
  "Urban Exploration": "#4682B4",            // Steel Blue
  "Religious Tourism": "#DAA520",            // Goldenrod
  "Adventure Travel": "#2E8B57"              // Sea Green
};

// Additional themes for linguistic filtering
export const linguisticRegions = {
  "Germanic": "#6495ED",        // Cornflower Blue
  "Romance": "#FF6347",         // Tomato
  "Slavic": "#228B22",          // Forest Green
  "Baltic": "#DAA520",          // Goldenrod
  "Celtic": "#9932CC",          // Dark Orchid
  "Hellenic": "#4682B4",        // Steel Blue
  "Uralic": "#FF8C00",          // Dark Orange
  "Turkic": "#8FBC8F",          // Dark Sea Green
  "Multilingual Areas": "#DDA0DD" // Plum
};

// Language families with their associated languages
export const languageFamilies = {
  "Germanic": ["German", "Dutch", "English", "Danish", "Swedish", "Norwegian", "Icelandic", "Luxembourgish", "Frisian", "Low German", "Faroese"],
  "Romance": ["French", "Italian", "Spanish", "Portuguese", "Romanian", "Catalan", "Galician", "Occitan", "Romansh", "Mirandese", "Sardinian", "Sicilian"],
  "Slavic": ["Polish", "Czech", "Slovak", "Slovene", "Croatian", "Serbian", "Bulgarian", "Macedonian", "Ukrainian", "Russian", "Sorbian", "Silesian", "Kashubian"],
  "Baltic": ["Lithuanian", "Latvian"],
  "Celtic": ["Irish", "Welsh", "Scottish Gaelic", "Breton"],
  "Hellenic": ["Greek"],
  "Uralic": ["Finnish", "Estonian", "Hungarian", "Sami"],
  "Turkic": ["Turkish"],
  "Others": ["Basque", "Maltese", "Romani", "Albanian", "Greenlandic"]
};

// Map countries to tourism themes
export const countryToTourismTheme = {
  "France": ["Cultural Tourism Hubs", "Gastronomic Destinations", "Historical Landmarks"],
  "Italy": ["Cultural Tourism Hubs", "Historical Landmarks", "Gastronomic Destinations"],
  "Switzerland": ["Mountain & Skiing", "Natural Landscapes"],
  "Greece": ["Beach Destinations", "Historical Landmarks"],
  "Spain": ["Beach Destinations", "Cultural Tourism Hubs", "Gastronomic Destinations"],
  "United Kingdom": ["Cultural Tourism Hubs", "Urban Exploration", "Historical Landmarks"],
  "Germany": ["Cultural Tourism Hubs", "Urban Exploration", "Historical Landmarks"],
  "Austria": ["Mountain & Skiing", "Cultural Tourism Hubs"],
  "Portugal": ["Beach Destinations", "Cultural Tourism Hubs"],
  "Netherlands": ["Cultural Tourism Hubs", "Urban Exploration"],
  "Czech Republic": ["Cultural Tourism Hubs", "Historical Landmarks"],
  "Croatia": ["Beach Destinations", "Natural Landscapes"],
  "Norway": ["Natural Landscapes", "Adventure Travel"],
  "Sweden": ["Natural Landscapes", "Urban Exploration"],
  "Ireland": ["Natural Landscapes", "Cultural Tourism Hubs"],
  "Hungary": ["Cultural Tourism Hubs", "Historical Landmarks"],
  "Poland": ["Cultural Tourism Hubs", "Historical Landmarks"],
  "Finland": ["Natural Landscapes", "Adventure Travel"],
  "Denmark": ["Urban Exploration", "Cultural Tourism Hubs"],
  "Iceland": ["Natural Landscapes", "Adventure Travel"]
};

// Legacy region colors and descriptions (for UI or fallback purposes)
export const regionColors = {
  "Western Europe": "#3182CE", // Blue
  "Central Europe": "#38A169", // Green
  "Southern Europe": "#DD6B20", // Orange
  "Eastern Europe": "#E53E3E", // Red
  "Northern Europe": "#805AD5", // Purple
  "British Isles": "#2C7A7B",  // Teal
  Mediterranean: "#F6AD55",    // Light Orange
  Alpine: "#4FD1C5",           // Teal
  "Atlantic Europe": "#63B3ED",// Light Blue
  "Imperial Cities": "#9F7AEA",// Purple
  "Celtic & Nordic": "#667EEA", // Indigo
  "Atlantic Islands": "#F687B3",// Pink
  Arctic: "#9AE6B4",           // Green
};

export const regionDescriptions = {
  "Western Europe":
    "Includes countries like France, Belgium, and the Netherlands. Known for iconic cities with rich history and culture.",
  "Central Europe":
    "Encompasses Germany, Austria, Switzerland, and more. Famous for stunning alpine scenery and historic cities.",
  "Southern Europe":
    "Mediterranean countries like Spain, Italy, and Greece. Offers warm weather, beaches, and ancient historical sites.",
  "Eastern Europe":
    "Includes Poland, Czech Republic, and Hungary. Features emerging tourism destinations with unique heritage.",
  "Northern Europe":
    "Nordic countries and Scandinavia. Known for stunning natural landscapes, design, and high quality of life.",
  "British Isles":
    "Comprising the United Kingdom and Ireland. Rich in history, literature, and diverse cultural experiences.",
  Mediterranean:
    "Coastal regions along the Mediterranean Sea known for warm climate, beaches, and ancient civilizations.",
  Alpine:
    "Mountainous regions with stunning peaks, lakes, and winter sports.",
  "Atlantic Europe":
    "Cities on or near the Atlantic coast with maritime heritage and diverse cultural influences.",
  "Imperial Cities":
    "Historic capitals of former empires with grand architecture and rich cultural institutions.",
  "Celtic & Nordic":
    "Cities with Celtic or Nordic heritage.",
  "Atlantic Islands":
    "Island destinations in the Atlantic featuring unique landscapes and cultures.",
  Arctic:
    "Northernmost regions with polar climates and phenomena like the Northern Lights.",
};