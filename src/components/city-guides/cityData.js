"use client";

import {
  regionThemes,
  tourismRegions,
  linguisticRegions,
  countryToTourismTheme,
  languagesSpoken,
  languageFamilies,
  getCountriesInRegion,
} from "./regionData";

// Define region colors for UI display
export const regionColors = {
  "Atlantic Europe": "#0EA5E9", // sky
  "Mediterranean": "#F97316", // orange
  "Central Europe": "#10B981", // emerald
  "Imperial Cities": "#8B5CF6", // violet
  "Alpine": "#3B82F6", // blue
  "Celtic & Nordic": "#6366F1", // indigo
  "Arctic": "#EC4899", // pink
  "Atlantic Islands": "#F59E0B", // amber
};

export const getCitiesData = () => {
  return [
    // FRANCE
    {
      id: "paris",
      name: "Paris",
      country: "France",
      region: "Atlantic Europe",
      description:
        "Paris, France's capital, is a major European city and a global center for art, fashion, gastronomy, and culture.",
      thumbnail: "/images/paris-thumbnail.jpeg",
      landmarks: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral"],
      latitude: 48.8566,
      longitude: 2.3522,
      tourismCategories: [
        "Historical Landmarks",
        "Cultural Tourism Hubs",
        "Gastronomic Destinations",
      ],
      linguisticCategories: ["Romance"],
    },
    {
      id: "nice",
      name: "Nice",
      country: "France",
      region: "Mediterranean",
      description:
        "Nice, located on the French Riviera, offers beautiful beaches, a Mediterranean climate, and a blend of French and Italian culture.",
      thumbnail: "/images/nice-thumbnail.jpeg",
      landmarks: ["Promenade des Anglais", "Vieux Nice"],
      latitude: 43.7102,
      longitude: 7.262,
      tourismCategories: ["Beach Destinations"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "lyon",
      name: "Lyon",
      country: "France",
      region: "Atlantic Europe",
      description:
        "Lyon is renowned for its historical architecture, gastronomy, and Renaissance district at the confluence of the Rhône and Saône rivers.",
      thumbnail: "/images/lyon-thumbnail.jpeg",
      landmarks: [
        "Basilica of Notre-Dame de Fourvière",
        "Parc de la Tête d'Or",
      ],
      latitude: 45.764,
      longitude: 4.8357,
      tourismCategories: ["Historical Landmarks", "Gastronomic Destinations"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "marseille",
      name: "Marseille",
      country: "France",
      region: "Mediterranean",
      description:
        "Marseille, France's oldest city and largest port, features vibrant multicultural neighborhoods and stunning calanques.",
      thumbnail: "/images/marseille-thumbnail.jpeg",
      landmarks: ["Old Port", "Basilique Notre-Dame de la Garde"],
      latitude: 43.2965,
      longitude: 5.3698,
      tourismCategories: ["Historical Landmarks", "Natural Landscapes"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "bordeaux",
      name: "Bordeaux",
      country: "France",
      region: "Atlantic Europe",
      description:
        "Bordeaux, the wine capital of the world, boasts elegant 18th-century architecture, world-class vineyards, and a vibrant riverfront.",
      thumbnail: "/images/bordeaux-thumbnail.jpeg",
      landmarks: ["Place de la Bourse", "La Cité du Vin"],
      latitude: 44.8378,
      longitude: -0.5792,
      tourismCategories: ["Gastronomic Destinations", "Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "strasbourg",
      name: "Strasbourg",
      country: "France",
      region: "Central Europe",
      description:
        "Strasbourg, located on the German border, blends French and German influences in its cuisine, architecture, and culture. It is also home to important EU institutions.",
      thumbnail: "/images/strasbourg-thumbnail.jpeg",
      landmarks: ["Strasbourg Cathedral", "La Petite France"],
      latitude: 48.5734,
      longitude: 7.7521,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "toulouse",
      name: "Toulouse",
      country: "France",
      region: "Atlantic Europe",
      description:
        'Known as "La Ville Rose" (The Pink City) for its distinctive brick architecture, Toulouse is a hub for the aerospace industry and southern French culture.',
      thumbnail: "/images/toulouse-thumbnail.jpeg",
      landmarks: ["Place du Capitole", "Basilique Saint-Sernin"],
      latitude: 43.6047,
      longitude: 1.4442,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "nantes",
      name: "Nantes",
      country: "France",
      region: "Atlantic Europe",
      description:
        "A vibrant city on the Loire River, Nantes is known for its rich maritime history, innovative arts scene, and proximity to the Loire Valley.",
      thumbnail: "/images/nantes-thumbnail.jpeg",
      landmarks: ["Château des Ducs de Bretagne", "Les Machines de l'Île"],
      latitude: 47.2184,
      longitude: -1.5536,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "montpellier",
      name: "Montpellier",
      country: "France",
      region: "Mediterranean",
      description:
        "Montpellier is a vibrant university city with a historic center, elegant squares, and a thriving cultural scene.",
      thumbnail: "/images/montpellier-thumbnail.jpeg",
      landmarks: ["Place de la Comédie", "Promenade du Peyrou"],
      latitude: 43.6119,
      longitude: 3.8772,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "lille",
      name: "Lille",
      country: "France",
      region: "Atlantic Europe",
      description:
        "Lille is a cultural hub in northern France, featuring Flemish architecture, renowned museums, and a lively urban atmosphere.",
      thumbnail: "/images/lille-thumbnail.jpeg",
      landmarks: ["Old Stock Exchange", "Palais des Beaux-Arts"],
      latitude: 50.6292,
      longitude: 3.0573,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },

    // GERMANY
    {
      id: "berlin",
      name: "Berlin",
      country: "Germany",
      region: "Imperial Cities",
      description:
        "Berlin, Germany's dynamic capital, offers a mix of historical landmarks, world-class museums, and a vibrant modern cultural scene.",
      thumbnail: "/images/berlin-thumbnail.jpeg",
      landmarks: [
        "Brandenburg Gate",
        "Berlin Wall Memorial",
        "Reichstag Building",
      ],
      latitude: 52.52,
      longitude: 13.405,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "munich",
      name: "Munich",
      country: "Germany",
      region: "Alpine",
      description:
        "Munich is Bavaria's capital, blending traditional German culture with modern technology and renowned for its Oktoberfest celebrations.",
      thumbnail: "/images/munich-thumbnail.jpeg",
      landmarks: ["Marienplatz", "English Garden", "Nymphenburg Palace"],
      latitude: 48.1351,
      longitude: 11.582,
      tourismCategories: ["Historical Landmarks", "Gastronomic Destinations"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "hamburg",
      name: "Hamburg",
      country: "Germany",
      region: "Atlantic Europe",
      description:
        "Hamburg is Germany's major port city with a rich maritime heritage, impressive Hanseatic architecture, and a lively cultural scene.",
      thumbnail: "/images/hamburg-thumbnail.jpeg",
      landmarks: ["Port of Hamburg", "Elbphilharmonie"],
      latitude: 53.5511,
      longitude: 9.9937,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "cologne",
      name: "Cologne",
      country: "Germany",
      region: "Atlantic Europe",
      description:
        "Cologne is known for its twin-spired Gothic cathedral and a unique blend of Roman heritage and modern cultural vibrancy.",
      thumbnail: "/images/cologne-thumbnail.jpeg",
      landmarks: ["Cologne Cathedral", "Hohenzollern Bridge"],
      latitude: 50.9375,
      longitude: 6.9603,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "dresden",
      name: "Dresden",
      country: "Germany",
      region: "Imperial Cities",
      description:
        'Often called the "Florence of the Elbe," Dresden is celebrated for its stunning baroque architecture and rich musical legacy.',
      thumbnail: "/images/dresden-thumbnail.jpeg",
      landmarks: ["Zwinger Palace", "Semper Opera House"],
      latitude: 51.0504,
      longitude: 13.7373,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "frankfurt",
      name: "Frankfurt",
      country: "Germany",
      region: "Central Europe",
      description:
        "Frankfurt is a global financial hub with a striking skyline, international business centers, and a mix of modern and historic architecture.",
      thumbnail: "/images/frankfurt-thumbnail.jpeg",
      landmarks: ["Römer", "Main Tower", "St. Bartholomew's Cathedral"],
      latitude: 50.1109,
      longitude: 8.6821,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "dusseldorf",
      name: "Düsseldorf",
      country: "Germany",
      region: "Atlantic Europe",
      description:
        "Düsseldorf is a fashion and business center, famous for its shopping boulevard and vibrant arts scene, centered around its charming Altstadt (Old Town).",
      thumbnail: "/images/dusseldorf-thumbnail.jpeg",
      landmarks: ["Königsallee", "Altstadt"],
      latitude: 51.2277,
      longitude: 6.7735,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "stuttgart",
      name: "Stuttgart",
      country: "Germany",
      region: "Central Europe",
      description:
        "Stuttgart, the cradle of the automobile industry, is home to world-renowned museums like those dedicated to Mercedes-Benz and Porsche.",
      thumbnail: "/images/stuttgart-thumbnail.jpeg",
      landmarks: ["Mercedes-Benz Museum", "Wilhelma Zoo"],
      latitude: 48.7758,
      longitude: 9.1829,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "nuremberg",
      name: "Nuremberg",
      country: "Germany",
      region: "Central Europe",
      description:
        "A city steeped in history with medieval walls and architecture, Nuremberg is also famed for its traditional Christmas market.",
      thumbnail: "/images/nuremberg-thumbnail.png",
      landmarks: [
        "Nuremberg Castle",
        "Documentation Centre Nazi Party Rally Grounds",
      ],
      latitude: 49.4521,
      longitude: 11.0767,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "leipzig",
      name: "Leipzig",
      country: "Germany",
      region: "Central Europe",
      description:
        "Leipzig is a cultural hub with a rich musical heritage, known for its connection to Bach, Mendelssohn, and the peaceful revolution of 1989.",
      thumbnail: "/images/leipzig-thumbnail.png",
      landmarks: ["St. Thomas Church", "Leipzig Opera House"],
      latitude: 51.3397,
      longitude: 12.3731,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "heidelberg",
      name: "Heidelberg",
      country: "Germany",
      region: "Central Europe",
      description:
        "Heidelberg is a picturesque university town, famous for its romantic castle ruins and historic old town along the Neckar River.",
      thumbnail: "/images/heidelberg-thumbnail.png",
      landmarks: ["Heidelberg Castle", "Old Bridge"],
      latitude: 49.3988,
      longitude: 8.6724,
      tourismCategories: ["Historical Landmarks", "Natural Landscapes"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "bremen",
      name: "Bremen",
      country: "Germany",
      region: "Atlantic Europe",
      description:
        "Bremen is a historic Hanseatic city known for its fairytale connection, maritime heritage, and distinctive Gothic architecture.",
      thumbnail: "/images/bremen-thumbnail.png",
      landmarks: ["Bremen Town Musicians Statue", "Schnoor Quarter"],
      latitude: 53.0793,
      longitude: 8.8017,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "hannover",
      name: "Hannover",
      country: "Germany",
      region: "Atlantic Europe",
      description:
        "Hannover combines urban innovation with natural beauty, featuring the Royal Gardens of Herrenhausen and a rebuilt historic center.",
      thumbnail: "/images/hannover-thumbnail.png",
      landmarks: ["Herrenhausen Gardens", "New Town Hall"],
      latitude: 52.3759,
      longitude: 9.732,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },

    // NETHERLANDS
    {
      id: "amsterdam",
      name: "Amsterdam",
      country: "Netherlands",
      region: "Atlantic Europe",
      description:
        "Amsterdam is celebrated for its artistic heritage, elaborate canal system, and narrow houses with gabled facades—a legacy of its 17th-century Golden Age.",
      thumbnail: "/images/amsterdam-thumbnail.jpeg",
      landmarks: ["Rijksmuseum", "Anne Frank House", "Historic Canals"],
      latitude: 52.3676,
      longitude: 4.9041,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "rotterdam",
      name: "Rotterdam",
      country: "Netherlands",
      region: "Atlantic Europe",
      description:
        "Rotterdam, home to Europe's largest port, is known for its bold modern architecture, innovative urban design, and energetic atmosphere.",
      thumbnail: "/images/rotterdam-thumbnail.jpeg",
      landmarks: ["Erasmus Bridge", "Cube Houses"],
      latitude: 51.9244,
      longitude: 4.4777,
      tourismCategories: ["Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "utrecht",
      name: "Utrecht",
      country: "Netherlands",
      region: "Atlantic Europe",
      description:
        "Utrecht features a charming medieval center with iconic canals and the towering Dom, creating a vibrant atmosphere fueled by its large student population.",
      thumbnail: "/images/utrecht-thumbnail.jpeg",
      landmarks: ["Dom Tower", "Scenic Canals"],
      latitude: 52.0907,
      longitude: 5.1214,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "eindhoven",
      name: "Eindhoven",
      country: "Netherlands",
      region: "Atlantic Europe",
      description:
        "A hub for technology and design, Eindhoven is renowned for its innovation, being home to Philips and hosting the annual Dutch Design Week.",
      thumbnail: "/images/eindhoven-thumbnail.png",
      landmarks: ["Philips Museum", "Strijp-S District"],
      latitude: 51.4416,
      longitude: 5.4697,
      tourismCategories: ["Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "maastricht",
      name: "Maastricht",
      country: "Netherlands",
      region: "Atlantic Europe",
      description:
        "Maastricht, one of the oldest cities in the Netherlands, is famed for its picturesque squares, historical buildings, and lively culinary scene.",
      thumbnail: "/images/maastricht-thumbnail.png",
      landmarks: ["Vrijthof Square", "St. Servatius Basilica"],
      latitude: 50.8514,
      longitude: 5.691,
      tourismCategories: ["Historical Landmarks", "Cultural Tourism Hubs"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "delft",
      name: "Delft",
      country: "Netherlands",
      region: "Atlantic Europe",
      description:
        "Delft is known for its iconic blue pottery, historic canals, and connection to the royal House of Orange-Nassau.",
      thumbnail: "/images/delft-thumbnail.png",
      landmarks: ["Oude Kerk", "Royal Delft Factory"],
      latitude: 51.999,
      longitude: 4.362,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "groningen",
      name: "Groningen",
      country: "Netherlands",
      region: "Atlantic Europe",
      description:
        "Groningen is a vibrant university city in the north, known for its youthful energy, cycling culture, and historic architecture.",
      thumbnail: "/images/groningen-thumbnail.png",
      landmarks: ["Martinitoren", "Groninger Museum"],
      latitude: 53.2194,
      longitude: 6.5665,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "haarlem",
      name: "Haarlem",
      country: "Netherlands",
      region: "Atlantic Europe",
      description:
        "Haarlem offers historic charm with its medieval buildings, cobblestone streets, and proximity to tulip fields and coastal dunes.",
      thumbnail: "/images/haarlem-thumbnail.png",
      landmarks: ["Grote Markt", "Teylers Museum"],
      latitude: 52.3874,
      longitude: 4.6462,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },

    // SPAIN
    {
      id: "barcelona",
      name: "Barcelona",
      country: "Spain",
      region: "Mediterranean",
      description:
        "Barcelona is known for its unique blend of modernist architecture, vibrant street life, and beautiful Mediterranean beaches.",
      thumbnail: "/images/barcelona-thumbnail.png",
      landmarks: ["Sagrada Família", "Park Güell", "La Rambla"],
      latitude: 41.3851,
      longitude: 2.1734,
      tourismCategories: ["Historical Landmarks", "Beach Destinations"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "madrid",
      name: "Madrid",
      country: "Spain",
      region: "Atlantic Europe",
      description:
        "Madrid, Spain's capital, offers a mix of elegant boulevards, expansive parks, and world-class museums alongside a buzzing nightlife.",
      thumbnail: "/images/madrid-thumbnail.jpeg",
      landmarks: ["Royal Palace", "Prado Museum", "Retiro Park"],
      latitude: 40.4168,
      longitude: -3.7038,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "seville",
      name: "Seville",
      country: "Spain",
      region: "Mediterranean",
      description:
        "Seville captivates with its rich Moorish history, vibrant flamenco culture, and impressive architectural landmarks.",
      thumbnail: "/images/seville-thumbnail.jpeg",
      landmarks: ["Seville Cathedral", "Alcázar of Seville"],
      latitude: 37.3891,
      longitude: -5.9845,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "valencia",
      name: "Valencia",
      country: "Spain",
      region: "Mediterranean",
      description:
        "Valencia blends futuristic architecture with historic charm, offering beautiful beaches and the birthplace of paella.",
      thumbnail: "/images/valencia-thumbnail.png",
      landmarks: ["City of Arts and Sciences", "Valencia Cathedral"],
      latitude: 39.4699,
      longitude: -0.3763,
      tourismCategories: ["Historical Landmarks", "Beach Destinations"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "granada",
      name: "Granada",
      country: "Spain",
      region: "Mediterranean",
      description:
        "Granada is known for the stunning Alhambra palace complex, set against the backdrop of the Sierra Nevada mountains.",
      thumbnail: "/images/granada-thumbnail.jpeg",
      landmarks: ["Alhambra", "Albaicín"],
      latitude: 37.1773,
      longitude: -3.5986,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "bilbao",
      name: "Bilbao",
      country: "Spain",
      region: "Atlantic Europe",
      description:
        "Bilbao, a former industrial city, has transformed into a cultural hub, famous for the titanium-clad Guggenheim Museum.",
      thumbnail: "/images/bilbao-thumbnail.jpeg",
      landmarks: ["Guggenheim Museum", "Casco Viejo"],
      latitude: 43.263,
      longitude: -2.935,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "malaga",
      name: "Malaga",
      country: "Spain",
      region: "Mediterranean",
      description:
        "Malaga, Picasso's birthplace, offers Andalusian charm, beautiful beaches, and rich artistic heritage on the Costa del Sol.",
      thumbnail: "/images/malaga-thumbnail.jpeg",
      landmarks: ["Alcazaba", "Picasso Museum"],
      latitude: 36.7213,
      longitude: -4.4214,
      tourismCategories: ["Beach Destinations", "Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "toledo",
      name: "Toledo",
      country: "Spain",
      region: "Mediterranean",
      description:
        'Known as the "City of Three Cultures," Toledo preserves its diverse Christian, Jewish, and Islamic heritage within its ancient walls.',
      thumbnail: "/images/toledo-thumbnail.jpeg",
      landmarks: ["Toledo Cathedral", "Alcázar of Toledo"],
      latitude: 39.8628,
      longitude: -4.0273,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },

    // ITALY
    {
      id: "rome",
      name: "Rome",
      country: "Italy",
      region: "Mediterranean",
      description:
        "Rome, steeped in over two millennia of history, offers ancient ruins, Renaissance art, and vibrant street life.",
      thumbnail: "/images/rome-thumbnail.jpeg",
      landmarks: ["Colosseum", "Vatican City", "Trevi Fountain"],
      latitude: 41.9028,
      longitude: 12.4964,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "milan",
      name: "Milan",
      country: "Italy",
      region: "Alpine",
      description:
        "Milan is Italy's fashion and design capital, blending historic architecture with modern industry and cultural innovation.",
      thumbnail: "/images/milan-thumbnail.jpeg",
      landmarks: [
        "Duomo di Milano",
        "Sforza Castle",
        "Galleria Vittorio Emanuele II",
      ],
      latitude: 45.4642,
      longitude: 9.19,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "florence",
      name: "Florence",
      country: "Italy",
      region: "Mediterranean",
      description:
        "Florence is the cradle of the Renaissance, famed for its art, architecture, and enduring cultural legacy.",
      thumbnail: "/images/florence-thumbnail.jpeg",
      landmarks: ["Florence Cathedral", "Uffizi Gallery", "Ponte Vecchio"],
      latitude: 43.7696,
      longitude: 11.2558,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "venice",
      name: "Venice",
      country: "Italy",
      region: "Mediterranean",
      description:
        "Built on a network of canals, Venice is a city of romance and history, celebrated for its art and unique waterways.",
      thumbnail: "/images/venice-thumbnail.jpeg",
      landmarks: ["St. Mark's Basilica", "Grand Canal", "Rialto Bridge"],
      latitude: 45.4408,
      longitude: 12.3155,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "naples",
      name: "Naples",
      country: "Italy",
      region: "Mediterranean",
      description:
        "Naples offers a vibrant urban life, historical treasures, and serves as the gateway to the Amalfi Coast and Pompeii.",
      thumbnail: "/images/naples-thumbnail.jpeg",
      landmarks: [
        "Naples Historic Center",
        "Mount Vesuvius",
        "Castel dell'Ovo",
      ],
      latitude: 40.8518,
      longitude: 14.2681,
      tourismCategories: ["Historical Landmarks", "Gastronomic Destinations"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "bologna",
      name: "Bologna",
      country: "Italy",
      region: "Mediterranean",
      description:
        "Bologna is known for its cuisine, medieval architecture, and the oldest university in the Western world.",
      thumbnail: "/images/bologna-thumbnail.png",
      landmarks: ["Two Towers", "Archiginnasio"],
      latitude: 44.4949,
      longitude: 11.3426,
      tourismCategories: ["Gastronomic Destinations", "Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "palermo",
      name: "Palermo",
      country: "Italy",
      region: "Mediterranean",
      description:
        "Palermo, Sicily's capital, showcases a unique blend of Arab-Norman architecture and Mediterranean flair.",
      thumbnail: "/images/palermo-thumbnail.png",
      landmarks: ["Palermo Cathedral", "Quattro Canti"],
      latitude: 38.1157,
      longitude: 13.3615,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "turin",
      name: "Turin",
      country: "Italy",
      region: "Alpine",
      description:
        "Turin combines French-influenced elegance with Italian character, known for its automotive industry and Egyptian Museum.",
      thumbnail: "/images/turin-thumbnail.png",
      landmarks: ["Mole Antonelliana", "Royal Palace of Turin"],
      latitude: 45.0703,
      longitude: 7.6869,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "verona",
      name: "Verona",
      country: "Italy",
      region: "Mediterranean",
      description:
        "Verona, the setting for Shakespeare's Romeo and Juliet, enchants with its Roman arena, medieval squares, and romantic atmosphere.",
      thumbnail: "/images/verona-thumbnail.png",
      landmarks: ["Arena di Verona", "Juliet's House"],
      latitude: 45.4384,
      longitude: 10.9916,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Romance"],
    },

    // AUSTRIA
    {
      id: "vienna",
      name: "Vienna",
      country: "Austria",
      region: "Imperial Cities",
      description:
        "Vienna exudes imperial charm with its classical music legacy, grand palaces, and vibrant coffeehouse culture.",
      thumbnail: "/images/vienna-thumbnail.png",
      landmarks: [
        "Schönbrunn Palace",
        "St. Stephen's Cathedral",
        "Belvedere Palace",
      ],
      latitude: 48.2082,
      longitude: 16.3738,
      tourismCategories: ["Historical Landmarks", "Cultural Tourism Hubs"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "salzburg",
      name: "Salzburg",
      country: "Austria",
      region: "Alpine",
      description:
        "Famous as the birthplace of Mozart, Salzburg enchants visitors with its baroque architecture and stunning alpine backdrop.",
      thumbnail: "/images/salzburg-thumbnail.png",
      landmarks: ["Hohensalzburg Fortress", "Mirabell Palace"],
      latitude: 47.8095,
      longitude: 13.055,
      tourismCategories: ["Historical Landmarks", "Natural Landscapes"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "innsbruck",
      name: "Innsbruck",
      country: "Austria",
      region: "Alpine",
      description:
        "Nestled in the Alps, Innsbruck is renowned for its winter sports and picturesque mountain scenery.",
      thumbnail: "/images/innsbruck-thumbnail.png",
      landmarks: ["Golden Roof", "Innsbruck Cathedral"],
      latitude: 47.2692,
      longitude: 11.4041,
      tourismCategories: ["Mountain & Skiing", "Natural Landscapes"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "graz",
      name: "Graz",
      country: "Austria",
      region: "Alpine",
      description:
        "Graz, Austria's second-largest city, features a UNESCO-listed Old Town, modern architecture, and a thriving university culture.",
      thumbnail: "/images/graz-thumbnail.png",
      landmarks: ["Schlossberg", "Kunsthaus Graz"],
      latitude: 47.0707,
      longitude: 15.4395,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "linz",
      name: "Linz",
      country: "Austria",
      region: "Central Europe",
      description:
        "Linz has transformed from an industrial city to a cultural center, known for its electronic arts festival and riverside views.",
      thumbnail: "/images/linz-thumbnail.png",
      landmarks: ["Pöstlingberg", "Ars Electronica Center"],
      latitude: 48.3069,
      longitude: 14.2858,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },

    // BELGIUM
    {
      id: "brussels",
      name: "Brussels",
      country: "Belgium",
      region: "Atlantic Europe",
      description:
        "Brussels is the de facto capital of the European Union, celebrated for its historical sites, cuisine, and comic art culture.",
      thumbnail: "/images/brussels-thumbnail.png",
      landmarks: ["Grand Place", "Atomium", "Manneken Pis"],
      latitude: 50.8503,
      longitude: 4.3517,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Multilingual Areas"],
    },
    {
      id: "antwerp",
      name: "Antwerp",
      country: "Belgium",
      region: "Atlantic Europe",
      description:
        "Antwerp is a vibrant port city with a rich history in diamond trade, art, and fashion.",
      thumbnail: "/images/antwerp-thumbnail.png",
      landmarks: ["Cathedral of Our Lady", "Antwerp Zoo"],
      latitude: 51.2194,
      longitude: 4.4025,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Multilingual Areas"],
    },
    {
      id: "bruges",
      name: "Bruges",
      country: "Belgium",
      region: "Atlantic Europe",
      description:
        "Bruges enchants visitors with its medieval architecture, romantic canals, and cobblestone streets that evoke a fairytale atmosphere.",
      thumbnail: "/images/bruges-thumbnail.png",
      landmarks: ["Belfry of Bruges", "Markt Square"],
      latitude: 51.2093,
      longitude: 3.2247,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Multilingual Areas"],
    },
    {
      id: "ghent",
      name: "Ghent",
      country: "Belgium",
      region: "Atlantic Europe",
      description:
        "Ghent offers a perfect blend of historic charm and youthful energy, with its medieval architecture and vibrant university atmosphere.",
      thumbnail: "/images/ghent-thumbnail.png",
      landmarks: ["Gravensteen Castle", "St. Bavo's Cathedral"],
      latitude: 51.0543,
      longitude: 3.7174,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Multilingual Areas"],
    },
    {
      id: "liege",
      name: "Liège",
      country: "Belgium",
      region: "Atlantic Europe",
      description:
        "Liège combines industrial heritage with cultural richness, set in the scenic valley of the Meuse River.",
      thumbnail: "/images/liege-thumbnail.png",
      landmarks: ["Montagne de Bueren", "Liège-Guillemins Station"],
      latitude: 50.6326,
      longitude: 5.5797,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Multilingual Areas"],
    },

    // DENMARK
    {
      id: "copenhagen",
      name: "Copenhagen",
      country: "Denmark",
      region: "Celtic & Nordic",
      description:
        "Copenhagen is a modern Scandinavian capital known for its design, cycling culture, and historic harbor.",
      thumbnail: "/images/copenhagen-thumbnail.png",
      landmarks: ["Tivoli Gardens", "Nyhavn", "The Little Mermaid"],
      latitude: 55.6761,
      longitude: 12.5683,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "aarhus",
      name: "Aarhus",
      country: "Denmark",
      region: "Celtic & Nordic",
      description:
        "Aarhus blends ancient Viking history with modern innovation, featuring cutting-edge museums and a bustling waterfront.",
      thumbnail: "/images/aarhus-thumbnail.png",
      landmarks: ["ARoS Art Museum", "Den Gamle By"],
      latitude: 56.1629,
      longitude: 10.2039,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "odense",
      name: "Odense",
      country: "Denmark",
      region: "Celtic & Nordic",
      description:
        "Odense, the birthplace of Hans Christian Andersen, charms with its literary heritage, cobblestone streets, and historic homes.",
      thumbnail: "/images/odense-thumbnail.png",
      landmarks: ["Hans Christian Andersen Museum", "Saint Canute's Cathedral"],
      latitude: 55.4038,
      longitude: 10.4024,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },

    // IRELAND
    {
      id: "dublin",
      name: "Dublin",
      country: "Ireland",
      region: "Celtic & Nordic",
      description:
        "Dublin is a lively city known for its literary history, vibrant pub culture, and iconic landmarks.",
      thumbnail: "/images/dublin-thumbnail.jpeg",
      landmarks: [
        "Trinity College",
        "Guinness Storehouse",
        "St. Patrick's Cathedral",
      ],
      latitude: 53.3498,
      longitude: -6.2603,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Celtic"],
    },
    {
      id: "cork",
      name: "Cork",
      country: "Ireland",
      region: "Celtic & Nordic",
      description:
        "Cork, Ireland's second city, offers a vibrant arts scene, maritime heritage, and serves as a gateway to the scenic southwest.",
      thumbnail: "/images/cork-thumbnail.png",
      landmarks: ["English Market", "Blarney Castle"],
      latitude: 51.8985,
      longitude: -8.4756,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Celtic"],
    },
    {
      id: "galway",
      name: "Galway",
      country: "Ireland",
      region: "Celtic & Nordic",
      description:
        "Galway captivates with its bohemian spirit, traditional Irish music, and stunning location on the Wild Atlantic Way.",
      thumbnail: "/images/galway-thumbnail.png",
      landmarks: ["Galway Cathedral", "Spanish Arch"],
      latitude: 53.2707,
      longitude: -9.0568,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Celtic"],
    },
    {
      id: "limerick",
      name: "Limerick",
      country: "Ireland",
      region: "Celtic & Nordic",
      description:
        "Limerick combines medieval history with Georgian elegance, situated along the majestic River Shannon.",
      thumbnail: "/images/limerick-thumbnail.png",
      landmarks: ["King John's Castle", "Hunt Museum"],
      latitude: 52.668,
      longitude: -8.6305,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Celtic"],
    },

    // PORTUGAL
    {
      id: "lisbon",
      name: "Lisbon",
      country: "Portugal",
      region: "Atlantic Islands",
      description:
        "Lisbon, perched on seven hills, offers a blend of traditional heritage and striking modernism, with a scenic riverside setting.",
      thumbnail: "/images/lisbon-thumbnail.png",
      landmarks: ["Belém Tower", "Jerónimos Monastery", "Alfama District"],
      latitude: 38.7223,
      longitude: -9.1393,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "porto",
      name: "Porto",
      country: "Portugal",
      region: "Atlantic Europe",
      description:
        "Porto is known for its historic center, vibrant wine culture, and dramatic riverside landscapes.",
      thumbnail: "/images/porto-thumbnail.png",
      landmarks: ["Dom Luís I Bridge", "Livraria Lello", "Clérigos Tower"],
      latitude: 41.1579,
      longitude: -8.6291,
      tourismCategories: ["Historical Landmarks", "Gastronomic Destinations"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "faro",
      name: "Faro",
      country: "Portugal",
      region: "Mediterranean",
      description:
        "Faro, the gateway to the Algarve, combines a historic old town with nearby golden beaches and natural reserves.",
      thumbnail: "/images/faro-thumbnail.jpg",
      landmarks: ["Arco da Vila", "Faro Cathedral"],
      latitude: 37.0194,
      longitude: -7.9304,
      tourismCategories: ["Beach Destinations", "Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "coimbra",
      name: "Coimbra",
      country: "Portugal",
      region: "Atlantic Europe",
      description:
        "Coimbra, home to one of Europe's oldest universities, offers rich academic traditions, medieval architecture, and Fado music.",
      thumbnail: "/images/coimbra-thumbnail.jpg",
      landmarks: ["University of Coimbra", "Old Cathedral of Coimbra"],
      latitude: 40.2056,
      longitude: -8.429,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "funchal",
      name: "Funchal",
      country: "Portugal",
      region: "Atlantic Islands",
      description:
        "Funchal, the capital of Madeira Island, features subtropical gardens, volcanic landscapes, and a picturesque harbor.",
      thumbnail: "/images/funchal-thumbnail.jpg",
      landmarks: ["Monte Cable Car", "Madeira Botanical Garden"],
      latitude: 32.6669,
      longitude: -16.9241,
      tourismCategories: ["Historical Landmarks", "Natural Landscapes"],
      linguisticCategories: ["Romance"],
    },

    // GREECE
    {
      id: "athens",
      name: "Athens",
      country: "Greece",
      region: "Mediterranean",
      description:
        "Athens is a city where ancient history meets modern urban life, boasting iconic ruins and lively neighborhoods.",
      thumbnail: "/images/athens-thumbnail.jpg",
      landmarks: ["Acropolis", "Parthenon", "Plaka"],
      latitude: 37.9838,
      longitude: 23.7275,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Hellenic"],
    },
    {
      id: "thessaloniki",
      name: "Thessaloniki",
      country: "Greece",
      region: "Mediterranean",
      description:
        "Thessaloniki blends Byzantine heritage with a vibrant waterfront and cultural scene as Greece's second-largest city.",
      thumbnail: "/images/thessaloniki-thumbnail.jpg",
      landmarks: ["White Tower", "Rotunda"],
      latitude: 40.6401,
      longitude: 22.9444,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Hellenic"],
    },
    {
      id: "heraklion",
      name: "Heraklion",
      country: "Greece",
      region: "Mediterranean",
      description:
        "Heraklion, Crete's capital, combines ancient Minoan heritage with a lively modern atmosphere.",
      thumbnail: "/images/heraklion-thumbnail.jpg",
      landmarks: ["Palace of Knossos", "Heraklion Archaeological Museum"],
      latitude: 35.3387,
      longitude: 25.1442,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Hellenic"],
    },
    {
      id: "rhodes",
      name: "Rhodes",
      country: "Greece",
      region: "Mediterranean",
      description:
        "Rhodes Town features a UNESCO-listed medieval Old Town enclosed within impressive fortress walls.",
      thumbnail: "/images/rhodes-thumbnail.jpg",
      landmarks: ["Palace of the Grand Master", "Street of the Knights"],
      latitude: 36.4349,
      longitude: 28.2176,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Hellenic"],
    },
    {
      id: "santorini",
      name: "Santorini",
      country: "Greece",
      region: "Mediterranean",
      description:
        "Santorini captivates with its iconic white-washed buildings perched on volcanic cliffs overlooking the azure Aegean Sea.",
      thumbnail: "/images/santorini-thumbnail.jpg",
      landmarks: ["Oia Village", "Akrotiri Archaeological Site"],
      latitude: 36.3932,
      longitude: 25.4615,
      tourismCategories: ["Historical Landmarks", "Beach Destinations"],
      linguisticCategories: ["Hellenic"],
    },

    // SWEDEN
    {
      id: "stockholm",
      name: "Stockholm",
      country: "Sweden",
      region: "Celtic & Nordic",
      description:
        "Stockholm is built on a series of islands and is renowned for its stunning waterfront, historic core, and innovative design scene.",
      thumbnail: "/images/stockholm-thumbnail.jpg",
      landmarks: ["Gamla Stan", "Vasa Museum", "Royal Palace"],
      latitude: 59.3293,
      longitude: 18.0686,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "gothenburg",
      name: "Gothenburg",
      country: "Sweden",
      region: "Celtic & Nordic",
      description:
        "Gothenburg offers maritime charm with its harbor, canals, and relaxed atmosphere as Sweden's second-largest city.",
      thumbnail: "/images/gothenburg-thumbnail.jpg",
      landmarks: ["Liseberg Amusement Park", "Gothenburg Archipelago"],
      latitude: 57.7089,
      longitude: 11.9746,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "malmo",
      name: "Malmö",
      country: "Sweden",
      region: "Celtic & Nordic",
      description:
        "Malmö combines historic roots with modern sustainability, connected to Copenhagen by the Öresund Bridge.",
      thumbnail: "/images/malmo-thumbnail.jpg",
      landmarks: ["Turning Torso", "Malmö Castle"],
      latitude: 55.605,
      longitude: 13.0038,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "uppsala",
      name: "Uppsala",
      country: "Sweden",
      region: "Celtic & Nordic",
      description:
        "Uppsala, Sweden's fourth-largest city, is known for its prestigious university, Gothic cathedral, and Viking heritage.",
      thumbnail: "/images/uppsala-thumbnail.jpg",
      landmarks: ["Uppsala Cathedral", "Uppsala University"],
      latitude: 59.8586,
      longitude: 17.6389,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },

    // NORWAY
    {
      id: "oslo",
      name: "Oslo",
      country: "Norway",
      region: "Celtic & Nordic",
      description:
        "Oslo offers a unique blend of modern architecture and natural beauty, set against a backdrop of fjords and forested hills.",
      thumbnail: "/images/oslo-thumbnail.jpg",
      landmarks: [
        "Vigeland Sculpture Park",
        "Akershus Fortress",
        "Oslo Opera House",
      ],
      latitude: 59.9139,
      longitude: 10.7522,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "bergen",
      name: "Bergen",
      country: "Norway",
      region: "Celtic & Nordic",
      description:
        "Bergen enchants with its colorful wooden houses along the old wharf, surrounded by seven mountains and fjords.",
      thumbnail: "/images/bergen-thumbnail.jpg",
      landmarks: ["Bryggen Hanseatic Wharf", "Mount Fløyen"],
      latitude: 60.3913,
      longitude: 5.3221,
      tourismCategories: ["Historical Landmarks", "Natural Landscapes"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "trondheim",
      name: "Trondheim",
      country: "Norway",
      region: "Celtic & Nordic",
      description:
        "Trondheim, Norway's third-largest city and former capital, features colorful warehouses and a stunning Gothic cathedral.",
      thumbnail: "/images/trondheim-thumbnail.jpg",
      landmarks: ["Nidaros Cathedral", "Old Town Bridge"],
      latitude: 63.4305,
      longitude: 10.3951,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "tromso",
      name: "Tromsø",
      country: "Norway",
      region: "Arctic",
      description:
        "Tromsø, located above the Arctic Circle, offers northern lights viewing, midnight sun, and a vibrant cultural scene.",
      thumbnail: "/images/tromso-thumbnail.jpg",
      landmarks: ["Arctic Cathedral", "Polaria"],
      latitude: 69.6492,
      longitude: 18.956,
      tourismCategories: ["Adventure Travel", "Natural Landscapes"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "stavanger",
      name: "Stavanger",
      country: "Norway",
      region: "Celtic & Nordic",
      description:
        "Stavanger blends old-world charm with modern energy, serving as the gateway to spectacular fjords and the famous Pulpit Rock.",
      thumbnail: "/images/stavanger-thumbnail.jpg",
      landmarks: ["Old Stavanger", "Norwegian Petroleum Museum"],
      latitude: 58.969,
      longitude: 5.7331,
      tourismCategories: ["Historical Landmarks", "Adventure Travel"],
      linguisticCategories: ["Germanic"],
    },

    // FINLAND
    {
      id: "helsinki",
      name: "Helsinki",
      country: "Finland",
      region: "Celtic & Nordic",
      description:
        "Helsinki is known for its design-driven culture, maritime charm, and a mix of modern and neoclassical architecture.",
      thumbnail: "/images/helsinki-thumbnail.jpg",
      landmarks: ["Helsinki Cathedral", "Suomenlinna", "Market Square"],
      latitude: 60.1699,
      longitude: 24.9384,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Uralic"],
    },
    {
      id: "tampere",
      name: "Tampere",
      country: "Finland",
      region: "Celtic & Nordic",
      description:
        "Tampere, located between two lakes, was a historical industrial center that has transformed into a hub for culture and technology.",
      thumbnail: "/images/tampere-thumbnail.jpg",
      landmarks: ["Tampere Cathedral", "Särkänniemi Amusement Park"],
      latitude: 61.4978,
      longitude: 23.761,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Uralic"],
    },
    {
      id: "turku",
      name: "Turku",
      country: "Finland",
      region: "Celtic & Nordic",
      description:
        "Turku, Finland's oldest city and former capital, offers medieval heritage, an archipelago, and a lively cultural scene.",
      thumbnail: "/images/turku-thumbnail.jpg",
      landmarks: ["Turku Castle", "Turku Cathedral"],
      latitude: 60.4518,
      longitude: 22.2666,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Uralic"],
    },
    {
      id: "rovaniemi",
      name: "Rovaniemi",
      country: "Finland",
      region: "Arctic",
      description:
        'Rovaniemi, the "official hometown of Santa Claus," is the gateway to Lapland, offering Arctic adventures and Northern Lights.',
      thumbnail: "/images/rovaniemi-thumbnail.jpg",
      landmarks: ["Santa Claus Village", "Arktikum Science Museum"],
      latitude: 66.5039,
      longitude: 25.7294,
      tourismCategories: ["Adventure Travel"],
      linguisticCategories: ["Uralic"],
    },

    // SWITZERLAND
    {
      id: "zurich",
      name: "Zurich",
      country: "Switzerland",
      region: "Alpine",
      description:
        "Zurich is Switzerland's financial center, offering a mix of medieval charm, modern amenities, and lakeside beauty.",
      thumbnail: "/images/zurich-thumbnail.jpg",
      landmarks: ["Lake Zurich", "Old Town", "Bahnhofstrasse"],
      latitude: 47.3769,
      longitude: 8.5417,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "geneva",
      name: "Geneva",
      country: "Switzerland",
      region: "Alpine",
      description:
        "Geneva, a global hub for diplomacy, combines French influence, a magnificent lakefront, and mountain views.",
      thumbnail: "/images/geneva-thumbnail.jpg",
      landmarks: ["Jet d'Eau", "Palais des Nations"],
      latitude: 46.2044,
      longitude: 6.1432,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Romance"],
    },
    {
      id: "basel",
      name: "Basel",
      country: "Switzerland",
      region: "Alpine",
      description:
        "Basel, at the meeting point of three countries, is renowned for its art, architecture, and pharmaceutical industry.",
      thumbnail: "/images/basel-thumbnail.jpg",
      landmarks: ["Basel Minster", "Kunstmuseum Basel"],
      latitude: 47.5596,
      longitude: 7.5886,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "bern",
      name: "Bern",
      country: "Switzerland",
      region: "Alpine",
      description:
        "Bern, Switzerland's capital, charms with its medieval old town, covered arcades, and scenic Aare River.",
      thumbnail: "/images/bern-thumbnail.jpg",
      landmarks: ["Clock Tower (Zytglogge)", "Federal Palace"],
      latitude: 46.948,
      longitude: 7.4474,
      tourismCategories: ["Historical Landmarks", "Natural Landscapes"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "lucerne",
      name: "Lucerne",
      country: "Switzerland",
      region: "Alpine",
      description:
        "Lucerne offers picture-perfect lake and mountain scenery, with its iconic wooden bridge and well-preserved medieval core.",
      thumbnail: "/images/lucerne-thumbnail.jpg",
      landmarks: ["Chapel Bridge", "Lion Monument"],
      latitude: 47.0502,
      longitude: 8.3093,
      tourismCategories: ["Historical Landmarks", "Natural Landscapes"],
      linguisticCategories: ["Germanic"],
    },
    {
      id: "lausanne",
      name: "Lausanne",
      country: "Switzerland",
      region: "Alpine",
      description:
        "Lausanne, home to the International Olympic Committee, offers spectacular views of Lake Geneva and the Alps.",
      thumbnail: "/images/lausanne-thumbnail.jpg",
      landmarks: ["Lausanne Cathedral", "Olympic Museum"],
      latitude: 46.5197,
      longitude: 6.6336,
      tourismCategories: ["Historical Landmarks", "Natural Landscapes"],
      linguisticCategories: ["Romance"],
    },

    // CZECH REPUBLIC
    {
      id: "prague",
      name: "Prague",
      country: "Czech Republic",
      region: "Imperial Cities",
      description:
        "Prague is famous for its well-preserved medieval architecture, enchanting bridges, and vibrant cultural scene.",
      thumbnail: "/images/prague-thumbnail.jpg",
      landmarks: ["Charles Bridge", "Prague Castle", "Old Town Square"],
      latitude: 50.0755,
      longitude: 14.4378,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "brno",
      name: "Brno",
      country: "Czech Republic",
      region: "Central Europe",
      description:
        "Brno, the Czech Republic's second-largest city, combines history with modernity and hosts international trade fairs.",
      thumbnail: "/images/brno-thumbnail.jpg",
      landmarks: ["Špilberk Castle", "Villa Tugendhat"],
      latitude: 49.1951,
      longitude: 16.6068,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "pilsen",
      name: "Pilsen",
      country: "Czech Republic",
      region: "Central Europe",
      description:
        "Pilsen is renowned worldwide for its beer brewing tradition and offers a charming historic center.",
      thumbnail: "/images/pilsen-thumbnail.jpg",
      landmarks: ["St. Bartholomew's Cathedral", "Pilsner Urquell Brewery"],
      latitude: 49.7384,
      longitude: 13.3736,
      tourismCategories: ["Historical Landmarks", "Gastronomic Destinations"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "český-krumlov",
      name: "Český Krumlov",
      country: "Czech Republic",
      region: "Central Europe",
      description:
        "Český Krumlov is a fairytale-like town with a stunning castle complex and winding riverside setting.",
      thumbnail: "/images/cesky-krumlov-thumbnail.jpg",
      landmarks: ["Český Krumlov Castle", "Baroque Theater"],
      latitude: 48.81,
      longitude: 14.315,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Slavic"],
    },

    // HUNGARY
    {
      id: "budapest",
      name: "Budapest",
      country: "Hungary",
      region: "Imperial Cities",
      description:
        "Budapest is split by the Danube River into two distinct areas—Buda and Pest—each with its own historical and cultural identity.",
      thumbnail: "/images/budapest-thumbnail.jpg",
      landmarks: ["Parliament Building", "Buda Castle", "Chain Bridge"],
      latitude: 47.4979,
      longitude: 19.0402,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Uralic"],
    },
    {
      id: "debrecen",
      name: "Debrecen",
      country: "Hungary",
      region: "Central Europe",
      description:
        "Debrecen, Hungary's second-largest city, features a central Great Reformed Church and rich cultural institutions.",
      thumbnail: "/images/debrecen-thumbnail.jpg",
      landmarks: ["Great Reformed Church", "Déri Museum"],
      latitude: 47.5316,
      longitude: 21.6273,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Uralic"],
    },
    {
      id: "szeged",
      name: "Szeged",
      country: "Hungary",
      region: "Central Europe",
      description:
        'Szeged, known as the "City of Sunshine," offers Art Nouveau architecture and a vibrant university atmosphere.',
      thumbnail: "/images/szeged-thumbnail.jpg",
      landmarks: ["Szeged Cathedral", "Reök Palace"],
      latitude: 46.253,
      longitude: 20.1414,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Uralic"],
    },
    {
      id: "pécs",
      name: "Pécs",
      country: "Hungary",
      region: "Central Europe",
      description:
        "Pécs blends 2,000 years of history with a Mediterranean atmosphere and UNESCO-listed early Christian sites.",
      thumbnail: "/images/pecs-thumbnail.jpg",
      landmarks: ["Pécs Cathedral", "Zsolnay Cultural Quarter"],
      latitude: 46.0727,
      longitude: 18.2324,
      tourismCategories: ["Historical Landmarks", "Gastronomic Destinations"],
      linguisticCategories: ["Uralic"],
    },

    // POLAND
    {
      id: "warsaw",
      name: "Warsaw",
      country: "Poland",
      region: "Central Europe",
      description:
        "Warsaw, the capital of Poland, is a dynamic blend of modern skyscrapers and meticulously reconstructed historic districts.",
      thumbnail: "/images/warsaw-thumbnail.jpg",
      landmarks: [
        "Royal Castle",
        "Łazienki Park",
        "Palace of Culture and Science",
      ],
      latitude: 52.2297,
      longitude: 21.0122,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "krakow",
      name: "Krakow",
      country: "Poland",
      region: "Central Europe",
      description:
        "Krakow charms visitors with its well-preserved medieval core, vibrant cultural scene, and rich historical heritage.",
      thumbnail: "/images/krakow-thumbnail.jpg",
      landmarks: ["Wawel Castle", "Main Market Square", "St. Mary's Basilica"],
      latitude: 50.0647,
      longitude: 19.945,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "gdansk",
      name: "Gdańsk",
      country: "Poland",
      region: "Atlantic Europe",
      description:
        "Gdańsk is a Baltic port city with a Hanseatic heritage, striking brick architecture, and historical significance.",
      thumbnail: "/images/gdansk-thumbnail.jpg",
      landmarks: ["Long Market", "European Solidarity Centre"],
      latitude: 54.352,
      longitude: 18.6466,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "wroclaw",
      name: "Wrocław",
      country: "Poland",
      region: "Central Europe",
      description:
        "Wrocław is built on multiple islands connected by bridges, featuring Gothic architecture and a vibrant university atmosphere.",
      thumbnail: "/images/wroclaw-thumbnail.jpg",
      landmarks: ["Market Square", "Cathedral Island"],
      latitude: 51.1079,
      longitude: 17.0385,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "poznan",
      name: "Poznań",
      country: "Poland",
      region: "Central Europe",
      description:
        "Poznań combines a charming old town with industrial heritage and is known for its international trade fairs.",
      thumbnail: "/images/poznan-thumbnail.jpg",
      landmarks: ["Poznań Town Hall", "Cathedral of St. Peter and Paul"],
      latitude: 52.4064,
      longitude: 16.9252,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Slavic"],
    },

    // CROATIA
    {
      id: "dubrovnik",
      name: "Dubrovnik",
      country: "Croatia",
      region: "Mediterranean",
      description:
        'Dubrovnik, known as the "Pearl of the Adriatic," captivates with its well-preserved walls, stunning coastal views, and historic old town.',
      thumbnail: "/images/dubrovnik-thumbnail.jpg",
      landmarks: ["City Walls", "Old Town", "Stradun"],
      latitude: 42.6507,
      longitude: 18.0944,
      tourismCategories: ["Historical Landmarks", "Beach Destinations"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "split",
      name: "Split",
      country: "Croatia",
      region: "Mediterranean",
      description:
        "Split is celebrated for the monumental Diocletian's Palace, which forms the heart of this vibrant coastal city.",
      thumbnail: "/images/split-thumbnail.jpg",
      landmarks: ["Diocletian's Palace", "Riva"],
      latitude: 43.5081,
      longitude: 16.4402,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "zagreb",
      name: "Zagreb",
      country: "Croatia",
      region: "Central Europe",
      description:
        "Zagreb, Croatia's capital, blends Austro-Hungarian architecture with a vibrant café culture and artistic spirit.",
      thumbnail: "/images/zagreb-thumbnail.jpg",
      landmarks: ["St. Mark's Church", "Ban Jelačić Square"],
      latitude: 45.815,
      longitude: 15.9819,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "zadar",
      name: "Zadar",
      country: "Croatia",
      region: "Mediterranean",
      description:
        "Zadar combines ancient Roman ruins with innovative modern installations along its scenic Adriatic waterfront.",
      thumbnail: "/images/zadar-thumbnail.jpg",
      landmarks: ["Sea Organ", "Church of St. Donatus"],
      latitude: 44.1194,
      longitude: 15.2314,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "rijeka",
      name: "Rijeka",
      country: "Croatia",
      region: "Mediterranean",
      description:
        "Rijeka, Croatia's primary seaport, features Habsburg-era architecture, industrial heritage, and a multicultural identity.",
      thumbnail: "/images/rijeka-thumbnail.jpg",
      landmarks: ["Trsat Castle", "Korzo Promenade"],
      latitude: 45.3271,
      longitude: 14.4422,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Slavic"],
    },

    // ESTONIA
    {
      id: "tallinn",
      name: "Tallinn",
      country: "Estonia",
      region: "Celtic & Nordic",
      description:
        "Tallinn boasts one of Europe's best-preserved medieval city centers alongside cutting-edge technology and design.",
      thumbnail: "/images/tallinn-thumbnail.jpg",
      landmarks: ["Tallinn Old Town", "Toompea Castle"],
      latitude: 59.437,
      longitude: 24.7536,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Uralic"],
    },
    {
      id: "tartu",
      name: "Tartu",
      country: "Estonia",
      region: "Celtic & Nordic",
      description:
        "Tartu, Estonia's intellectual center, offers a rich university heritage, bohemian atmosphere, and historic wooden architecture.",
      thumbnail: "/images/tartu-thumbnail.jpg",
      landmarks: ["University of Tartu", "Town Hall Square"],
      latitude: 58.3776,
      longitude: 26.729,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Uralic"],
    },

    // LATVIA
    {
      id: "riga",
      name: "Riga",
      country: "Latvia",
      region: "Celtic & Nordic",
      description:
        "Riga features the largest collection of Art Nouveau buildings in Europe alongside a charming medieval Old Town.",
      thumbnail: "/images/riga-thumbnail.jpg",
      landmarks: ["House of the Blackheads", "St. Peter's Church"],
      latitude: 56.9496,
      longitude: 24.1052,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Baltic"],
    },
    {
      id: "jurmala",
      name: "Jūrmala",
      country: "Latvia",
      region: "Celtic & Nordic",
      description:
        "Jūrmala is a resort city known for its wooden Art Nouveau villas, long sandy beach, and spa traditions.",
      thumbnail: "/images/jurmala-thumbnail.jpg",
      landmarks: ["Dzintari Concert Hall", "Jomas Street"],
      latitude: 56.968,
      longitude: 23.77,
      tourismCategories: ["Beach Destinations"],
      linguisticCategories: ["Baltic"],
    },

    // LITHUANIA
    {
      id: "vilnius",
      name: "Vilnius",
      country: "Lithuania",
      region: "Celtic & Nordic",
      description:
        "Vilnius offers one of Eastern Europe's largest baroque old towns, featuring diverse architectural styles and artistic atmosphere.",
      thumbnail: "/images/vilnius-thumbnail.jpg",
      landmarks: ["Gediminas Tower", "Gate of Dawn"],
      latitude: 54.6872,
      longitude: 25.2797,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Baltic"],
    },
    {
      id: "kaunas",
      name: "Kaunas",
      country: "Lithuania",
      region: "Celtic & Nordic",
      description:
        "Kaunas blends modernist architecture with medieval history and served as Lithuania's temporary capital between the wars.",
      thumbnail: "/images/kaunas-thumbnail.jpg",
      landmarks: ["Kaunas Castle", "Laisvės Alėja"],
      latitude: 54.8985,
      longitude: 23.9036,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Baltic"],
    },
    {
      id: "klaipeda",
      name: "Klaipėda",
      country: "Lithuania",
      region: "Celtic & Nordic",
      description:
        "Klaipėda is Lithuania's main seaport, offering a distinctive German-influenced old town and gateway to the Curonian Spit.",
      thumbnail: "/images/klaipeda-thumbnail.jpg",
      landmarks: ["Theatre Square", "Sculpture Park"],
      latitude: 55.7033,
      longitude: 21.1443,
      tourismCategories: ["Historical Landmarks", "Beach Destinations"],
      linguisticCategories: ["Baltic"],
    },

    // SLOVENIA
    {
      id: "ljubljana",
      name: "Ljubljana",
      country: "Slovenia",
      region: "Alpine",
      description:
        "Ljubljana captivates with its riverside cafés, distinctive bridges, and harmonious blend of baroque and Art Nouveau architecture.",
      thumbnail: "/images/ljubljana-thumbnail.jpg",
      landmarks: ["Ljubljana Castle", "Triple Bridge"],
      latitude: 46.0569,
      longitude: 14.5058,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "maribor",
      name: "Maribor",
      country: "Slovenia",
      region: "Alpine",
      description:
        "Maribor, Slovenia's second-largest city, is known for the world's oldest grapevine and its picturesque Drava River setting.",
      thumbnail: "/images/maribor-thumbnail.jpg",
      landmarks: ["Old Vine House", "Maribor Cathedral"],
      latitude: 46.5547,
      longitude: 15.6459,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "bled",
      name: "Bled",
      country: "Slovenia",
      region: "Alpine",
      description:
        "Bled is renowned for its stunning alpine lake with a fairy-tale island church and dramatic castle perched on a cliff.",
      thumbnail: "/images/bled-thumbnail.jpg",
      landmarks: ["Lake Bled", "Bled Castle"],
      latitude: 46.3649,
      longitude: 14.1149,
      tourismCategories: ["Historical Landmarks", "Natural Landscapes"],
      linguisticCategories: ["Slavic"],
    },

    // SLOVAKIA
    {
      id: "bratislava",
      name: "Bratislava",
      country: "Slovakia",
      region: "Central Europe",
      description:
        "Bratislava combines a charming old town with contemporary urban development along the Danube River.",
      thumbnail: "/images/bratislava-thumbnail.jpg",
      landmarks: ["Bratislava Castle", "St. Martin's Cathedral"],
      latitude: 48.1486,
      longitude: 17.1077,
      tourismCategories: ["Historical Landmarks", "Urban Exploration"],
      linguisticCategories: ["Slavic"],
    },
    {
      id: "kosice",
      name: "Košice",
      country: "Slovakia",
      region: "Central Europe",
      description:
        "Košice features a well-preserved medieval core centered around a magnificent Gothic cathedral and lively main street.",
      thumbnail: "/images/kosice-thumbnail.jpg",
      landmarks: ["St. Elisabeth Cathedral", "Singing Fountain"],
      latitude: 48.7164,
      longitude: 21.2611,
      tourismCategories: ["Historical Landmarks"],
      linguisticCategories: ["Slavic"],
    },
  ];
};

// Generate a map of regions by country based on both regionData and city data
export const countryRegions = (() => {
  // First, initialize with regionThemes data
  const regionsByCountry = {};

  // Add regions from regionThemes (more reliable/canonical source)
  regionThemes.forEach((region) => {
    region.countries.forEach((country) => {
      if (!regionsByCountry[country]) {
        regionsByCountry[country] = new Set();
      }
      regionsByCountry[country].add(region.id);
    });
  });

  // Then add any additional regions from city data
  getCitiesData().forEach((city) => {
    if (!regionsByCountry[city.country]) {
      regionsByCountry[city.country] = new Set();
    }
    regionsByCountry[city.country].add(city.region);
  });

  // Convert each set to an array
  Object.keys(regionsByCountry).forEach((country) => {
    regionsByCountry[country] = [...regionsByCountry[country]];
  });

  return regionsByCountry;
})();

// Basic helper functions
export const getCityById = (cityId) => {
  const cities = getCitiesData();
  return cities.find((city) => city.id === cityId);
};

export const getCitiesByCountry = (countryName) => {
  const cities = getCitiesData();
  return cities.filter((city) => city.country === countryName);
};

// Get cities by region - with proper filter type handling
export const getCitiesByRegion = (regionId, filterType = "geographic") => {
  console.log(
    `FILTER FUNCTION CALLED: regionId=${regionId}, filterType=${filterType}`
  );
  const cities = getCitiesData();

  if (regionId === "All") return cities;

  let filteredCities = [];

  // Filter by geographic region using country membership
  if (filterType === "geographic") {
    const mainRegion = regionThemes.find((r) => r.id === regionId);
    if (mainRegion && mainRegion.countries) {
      console.log(
        `Found geographic region: ${regionId} with countries: ${mainRegion.countries.join(
          ", "
        )}`
      );
      filteredCities = cities.filter((city) =>
        mainRegion.countries.includes(city.country)
      );
    } else {
      console.log(`No geographic region found for: ${regionId}`);
      return [];
    }
  }

  // Filter by secondary region using region property
  else if (filterType === "region") {
    console.log(`Filtering by secondary region: ${regionId}`);
    filteredCities = cities.filter((city) => city.region === regionId);
  }

  // Filter by tourism theme
  else if (filterType === "travel") {
    console.log(`Filtering by travel theme: ${regionId}`);
    // Explicitly log each city and whether it contains the theme
    filteredCities = cities.filter((city) => {
      const hasTheme =
        city.tourismCategories &&
        Array.isArray(city.tourismCategories) &&
        city.tourismCategories.includes(regionId);

      if (hasTheme) {
        console.log(`City ${city.name} has theme ${regionId}`);
      }

      return hasTheme;
    });
  }

  // Default case - shouldn't happen but good to have
  else {
    console.log(
      `Unknown filter type: ${filterType}, falling back to region property`
    );
    filteredCities = cities.filter((city) => city.region === regionId);
  }

  console.log(`Filter results: Found ${filteredCities.length} cities`);
  return filteredCities;
};

// Get countries for a specific region
export const getCountriesByRegion = (regionId, filterType = "geographic") => {
  // If it's "All", return all countries from city data
  if (regionId === "All") {
    return [...new Set(getCitiesData().map((city) => city.country))];
  }

  // For main geographic regions, use the countries defined in regionThemes
  if (filterType === "geographic") {
    const mainRegion = regionThemes.find((r) => r.id === regionId);
    if (mainRegion) {
      return mainRegion.countries;
    }
  }

  // For secondary regions, filter from city data
  if (filterType === "region") {
    const cities = getCitiesData().filter((city) => city.region === regionId);
    return [...new Set(cities.map((city) => city.country))];
  }

  // For travel/tourism regions, find countries with cities in that category
  if (filterType === "travel") {
    // Filter cities first
    const filteredCities = getCitiesByRegion(regionId, "travel");
    // Then extract unique countries
    return [...new Set(filteredCities.map((city) => city.country))];
  }

  // Fallback to filtering from city data
  const cities = getCitiesData().filter((city) => city.region === regionId);
  return [...new Set(cities.map((city) => city.country))];
};

// Tourism theme helper (more explicit)
export const getCitiesByTourismTheme = (theme) => {
  if (theme === "All") return getCitiesData();

  return getCitiesData().filter(
    (city) =>
      city.tourismCategories &&
      Array.isArray(city.tourismCategories) &&
      city.tourismCategories.includes(theme)
  );
};

// Linguistic theme helper
export const getCitiesByLinguisticTheme = (theme) => {
  const cities = getCitiesData();
  if (theme === "All") return cities;

  // Find countries that speak languages in this language family
  const targetLanguages = languageFamilies[theme] || [];

  // First try by explicit linguistic categories
  const categorizedCities = cities.filter(
    (city) =>
      city.linguisticCategories && city.linguisticCategories.includes(theme)
  );

  // If we found cities with explicit categorization, use those
  if (categorizedCities.length > 0) {
    return categorizedCities;
  }

  // Fallback to checking country's languages
  return cities.filter((city) => {
    const countryLanguages = languagesSpoken[city.country] || [];
    return countryLanguages.some((lang) => targetLanguages.includes(lang));
  });
};

// Get unique list of countries from city data
export const cityCountries = [
  ...new Set(getCitiesData().map((city) => city.country)),
];

// Featured cities data remains unchanged
export const featuredCities = [
  {
    name: "Paris",
    country: "France",
    slug: "paris",
    description:
      "The City of Light offers iconic landmarks, world-class museums, and charming neighborhoods.",
    imageUrl: "/images/cities/default-city.jpg",
    highlights: ["Eiffel Tower", "Louvre Museum", "Notre-Dame", "Montmartre"],
  },
  // Other featured cities...
];

// Export everything for convenience
export default {
  regionThemes,
  tourismRegions,
  linguisticRegions,
  cityCountries,
  countryRegions,
  getCitiesData,
  getCitiesByCountry,
  getCitiesByRegion,
  getCityById,
  getCountriesByRegion,
  getCitiesByTourismTheme,
  getCitiesByLinguisticTheme,
  featuredCities,
};
