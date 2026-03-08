'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';

// City-specific FAQ data
const CITY_FAQS = {
  amsterdam: [
    {
      question: "Is Amsterdam safe for tourists?",
      answer: "Very safe overall. Petty theft (bike theft, pickpocketing) occurs in tourist areas and on trams, so keep valuables secure. The Red Light District is safe but stay aware at night. Bike lanes are sacred—standing in them is both dangerous and will irritate locals. Cannabis is tolerated in licensed coffeeshops but not on the street."
    },
    {
      question: "How much should I budget per day?",
      answer: "A comfortable mid-range budget is €130-170 per person per day, covering accommodation, meals, transport, and attractions. Budget travelers can manage €80-100 with hostels and market snacks. Luxury visitors should expect €300+. Amsterdam is expensive—comparable to Paris—but museum passes and cycling save money."
    },
    {
      question: "Do I need to speak Dutch?",
      answer: "Not at all. The Dutch have near-universal English fluency—possibly the best in non-English-speaking Europe. You'll rarely encounter a language barrier. That said, 'Dank je wel' (thank you) and 'Alsjeblieft' (please/here you go) are always appreciated."
    },
    {
      question: "What's the best area to stay?",
      answer: "Canal Ring (Grachtengordel) is central and beautiful but pricey. Jordaan is charming with great cafés. De Pijp is young and multicultural near Albert Cuyp Market. Museum Quarter is quieter and convenient for major museums. Avoid staying in the Red Light District unless you specifically want the atmosphere—it's noisy at night."
    },
    {
      question: "Should I buy museum tickets in advance?",
      answer: "Essential for the big three. Anne Frank House sells out 6 weeks ahead—set a calendar reminder. Van Gogh Museum requires timed-entry booking. Rijksmuseum is slightly more flexible but morning slots go fast. The I amsterdam City Card covers 70+ museums and transit if you're doing several."
    },
    {
      question: "Is Amsterdam tap water safe to drink?",
      answer: "Excellent—among the best in Europe. Amsterdam's tap water comes from the dunes and tastes great. Bring a refillable bottle. Restaurants will bring tap water ('kraanwater') free if you ask, though some push bottled."
    },
    {
      question: "How do I get around at night?",
      answer: "Night buses (nachtbus) run hourly on major routes after trams stop around midnight. Taxis are available but expensive. Most locals bike home regardless of the hour—the infrastructure is safe. Uber works but isn't much cheaper than taxis. The city center is very walkable if you're staying central."
    },
    {
      question: "What should I definitely not miss?",
      answer: "Beyond the museums (Rijksmuseum, Van Gogh, Anne Frank): rent a bike and just ride—it transforms how you experience the city. Have a beer in a brown café (Café 't Smalle, Café Papeneiland). Walk the canals at night when bridges light up. Take the free ferry to Noord for the creative scene. And yes, try a stroopwafel fresh from Albert Cuyp Market."
    }
  ],
  rome: [
    {
      question: "Is Rome safe for tourists?",
      answer: "Very safe overall, but pickpocketing is common—especially on crowded buses (the 64 and 40 to the Vatican are notorious), at Termini station, and around major monuments. Keep valuables in front pockets or a money belt, watch for distraction scams, and you'll be fine. Violent crime against tourists is rare."
    },
    {
      question: "How much should I budget per day?",
      answer: "A comfortable mid-range budget is €100-140 per person per day, covering accommodation, meals, transport, and attractions. Budget travelers can manage €60-80 with hostels and pizza al taglio lunches. Luxury visitors should expect €250+. Rome is cheaper than Paris or London but slightly pricier than other Italian cities."
    },
    {
      question: "Do I need to speak Italian?",
      answer: "Not essential—English is widely spoken in tourist areas, hotels, and restaurants. But learning basics goes far: 'Buongiorno' (good morning), 'Grazie' (thanks), 'Per favore' (please), 'Il conto, per favore' (the bill please). Italians appreciate any effort, and it opens doors."
    },
    {
      question: "What's the best area to stay?",
      answer: "Centro Storico puts you in the heart of things but is noisy and pricey. Trastevere is charming with great nightlife but cobblestones challenge luggage. Monti is hip with excellent restaurants. Near Termini is convenient but less atmospheric. Avoid staying too far from a Metro stop—the system is limited."
    },
    {
      question: "Should I buy attraction tickets in advance?",
      answer: "Essential for the Vatican Museums and Colosseum—both sell out days ahead and skip-the-line access saves hours. Book 2-3 weeks before for peak season. The Borghese Gallery requires reservations (no walk-ins allowed). St. Peter's Basilica is free but the dome climb benefits from early arrival."
    },
    {
      question: "Is Rome tap water safe to drink?",
      answer: "Absolutely—Rome's tap water is excellent, fed by ancient aqueducts. The 2,500+ nasoni (public drinking fountains) around the city provide the same clean water. Bring a refillable bottle and save money. Restaurant tap water ('acqua del rubinetto') is free if you ask, though waiters may push bottled."
    },
    {
      question: "How do I get around at night?",
      answer: "Metro closes at 11:30pm (12:30am Fri/Sat). Night buses run key routes but are infrequent. Taxis are the practical option—use official white cars with meters, or book via FREE NOW or itTaxi apps. Uber exists but uses licensed taxi/NCC drivers at similar prices. Central Rome is very walkable at night."
    },
    {
      question: "What should I definitely not miss?",
      answer: "Beyond the obvious (Colosseum, Vatican, Pantheon): aperitivo at sunset overlooking the city, a proper Roman dinner in Trastevere or Testaccio, the Borghese Gallery (book ahead!), wandering the Centro Storico at night when it's magical, and simply sitting at a piazza with gelato watching Roman life unfold."
    }
  ],
  barcelona: [
    {
      question: "Is Barcelona safe for tourists?",
      answer: "Generally very safe, but pickpocketing is rampant—especially on La Rambla, in the Metro, and at crowded attractions like Sagrada Família. Use a money belt or front pocket, keep bags zipped and in front of you, and be wary of distraction scams. At night, stick to well-lit areas and avoid the Raval's darker streets."
    },
    {
      question: "How much should I budget per day?",
      answer: "A comfortable mid-range budget is €120-150 per person per day, covering accommodation, meals, transport, and attractions. Budget travelers can manage €70-90 with hostels and menú del día lunches. Luxury visitors should expect €300+. Barcelona is cheaper than Paris or London but pricier than other Spanish cities."
    },
    {
      question: "Do I need to speak Spanish or Catalan?",
      answer: "Most locals speak Spanish and Catalan; many speak English in tourist areas. Learning 'Hola,' 'Gràcies' (Catalan for thanks), 'Per favor,' and 'La cuenta, por favor' (the bill please) goes far. Catalan is the official language—signs, menus, and announcements often appear in Catalan first."
    },
    {
      question: "What's the best area to stay?",
      answer: "Gothic Quarter is central but very touristy and noisy at night. El Born is trendy with great bars and restaurants. Eixample puts you near Gaudí landmarks and has a more local feel. Gràcia is hip and village-like but farther from beaches. Barceloneta is perfect for beach access but can be rowdy."
    },
    {
      question: "Should I buy attraction tickets in advance?",
      answer: "Absolutely essential for Sagrada Família—slots sell out weeks ahead. Same for Park Güell's monumental zone, Casa Batlló, and La Pedrera. Book 2-4 weeks before your trip, or check for cancellations. The Picasso Museum is also best booked ahead. Free Sundays at some museums mean even longer queues."
    },
    {
      question: "Is Barcelona tap water safe to drink?",
      answer: "Technically safe, but it tastes heavily chlorinated and many locals drink bottled. Restaurants will bring tap water if you ask for 'agua del grifo.' Bottled water is cheap—about €0.50 from supermarkets. Some newer buildings have improved filtration."
    },
    {
      question: "How do I get around at night?",
      answer: "Metro runs until midnight (2am Fri/Sat, all night some holidays). Night buses (NitBus) cover major routes every 20-30 minutes until Metro reopens at 5am. Taxis are plentiful and affordable—hail the green-lit ones or use the FREE NOW app. Uber operates but is less common than taxis."
    },
    {
      question: "What should I definitely not miss?",
      answer: "Beyond Sagrada Família and Park Güell: sunset drinks at a rooftop bar, vermouth at a bodega in Gràcia, wandering the Gothic Quarter at night, La Boqueria market (go early), the Picasso Museum, fresh seafood in Barceloneta, and simply getting lost in El Born's medieval streets."
    }
  ],
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
  ],
  london: [
    {
      question: "Is London safe for tourists?",
      answer: "Very safe overall. The usual big-city advice applies: watch for pickpockets on the Tube and in crowded tourist areas, keep an eye on your belongings, and stay aware of your surroundings at night. The British Transport Police patrol the underground, and CCTV is everywhere."
    },
    {
      question: "How much should I budget per day?",
      answer: "London's expensive—expect £120-180 per person daily for mid-range accommodation, meals, transport, and attractions. Budget travelers can manage £70-100 with hostels and careful spending. Luxury visitors should prepare for £300+. The weak pound helps non-UK visitors."
    },
    {
      question: "Do I need to learn any British phrases?",
      answer: "You already speak the language (sort of). 'Cheers' means thank you or goodbye. 'Sorry' is used constantly, even when someone else bumps into YOU. 'Queueing' means waiting in line—and it's sacred. 'Not bad' actually means quite good. 'Taking the piss' means joking around."
    },
    {
      question: "What's the best area to stay?",
      answer: "Covent Garden/Soho (West End) is central for theatre and nightlife. Southwark/Borough puts you near the Tate and Borough Market. Shoreditch suits hipster vibes and street art. Kensington is elegant but touristy. King's Cross is transit-practical. Avoid anywhere too far from a Tube station."
    },
    {
      question: "Should I buy attraction tickets in advance?",
      answer: "Yes, for the big ones—Tower of London, Westminster Abbey, St Paul's, Warner Bros Studio Tour. Many major museums are FREE (British Museum, Tate, National Gallery, V&A)—no booking needed. For shows, TKTS in Leicester Square sells same-day discounted West End tickets."
    },
    {
      question: "Is London tap water safe?",
      answer: "Absolutely. London's tap water is excellent—it's hard (chalky) but perfectly safe. Restaurants must provide free tap water if asked. Bring a refillable bottle; there are water fountains across the city and you'll save on expensive bottled water."
    },
    {
      question: "How do I get around at night?",
      answer: "The Tube runs until around midnight (later on Friday/Saturday Night Tube lines: Victoria, Central, Jubilee, Northern, Piccadilly). Night buses (prefixed with 'N') run all night and cover most routes. Uber and black cabs are readily available. Black cabs can be pricey but are licensed and safe."
    },
    {
      question: "What should I definitely not miss?",
      answer: "Beyond the obvious (Big Ben, Tower Bridge, Buckingham Palace), don't skip: a pint in a historic pub, Borough Market on a weekday morning, a walk along the South Bank, free museums (seriously—world class), and a Sunday roast somewhere proper. Oh, and the view from Primrose Hill."
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
  amsterdam: {
    intro: `You've landed at Schiphol. Here's the fast start—no tourist traps, no bike lane mishaps, just the moves that make navigating this canal-laced city feel natural from the first hour.`,

    arrival: {
      title: "From the Airport",
      content: `**Schiphol → city:** The train is fast and easy. Buy a ticket at the yellow machines (€5.70 one-way) or tap your contactless card directly at the gates. Trains to Amsterdam Centraal run every 10-15 min, take 15-20 min. No validation needed—just tap in and out.

**Buses** run to various city locations but are slower. The 397 goes to Museumplein and Leidseplein if that's more convenient than Centraal.

**Taxis:** Fixed fare of ~€50 to city center. Use only official taxis from the rank outside Arrivals. Uber works at similar prices.

**Pro tip:** Download the NS app (Dutch Railways) for real-time schedules and mobile tickets.`
    },

    gettingAround: {
      title: "Getting Around",
      content: `**Bike. Seriously.** This is how Amsterdam works. Rent from MacBike, Yellow Bike, or countless local shops (€10-15/day). Within an hour you'll feel the flow. Key rules: stay right, signal turns with your hand, and NEVER stop in bike lanes.

**Trams** cover what pedaling doesn't. Buy a day pass (€8.50) or use contactless tap-in/tap-out. Lines 2, 5, and 12 hit major tourist spots.

**Walking** is lovely but slower than biking. The canal ring is about 3km across—walkable but a bike halves the time.

**GVB passes** cover trams, buses, Metro, and ferries. The 24/48/72-hour passes are good value if you're not biking.

**Ferries to Noord** are free and run 24/7 from behind Centraal Station. Take one just for the experience.`
    },

    money: {
      title: "Money & Payments",
      content: `**Cards everywhere.** The Dutch love contactless—many places are actually cashless. Visa and Mastercard work universally; Amex is hit or miss. Tap-to-pay is the norm.

Carry **€20-30** for markets and the rare cash-only spot (some brown cafés, Albert Cuyp vendors).

**Tipping:** Not required or expected. Round up for good service; 5-10% at restaurants is generous. Service is never added automatically.

**ATMs** are everywhere. Use bank machines (ING, ABN AMRO, Rabobank) to avoid fees.`
    },

    connectivity: {
      title: "Staying Connected",
      content: `**WiFi is standard**—cafés, restaurants, hotels, and many public spaces offer free access. Quality is generally good.

**EU SIMs roam free.** Non-EU visitors should grab a prepaid SIM from **Lebara, Lyca, or KPN**—available at Schiphol, train stations, or phone shops. €15-20 for plenty of data.

**Outlets:** Type C/F, 230V. Standard European plugs. US/UK visitors need adapters.`
    },

    timing: {
      title: "Local Rhythms",
      content: `**The Dutch are punctual.** Trains leave on time. Reservations mean something. Don't be late.

**Shops:** 10am-6pm weekdays, often later Thursday (koopavond). Sundays many shops open noon-5pm, but some still close.

**Museums:** Most open 9am-5pm or 10am-6pm. Rijksmuseum and Van Gogh stay open later some evenings. Mondays many smaller museums close.

**Restaurants:** Dinner starts 6-7pm—earlier than Mediterranean Europe. Kitchens often close by 9:30-10pm. Book popular spots.

**Brown cafés** open mid-afternoon and stay open until 1am (3am Fri/Sat). Terraces fill the second the sun appears.

**King's Day (April 27):** The city goes completely orange and completely mad. Book accommodation months ahead.`
    },

    quickWins: {
      title: "Insider Moves",
      content: `**Stay out of bike lanes.** Seriously. Not for standing, not for photos, not for one second. You'll get hit or yelled at—possibly both.

**Book Anne Frank House NOW.** Tickets release 6 weeks ahead and sell out within hours.

**Rent a bike, not a car.** Parking is €7.50/hour in the center. Bikes are €12/day. The math is obvious.

**Brown cafés > tourist bars.** Look for dark wood, Persian rugs, and candles. Café 't Smalle and Café Papeneiland are classics.

**Free ferries to Noord.** The creative scene across the IJ is worth the (free) trip. NDSM Wharf has food, bars, and industrial cool.

**Coffeeshop etiquette:** If you partake, buy something (drink or product) and don't photograph inside. No alcohol served.`
    }
  },
  rome: {
    intro: `You've landed at Fiumicino. Here's the fast start—no tourist traps, no confusion, just the moves that make navigating the Eternal City feel natural from day one.`,

    arrival: {
      title: "From the Airport",
      content: `**Fiumicino (FCO) → city:** The **Leonardo Express** train runs every 15 min to Termini station. €14 one-way, 32 min, no stops. Buy tickets at machines (not from people approaching you) and validate before boarding.

**Buses** are cheaper: SIT, Terravision, or COTRAL run €6-7 to Termini (45-60 min depending on traffic). Fine for budget travelers, but the train is worth it.

**Taxis:** Flat fare—€50 to anywhere within the Aurelian Walls (historic center). Insist on the flat rate before departing. Official taxis are white with a meter.

**Ciampino:** Budget airlines land here. Buses to Termini run €6-7, 40 min. No train connection.`
    },

    gettingAround: {
      title: "Getting Around",
      content: `**Walking is best.** Rome's historic center is compact—Piazza Navona to the Pantheon is 5 minutes, Spanish Steps to Trevi is 10. The cobblestones demand comfortable shoes.

**Metro** has just 3 lines and doesn't reach many tourist spots (no stop at the Pantheon, Piazza Navona, or Trastevere). Still useful for Termini↔Vatican (Line A) and Colosseum (Line B). Buy a **BIT ticket** (€1.50, 100 min) or **24-hour pass** (€7).

**Buses** go everywhere but are crowded and confusing. The 40 and 64 link Termini to the Vatican—watch for pickpockets.

**Taxis** are reasonably priced. White cars only, always use the meter or agree on the flat rate. FREE NOW app works well.`
    },

    money: {
      title: "Money & Payments",
      content: `**Cards work widely** but Rome is more cash-friendly than northern Europe. Small trattorias, market vendors, and gelaterias often prefer cash. Visa/Mastercard are standard; Amex is spottier.

Keep **€50-80** on hand for meals, markets, and the occasional cash-only spot.

**Tipping:** Not required. €1-2 at restaurants for good service is appreciated but not expected. Rounding up taxi fares is sufficient. "Coperto" (cover charge, €1-3) appears on restaurant bills—this is normal, not a tip.

Use bank ATMs; avoid the standalone machines near tourist sites that charge €5-7 fees.`
    },

    connectivity: {
      title: "Staying Connected",
      content: `**WiFi is decent**—hotels and cafés offer it, though speeds vary. Many piazzas and public spaces lack coverage.

EU SIMs roam free. Non-EU visitors should get a prepaid SIM from **TIM, Vodafone, or Wind Tre**—€15-25 for solid data. Shops at Termini station or on Via del Corso.

**Outlets:** Type C/L, 230V. Most European plugs fit; US visitors need adapters.`
    },

    timing: {
      title: "Local Rhythms",
      content: `**Italy runs on its own clock.** Learn it or struggle.

**Lunch:** 12:30–2:30pm. Restaurants close between meals. Don't expect food at 3pm—you'll find locked doors. Grab pizza al taglio (by weight) if you're stuck.

**Dinner:** 8pm is early; 9pm is normal. Kitchens close around 10:30-11pm. Romans eat late and linger.

**Riposo (afternoon rest):** 1-4pm, many small shops close. Churches close 12:30-3pm. Plan museum visits or a long lunch.

**Sundays:** Many restaurants in tourist areas stay open, but residential neighborhoods shut down. Some museums close Mondays.

**August:** Romans flee the city. Many restaurants close for 2-3 weeks. The city empties but major sites stay open.`
    },

    quickWins: {
      title: "Insider Moves",
      content: `**Book the Vatican for first entry (8am).** Beat the cruise ship crowds that arrive by 10am.

**Skip restaurants with photo menus** or aggressive hosts on the street. Walk one block off the main piazza for better food at half the price.

**Validate your bus/metro ticket.** Inspectors exist and fines are €50+.

**Drink from the nasoni.** The public fountains are everywhere and the water is excellent.

**Dress for churches.** Shoulders and knees covered. St. Peter's and major basilicas enforce this.

**Say "Buongiorno" first.** Always. Before any transaction. It's non-negotiable etiquette.`
    }
  },
  barcelona: {
    intro: `You've landed at El Prat. Here's the fast start—no tourist traps, no confusion, just the moves that make you feel like you've been coming here for years.`,

    arrival: {
      title: "From the Airport",
      content: `**El Prat → city:** The **Aerobus** runs every 5 min to Plaça Catalunya. €7.75 one-way, 35 min. No booking needed—just buy at the machine or tap contactless on board. Runs 5am–12:30am.

**Metro L9 Sud** is cheaper (€5.15 with T-Casual) but slower and doesn't reach the center directly—you'll transfer at Torrassa or Zona Universitària.

**Taxis:** Flat fare—€42 to city center. Official stands only; black-and-yellow cars. Uber exists but taxis are easier from the airport.

**Girona/Reus airports:** Budget airlines land here. Buses run to Barcelona Nord station (~75-90 min, €12-16).`
    },

    gettingAround: {
      title: "Getting Around",
      content: `**Metro first.** Eight lines, runs 5am–midnight (to 2am Fri/Sat, 24h some holidays). Buy a **T-Casual** card (€11.35 for 10 trips)—works on Metro, bus, tram, and FGC trains within Zone 1.

**Always validate** at the turnstile or machine. Inspectors are common; fines are €100+.

**Walking** is best in the old town—the Gothic Quarter, El Born, and Barceloneta are compact and better on foot.

**Taxis** are affordable. Green light means available. Uber works but drivers are the same as taxis. Use FREE NOW app for either.`
    },

    money: {
      title: "Money & Payments",
      content: `**Cards everywhere.** Visa/Mastercard work universally; Amex is spottier. Tap-to-pay is standard at most places.

Carry **€30–50 cash** for markets, small tapas bars, and the occasional cash-only bodega. La Boqueria vendors prefer cash for small purchases.

**Tipping:** Not required or expected. Round up for good service; €1-2 at sit-down restaurants is generous. No one tips at tapas bars.

ATMs are everywhere but avoid Euronet and other tourist-trap machines that charge €5-7 fees. Use bank ATMs.`
    },

    connectivity: {
      title: "Staying Connected",
      content: `**WiFi is easy**—cafés, hotels, and many restaurants offer free access. Metro stations have spotty coverage.

EU SIMs roam free. Non-EU visitors should grab a prepaid SIM from **Orange, Vodafone, or Movistar**—~€15–20 for solid data. Shops are at the airport or on Passeig de Gràcia.

**Outlets:** Type C/F, 230V. Same as most of Europe. Your dual-voltage phone chargers will work fine.`
    },

    timing: {
      title: "Local Rhythms",
      content: `**Spain runs late.** This is not a polite suggestion—it's law.

**Lunch:** 1:30–3:30pm. Most restaurants don't open until 1pm. The **menú del día** (set lunch, €12–18) is the best deal in town.

**Dinner:** 8:30pm is early; 9:30–10pm is normal. Kitchens often close by 11:30pm. Don't show up at 6pm expecting dinner—you'll find locked doors.

**Shops:** 10am–2pm, then 5–8:30pm (many close for siesta). Big stores stay open through. **Sundays** most things close.

**Vermut hour:** Noon–2pm on weekends. Order vermouth, olives, and tinned seafood at a bodega. This is sacred.`
    },

    quickWins: {
      title: "Insider Moves",
      content: `**Greet in Catalan.** "Bon dia" (good day), "Gràcies" (thanks). It's noticed and appreciated.

**Skip La Rambla restaurants.** Tourist traps with frozen paella. Walk one block into the Gothic Quarter or Raval for real food at half the price.

**Book Sagrada Família NOW.** Seriously. Morning slots sell out weeks ahead.

**Siesta is real.** Plan your afternoon museum visit or beach time between 2–5pm when small shops close.

**Watch your phone.** Barcelona has Europe's highest pickpocketing rates. Front pocket, always.`
    }
  },
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
      content: `**Water is free.** Ask for "une carafe d'eau, s'il vous plaît."

**Service is included.** Tip small only for standout service.

**Always say bonjour/bonsoir.** It's expected.

**Indoor voice.** Paris is discreet—keep volumes low on Metro and in cafés.`
    }
  },
  london: {
    intro: `You've arrived in London. Here's everything you need to navigate the city like a Londoner—efficient, unflustered, and possibly complaining about the weather.`,

    arrival: {
      title: "From the Airport",
      content: `**Heathrow → city:** The **Piccadilly Line** (Tube) runs every few minutes, £5.50 to central London in 50–60 min with Oyster/contactless. The **Heathrow Express** is faster (15 min to Paddington) but costs £25. Uber/taxi runs £50-80.

**Gatwick:** **Gatwick Express** (£19.90, 30 min to Victoria) or Southern Rail (£15, 45 min). **Stansted:** Stansted Express to Liverpool Street (£19.40, 47 min). **Luton:** Train + bus combo, about an hour.

**Black cabs:** Licensed, metered, and can be hailed on the street. Expect £60-90 from Heathrow. Only use official taxi ranks—ignore touts inside terminals.`
    },

    gettingAround: {
      title: "Getting Around",
      content: `**The Tube is king.** 11 lines, runs ~5am-midnight (Night Tube on some lines Fri/Sat). Get an **Oyster card** at any station or just use **contactless**—same prices, daily cap of ~£8.

**Tap in AND tap out.** Forgetting costs you the maximum fare.

**Buses** are cheaper (£1.75 flat fare, contactless only) and better for seeing the city. The **24, 11, and 9** pass major sights.

**Black cabs** are safe but pricey. **Uber/Bolt** work fine. Tipping isn't expected but rounding up is appreciated.`
    },

    money: {
      title: "Money & Payments",
      content: `**Contactless everywhere.** London runs on tap-to-pay. Visa/Mastercard work universally; Amex is spottier. Cash is increasingly unnecessary—many places are actually cashless.

Keep **£20-30** for markets and small vendors. Tipping: 10-12.5% at restaurants if service isn't included (check the bill), round up in taxis, nothing expected at pubs.

ATMs are plentiful but avoid the independent ones in tourist areas—use bank ATMs for better rates.`
    },

    connectivity: {
      title: "Staying Connected",
      content: `**WiFi is ubiquitous**—cafés, pubs, shops, and even the Tube stations (not in tunnels). Most is free with no catch.

EU roaming ended with Brexit—check your provider. For extended stays, grab a **Three, Vodafone, or EE** SIM; £10-20 gets you plenty of data.

Outlets: **Type G (three-prong)**. You'll need an adapter. 230V, so most chargers work—just not the plug shape.`
    },

    timing: {
      title: "Local Rhythms",
      content: `**Shops:** 10am-6pm Mon-Sat, 11am-5pm Sunday (Sunday Trading Laws). Oxford Street stays open later.

**Pubs:** Open 11am-11pm. **Last orders** is called 10-15 min before closing—get to the bar sharpish. Many pubs close earlier Sunday.

**Restaurants:** Lunch noon-2:30pm, dinner 6-10pm. Kitchen times matter—arriving at 9:30pm often means last orders.

**Museums:** Most major ones are FREE. Check for late nights (V&A Fridays, National Gallery Fridays). Many close 5-6pm.`
    },

    quickWins: {
      title: "Insider Moves",
      content: `**Stand on the right.** On escalators, stand right, walk left. This is non-negotiable. Blocking will earn you tutting at minimum.

**Mind the gap.** You'll hear it constantly. The gap is real on older stations.

**Queuing is sacred.** Form an orderly line or face British passive-aggressive disappointment.

**"Sorry" is reflexive.** You'll start saying it too. Someone steps on YOUR foot? "Sorry." It just happens.

**The pint comes first.** In a pub, find your seat, go to the bar, order, pay immediately. Table service exists but isn't standard.`
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
