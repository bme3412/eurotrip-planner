'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';

// City-specific FAQ data
const CITY_FAQS = {
  paris: [
    {
      question: "Is Paris safe for tourists?",
      answer: "Paris is generally very safe. Like any major city, stay aware of your surroundings, watch for pickpockets in crowded tourist areas and on the Metro, and keep valuables secure. Avoid dark, empty streets late at night and you'll be fine."
    },
    {
      question: "How much should I budget per day?",
      answer: "A comfortable mid-range budget is €150-200 per person per day, covering accommodation, meals, transport, and a few attractions. Budget travelers can manage on €80-100 with hostels and casual dining. Luxury travelers should expect €400+."
    },
    {
      question: "Do I need to speak French?",
      answer: "Not fluently, but learning basic phrases goes a long way. 'Bonjour,' 'Merci,' 'S'il vous plaît,' and 'Parlez-vous anglais?' will cover most situations. Many Parisians speak English, especially in tourist areas, but attempting French is always appreciated."
    },
    {
      question: "What's the best area to stay?",
      answer: "Le Marais (3rd/4th) is central with great nightlife and dining. Saint-Germain (6th) is classically Parisian. Montmartre (18th) is charming but hilly. The 1st/2nd arrondissements put you near the Louvre. Avoid staying too far from a Metro station."
    },
    {
      question: "Should I buy museum passes in advance?",
      answer: "Yes, especially for the Louvre, Musée d'Orsay, and Versailles. Timed-entry tickets are often required and sell out. The Paris Museum Pass covers 50+ attractions and lets you skip some queues—worth it if you're visiting several museums."
    },
    {
      question: "Is the tap water safe to drink?",
      answer: "Absolutely. Paris tap water is clean and safe. Restaurants will bring you a free carafe if you ask for 'une carafe d'eau.' You'll also find free water fountains throughout the city, including the famous Wallace fountains."
    },
    {
      question: "How do I get around at night after the Metro closes?",
      answer: "The Noctilien night bus network runs until the Metro reopens around 5:30am. Routes are less frequent (every 30-60 min) but cover major areas. Uber, Bolt, and taxis are more practical for late nights—just expect higher prices."
    },
    {
      question: "What should I definitely not miss?",
      answer: "Beyond the obvious (Eiffel Tower, Louvre, Notre-Dame), don't skip: a morning at a neighborhood market, sunset drinks along the Seine or Canal Saint-Martin, the Musée de l'Orangerie's Monet room, and simply wandering through Le Marais or Montmartre."
    }
  ]
};

const DEFAULT_FAQS = [
  {
    question: "Is this city safe for tourists?",
    answer: "Generally yes. Like any major destination, stay aware of your surroundings, watch for pickpockets in crowded areas, and keep valuables secure. Research specific neighborhoods before your visit."
  },
  {
    question: "How much should I budget per day?",
    answer: "Budget varies by city and travel style. Research average costs for accommodation, food, and attractions. A mid-range budget typically covers comfortable hotels, nice meals, and key sights."
  },
  {
    question: "Do I need to learn the local language?",
    answer: "Learning basic phrases is always appreciated and helpful. 'Hello,' 'Thank you,' 'Please,' and 'Do you speak English?' will cover most situations. Many tourist areas have English speakers, but making an effort goes a long way."
  },
  {
    question: "What's the best area to stay?",
    answer: "Look for neighborhoods near public transit with good access to attractions. Research different areas for their character—some are more lively, others quieter. Check recent reviews and avoid locations too far from the center."
  },
  {
    question: "Should I book attractions in advance?",
    answer: "For popular museums and landmarks, advance booking is often required or strongly recommended. Timed-entry tickets help you skip queues and guarantee access, especially during peak season."
  }
];

