'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, MapPin, Clock, Euro, Star } from 'lucide-react';

// City-specific food & drink data
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

export default function FoodDrinkGuide({ cityName, cityData }) {
  const cityKey = cityName?.toLowerCase();
  const foodData = CITY_FOOD_DATA[cityKey] || DEFAULT_FOOD_DATA;
  const displayName = cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';

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

      {/* Highlights */}
      {foodData.highlights && foodData.highlights.length > 0 && (
        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Don't Miss</h2>
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

