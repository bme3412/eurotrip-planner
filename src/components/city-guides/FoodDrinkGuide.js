'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, MapPin, Clock, Star, Utensils, Wine, Coffee, ShoppingBag, ChefHat } from 'lucide-react';

// City-specific food & drink data (narrative prose)
const CITY_FOOD_DATA = {
  amsterdam: {
    intro: `Dutch cuisine has a reputation problem—stamppot and raw herring don't exactly set hearts racing. But modern Amsterdam has evolved into a serious food city, blending colonial influences (Indonesian rijsttafel is a national treasure), global immigration, and a new generation of chefs doing creative things with local ingredients. Here's how to eat and drink like an Amsterdammer.`,

    sections: [
      {
        title: "The Essentials",
        content: `Start your morning at a café with **koffie verkeerd** (coffee with milk, similar to a latte) and something from the pastry case—an **appelgebak** (Dutch apple pie, served warm with whipped cream) is the classic. Or grab an **uitsmijter** (fried eggs on bread with ham and cheese) for something heartier.

**Lunch** is practical. The Dutch don't linger—a quick broodje (sandwich), a bowl of soup, or something from a market stall. Albert Cuyp Market is the move for grazing: stroopwafels, kibbeling (fried fish), and fresh produce.

**Dinner** starts earlier than Mediterranean Europe—6-7pm is normal, and many kitchens close by 9:30-10pm. The Dutch eat efficiently, but the city's restaurant scene has depth. Book popular spots, especially on weekends.

**Borrel** (drinks with snacks) is the real social ritual. After work, from 5-7pm, cafés fill with people nursing beers and picking at bitterballen (fried meatballs). This is gezelligheid in action.`
      },
      {
        title: "What to Eat",
        content: `**Indonesian Rijsttafel** — The colonial legacy, now beloved: 15-25 small dishes served with rice, spanning the Indonesian archipelago. Satay, rendang, gado-gado, sambal—it's a feast. This is Amsterdam's most distinctive culinary experience. Try Blauw or Sampurna.

**Bitterballen** — Crispy fried balls of beef ragout, served with mustard. The essential borrel snack. Every brown café serves them; quality varies but the concept is foolproof.

**Stroopwafel** — Two thin waffle layers with caramel syrup between. Best fresh and warm from a market stand, balanced on your coffee cup to soften.

**Haring (Herring)** — Raw herring with onions and pickles, eaten by holding it by the tail and tilting your head back. The Dutch way. Available from fish stands across the city; Frens on Koningsplein is classic.

**Cheese** — Gouda (aged is "oude," young is "jonge"), Edam, and countless varieties. Visit a cheese shop; samples are expected. Reypenaer has a cheese tasting room.

**Frites** — Dutch fries are thick-cut and served with mayo (fritessaus) in a paper cone. Vleminckx in the center has been doing them since 1957.`
      },
      {
        title: "Where to Drink",
        content: `**Brown Cafés (Bruine Kroegen)** — The soul of Amsterdam drinking. Dark wood, Persian rugs, candles, and centuries of tobacco stains. Order a **biertje** (small beer) or **Heineken** (yes, it tastes better here). Café 't Smalle, Café Papeneiland, and Café Chris are institutions.

**Craft Beer** — The scene has exploded. Brouwerij 't IJ (in a windmill), Oedipus, and dozens more brew locally. Beer bars like Proeflokaal Arendsnest serve only Dutch beer—100+ varieties.

**Jenever** — Dutch gin's predecessor, served in tulip-shaped glasses filled to the brim. You lean down to sip the first taste—"kopstoot" (headbutt) pairs it with beer. De Drie Fleschjes and Wynand Fockink are historic jenever houses.

**Wine Bars** — Natural wine has arrived with force. Glou Glou in Oost and Worst Wijncafé in De Pijp lead the scene.

**Terraces** — The Dutch obsession. The moment the sun appears, every canal-side seat fills. Don't expect fast service; you're renting the chair. This is the point.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**De Pijp** — The most food-focused neighborhood. Albert Cuyp Market anchors it (stroopwafels, cheese, herring, everything). Indonesian, Surinamese, Turkish, and trendy modern spots cluster on surrounding streets.

**Jordaan** — The charming classic. Brown cafés, cozy restaurants, and the Saturday Noordermarkt farmers' market. Less experimental, more traditional gezelligheid.

**De 9 Straatjes (Nine Streets)** — Boutique shopping meets café culture. Good for lunch spots and wine bars amid the canal-side browsing.

**Oost (East)** — Multicultural and emerging. Javaplein has Indonesian spots; Dappermarkt is less touristy than Albert Cuyp. Natural wine bars and creative restaurants are opening.

**Noord** — Across the free ferry, the industrial waterfront hosts food halls, craft breweries (Oedipus), and creative spaces. NDSM Wharf is the epicenter.

**Foodhallen** — Indoor food market in a former tram depot (Oud-West). Multiple vendors from burgers to bao to oysters. Good for groups who can't agree on cuisine.`
      },
      {
        title: "Practical Tips",
        content: `**Reservations** — Essential for dinner at popular restaurants, especially weekends. The Fork app works well; some places only take calls or walk-ins.

**Tipping** — Not expected or required. Round up for good service; 5-10% at nicer restaurants is generous but optional. Service is never added automatically.

**Kitchen Hours** — Dutch kitchens close early. 9:30-10pm is often last order. Plan accordingly.

**Cash vs Card** — Many places are card-only now. The Dutch love contactless payment. Carry some cash for markets and traditional spots.

**Brown Café Rules** — Order at the bar or from your seat, depending on the place. Rounds are expected in groups. Don't ask for cocktails in a beer café.

**Coffeeshops** — Not coffee. If you partake, buy something and don't photograph inside. No alcohol served. Green means cannabis; brown cafés mean beer.`
      }
    ],

    highlights: [
      { name: "Indonesian Rijsttafel", type: "Meal", neighborhood: "De Pijp / Centrum", time: "Dinner" },
      { name: "Borrel at a Brown Café", type: "Drink", neighborhood: "Jordaan", time: "5-7pm" },
      { name: "Albert Cuyp Market Grazing", type: "Experience", neighborhood: "De Pijp", time: "Morning" },
      { name: "Fresh Stroopwafel", type: "Snack", neighborhood: "Any market", time: "Anytime" },
      { name: "Jenever at Wynand Fockink", type: "Drink", neighborhood: "Centrum", time: "Afternoon" },
      { name: "Craft Beer at Brouwerij 't IJ", type: "Drink", neighborhood: "Oost", time: "Afternoon" }
    ]
  },
  rome: {
    intro: `Roman cuisine is built on simplicity, tradition, and the stubborn belief that the old ways are best. Four pastas, a handful of classic dishes, and an unwavering commitment to seasonal ingredients—this is not a city for culinary innovation, and that's precisely the point. Here's how to eat like a Roman, not a tourist.`,

    sections: [
      {
        title: "The Essentials",
        content: `Start your morning at a **bar** (what Romans call a café). Stand at the counter, order a cornetto (Italian croissant, often filled with cream or jam) and a caffè (espresso). Pay at the register first, bring your receipt to the barista. Sitting at a table costs more. Cappuccino after 11am marks you as a tourist—coffee with milk is strictly a morning drink.

**Lunch** can be quick—pizza al taglio (by weight) or a supplì (fried rice ball) from a rosticceria. For a proper sit-down meal, look for a **trattoria** offering a daily menu of simple Roman dishes. Lunch runs 12:30–2:30pm; kitchens close after that.

**Dinner** is the main event. Romans eat late—8pm is early, 9pm is normal. Make reservations for popular spots, especially in Trastevere and Testaccio. Expect to linger; rushing is not Roman.`
      },
      {
        title: "What to Eat",
        content: `**The Four Pastas** — Rome's holy quartet, made with guanciale (cured pork cheek), pecorino Romano, and nothing unnecessary:
• **Carbonara** — Egg, guanciale, pecorino, black pepper. No cream, ever.
• **Cacio e Pepe** — Just pecorino and black pepper. Deceptively simple, hard to perfect.
• **Amatriciana** — Tomato, guanciale, pecorino. Originally from Amatrice.
• **Gricia** — The "white amatriciana." Guanciale and pecorino without tomato.

**Beyond Pasta** — Saltimbocca (veal with prosciutto and sage), carciofi alla romana (braised artichokes), trippa alla romana (tripe in tomato sauce), coda alla vaccinara (oxtail stew). These are Testaccio classics, born in the old slaughterhouse district.

**Pizza** — Roman-style is thin, crispy, and sold by weight (al taglio) or round (tonda). Supplì (fried rice balls with mozzarella) are the essential starter.

**Jewish-Roman Cuisine** — The old Ghetto neighborhood gave Rome carciofi alla giudia (fried artichokes) and fiori di zucca (fried zucchini flowers). Not to be missed.`
      },
      {
        title: "Where to Drink",
        content: `**Aperitivo** is sacred. From 6–9pm, bars serve drinks accompanied by snacks—sometimes elaborate buffets. Order a Spritz, Negroni, or Aperol and graze. Trastevere and Pigneto are the neighborhoods for this ritual.

**Wine Bars (Enoteche)** — Rome's wine bar culture is excellent. Order by the glass, pair with cheese and cured meats. Roscioli, Il Goccetto, and Ai Tre Scalini are institutions.

**Negroni** — Invented in Florence but adopted by Rome. Equal parts gin, Campari, and sweet vermouth. Order it anywhere that takes cocktails seriously.

**House Wine** — At trattorias, the vino della casa (house wine) is almost always a good value—usually a simple Frascati or Castelli Romani white, or a Montepulciano red. €3-5 per carafe.

**After Dinner** — A digestivo is traditional. Amaro (bitter herbal liqueur), limoncello, or grappa. Espresso comes before dessert, not after—order "caffè" and it will arrive.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Trastevere** — The classic choice, cobblestoned and atmospheric. Crowded with tourists but still delivering excellent trattorias if you choose carefully. Avoid the main drag (Viale di Trastevere) and explore the quieter side streets.

**Testaccio** — The traditional Roman food neighborhood, built around the old slaughterhouse. This is where cucina romana was born—offal dishes, classic pastas, and authentic trattorias. Less touristy, more local.

**Monti** — Hip, young, and increasingly excellent. Wine bars, modern trattorias, and some of the city's most creative cooking. Narrow streets perfect for wandering.

**Jewish Ghetto** — Small but essential. Fried artichokes, Jewish-Roman cuisine, and historic bakeries. Restaurants here are pricey but deliver.

**Centro Storico** — Tourist traps abound near Piazza Navona and the Pantheon. Walk 2-3 blocks away and quality improves dramatically. Don't eat anywhere with a photo menu.

**Pigneto** — East of the center, younger and edgier. Street art, aperitivo bars, and restaurants that feel like discoveries.`
      },
      {
        title: "Practical Tips",
        content: `**Coperto** — The €1-3 cover charge on your bill is standard, not a scam. It covers bread and table service.

**Tipping** — Not expected or required. Round up for exceptional service; €2-3 at a nice restaurant is generous. Service is never added automatically.

**Reservations** — Essential for popular spots, especially weekends. Many restaurants respond on WhatsApp now.

**Don't Order** — Fettuccine Alfredo (American invention), spaghetti with meatballs (not Roman), or cappuccino after noon (tourist move). Chicken on pasta doesn't exist here.

**Do Order** — Carciofi when in season (fall and spring). The pasta your waiter recommends. House wine by the carafe. Supplì before your meal.

**The Check** — Won't come until you ask. "Il conto, per favore." Lingering is expected.`
      }
    ],

    highlights: [
      { name: "Standing Espresso at a Bar", type: "Experience", neighborhood: "Any", time: "Morning" },
      { name: "The Four Pastas", type: "Meal", neighborhood: "Testaccio / Trastevere", time: "Dinner" },
      { name: "Aperitivo in Trastevere", type: "Drink", neighborhood: "Trastevere", time: "6-8pm" },
      { name: "Pizza al Taglio", type: "Meal", neighborhood: "Any (Bonci at Mercato Trionfale is legendary)", time: "Lunch" },
      { name: "Supplì at a Rosticceria", type: "Snack", neighborhood: "Any", time: "Anytime" },
      { name: "Carciofi alla Giudia", type: "Dish", neighborhood: "Jewish Ghetto", time: "Lunch or dinner" }
    ]
  },
  barcelona: {
    intro: `Barcelona isn't just a food city—it's a city that revolves around eating and drinking as social ritual. From morning café con leche to midnight pintxos, from vermut hour to 11pm suppers, the rhythm of meals dictates everything. Here's how to eat like a local, not a tourist.`,

    sections: [
      {
        title: "The Essentials",
        content: `Start your morning at a neighborhood **bar** (not a café). Order a café con leche (espresso with milk) and a croissant or bikini (toasted ham and cheese sandwich). Standing at the bar is cheaper and more local—sitting at a terrace adds €1-2.

**Lunch** is the main event. Between 1:30–3:30pm, restaurants serve the **menú del día**—a full three-course meal with bread, wine, and coffee for €12-18. This is the best deal in Barcelona dining. Don't miss it.

**Dinner** starts late. Showing up at 7pm marks you as a confused tourist. 9pm is normal; 10pm is not unusual. Kitchens often close by 11:30pm, so plan accordingly. Tapas bars are more flexible, opening around 8pm and staying busy until midnight.`
      },
      {
        title: "What to Eat",
        content: `**Tapas** — Small shared plates meant for grazing with drinks. Order 2-3 per person: patatas bravas (fried potatoes with spicy sauce), jamón ibérico, croquetas, gambas al ajillo (garlic shrimp), pa amb tomàquet (bread rubbed with tomato).

**Pintxos** — Basque-style small bites on toothpicks, typically lined up on the bar. Point at what you want, keep the sticks to tally your bill. Better in San Sebastián, but Barcelona does them well.

**Paella & Rice Dishes** — Authentic paella is from Valencia, but Barcelona does excellent arroz dishes. Try **fideuà** (like paella but with noodles) or **arroz negro** (squid ink rice) at beachfront restaurants. Avoid anywhere with photos on the menu.

**Seafood** — Barceloneta's chiringuitos (beach bars) serve grilled fish, mussels, and razor clams. **La Boqueria** market has the freshest variety—eat at the stalls inside.

**Catalan Classics** — Escalivada (roasted vegetables), botifarra amb mongetes (sausage with white beans), esqueixada (salt cod salad), crema catalana (Catalan crème brûlée).`
      },
      {
        title: "Where to Drink",
        content: `**Vermut** is sacred. On weekend mornings (noon–2pm), barceloneses gather at bodegas for house vermouth on tap, olives, and tinned seafood. Bar Calders, Morro Fi, and El Maravillas are legendary. This is the city's best tradition—don't skip it.

**Wine Bars** have multiplied. Natural wine has arrived with force. Can Cisa/Bar Brutal in El Born pioneered the scene; La Pepita in Gràcia and Bar Mut in Eixample follow suit.

**Cava** (Catalan sparkling wine) is local pride. Order a copa at any bar—it's cheaper and often better than champagne.

**Cocktails** thrive in El Born and Raval. Dry Martini is a Barcelona institution; Paradiso and Two Schmucks rank among the world's best. Expect €12-16 per drink.

**Late-night bodegas** stay open until 2-3am in Gràcia and El Born, serving drinks and simple tapas to locals spilling onto the streets. This is Barcelona at its best.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**El Born** — The current epicenter. Wine bars, inventive tapas, Basque pintxos, and the city's trendiest openings. Narrow medieval streets packed with options.

**Gràcia** — Village-like neighborhood with local bodegas, vermut bars, and excellent value. Mercat de l'Abaceria has good food stalls. Less touristy, more residential.

**Gothic Quarter** — Tourist traps line the main streets, but hidden gems exist on the back alleys. Avoid anything on La Rambla or with aggressive hosts outside.

**Barceloneta** — Beach neighborhood for seafood. Chiringuitos and old-school marisquerías serve the freshest fish. Can Paixano (La Xampanyeria) is legendary for cava and cured ham.

**La Boqueria Market** — Iconic but crowded. Go before 10am for the real experience, or try the less-touristy **Mercat de Sant Antoni** instead.

**Raval** — Multicultural, edgy, improving. Excellent Middle Eastern and Southeast Asian food alongside creative modern Catalan. Skip the darker streets at night.`
      },
      {
        title: "Practical Tips",
        content: `**Reservations** — Essential for popular restaurants, especially on weekends. Use the restaurant's website or call directly; most respond on WhatsApp now.

**Tipping** — Not expected or required. Round up for good service; €2-3 at a nice restaurant is generous. Nobody tips at tapas bars.

**Pa amb tomàquet** — Bread rubbed with tomato arrives automatically. It's fundamental. Use it liberally.

**Water** — Tap water is safe but tastes chlorinated. Most locals order bottled, but "agua del grifo" (tap water) is free if you ask.

**The check** — Waiters won't bring it unsolicited. Say "la cuenta, por favor" when ready. Lingering is normal and welcome.

**Siesta still exists.** Many smaller restaurants close 4–8pm. Plan accordingly.`
      }
    ],

    highlights: [
      { name: "Vermut at a Bodega", type: "Drink", neighborhood: "Gràcia / Poble Sec", time: "12-2pm weekends" },
      { name: "Menú del Día Lunch", type: "Meal", neighborhood: "Any neighborhood", time: "1:30-3pm" },
      { name: "La Boqueria Market", type: "Experience", neighborhood: "La Rambla", time: "Before 10am" },
      { name: "Tapas Crawl in El Born", type: "Experience", neighborhood: "El Born", time: "8-11pm" },
      { name: "Seafood in Barceloneta", type: "Meal", neighborhood: "Barceloneta", time: "Lunch" },
      { name: "Cava at Can Paixano", type: "Drink", neighborhood: "Barceloneta", time: "Evening" }
    ]
  },
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
