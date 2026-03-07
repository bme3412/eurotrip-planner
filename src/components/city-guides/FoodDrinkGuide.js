'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, MapPin, Clock, Star, Utensils, Wine, Coffee, ShoppingBag, ChefHat } from 'lucide-react';

// City-specific food & drink data (narrative prose)
const CITY_FOOD_DATA = {
  paris: {
    intro: `Eating in Paris isn't just sustenance—it's a way of life. From flaky croissants at dawn to midnight oysters at a bustling brasserie, the city treats every meal as an occasion. Here's how to eat and drink like a local.`,

    sections: [
      {
        title: "The Essentials",
        content: `Start your morning at a **neighborhood bakery** (boulangerie), not a café. Order a croissant or pain au chocolat still warm from the oven—the good ones shatter when you bite in. For coffee, find a zinc-topped bar and order "un café" (espresso) or "un crème" (espresso with steamed milk). Standing at the bar is cheaper than sitting at a table.

**Lunch** is sacred. Many restaurants offer a **formule** (set menu) at a fraction of à la carte prices—usually an entrée (starter), plat (main), and sometimes dessert for €15-25. This is the best value in Paris dining. Kitchens typically serve from noon to 2pm, then close until dinner.

**Dinner** starts late. Arriving at 7pm marks you as a tourist; 8pm is standard, 9pm is perfectly normal. Make reservations for anywhere you specifically want to try—popular bistros fill up days in advance.`
      },
      {
        title: "What to Eat",
        content: `**Croissants & pastries** — Skip hotel breakfast and find a bakery with the words "artisan" or "fait maison." Croissants should be golden, layered, and slightly sticky from butter. Pain au chocolat, chausson aux pommes, and kouign-amann are morning essentials.

**Bistro classics** — Steak frites, duck confit, coq au vin, beef bourguignon, blanquette de veau. These aren't tourist traps—they're genuinely beloved. Order them at old-school bistros with paper tablecloths and hand-written menus.

**Cheese** — Visit a fromagerie (cheese shop) and point at what looks interesting. Ask for "quelque chose de crémeux" (something creamy) or "quelque chose de fort" (something strong). Comté, Brie de Meaux, Roquefort, and Époisses are classics.

**Oysters** — Available year-round at brasseries. Order a dozen with a glass of Muscadet or Chablis. Fines de Claire and Gillardeau are premium varieties.`
      },
      {
        title: "Where to Drink",
        content: `**Wine bars** (bars à vin) have revolutionized Parisian drinking. Skip the tourist-trap Irish pubs and find a cave with natural wines, charcuterie boards, and locals debating politics. Le Verre Volé, Septime Cave, and Le Baron Rouge are institutions.

**Apéro** is the pre-dinner ritual. Around 6-7pm, terraces fill with people nursing a glass of wine, a kir (white wine with cassis), or a pastis (anise-flavored spirit with water). Order some olives or chips and watch the city go by.

**Cocktails** have arrived. Paris now has world-class cocktail bars—Little Red Door, Candelaria, and Experimental Cocktail Club pioneered the scene. Expect €14-18 per drink but exceptional quality.

**Coffee after dinner** means espresso, not a latte. And never order cappuccino after 11am—it's strictly a morning drink here.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Le Marais (3rd/4th)** — Falafel on Rue des Rosiers, trendy bistros, excellent wine bars, and late-night spots. Crowded but delivers.

**Canal Saint-Martin (10th)** — The young, hip food scene. Natural wine bars, neo-bistros, specialty coffee, and the city's best pizza at Pink Mamma.

**Montmartre (18th)** — Tourist traps on Place du Tertre, but excellent bistros on the quieter back streets. Try the covered market on Rue Lepic.

**Saint-Germain (6th)** — Classic and pricey, but legendary cafés (Les Deux Magots, Café de Flore) and excellent chocolate shops.

**Belleville (20th)** — Diverse, affordable, and overlooked by tourists. Chinese, Vietnamese, North African, and some of the city's most exciting young chef-driven spots.`
      },
      {
        title: "Practical Tips",
        content: `**Reservations** — Essential for dinner at popular spots. Use TheFork (La Fourchette) app for last-minute tables and discounts.

**Tipping** — Service is included by law. Leave a few euros for exceptional service, but 15-20% tips will confuse your server.

**Water** — Ask for "une carafe d'eau" for free tap water. Bottled water is a tourist tax.

**Bread** — It arrives automatically and is free. Use it to mop up sauces (that's what it's for).

**The check** — Waiters won't bring it until you ask. Say "l'addition, s'il vous plaît" when ready. Lingering is encouraged, not rude.`
      }
    ],

    highlights: [
      { name: "Morning Croissant Run", type: "Experience", neighborhood: "Any", time: "7-9am" },
      { name: "Bistro Lunch Formule", type: "Meal", neighborhood: "Any", time: "12-2pm" },
      { name: "Wine Bar Apéro", type: "Drink", neighborhood: "Canal Saint-Martin", time: "6-8pm" },
      { name: "Market Stroll", type: "Experience", neighborhood: "Rue Mouffetard / Rue Montorgueil", time: "Morning" },
      { name: "Late Dinner at a Brasserie", type: "Meal", neighborhood: "Saint-Germain", time: "9-11pm" }
    ]
  },
  london: {
    intro: `Yes, the jokes about British food are outdated—spectacularly so. London's dining scene now rivals any city on earth, from Michelin-starred temples to midnight kebabs that genuinely deserve their queues. The gastropub revolution started here, the curry house is a national institution, and the humble pie and mash shop soldiers on with dignity. Here's how to eat and drink properly.`,

    sections: [
      {
        title: "The Essentials",
        content: `Start your morning with a **Full English**—the complete works of beans, bacon, sausage, eggs, mushrooms, tomato, toast, and black pudding (if you're brave). Caffs (greasy spoons) serve it best; anywhere with formica tables and builders reading tabloids is a good sign. Coffee culture has arrived—London's specialty coffee scene rivals Melbourne—but a builder's tea (strong, milk, no pretension) remains the backbone of civilization.

**Lunch** is often grabbed quickly—Pret and supermarket meal deals fuel the city—but proper lunch exists at pubs serving gastro fare or Borough Market's extraordinary food stalls. Sunday lunch, however, is **sacred**: a roast with all the trimmings, Yorkshire pudding mandatory, gravy essential. Book ahead.

**Dinner** starts earlier than Paris (7pm is normal) but pubs serve food until 9-10pm. Booking is essential for popular restaurants—OpenTable and Resy are your friends. Walk-ins work at market stalls, casual spots, and curry houses.`
      },
      {
        title: "What to Eat",
        content: `**Full English Breakfast** — The complete works. Variations exist (Scottish adds haggis, Welsh adds laverbread), but the principle is sacred: protein, carbs, and enough to fuel a morning.

**Pie & Mash** — London's original fast food. Beef pie with mash and liquor (parsley sauce, not alcohol—a common confusion). M. Manze in Bermondsey has served it since 1902.

**Fish & Chips** — Vinegar application is a personal matter, but it should be applied. Mushy peas are traditional. Proper chip shops wrap in paper and serve with a wooden fork.

**Sunday Roast** — Beef, lamb, chicken, or pork with roasted vegetables, Yorkshire pudding, and gravy. This is a 2-3 hour social affair, not a quick meal. Pubs and gastropubs do it best.

**Afternoon Tea** — Scones (cream first in Devon, jam first in Cornwall—don't ask), finger sandwiches, cakes, and proper tea. The Ritz requires booking months ahead; many hotels offer excellent versions.

**Curry** — Britain's adopted national dish. Brick Lane is famous but inconsistent; the best spots are often in unglamorous suburbs. Chicken tikka masala was invented in Britain. This matters.`
      },
      {
        title: "Where to Drink",
        content: `**The Pub** is not a bar—it's an institution. Find "your local" and become a regular. Order at the bar (not the table), pay immediately, tip by rounding up or saying "and one for yourself." Last orders are called at 10:45pm (11pm closing); the bell means drink up.

**Real Ale** is the traditional choice—cask-conditioned, served slightly warm, with names like "Old Peculier" and "Bishop's Finger." CAMRA pubs specialize in this. Craft beer arrived later but has exploded—Bermondsey's Beer Mile is essential.

**Wine Bars** have improved dramatically. Natural wine spots have colonized Hackney and Peckham. Terroirs (RIP, but its spirit lives on) pioneered the scene.

**Cocktails** thrive in Soho and Shoreditch. The American Bar at the Savoy is legendary; modern speakeasies hide behind unmarked doors across the city. Expect to pay £14-18 for quality.

**Gin** deserves mention. London Dry is a style, and the city's gin bars—from the historic (Gordon's Wine Bar in its cave-like cellar) to the modern—take it seriously.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Borough Market (SE1)** — London's greatest food market. Go hungry, go weekday mornings to avoid crushing crowds, and sample everything from Scotch eggs to raclette. Nearby Maltby Street Market is less touristy.

**Brick Lane (E1)** — Curry mile, plus excellent bagels (Beigel Bake vs. Beigel Shop is a genuine debate), street food, and late-night eats.

**Soho (W1)** — Dense with options from Chinatown dumplings to prix-fixe French to the city's best cocktails. Always busy, always delivers.

**Shoreditch/Hackney (E2/E8)** — The young, creative food scene. Vietnamese, natural wine bars, experimental tasting menus, and outstanding street food.

**Brixton (SW2)** — Caribbean heritage, excellent market, and some of London's best value eating. Jerk chicken and rum punch are the calling cards.

**Peckham (SE15)** — South London's rising star. Nigerian and West African food, wine bars, rooftop bars, and a genuine neighborhood feel.`
      },
      {
        title: "Practical Tips",
        content: `**Reservations** — Essential for dinner at popular spots. OpenTable and Resy work; some restaurants use their own systems. Walk-ins are possible at markets, pubs, and casual spots.

**Tipping** — 12.5% service is often added automatically; check the bill. If not included, 10-12.5% is standard. Cash tips go directly to staff. Pubs: not expected, but "and one for yourself" is a lovely tradition.

**Water** — Free tap water is a legal right in licensed premises. Just ask.

**Pub Etiquette** — Order at the bar. Don't queue-jump (this is Britain). Buying rounds is expected in groups—remember whose turn it is. "Last orders" bell means get to the bar NOW.

**Sunday** — Many restaurants close or serve only roast. Plan accordingly. Pubs are your friend.

**August** — Unlike Paris, London doesn't close. Restaurants operate normally.`
      }
    ],

    highlights: [
      { name: "Full English at a Caff", type: "Meal", neighborhood: "Any (Clerkenwell's E. Pellicci is legendary)", time: "8-11am" },
      { name: "Sunday Roast at a Gastropub", type: "Meal", neighborhood: "Any (book ahead)", time: "12-4pm" },
      { name: "Borough Market Grazing", type: "Experience", neighborhood: "Southwark", time: "Morning weekday" },
      { name: "Curry on Brick Lane", type: "Meal", neighborhood: "East London", time: "Evening" },
      { name: "Pub Session at a Historic Boozer", type: "Drink", neighborhood: "City (The George Inn) or Soho", time: "5-11pm" }
    ]
  }
};