// City-specific essential info data in narrative form
const CITY_NARRATIVES = {
  paris: {
    intro: `Your plane touches down at Charles de Gaulle, and Paris is waiting. Here's how to hit the ground running—no confusion, no tourist traps, just the essentials that'll make you feel like you've done this before.`,
    
    arrival: {
      title: "From the Airport",
      content: `**Charles de Gaulle (CDG)** sits about 25km northeast of the city. The smartest move? The **RER B train**—€11.80 gets you to Gare du Nord or Châtelet-Les Halles in 35-50 minutes, with trains departing every 10-15 minutes. Follow signs to the train station (it's a bit of a walk through the terminal), validate your ticket at the yellow machines before boarding, and you're set.

If you're traveling heavy or arriving late, taxis run a flat €55 to the Right Bank (Louvre, Marais, Opéra) or €62 to the Left Bank (Saint-Germain, Latin Quarter). Use only official cabs from the designated stands—never accept rides from anyone approaching you inside the terminal. Uber and Bolt work too, typically €50-80 depending on demand, with pickup from signed rideshare zones.

**Flying into Orly?** It's closer to the city center. The Orlybus (€11.50, 30-40 min) drops you at Denfert-Rochereau, where you can hop on the Metro. The Orlyval automatic train connects to the RER B at Antony for €14.10.`
    },

    gettingAround: {
      title: "Getting Around",
      content: `The **Paris Metro** is your best friend—fast, frequent, and covers virtually everywhere you'll want to go. Pick up a **Navigo Easy card** at any station, load it with single tickets (€2.15 each) or a day pass, and tap in. One crucial detail: always **validate your ticket** before boarding trains and RER lines. Inspectors patrol regularly, and the fine for riding without a valid ticket is €50 on the spot.

Metro lines run from roughly 5:30am until 12:40am on weekdays, extending to 1:40am on Fridays and Saturdays. After that, the Noctilien night bus network takes over, though taxis or rideshares are usually more practical late at night.

**Uber, Bolt, and FREE NOW** all operate here. Taxis can be hailed on the street (look for the illuminated roof light) or found at marked stands near major landmarks, train stations, and hotels. Tipping drivers isn't expected, though rounding up a euro or two is a nice gesture.`
    },

    money: {
      title: "Money & Payments",
      content: `Paris runs on plastic. **Visa and Mastercard** are accepted virtually everywhere—restaurants, museums, Metro stations, even most market stalls. Contactless payments are the norm, so Apple Pay and Google Pay work seamlessly. American Express is spottier; some smaller establishments won't take it.

You can easily spend a week here without touching cash, though having €20-50 tucked away is handy for the occasional cash-only bakery, flea market find, or tips at a fancy restaurant (which, to be clear, are never expected—service is included in all prices by law).

ATMs are everywhere and dispense euros without issue. Your bank may charge foreign transaction fees, so check before you go.`
    },

    connectivity: {
      title: "Staying Connected",
      content: `**WiFi** blankets the city—cafés, hotels, museums, and even many public parks offer free access. The Metro has it at stations (though not on trains yet). You'll rarely struggle to get online.

If you need mobile data, **EU SIM cards** work perfectly here under roaming agreements. For longer stays or better rates, pick up a local prepaid SIM from **Orange, SFR, or Bouygues**—you'll find shops in any neighborhood, and at both airports. Expect to pay around €20-30 for a decent data package.

French outlets use **Type C/E plugs** (the two-pin European standard) at **230V**. Bring an adapter if needed. Most modern phone and laptop chargers are dual-voltage, but check appliances like hair dryers before plugging in.`
    },

    timing: {
      title: "Local Rhythms",
      content: `Paris moves to its own clock. **Shops** typically open around 10am and close by 7pm, with many still observing the traditional lunch break between 1-2pm. Sundays remain sacred—most stores close entirely, though you'll find bakeries, some supermarkets, and tourist-area shops open.

**Restaurants** serve lunch from noon to 2pm, then close until dinner service begins around 7:30pm. Kitchens often stop taking orders by 10pm, even on weekends. If you're hungry at 3pm, you're looking at bakeries, cafés serving light bites, or chain spots. Plan meals accordingly.

**Museums** often close on Tuesdays (major exception: the Musée d'Orsay closes Mondays instead). Most stay open late one evening per week—the Louvre until 9:45pm on Fridays, for instance. Check schedules before you go.

One more thing: **August** is vacation month. Many beloved neighborhood restaurants, boutiques, and shops close for 2-4 weeks while their owners escape to the coast. It's charming in its own way, but don't expect your Pinterest-saved bistro to be open.`
    },

    quickWins: {
      title: "Insider Moves",
      content: `**Water is free.** At any restaurant, simply ask for "une carafe d'eau, s'il vous plaît" and you'll receive complimentary tap water. No need to pay €6 for a small bottle of Evian unless you want to.

**Tipping is included.** That 15% service charge is already baked into menu prices by law. You can leave a few euros for exceptional service, but large tips aren't expected and may earn you puzzled looks.

**Say bonjour.** When entering any shop, café, or bakery, greet the staff. A simple "Bonjour" (or "Bonsoir" after 6pm) goes a long way. It's not just polite—it's how things work here. Skip it and you'll get chillier service.

**Keep your voice down.** Parisians value discretion. On the Metro, in restaurants, on the street—speak at a conversational volume. Being loud in public is considered rude here.`
    }
  }
};

