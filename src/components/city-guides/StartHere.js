'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Plane,
  Navigation,
  Wallet,
  Wifi,
  Clock,
  Lightbulb
} from 'lucide-react';

// City-specific FAQ data
const CITY_FAQS = {
  prague: [
    {
      question: "Is Prague safe for tourists?",
      answer: "Very safe overall. Petty theft exists—watch your pockets on Charles Bridge, in Old Town Square, and on tram 22. Taxi scams were legendary but apps (Bolt, Liftago) solved this. Avoid exchangers with 'commission' signs—they'll rip you off. The biggest danger is cobblestones after a few beers."
    },
    {
      question: "How much should I budget per day?",
      answer: "Prague is excellent value—€70-100 per person daily covers comfortable accommodation, good meals, transport, and attractions. Budget travelers can manage €50-70. Luxury visitors might spend €150-200. Beer is €2-3 at local pubs; a full dinner with drinks rarely exceeds €25-30 even at nice restaurants."
    },
    {
      question: "Do I need to speak Czech?",
      answer: "Not in tourist areas where English is widely spoken. Learning 'Dobrý den' (hello), 'Děkuji' (thank you), and 'Pivo, prosím' (beer, please) goes a long way. Czechs appreciate the effort. Outside the center, English is less common among older generations but younger Czechs usually speak it well."
    },
    {
      question: "What's the best area to stay?",
      answer: "Old Town (Staré Město) is central but touristy and noisy. Malá Strana is beautiful and quieter, close to the castle. Vinohrady is where locals live—great restaurants, bars, and parks with easy metro access. Žižkov is edgier and cheaper with authentic pubs. Avoid staying directly on Old Town Square unless you love crowds."
    },
    {
      question: "Should I buy attraction tickets in advance?",
      answer: "Helpful but not as critical as in Paris or Rome. Prague Castle has timed slots that can sell out in peak summer—book a day or two ahead. Jewish Quarter tickets benefit from advance purchase. St. Vitus Cathedral entry (inside the castle complex) is included with castle tickets. Most other sites are walk-up friendly."
    },
    {
      question: "Is Prague tap water safe to drink?",
      answer: "Absolutely—Prague's tap water is excellent. The city's water system is well-maintained and the water tastes good. Restaurants will bring tap water if you ask, though they may push bottled. Refill bottles freely."
    },
    {
      question: "How do I avoid tourist traps?",
      answer: "Skip any restaurant with photos on the menu or a guy aggressively beckoning outside. Avoid exchanges with 'commission' or '0% commission' signs—they manipulate rates. Never take an unmarked taxi. Walk 2-3 blocks from Old Town Square for better food at half the price. If the menu is in 10 languages, keep walking."
    },
    {
      question: "What should I definitely not miss?",
      answer: "Charles Bridge at sunrise (before 7am, it's empty and magical), a proper Czech beer hall experience (not in Old Town), Prague Castle in the morning, the view from Letná Park at sunset, and getting lost in Malá Strana's side streets. Also: svíčková (beef in cream sauce) at a local restaurant, not a tourist trap."
    }
  ],
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
  ],
  lisbon: [
    {
      question: "Is Lisbon safe for tourists?",
      answer: "Very safe overall—one of Europe's safest capitals. Petty theft exists in tourist hotspots (Baixa, trams, Belém), so watch bags and pockets. The 28 tram is notorious for pickpockets—keep valuables secure. At night, Bairro Alto gets rowdy but isn't dangerous. Avoid darker streets in Mouraria and Alfama late at night."
    },
    {
      question: "How much should I budget per day?",
      answer: "Lisbon is excellent value—€80-120 per person daily covers comfortable accommodation, great food, transport, and attractions. Budget travelers can manage €50-70 with hostels and local tascas. Luxury visitors might spend €200+. A proper meal with wine rarely exceeds €20-25 even at good restaurants."
    },
    {
      question: "Do I need to speak Portuguese?",
      answer: "Not essential—English is widely spoken, especially among younger Lisboetas. Learning 'Bom dia' (good morning), 'Obrigado/Obrigada' (thank you, male/female speaker), 'Por favor' (please), and 'A conta, por favor' (the bill please) goes far. Portuguese appreciate the effort enormously."
    },
    {
      question: "What's the best area to stay?",
      answer: "Baixa/Chiado is central and walkable to everything. Alfama has character but steep hills and noise from fado bars. Príncipe Real is trendy and quieter. Bairro Alto is nightlife central—great if you're young, loud at night. Santos/Lapa is local and affordable. Avoid anything too far from a Metro line."
    },
    {
      question: "Should I buy attraction tickets in advance?",
      answer: "Helpful for Jerónimos Monastery (long queues), Belém Tower, and the National Tile Museum. Sintra day trips benefit from early Pena Palace tickets—it gets packed by 11am. Most other attractions are walk-up friendly. The Lisboa Card covers transport and many museums if you're doing several."
    },
    {
      question: "Is Lisbon tap water safe to drink?",
      answer: "Absolutely—Lisbon's tap water is clean and safe. It can taste slightly chlorinated depending on your neighborhood, but it's perfectly fine. Restaurants will bring tap water if you ask, though some push bottled. Refill bottles at public fountains."
    },
    {
      question: "How do I handle the hills?",
      answer: "Lisbon is built on seven hills—embrace it or work around it. The Metro avoids most climbing. The three funiculars (Glória, Bica, Lavra) and the Santa Justa elevator help. Tuk-tuks are overpriced but useful if you're tired. Wear comfortable shoes—cobblestones are everywhere and can be slippery when wet."
    },
    {
      question: "What should I definitely not miss?",
      answer: "Beyond Belém and Alfama: sunset drinks at a miradouro (Graça or Portas do Sol), a ginjinha (cherry liqueur) standing at a tiny bar, fresh pastéis de nata from Manteigaria, fado in an intimate venue (not a tourist show), the LX Factory on weekends, and simply getting lost in Alfama's labyrinthine streets."
    }
  ],
  vienna: [
    {
      question: "Is Vienna safe for tourists?",
      answer: "Extremely safe—consistently ranked among the world's safest cities. Violent crime is rare; petty theft exists but at lower rates than most European capitals. The U-Bahn is safe at all hours. Normal urban awareness suffices. The biggest 'danger' is jaywalking—Viennese take crosswalks seriously."
    },
    {
      question: "How much should I budget per day?",
      answer: "Vienna is moderately expensive—€120-160 per person daily for mid-range comfort covering accommodation, meals, transport, and attractions. Budget travelers can manage €70-90 with hostels and careful choices. The Vienna Pass covers many museums but do the math first. Coffee and cake: €10-15. Schnitzel dinner: €20-30."
    },
    {
      question: "Do I need to speak German?",
      answer: "Not essential—English is widely spoken in tourist areas, hotels, and restaurants. But Viennese appreciate effort: 'Grüß Gott' (hello), 'Danke' (thanks), 'Bitte' (please), and 'Die Rechnung, bitte' (the bill please) go far. Note: Viennese German differs from German German; locals are proud of their dialect."
    },
    {
      question: "What's the best area to stay?",
      answer: "Innere Stadt (1st district) puts you in the historic center—walkable to everything but pricey. Neubau (7th) and Josefstadt (8th) offer trendy restaurants and local character at better prices. Leopoldstadt (2nd) near the Prater is emerging and well-connected. Anywhere near a U-Bahn works—the system is excellent."
    },
    {
      question: "Should I buy attraction tickets in advance?",
      answer: "Helpful for Schönbrunn Palace (especially Grand Tour tickets) and the Belvedere's Klimt collection. The Kunsthistorisches Museum and most others are walk-up friendly. Standing-room opera tickets are sold same-day only (arrive 80 min early). The Vienna Pass saves money if you're museum-intensive."
    },
    {
      question: "Is Vienna tap water safe?",
      answer: "Excellent—Vienna's tap water comes from Alpine springs and is genuinely delicious. The city is proud of this; public fountains are drinkable. Restaurants serve tap water free if you ask ('Leitungswasser, bitte'). Don't waste money on bottled water."
    },
    {
      question: "How does the coffee house culture work?",
      answer: "Order at your table; wait for the waiter (rushing is frowned upon). One coffee entitles you to stay indefinitely—this is tradition. Newspapers are provided. Tip by rounding up. 'Melange' is like cappuccino; 'Verlängerter' is elongated espresso; 'Einspänner' is espresso with whipped cream. Always comes with a glass of water."
    },
    {
      question: "What should I definitely not miss?",
      answer: "Beyond Schönbrunn and the museums: standing-room opera at the Staatsoper (€15 for world-class), coffee and cake at a historic café (Café Central, Sperl, or Hawelka), the Naschmarkt for food browsing, an evening at a Heuriger wine tavern, and simply wandering the Ringstrasse at golden hour when the buildings glow."
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
  prague: {
    intro: `You've landed at Václav Havel Airport. Here's the fast start—no tourist traps, no exchange rate scams, just the moves that make navigating this fairy-tale city feel natural from day one.`,

    arrival: {
      title: "From the Airport",
      content: `**Airport → city:** The **Airport Express (AE) bus** runs every 30 min to Hlavní nádraží (main train station). 100 CZK, 35 min. Or take **bus 119** to Nádraží Veleslavín metro (Line A), then metro to center—40 CZK total, about 45 min.

**Taxis:** Should cost 500-700 CZK to center. Use **Bolt or Liftago apps only**—Prague taxi scams are legendary. Never take an unmarked car or agree to a "flat rate" from someone who approaches you.

**Pro tip:** Get Czech Koruna (CZK) from an ATM at the airport, not the exchange booths. Use a debit card with no foreign transaction fees.`
    },

    gettingAround: {
      title: "Getting Around",
      content: `**Metro + tram** cover everything. Three metro lines (A/B/C), clean and efficient, run 5am-midnight. **Trams** are useful—line 22 is the scenic route from castle to New Town.

Buy tickets at metro stations or use contactless on newer validators. **24-hour pass (120 CZK)** is best value if you're moving around. Single tickets (40 CZK) must be validated.

**Walking** is essential in the historic center—cobblestones don't suit bikes. The main sights cluster within a 30-minute walk.

**Taxis:** Use Bolt or Liftago apps. Period. Street hails in tourist areas still risk scams.`
    },

    money: {
      title: "Money & Payments",
      content: `**Czech Koruna (CZK), not Euro.** Some tourist places accept Euro but at terrible rates. Use CZK everywhere.

**Cards work widely**—Visa and Mastercard accepted at most restaurants and shops. Smaller pubs and markets may be cash-only. Tap-to-pay is common.

**ATMs:** Use bank ATMs (Česká spořitelna, Komerční banka, ČSOB). Avoid Euronet and standalone machines that offer "dynamic currency conversion"—always choose CZK, not your home currency.

**AVOID exchange booths** in tourist areas. Even ones claiming "0% commission" manipulate rates. ATMs are always better.

**Tipping:** 10% at restaurants by rounding up. Tell the waiter the total you want to pay. Small tip at bars when paying each round.`
    },

    connectivity: {
      title: "Staying Connected",
      content: `**WiFi is standard**—cafés, restaurants, and hotels offer free access. Quality is generally good.

**EU SIMs roam free.** Non-EU visitors should grab a prepaid SIM from **Vodafone, O2, or T-Mobile**—available at the airport or in the city. €10-15 for decent data.

**Outlets:** Type C/E, 230V. Standard European plugs.`
    },

    timing: {
      title: "Local Rhythms",
      content: `**Czechs keep reasonable hours.** Not as late as Spain, not as early as Northern Europe.

**Restaurants:** Lunch noon-2pm, dinner 6-10pm. Kitchens often close by 9:30pm at traditional spots. Reservations helpful on weekends.

**Shops:** 9am-6pm weekdays, shorter Saturdays, many closed Sundays. Shopping centers stay open later.

**Pubs:** Open from late morning, busy after work (5-6pm), running until 11pm-midnight. Traditional pivnice close earlier; modern bars stay open later.

**Museums:** Most open 10am-6pm, closed Mondays. Prague Castle opens at 6am (grounds) / 9am (interiors).

**Charles Bridge:** Sunrise is magical and nearly empty. By 9am it's a tourist gauntlet. Late night (11pm+) is also atmospheric.`
    },

    quickWins: {
      title: "Insider Moves",
      content: `**Charles Bridge at sunrise.** Set your alarm for 5:30am—you'll have it nearly to yourself and the photos are incomparable.

**Skip Old Town restaurants.** Walk 5 minutes in any direction for better food at half the price. If there's a menu in 10 languages, keep walking.

**Beer is sacred.** Order "pivo" (beer), specify size: malé (small, 0.3L) or velké (large, 0.5L). Pilsner Urquell, Staropramen, and Kozel are reliable. Don't order Budweiser—you'll get the Czech original, which is good, but locals might roll their eyes.

**Never use street exchange booths.** Even "0% commission" signs mean bad rates. ATM or your bank card, always.

**Tipping:** Say the total you want to pay. If the bill is 180 CZK, say "200" and hand them the money. Don't leave coins on the table.`
    }
  },
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
  },
  lisbon: {
    intro: `You've landed at Humberto Delgado Airport. Here's the fast start—no tourist traps, no confusion, just the moves that make navigating this sun-drenched city of seven hills feel natural from day one.`,

    arrival: {
      title: "From the Airport",
      content: `**Airport → city:** The **Metro (red line)** runs every 6–9 min to the center. €1.65 single + €0.50 reusable Viva Viagem card. Takes 20–25 min to Alameda (transfer to green line for Baixa-Chiado). Clean, safe, easy.

**Aerobus** runs to Marquês de Pombal, Restauradores, and Cais do Sodré. €4 one-way, €6 return. Every 20 min, 35–40 min to center. Useful if you're staying near those stops.

**Taxis:** Should cost €15–20 to center (meter, not flat rate). Use the official taxi rank outside arrivals. Uber and Bolt work at similar prices and are reliable.

**Pro tip:** Get a Viva Viagem card at the airport Metro station—you'll use it all trip.`
    },

    gettingAround: {
      title: "Getting Around",
      content: `**Metro** covers the main areas well—4 lines, runs 6:30am–1am. Load your Viva Viagem with "zapping" credit (€1.65/trip) rather than single tickets.

**Trams** are charming but slow. The famous **28** is packed with tourists—take it for the experience but not efficiency. The **28E** follows the same route with less crowding.

**Walking** is essential but exhausting—Lisbon's hills are no joke. Comfortable shoes are mandatory.

**Funiculars** (Glória, Bica, Lavra) and the **Santa Justa Elevator** help with hills and are covered by the 24-hour transit pass (€6.80).

**Uber/Bolt** are cheap and everywhere. A cross-city ride rarely exceeds €8.`
    },

    money: {
      title: "Money & Payments",
      content: `**Cards work almost everywhere**—Visa and Mastercard accepted at most restaurants, shops, and cafés. Tap-to-pay is common. Smaller tascas and markets may prefer cash.

Keep **€20–40** on hand for small purchases, markets, and tipping.

**Tipping:** Not required but appreciated. Round up at restaurants or leave €1–2 for good service. Cafés: small change is fine. No one tips at the counter.

**ATMs (Multibanco):** Use bank machines—they're everywhere and fee-free for most cards. Avoid Euronet and standalone tourist machines.`
    },

    connectivity: {
      title: "Staying Connected",
      content: `**WiFi is standard**—cafés, restaurants, and hotels offer free access. Quality is generally good. Many public spaces and miradouros also have coverage.

**EU SIMs roam free.** Non-EU visitors should grab a prepaid SIM from **MEO, NOS, or Vodafone**—available at the airport or in the city. €15–20 for solid data.

**Outlets:** Type C/F, 230V. Standard European plugs.`
    },

    timing: {
      title: "Local Rhythms",
      content: `**Portugal keeps relaxed hours.** Not as late as Spain, but not early either.

**Lunch:** 12:30–2:30pm. Many places close between meals. The €10–15 "menu do dia" at local tascas is the best deal in town.

**Dinner:** 7:30–8pm is early; 9pm is normal. Kitchens close around 10:30–11pm. Fado shows start late—often 9:30pm or later.

**Shops:** 10am–7pm weekdays, shorter Saturdays. Shopping centers stay open until 11pm or midnight. Sunday closures are common for small shops.

**Cafés:** Open early (8am) for that first bica (espresso). Pastéis de nata are best fresh in the morning.`
    },

    quickWins: {
      title: "Insider Moves",
      content: `**Skip the Belém pastel queue.** Manteigaria in Chiado has better pastéis de nata with no wait.

**The 28 tram is a tourist trap.** Take the 28E or walk—Alfama is small and best explored on foot.

**Miradouros at sunset.** Graça and Portas do Sol have the best views. Bring a beer from a nearby shop.

**Ginjinha ritual.** Order a shot at A Ginjinha near Rossio—€1.50, stand at the bar, drink it in one go.

**Fado requires research.** Skip tourist dinner shows. Real fado happens in Alfama's small casas—ask locals or check Clube de Fado, Mesa de Frades.

**Sintra goes early.** Take the first train (before 9am) to beat the crowds at Pena Palace.`
    }
  },
  vienna: {
    intro: `You've arrived at Vienna International Airport. Here's the fast start—no overpriced taxis, no confusion, just the moves that make navigating this imperial city of coffee and music feel natural from day one.`,

    arrival: {
      title: "From the Airport",
      content: `**Airport → city:** The **City Airport Train (CAT)** runs every 30 min to Wien Mitte, €12 one-way (16 min, direct). The **S7 S-Bahn** is cheaper (€4.40 single, €2.40 with Vienna Card) but takes 25 min with stops. Both arrive at Wien Mitte, connected to U3/U4.

**ÖBB Railjet** trains go to Hauptbahnhof (main station) if that's more convenient for your hotel—same price as S-Bahn.

**Taxis:** Fixed fare €39 to center. Use the official taxi rank; ignore anyone approaching you inside. Uber works but isn't much cheaper.

**Pro tip:** Get a **Wiener Linien** transport pass at the airport—24-hour (€8), 48-hour (€14.10), or 72-hour (€17.10) covers unlimited travel on everything.`
    },

    gettingAround: {
      title: "Getting Around",
      content: `**The U-Bahn is superb.** 5 lines, runs 5am-midnight (24 hours Fri/Sat nights). Clean, punctual, safe. A single ticket (€2.40) is valid for one journey with transfers.

**Trams** are iconic and useful—the Ring Tram circles the Ringstrasse past major sights. Buy tickets before boarding from machines or Tabak shops.

**Walking** covers the Innere Stadt (1st district) easily—it's compact and beautiful. Most major sights are within 20 minutes of each other.

**Taxis** use meters. Uber and Bolt work well. Tipping: round up or add 10%.

**Bikes:** Vienna has excellent cycling infrastructure. City Bike Wien (WienMobil) offers free first-hour rentals.`
    },

    money: {
      title: "Money & Payments",
      content: `**Cards work almost everywhere**—Visa and Mastercard accepted at most restaurants, shops, and cafés. Contactless is common. Some traditional spots and market vendors prefer cash.

Keep **€30–50** on hand for small purchases, markets, and tips.

**Tipping:** Round up at restaurants or add 5-10% for good service. Tell the waiter the total you want to pay. Cafés: round up or leave coins. Nothing expected at counters.

**ATMs:** Bank machines throughout the city—avoid Euronet and independent machines with high fees. Austrian banks like Erste, BAWAG, and Raiffeisen are best.`
    },

    connectivity: {
      title: "Staying Connected",
      content: `**WiFi is widely available**—cafés, museums, and hotels offer free access. Many public spaces including U-Bahn stations have coverage.

**EU SIMs roam free.** Non-EU visitors should grab a prepaid SIM from **A1, Magenta, or Drei**—available at the airport or phone shops. €10–20 for solid data.

**Outlets:** Type C/F, 230V. Standard European plugs.`
    },

    timing: {
      title: "Local Rhythms",
      content: `**Vienna keeps civilized hours.** Not as late as Mediterranean cities, but not early either.

**Breakfast/Brunch:** 8–11am at cafés. The traditional Viennese breakfast is coffee, bread, jam, and maybe an egg—or go full pastry.

**Lunch:** Noon–2pm. Many restaurants offer good-value lunch menus (Mittagsmenü).

**Dinner:** 6:30–8pm start is normal. Kitchens typically close by 9:30–10pm at traditional spots; later at contemporary restaurants.

**Coffeehouses:** Open from early morning until 10pm or later. No rush—ever.

**Shops:** 9am–6pm weekdays, 9am–5pm Saturday. Most closed Sunday (except in tourist zones).

**Museums:** Usually 10am–6pm, many open late one evening per week.`
    },

    quickWins: {
      title: "Insider Moves",
      content: `**Standing-room opera is the move.** €15 for world-class performances at the Staatsoper. Arrive 80 minutes before curtain to queue.

**Coffee house etiquette:** Never rush. One coffee entitles you to stay indefinitely. Water comes automatically. Newspapers are provided.

**Grüß Gott, not Guten Tag.** Austrians say "Grüß Gott" (God greet you)—it's not religious, just local.

**Skip the Sacher line.** Hotel Sacher's café has eternal queues. Demel and Café Central serve equally excellent Sachertorte.

**Heurigen evenings.** Take the tram to Grinzing or Neustift for wine tavern evenings with local wine and buffet food. This is where Viennese actually go.

**The Ringstrasse at sunset.** Walk or take tram 1 or 2 around the Ring as buildings turn golden—free and unforgettable.`
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

  // Section accent colors - just left border + icon color
  const SECTION_ACCENTS = {
    arrival: { border: 'border-l-sky-400', icon: Plane, iconColor: 'text-sky-500' },
    gettingAround: { border: 'border-l-indigo-400', icon: Navigation, iconColor: 'text-indigo-500' },
    money: { border: 'border-l-emerald-400', icon: Wallet, iconColor: 'text-emerald-500' },
    connectivity: { border: 'border-l-amber-400', icon: Wifi, iconColor: 'text-amber-500' },
    timing: { border: 'border-l-rose-400', icon: Clock, iconColor: 'text-rose-500' },
    quickWins: { border: 'border-l-violet-400', icon: Lightbulb, iconColor: 'text-violet-500' }
  };

  // Convert markdown-style bold to JSX
  const renderContent = (content) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Editorial-style section with accent border
  const Section = ({ sectionKey, title, content }) => {
    const accent = SECTION_ACCENTS[sectionKey] || SECTION_ACCENTS.quickWins;
    const Icon = accent.icon;

    return (
      <section className={`border-l-[3px] ${accent.border} pl-5 py-1`}>
        <div className="flex items-center gap-2.5 mb-3">
          <Icon className={`h-[18px] w-[18px] ${accent.iconColor}`} />
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">{title}</h2>
        </div>
        <div className="space-y-3">
          {content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-gray-600 leading-7 text-[15px]">
              {renderContent(paragraph)}
            </p>
          ))}
        </div>
      </section>
    );
  };

  const FAQItem = ({ faq, index }) => {
    const isOpen = openFaq === index;
    return (
      <div className="border-b border-gray-100 last:border-b-0">
        <button
          onClick={() => setOpenFaq(isOpen ? null : index)}
          className="w-full py-4 flex items-start justify-between gap-4 text-left group"
        >
          <span className={`text-[15px] leading-snug transition-colors ${
            isOpen ? 'text-gray-900 font-semibold' : 'text-gray-700 font-medium group-hover:text-gray-900'
          }`}>{faq.question}</span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 mt-1 transition-all duration-200 ${
              isOpen ? 'rotate-180 text-indigo-500' : 'text-gray-400 group-hover:text-gray-600'
            }`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ease-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <p className="text-gray-600 leading-7 text-[15px] pb-4 pr-6">{faq.answer}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <article className="lg:max-w-none">
        {/* Lead - editorial pull-quote style */}
        <div className="border-l-4 border-indigo-400 pl-6 mb-10">
          <p className="text-xl md:text-[22px] text-gray-800 leading-relaxed font-medium max-w-3xl">
            {narrative.intro}
          </p>
        </div>

        {/* Two column layout with editorial sections */}
        <div className="grid lg:grid-cols-2 gap-x-10 gap-y-8">
          <Section sectionKey="arrival" title={narrative.arrival.title} content={narrative.arrival.content} />
          <Section sectionKey="gettingAround" title={narrative.gettingAround.title} content={narrative.gettingAround.content} />
          <Section sectionKey="money" title={narrative.money.title} content={narrative.money.content} />
          <Section sectionKey="connectivity" title={narrative.connectivity.title} content={narrative.connectivity.content} />
          <Section sectionKey="timing" title={narrative.timing.title} content={narrative.timing.content} />
          <Section sectionKey="quickWins" title={narrative.quickWins.title} content={narrative.quickWins.content} />
        </div>
      </article>

      {/* FAQ Section */}
      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-6">Frequently Asked Questions</h2>
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

      {/* Footer */}
      <footer className="mt-10 pt-6 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
          <span className="text-gray-500 font-medium">Plan smarter. Travel better.</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/city-guides" className="text-gray-500 hover:text-indigo-600 transition-colors font-medium">
              Browse all cities
            </Link>
            <Link href="mailto:hello@eurotrip.guide" className="text-gray-500 hover:text-indigo-600 transition-colors font-medium">
              Get support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