// Default fallback
const DEFAULT_FOOD_DATA = {
  intro: `Every great city has its own food culture. Here's how to eat and drink like a local.`,
  sections: [
    {
      title: "Getting Started",
      content: `Research local specialties before you arrive. Ask locals for recommendations—hotel staff, taxi drivers, and shopkeepers often know the best spots. Avoid restaurants with photos on the menu or aggressive hosts outside.`
    },
    {
      title: "Dining Tips",
      content: `Learn local meal times—they vary widely across cultures. Lunch is often the best value for quality dining. Make reservations for popular spots. Don't be afraid to eat where you don't see other tourists.`
    }
  ],
  highlights: []
};

// Category definitions for restaurant filtering
const RESTAURANT_CATEGORIES = [
  { id: 'all', label: 'All', icon: Utensils },
  { id: 'fine_dining', label: 'Fine Dining', icon: Star },
  { id: 'casual_dining', label: 'Casual', icon: Utensils },
  { id: 'street_food', label: 'Street Food', icon: ShoppingBag },
  { id: 'coffee_shops', label: 'Coffee', icon: Coffee },
  { id: 'bars', label: 'Bars', icon: Wine },
];

// Price filter options - support both € and £ currencies
const PRICE_FILTERS = [
  { id: 'all', label: 'All Prices', match: null },
  { id: 'budget', label: '$ Budget', match: ['€', '£'] },
  { id: 'mid', label: '$$ Mid-range', match: ['€€', '££'] },
  { id: 'upscale', label: '$$$ Upscale', match: ['€€€', '£££'] },
  { id: 'luxury', label: '$$$$ Fine Dining', match: ['€€€€', '££££'] },
];