// Fallback for cities without specific narratives
const DEFAULT_NARRATIVE = {
  intro: `You've just arrived. Here's everything you need to know to navigate the city like you've been here before—no stress, no confusion, just practical knowledge.`,
  
  arrival: {
    title: "From the Airport",
    content: `Most major European cities offer multiple ways to reach the center from the airport. Public transit (trains, buses, or metro connections) typically offers the best value, while taxis and rideshares provide door-to-door convenience at a premium. Look for official transport desks in the arrivals hall, and be wary of anyone approaching you offering rides inside the terminal.`
  },

  gettingAround: {
    title: "Getting Around",
    content: `European cities generally have excellent public transit. Metro, tram, and bus networks are clean, safe, and efficient. Pick up a transit card at any station—it's almost always cheaper than buying single tickets. Rideshare apps like Uber and Bolt operate in most major cities, and taxis can be found at designated stands or hailed on the street.`
  },

  money: {
    title: "Money & Payments",
    content: `Credit and debit cards are widely accepted across Europe, with contactless payments increasingly the norm. Visa and Mastercard work almost everywhere; American Express is more limited. Keep a small amount of cash for markets, small vendors, and the occasional cash-only spot. ATMs are readily available.`
  },

  connectivity: {
    title: "Staying Connected",
    content: `WiFi is widely available in hotels, cafés, and many public spaces. EU SIM cards work across the continent under roaming agreements. Local prepaid SIMs offer the best rates for extended stays. European outlets use Type C/E plugs at 230V—bring an adapter if you're coming from outside Europe.`
  },

  timing: {
    title: "Local Rhythms",
    content: `Shop hours and dining times vary by country and culture. Many European countries still observe a slower pace on Sundays, with limited retail hours. Research local customs around lunch breaks, late dinners, and seasonal closures before you go.`
  },

  quickWins: {
    title: "Insider Moves",
    content: `Learn a few key phrases in the local language—greetings go a long way. Research tipping customs (it varies wildly). Keep your voice down in public spaces. And don't forget to actually look up from your phone occasionally—you're in one of the world's great cities.`
  }
};

export default function StartHere({ cityName }) {
  const cityKey = cityName?.toLowerCase();
  const narrative = CITY_NARRATIVES[cityKey] || DEFAULT_NARRATIVE;
  const faqs = CITY_FAQS[cityKey] || DEFAULT_FAQS;
  const displayName = cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';
  
  const [openFaq, setOpenFaq] = useState(null);

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

  const FAQItem = ({ faq, index }) => {
    const isOpen = openFaq === index;
    return (
      <div className="border-b border-gray-200 last:border-b-0">
        <button
          onClick={() => setOpenFaq(isOpen ? null : index)}
          className="w-full py-4 flex items-start justify-between gap-4 text-left hover:bg-gray-50 transition-colors -mx-2 px-2 rounded"
        >
          <span className="text-[17px] font-medium text-gray-900 leading-snug">{faq.question}</span>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>
        {isOpen && (
          <div className="pb-4 pr-8">
            <p className="text-gray-600 leading-relaxed text-[16px]">{faq.answer}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-12">
      <article className="max-w-4xl mx-auto lg:max-w-none">
        {/* Lead paragraph */}
        <p className="text-xl md:text-2xl text-gray-800 leading-relaxed mb-10 font-medium max-w-4xl">
          {narrative.intro}
        </p>

        {/* Two column layout on larger screens */}
        <div className="grid lg:grid-cols-2 gap-x-12 gap-y-2">
          <div className="divide-y divide-gray-100 lg:divide-y-0">
            <div className="py-5 first:pt-0 lg:py-0 lg:mb-8">
              <Section title={narrative.arrival.title} content={narrative.arrival.content} />
            </div>
            
            <div className="py-5 lg:py-0 lg:mb-8">
              <Section title={narrative.gettingAround.title} content={narrative.gettingAround.content} />
            </div>
            
            <div className="py-5 lg:py-0 lg:mb-8">
              <Section title={narrative.money.title} content={narrative.money.content} />
            </div>
          </div>
          
          <div className="divide-y divide-gray-100 lg:divide-y-0">
            <div className="py-5 first:pt-0 lg:py-0 lg:mb-8">
              <Section title={narrative.connectivity.title} content={narrative.connectivity.content} />
            </div>
            
            <div className="py-5 lg:py-0 lg:mb-8">
              <Section title={narrative.timing.title} content={narrative.timing.content} />
            </div>
            
            <div className="py-5 lg:py-0">
              <Section title={narrative.quickWins.title} content={narrative.quickWins.content} />
            </div>
          </div>
        </div>
      </article>

      {/* FAQ Section */}
      <section className="border-t border-gray-200 pt-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Frequently Asked Questions</h2>
        <div className="grid lg:grid-cols-2 gap-x-12">
          <div>
            {faqs.slice(0, Math.ceil(faqs.length / 2)).map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </div>
          <div>
            {faqs.slice(Math.ceil(faqs.length / 2)).map((faq, i) => (
              <FAQItem key={i + Math.ceil(faqs.length / 2)} faq={faq} index={i + Math.ceil(faqs.length / 2)} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer with breadcrumbs and links */}
      <footer className="border-t border-gray-200 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center text-sm text-gray-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-gray-700 transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <Link href="/city-guides" className="hover:text-gray-700 transition-colors">City Guides</Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">{displayName}</span>
          </nav>
          
          {/* Quick links */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/city-guides" className="text-gray-600 hover:text-gray-900 transition-colors">
              All Cities
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/saved-trips" className="text-gray-600 hover:text-gray-900 transition-colors">
              My Wishlists
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              Trip Planner
            </Link>
          </div>
        </div>
        
        <p className="mt-6 text-xs text-gray-400">
          Information is provided as a general guide and may change. Always verify current prices, hours, and policies before your trip.
        </p>
      </footer>
    </div>
  );
}
