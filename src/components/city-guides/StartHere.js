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
    intro: `You’ve landed at Charles de Gaulle. Here’s the fast start—no scams, no confusion, just the moves that make you feel like you’ve been here before.`,
    
    arrival: {
      title: "From the Airport",
      content: `**CDG → city:** Take the **RER B**. €11.80 to Gare du Nord/Châtelet in 35–50 min, every 10–15 min. Follow the signs, validate the ticket at yellow machines, and board.

**Taxis:** Flat fare—€55 Right Bank (Louvre/Marais/Opéra), €62 Left Bank (Saint-Germain/Latin Quarter). Only use official stands; ignore anyone who approaches you inside. Uber/Bolt run €50–80 depending on demand.

**Orly:** Closer in. Orlybus (€11.50, 30–40 min) to Denfert-Rochereau, or Orlyval + RER B (€14.10) via Antony.`
    },

    gettingAround: {
      title: "Getting Around",
      content: `**Metro first.** It’s fast, frequent, and goes almost everywhere. Grab a **Navigo Easy** at any station and load singles (€2.15) or a day pass. Always **validate**—inspector fines are €50 on the spot.

Hours: ~5:30am–12:40am (to 1:40am Fri/Sat). After that, Noctilien night buses run, but taxis/rideshares are simpler late.

**Uber/Bolt/FREE NOW** work. Taxis: hail the lit roof light or use marked stands. Rounding up a euro or two is nice but not required.`
    },

    money: {
      title: "Money & Payments",
      content: `**Cards everywhere.** Visa/Mastercard work almost universally; Amex is spottier. Tap-to-pay is standard.

Carry **€20–50** for the rare cash-only bakery or market. Service is included by law—tip only for standout service.

ATMs are plentiful. Check your bank’s FX fees.`
    },

    connectivity: {
      title: "Staying Connected",
      content: `**WiFi is easy**—cafés, hotels, museums, parks, and Metro stations (not trains). EU SIMs roam fine. For the best rates, buy a local SIM from **Orange/SFR/Bouygues**; ~€20–30 for solid data.

Outlets: **Type C/E, 230V**. Most chargers are dual-voltage; check hair dryers.`
    },

    timing: {
      title: "Local Rhythms",
      content: `**Shops:** ~10am–7pm. Many pause 1–2pm. Sundays are sleepy—bakeries/some markets stay open.

**Restaurants:** Lunch noon–2pm. Dinner from ~7:30pm; kitchens often close by 10pm. Hungry at 3pm? Think bakeries/cafés.

**Museums:** Many close Tuesdays (Orsay closes Monday). Late nights once a week (Louvre Friday to 9:45pm). Check before you go.

**August:** Vacation month—great spots can close for weeks. Have backups.`
    },

    quickWins: {
      title: "Insider Moves",
      content: `**Water is free.** Ask for “une carafe d’eau, s’il vous plaît.”

**Service is included.** Tip small only for standout service.

**Always say bonjour/bonsoir.** It’s expected.

**Indoor voice.** Paris is discreet—keep volumes low on Metro and in cafés.`
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

      {/* Footer - simplified */}
      <footer className="border-t border-gray-200 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
          <span className="text-gray-700 font-semibold">Plan smarter. Travel better.</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/city-guides" className="text-gray-600 hover:text-gray-900 transition-colors">
              Browse all cities
            </Link>
            <Link href="mailto:hello@eurotrip.guide" className="text-gray-600 hover:text-gray-900 transition-colors">
              Get support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
