// City-specific photo spots data
export const CITY_PHOTO_DATA = {
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

export const DEFAULT_PHOTO_DATA = {
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

export function getPhotoData(cityName) {
  const cityKey = cityName?.toLowerCase();
  return CITY_PHOTO_DATA[cityKey] || DEFAULT_PHOTO_DATA;
}
