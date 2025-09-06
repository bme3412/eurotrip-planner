'use client';

// Collection of predefined routes by category
export const predefinedRoutes = [
  {
    section: "beach destinations",
    seasonality: ["summer"],
    items: [
      { 
        title: "spanish mediterranean", 
        route: "barcelona → valencia → mallorca",
        description: "Sun-soaked beaches and vibrant coastal cities",
        flags: ["🇪🇸", "🇪🇸", "🇪🇸"],
        bestMonths: [5, 6, 7, 8, 9],
        duration: "10-14 days",
        idealFor: ["beach lovers", "nightlife", "food"],
        highlights: ["La Sagrada Familia", "City of Arts and Sciences", "Palma Cathedral"],
        transport: "Ferries and short domestic flights connect all destinations"
      },
      { 
        title: "croatian coastline", 
        route: "split → hvar → dubrovnik",
        description: "Crystal clear Adriatic waters and island hopping",
        flags: ["🇭🇷", "🇭🇷", "🇭🇷"],
        bestMonths: [5, 6, 7, 8, 9],
        duration: "7-10 days",
        idealFor: ["beach", "island hopping", "history", "nightlife"],
        highlights: ["Diocletian's Palace", "Hvar Town", "Dubrovnik City Walls"],
        transport: "Frequent ferries connect all destinations"
      },
      { 
        title: "greek islands", 
        route: "athens → santorini → crete",
        description: "Iconic white and blue villages with stunning beaches",
        flags: ["🇬🇷", "🇬🇷", "🇬🇷"],
        bestMonths: [5, 6, 7, 8, 9],
        duration: "10-14 days",
        idealFor: ["beach", "romance", "culture", "photography"],
        highlights: ["Acropolis", "Santorini Sunset", "Cretan Cuisine"],
        transport: "Ferries or short flights between islands"
      },
      { 
        title: "portuguese coast", 
        route: "lisbon → algarve → porto",
        description: "Atlantic beaches with dramatic cliffs and vibrant cities",
        flags: ["🇵🇹", "🇵🇹", "🇵🇹"],
        bestMonths: [5, 6, 7, 8, 9],
        duration: "10-14 days",
        idealFor: ["beach", "culture", "food", "wine"],
        highlights: ["Belem Tower", "Benagil Cave", "Port Wine Cellars"],
        transport: "High-speed trains connect major cities, car rental recommended for Algarve"
      },
      { 
        title: "french riviera", 
        route: "nice → cannes → monaco",
        description: "Glamorous Mediterranean beaches and coastal towns",
        flags: ["🇫🇷", "🇫🇷", "🇲🇨"],
        bestMonths: [5, 6, 7, 8, 9],
        duration: "7-10 days",
        idealFor: ["luxury", "beach", "celebrity spotting", "fine dining"],
        highlights: ["Promenade des Anglais", "Cannes Film Festival", "Monte Carlo Casino"],
        transport: "Excellent train connections along the coast"
      },
      { 
        title: "italian beaches", 
        route: "amalfi coast → sicily → sardinia",
        description: "Stunning Mediterranean beaches with Italian charm",
        flags: ["🇮🇹", "🇮🇹", "🇮🇹"],
        bestMonths: [5, 6, 7, 8, 9],
        duration: "12-15 days",
        idealFor: ["scenic views", "beach", "food", "history"],
        highlights: ["Positano", "Valley of Temples", "La Maddalena"],
        transport: "Ferries and domestic flights between destinations"
      }
    ]
  },
  {
    section: "historical journeys",
    seasonality: ["year-round", "spring", "fall"],
    items: [
      { 
        title: "ancient rome trail", 
        route: "rome → pompeii → syracuse",
        description: "Follow the footsteps of the Roman Empire",
        flags: ["🇮🇹", "🇮🇹", "🇮🇹"],
        bestMonths: [3, 4, 5, 9, 10, 11],
        duration: "10-12 days",
        idealFor: ["history buffs", "archaeology", "architecture"],
        highlights: ["Colosseum", "Pompeii Ruins", "Greek Theater of Syracuse"],
        transport: "High-speed trains and ferries connect destinations"
      },
      { 
        title: "imperial capitals", 
        route: "vienna → budapest → prague",
        description: "Experience the grandeur of Habsburg and European royalty",
        flags: ["🇦🇹", "🇭🇺", "🇨🇿"],
        bestMonths: [4, 5, 6, 9, 10],
        duration: "9-12 days",
        idealFor: ["history", "architecture", "classical music", "café culture"],
        highlights: ["Schönbrunn Palace", "Hungarian Parliament", "Prague Castle"],
        transport: "Fast trains connect all three capital cities"
      },
      { 
        title: "medieval towns", 
        route: "bruges → rothenburg → tallinn",
        description: "Step back in time in Europe's best-preserved medieval towns",
        flags: ["🇧🇪", "🇩🇪", "🇪🇪"],
        bestMonths: [4, 5, 6, 9, 10],
        duration: "10-14 days",
        idealFor: ["history", "architecture", "photography"],
        highlights: ["Bruges Canals", "Rothenburg Old Town", "Tallinn City Walls"],
        transport: "Trains between western destinations, flight to Tallinn"
      },
      { 
        title: "renaissance art trail", 
        route: "florence → venice → milan",
        description: "Experience the birthplace of Renaissance art and architecture",
        flags: ["🇮🇹", "🇮🇹", "🇮🇹"],
        bestMonths: [3, 4, 5, 9, 10, 11],
        duration: "9-12 days",
        idealFor: ["art", "history", "architecture", "food"],
        highlights: ["Uffizi Gallery", "St. Mark's Square", "The Last Supper"],
        transport: "Fast trains connect all cities"
      },
      { 
        title: "world war history", 
        route: "berlin → nuremberg → krakow",
        description: "Understand Europe's 20th century conflicts and memorials",
        flags: ["🇩🇪", "🇩🇪", "🇵🇱"],
        bestMonths: [4, 5, 6, 9, 10],
        duration: "9-12 days",
        idealFor: ["history", "museums", "education"],
        highlights: ["Berlin Wall", "Documentation Center", "Auschwitz-Birkenau"],
        transport: "Trains connect all destinations"
      }
    ]
  },
  {
    section: "cultural experiences",
    seasonality: ["year-round", "seasonal festivals"],
    items: [
      { 
        title: "culinary capitals", 
        route: "paris → lyon → san sebastian",
        description: "Taste the best of European gastronomy",
        flags: ["🇫🇷", "🇫🇷", "🇪🇸"],
        bestMonths: [4, 5, 6, 9, 10],
        duration: "10-14 days",
        idealFor: ["food lovers", "wine tasting", "fine dining"],
        highlights: ["Paris Bistros", "Lyonnaise Bouchons", "Pintxos Bars"],
        transport: "High-speed trains connect all destinations"
      },
      { 
        title: "classical music trail", 
        route: "vienna → salzburg → leipzig",
        description: "Experience the cities of Mozart, Beethoven, and Bach",
        flags: ["🇦🇹", "🇦🇹", "🇩🇪"],
        bestMonths: [1, 2, 3, 4, 5, 9, 10, 11, 12],
        duration: "7-10 days",
        idealFor: ["music lovers", "concert-goers", "history"],
        highlights: ["Vienna State Opera", "Mozart's Birthplace", "Bach Museum"],
        transport: "Trains connect all destinations"
      },
      { 
        title: "artistic revolution", 
        route: "amsterdam → paris → barcelona",
        description: "Follow the evolution of modern art through Europe",
        flags: ["🇳🇱", "🇫🇷", "🇪🇸"],
        bestMonths: [4, 5, 6, 9, 10],
        duration: "10-14 days",
        idealFor: ["art lovers", "museum enthusiasts", "architecture"],
        highlights: ["Van Gogh Museum", "Centre Pompidou", "Gaudi's Works"],
        transport: "High-speed trains connect all destinations"
      },
      { 
        title: "literary giants", 
        route: "dublin → london → paris",
        description: "Visit the haunts of Europe's greatest writers",
        flags: ["🇮🇪", "🇬🇧", "🇫🇷"],
        bestMonths: [3, 4, 5, 6, 9, 10],
        duration: "9-12 days",
        idealFor: ["literature fans", "history", "pub culture"],
        highlights: ["Dublin Writers Museum", "Shakespeare's Globe", "Shakespeare and Company"],
        transport: "Short flights or combination of ferry and train"
      },
      { 
        title: "festival circuit", 
        route: "edinburgh → munich → venice",
        description: "Experience Europe's most famous cultural festivals",
        flags: ["🇬🇧", "🇩🇪", "🇮🇹"],
        bestMonths: [8, 9, 2],
        duration: "14-20 days",
        idealFor: ["festival-goers", "culture", "entertainment"],
        highlights: ["Edinburgh Fringe (August)", "Oktoberfest (September)", "Venice Carnival (February)"],
        transport: "Flights between destinations recommended"
      }
    ]
  },
  {
    section: "natural wonders",
    seasonality: ["seasonal"],
    items: [
      { 
        title: "alpine adventure", 
        route: "lucerne → chamonix → innsbruck",
        description: "Explore the majestic peaks and valleys of the Alps",
        flags: ["🇨🇭", "🇫🇷", "🇦🇹"],
        bestMonths: [6, 7, 8, 9],
        duration: "10-14 days",
        idealFor: ["hiking", "mountain scenery", "adventure", "photography"],
        highlights: ["Lake Lucerne", "Mont Blanc", "Tyrolean Alps"],
        transport: "Scenic trains connect all destinations"
      },
      { 
        title: "fjords and mountains", 
        route: "bergen → geiranger → oslo",
        description: "Witness Norway's breathtaking coastal landscapes",
        flags: ["🇳🇴", "🇳🇴", "🇳🇴"],
        bestMonths: [6, 7, 8],
        duration: "8-12 days",
        idealFor: ["nature", "hiking", "photography", "scenic drives"],
        highlights: ["Bryggen Wharf", "Geirangerfjord", "Vigeland Park"],
        transport: "Combination of scenic ferries, buses and trains"
      },
      { 
        title: "volcanic landscapes", 
        route: "reykjavik → naples → santorini",
        description: "Discover Europe's most dramatic volcanic formations",
        flags: ["🇮🇸", "🇮🇹", "🇬🇷"],
        bestMonths: [5, 6, 7, 8, 9],
        duration: "12-15 days",
        idealFor: ["geology", "natural wonders", "adventure"],
        highlights: ["Blue Lagoon", "Mount Vesuvius", "Santorini Caldera"],
        transport: "Flights between destinations required"
      },
      { 
        title: "mediterranean islands", 
        route: "mallorca → corsica → sicily",
        description: "Experience the diverse landscapes of Mediterranean islands",
        flags: ["🇪🇸", "🇫🇷", "🇮🇹"],
        bestMonths: [5, 6, 9, 10],
        duration: "12-15 days",
        idealFor: ["nature", "beaches", "hiking", "food"],
        highlights: ["Serra de Tramuntana", "Calanques de Piana", "Mount Etna"],
        transport: "Combinations of flights and ferries required"
      },
      { 
        title: "northern lights", 
        route: "tromsø → rovaniemi → reykjavik",
        description: "Chase the aurora borealis across the Arctic Circle",
        flags: ["🇳🇴", "🇫🇮", "🇮🇸"],
        bestMonths: [1, 2, 3, 9, 10, 11, 12],
        duration: "10-14 days",
        idealFor: ["aurora viewing", "winter activities", "adventure"],
        highlights: ["Tromsø Fjords", "Santa Claus Village", "Icelandic Hot Springs"],
        transport: "Flights between destinations required"
      }
    ]
  }
];