// Restaurant Card Component
function RestaurantCard({ restaurant, category }) {
  const [expanded, setExpanded] = useState(false);

  const isBar = category === 'bars';
  const isCoffee = category === 'coffee_shops';
  const isStreetFood = category === 'street_food';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
            {restaurant.michelin_stars > 0 && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                {Array(restaurant.michelin_stars).fill('★').join('')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {restaurant.cuisine_type || restaurant.type || restaurant.specialty || 'Restaurant'}
          </p>
        </div>
        <span className="text-sm font-medium text-gray-700 shrink-0">
          {restaurant.price_range}
        </span>
      </div>

      {/* Quick info */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-600">
        {(restaurant.neighborhood || restaurant.location) && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {restaurant.neighborhood || restaurant.location}
          </span>
        )}
        {restaurant.best_time && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {restaurant.best_time}
          </span>
        )}
      </div>

      {/* Signature dishes or drinks */}
      {(restaurant.signature_dishes || restaurant.signature_drinks || restaurant.must_try || restaurant.specialties) && (
        <div className="mt-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{isBar ? 'Try:' : isCoffee ? 'Must try:' : isStreetFood ? 'Specialties:' : 'Signature:'}</span>{' '}
            {(restaurant.signature_dishes || restaurant.signature_drinks || restaurant.must_try || restaurant.specialties)?.slice(0, 3).join(', ')}
          </p>
        </div>
      )}

      {/* Expandable details */}
      {(restaurant.atmosphere || restaurant.local_tips || restaurant.booking_tips) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {expanded ? 'Show less' : 'More details'}
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 text-sm text-gray-600 border-t border-gray-100 pt-3">
              {restaurant.atmosphere && (
                <p><span className="font-medium text-gray-700">Atmosphere:</span> {restaurant.atmosphere}</p>
              )}
              {restaurant.local_tips && (
                <p><span className="font-medium text-gray-700">Local tip:</span> {restaurant.local_tips}</p>
              )}
              {restaurant.booking_tips && (
                <p><span className="font-medium text-gray-700">Booking:</span> {restaurant.booking_tips}</p>
              )}
              {restaurant.dress_code && (
                <p><span className="font-medium text-gray-700">Dress code:</span> {restaurant.dress_code}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FoodDrinkGuide({ cityName, cityData }) {
  const cityKey = cityName?.toLowerCase();
  const foodData = CITY_FOOD_DATA[cityKey] || DEFAULT_FOOD_DATA;
  const displayName = cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';

  // Get culinary guide from cityData
  const culinaryGuide = cityData?.culinaryGuide;

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [showAllRestaurants, setShowAllRestaurants] = useState(false);

  // Flatten and filter restaurants
  const allRestaurants = useMemo(() => {
    if (!culinaryGuide) return [];

    const restaurants = [];

    // Add restaurants
    if (culinaryGuide.restaurants) {
      Object.entries(culinaryGuide.restaurants).forEach(([category, items]) => {
        if (Array.isArray(items)) {
          items.forEach(item => {
            restaurants.push({ ...item, _category: category });
          });
        }
      });
    }

    // Add bars and cafes
    if (culinaryGuide.bars_and_cafes) {
      Object.entries(culinaryGuide.bars_and_cafes).forEach(([category, items]) => {
        if (Array.isArray(items)) {
          items.forEach(item => {
            restaurants.push({ ...item, _category: category });
          });
        }
      });
    }

    return restaurants;
  }, [culinaryGuide]);

  // Apply filters
  const filteredRestaurants = useMemo(() => {
    return allRestaurants.filter(r => {
      if (categoryFilter !== 'all' && r._category !== categoryFilter) return false;
      if (priceFilter !== 'all') {
        const priceConfig = PRICE_FILTERS.find(p => p.id === priceFilter);
        if (priceConfig?.match && !priceConfig.match.includes(r.price_range)) {
          return false;
        }
      }
      return true;
    });
  }, [allRestaurants, categoryFilter, priceFilter]);

  // Limit displayed restaurants unless "show all" is clicked
  const displayedRestaurants = showAllRestaurants
    ? filteredRestaurants
    : filteredRestaurants.slice(0, 6);

  // Convert markdown-style bold to JSX
  const renderContent = (content) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const Section = ({ title, content }) => (
    <section className="mb-8 last:mb-0">
      <h2 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">{title}</h2>
      <div className="prose prose-lg max-w-none">
        {content.split('\n\n').map((paragraph, i) => (
          <p key={i} className="text-gray-700 leading-relaxed mb-4 last:mb-0 text-[17px]">
            {renderContent(paragraph)}
          </p>
        ))}
      </div>
    </section>
  );

  return (
    <div className="space-y-10">
      <article className="max-w-4xl mx-auto lg:max-w-none">
        {/* Lead paragraph */}
        <p className="text-xl md:text-2xl text-gray-800 leading-relaxed mb-10 font-medium max-w-4xl">
          {foodData.intro}
        </p>

        {/* Two column layout on larger screens */}
        <div className="grid lg:grid-cols-2 gap-x-12 gap-y-2">
          <div className="divide-y divide-gray-100 lg:divide-y-0">
            {foodData.sections.slice(0, Math.ceil(foodData.sections.length / 2)).map((section, i) => (
              <div key={i} className="py-5 first:pt-0 lg:py-0 lg:mb-8">
                <Section title={section.title} content={section.content} />
              </div>
            ))}
          </div>

          <div className="divide-y divide-gray-100 lg:divide-y-0">
            {foodData.sections.slice(Math.ceil(foodData.sections.length / 2)).map((section, i) => (
              <div key={i} className="py-5 first:pt-0 lg:py-0 lg:mb-8">
                <Section title={section.title} content={section.content} />
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Restaurant Guide Section - only shows if culinaryGuide exists */}
      {culinaryGuide && allRestaurants.length > 0 && (
        <section className="border-t border-gray-200 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-amber-600" />
              Restaurant Guide
            </h2>
            <span className="text-sm text-gray-500">{allRestaurants.length} places</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            {/* Category filter */}
            <div className="flex flex-wrap gap-2">
              {RESTAURANT_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const count = cat.id === 'all'
                  ? allRestaurants.length
                  : allRestaurants.filter(r => r._category === cat.id).length;
                if (count === 0 && cat.id !== 'all') return null;

                return (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoryFilter(cat.id); setShowAllRestaurants(false); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      categoryFilter === cat.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                    {cat.id !== 'all' && <span className="text-xs opacity-75">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Price filter */}
            <select
              value={priceFilter}
              onChange={(e) => { setPriceFilter(e.target.value); setShowAllRestaurants(false); }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-700"
            >
              {PRICE_FILTERS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Restaurant Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedRestaurants.map((restaurant, i) => (
              <RestaurantCard
                key={`${restaurant.name}-${i}`}
                restaurant={restaurant}
                category={restaurant._category}
              />
            ))}
          </div>

          {/* Show more button */}
          {filteredRestaurants.length > 6 && !showAllRestaurants && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllRestaurants(true)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Show all {filteredRestaurants.length} places
              </button>
            </div>
          )}

          {/* No results */}
          {filteredRestaurants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No restaurants match your filters. Try adjusting your selection.
            </div>
          )}
        </section>
      )}

      {/* Highlights */}
      {foodData.highlights && foodData.highlights.length > 0 && (
        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Don&apos;t Miss</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {foodData.highlights.map((item, i) => (
              <div key={i} className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                    {item.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  {item.neighborhood && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {item.neighborhood}
                    </span>
                  )}
                  {item.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {item.time}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
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
            <span className="text-gray-900 font-medium">Food + Drink</span>
          </nav>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Prices, hours, and availability may change. Always check current information before visiting.
        </p>
      </footer>
    </div>
  );
}