// Seasonal recommendations
export const seasonalityGuide = {
  winter: {
    months: [12, 1, 2],
    recommended: ["Northern Lights", "Christmas Markets", "Alpine Skiing", "Vienna Balls"],
    avoidBeaches: true,
    indoor: ["Museums", "Classical Concerts", "Fine Dining", "Thermal Baths"]
  },
  spring: {
    months: [3, 4, 5],
    recommended: ["Tulip Season", "Easter Celebrations", "Cherry Blossoms", "Fewer Crowds"],
    mildWeather: true,
    shoulder: ["Mediterranean", "City Breaks", "Rural Escapes"]
  },
  summer: {
    months: [6, 7, 8],
    recommended: ["Beaches", "Festivals", "Outdoor Dining", "Midnight Sun North"],
    highSeason: true,
    avoid: ["Very Hot Southern Cities", "Overcrowded Attractions"]
  },
  fall: {
    months: [9, 10, 11],
    recommended: ["Wine Harvest", "Fall Foliage", "Fewer Crowds", "Food Festivals"],
    mildWeather: true,
    shoulder: ["Mediterranean", "City Breaks", "Rural Escapes"]
  }
};

// Special event calendar - major European events
export const specialEvents = [
  { name: "Venice Carnival", location: "Venice, Italy", dates: "February", type: "cultural" },
  { name: "Keukenhof Gardens", location: "Netherlands", dates: "March-May", type: "natural" },
  { name: "Eurovision Song Contest", location: "Various", dates: "May", type: "entertainment" },
  { name: "Cannes Film Festival", location: "Cannes, France", dates: "May", type: "cultural" },
  { name: "Running of the Bulls", location: "Pamplona, Spain", dates: "July", type: "cultural" },
  { name: "Edinburgh Fringe Festival", location: "Edinburgh, Scotland", dates: "August", type: "cultural" },
  { name: "La Tomatina", location: "Buñol, Spain", dates: "August", type: "entertainment" },
  { name: "Oktoberfest", location: "Munich, Germany", dates: "September-October", type: "cultural" },
  { name: "Christmas Markets", location: "Various", dates: "November-December", type: "cultural" }
];

// Utility function to calculate trip duration from two dates
export const calculateTripDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const difference = end.getTime() - start.getTime();
  const days = Math.ceil(difference / (1000 * 3600 * 24));
  
  return days > 0 ? days : 0;
};