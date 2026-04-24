// Co-located static food & drink data for FoodDrinkGuide.
// City-specific food & drink data (narrative prose)
export const CITY_FOOD_DATA = {
  prague: {
    intro: `Czech cuisine is built for cold winters and long beer sessions—hearty, meaty, and unapologetically rich. Dumplings, roast pork, and sauces you'll dream about. But Prague has evolved beyond grandma's cooking: modern Czech chefs are doing creative things with traditional ingredients, and the city's beer culture remains unmatched anywhere in the world. Here's how to eat and drink like a local.`,

    sections: [
      {
        title: "The Essentials",
        content: `Start your day with **káva** (coffee) at a traditional kavárna (café)—Café Louvre and Café Slavia are historic institutions. Czech breakfast isn't elaborate; a pastry or chlebíčky (open-faced sandwiches) will do.

**Lunch** is the main meal for working Czechs. Look for **denní menu** (daily menu) at local restaurants—a soup, main course, and often a drink for 150-200 CZK. This is incredible value for a full meal. Served roughly 11am-2pm.

**Dinner** is lighter traditionally, but tourist restaurants serve full meals all evening. Reservations helpful at popular spots on weekends. Kitchens typically close by 9:30-10pm at traditional places.

**Beer is constant.** Czechs drink more beer per capita than anyone on earth. A half-liter (velké pivo) costs 40-60 CZK at local pubs, 80-120 CZK in tourist areas. You'll be asked repeatedly if you want another—they'll just bring it unless you say no.`
      },
      {
        title: "What to Eat",
        content: `**Svíčková na smetaně** — The national dish: beef sirloin in a creamy vegetable sauce, served with bread dumplings (knedlíky), cranberries, and a dollop of whipped cream. Yes, cream on meat. Trust us.

**Vepřo-knedlo-zelo** — Roast pork with dumplings and sauerkraut. The holy trinity of Czech cuisine. Simple, satisfying, and goes perfectly with beer.

**Smažený sýr** — Fried cheese. Usually Edam, breaded and deep-fried, served with tartar sauce and fries. Czech comfort food at its finest. Better than it sounds.

**Kulajda** — Creamy potato soup with dill, mushrooms, and a poached egg. The best Czech soup, especially on cold days.

**Trdelník** — The spiral pastry you'll see everywhere. Originally Slovak/Hungarian, now a tourist symbol. Good warm with cinnamon sugar; the ice cream versions are extra.

**Chlebíčky** — Open-faced sandwiches, usually from deli counters. Egg salad, ham, cheese, and mysterious but delicious mayonnaise-based concoctions.`
      },
      {
        title: "Where to Drink",
        content: `**Pivnice (Beer Halls)** — This is why you came. Traditional pubs serve Czech lagers on tap at prices that make other cities weep. U Zlatého Tygra, U Fleků (touristy but historic), and Lokál (modern but authentic) are institutions. The waiter marks your tab on a paper slip; don't lose it.

**Czech Beer** — Pilsner Urquell invented the pilsner style. Staropramen is the local Prague brew. Kozel, Budvar (the original Budweiser), and Gambrinus are reliable. Craft beer has arrived—look for Matuška and Dva Kohouti.

**Tankové Pivo** — Tank beer, unpasteurized and delivered fresh in tanks to the pub. Smoother and better than bottled. Lokál pioneered this; look for "tankové" on menus.

**Wine** — Moravia (southeastern Czechia) produces decent wine. Try it at a vinárna (wine bar). Grüner Veltliner and local reds surprise people.

**Becherovka** — The Czech herbal liqueur. Tastes like Christmas. Often served as a digestif. The Becherovka & tonic (beton) is popular.

**Slivovice** — Plum brandy. Strong (50%+), traditional, and offered with alarming frequency. One shot is cultural; three is a commitment.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Vinohrady** — The best eating neighborhood. Locals' favorite—tree-lined streets, excellent restaurants ranging from traditional to modern, and pubs where you're the only tourist. Worth the metro ride.

**Žižkov** — Gritty, authentic, and packed with old-school pubs. Less polished than Vinohrady but cheaper and more local. Great for a genuine Czech beer experience.

**Malá Strana** — Beautiful but touristy. Still some gems hidden on side streets, especially for wine bars and upscale dining. Prices higher than average.

**Old Town (Staré Město)** — Avoid the square itself. Walk 5 minutes in any direction for dramatically better value. Týnská ulička and the streets near Dlouhá have some good options.

**Karlín** — Emerging neighborhood across the river. Modern restaurants, great brunch spots, and a less touristy vibe. Worth exploring.

**Náplavka** — Riverside embankment with Saturday farmers' market. Good for daytime grazing and sunset drinks at the boat bars.`
      },
      {
        title: "Practical Tips",
        content: `**Tipping:** 10% is standard. Don't leave money on the table—tell the waiter the total you want to pay ("280" for a 250 CZK bill) when they bring the check.

**Beer etiquette:** The waiter will keep bringing beers until you say stop (or cover your glass). Check marks on your tab track consumption. Pay when leaving.

**Denní menu:** The daily lunch menu is the best value anywhere. Available at local restaurants 11am-2pm on weekdays. Three courses for ~150-200 CZK.

**Reservations:** Helpful on weekends at popular spots, otherwise usually fine to walk in.

**Old Town trap:** Any restaurant with pictures on the menu, a guy beckoning outside, or menus in 10 languages is a tourist trap. Walk further.

**Service pace:** Czech service can feel slow by American standards. This is normal—you're renting the table. Wave for the check when ready.`
      }
    ],

    highlights: [
      { name: "Svíčková at a Local Restaurant", type: "Meal", neighborhood: "Vinohrady", time: "Lunch or dinner" },
      { name: "Beer Hall Session", type: "Drink", neighborhood: "Žižkov / Old Town", time: "Evening" },
      { name: "Denní Menu Lunch", type: "Meal", neighborhood: "Any local spot", time: "11am-2pm" },
      { name: "Tank Beer at Lokál", type: "Drink", neighborhood: "Various locations", time: "Evening" },
      { name: "Náplavka Farmers Market", type: "Experience", neighborhood: "Riverside", time: "Saturday morning" },
      { name: "Coffee at Café Louvre", type: "Experience", neighborhood: "New Town", time: "Afternoon" }
    ]
  },
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
  },
  lisbon: {
    intro: `Portuguese cuisine is built on simple ingredients prepared with love—salt cod transformed a hundred ways, sardines grilled over charcoal, and pastries that make Paris jealous. Lisbon's food scene honors these traditions while a new generation of chefs pushes boundaries. Wine flows freely (cheaper than water in many spots), and meals unfold slowly because rushing is simply not done here. Here's how to eat and drink like a Lisboeta.`,

    sections: [
      {
        title: "The Essentials",
        content: `Start your morning at a **pastelaria** with a **bica** (espresso) and a warm **pastel de nata** straight from the oven—custard tarts with caramelized tops that shatter perfectly. Locals stand at the counter; tourists sit (and pay more). Either works.

**Lunch** is the main meal for working Lisboetas. Seek out **tascas** (tavern-style restaurants) offering a **prato do dia** (dish of the day) or **menu do dia** for €8-12—soup, main, drink, coffee. This is extraordinary value for home-cooked Portuguese food. Served roughly noon-3pm.

**Dinner** starts late by Northern European standards. 8pm is early; 9pm is normal. Kitchens close around 10:30-11pm. Reservations are helpful at popular spots on weekends, but many places welcome walk-ins.

**Petiscos** (Portuguese tapas) are perfect for grazing. Order several small plates—pica-pau (garlicky pork), peixinhos da horta (fried green beans), moelas (gizzards), presunto (cured ham)—and share.`
      },
      {
        title: "What to Eat",
        content: `**Bacalhau** — Salt cod, prepared 365 ways (the Portuguese will tell you). Bacalhau à Brás (shredded with eggs and potatoes), Bacalhau com Natas (baked in cream), Pastéis de Bacalhau (fried croquettes). The national obsession.

**Sardinhas Assadas** — Grilled sardines, served whole, charred and smoky. Peak season is June (Santo António festival), but available year-round at good restaurants. Eat with your hands, discard bones, repeat.

**Francesinha** — Not from Lisbon (it's a Porto thing) but available everywhere. A gut-busting sandwich of meats, covered in cheese and beer sauce, often with a fried egg on top. Hangover cure or cause—you decide.

**Bifana** — Thin pork steak in a bread roll, soaked in garlic-white wine sauce. The perfect cheap lunch. As Bifanas in Cais do Sodré is legendary.

**Pastéis de Nata** — Those custard tarts. Manteigaria in Chiado makes them fresh constantly (skip the Belém queue unless you want the historic experience).

**Queijo da Serra** — Portugal's great cheese, from sheep's milk. Soft, creamy, eaten with a spoon scooped from inside the rind. Ask at any decent restaurant.`
      },
      {
        title: "Where to Drink",
        content: `**Wine** — Portugal produces extraordinary wine at remarkable prices. A good bottle of **Alentejo** red or **Douro** is €4-8 at a wine shop, €15-20 at restaurants. **Vinho Verde** (young, slightly effervescent white) is perfect for summer afternoons. Order a **copo** (glass) at any tasca.

**Ginjinha** — Sour cherry liqueur, served in tiny chocolate cups at hole-in-the-wall bars. A Ginjinha near Rossio is the original; there are others. One euro, one shot, move on.

**Cerveja** — Super Bock and Sagres are the local lagers. Served cold as **imperial** (small draft) or **caneca** (half-liter). Portuguese beer is simple but refreshing.

**Rooftop Bars** — Lisbon's miradouros have competition from rooftop terraces. Park Bar (above a parking garage, shockingly great), Sky Bar at Tivoli, and TOPO Chiado offer views and cocktails.

**Fado Houses** — Some serve dinner; most require a drink minimum. Genuine fado isn't about the food—it's about listening. Tasca do Chico, Mesa de Frades, and Clube de Fado are authentic.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Baixa/Chiado** — Tourist central, but Manteigaria for pastéis de nata and several good traditional restaurants survive. Prices higher than elsewhere.

**Alfama** — The old quarter has traditional tascas hidden among fado houses. More authentic, fewer menus in English. Wander until something smells good.

**Bairro Alto** — Restaurant-dense and young. Great for evening grazing and bar-hopping. Quality varies; follow your nose and the locals.

**Mouraria** — Multicultural, underrated, increasingly foodie. African, Asian, and traditional Portuguese options cluster here. Zé da Mouraria is a local institution.

**Santos/Cais do Sodré** — Transformed from red-light district to restaurant row. Time Out Market is here (curated food hall, good but crowded). Surrounding streets have excellent independent spots.

**LX Factory** — Sunday market brunch spot in converted industrial space. Good for a lazy late morning with excellent coffee and creative vendors.`
      },
      {
        title: "Practical Tips",
        content: `**Tipping** — Not required but appreciated. 5-10% for good service at restaurants; rounding up is standard. Many Lisboetas leave coins on the table.

**Couvert** — Bread, olives, and cheese appear without ordering. These cost €2-5—wave them away immediately if you don't want to pay. Once touched, you're charged.

**Service pace** — Slow by American standards. This is intentional. Wave clearly for the check; the waiter won't rush you.

**Menu do Dia** — The lunch menu at local tascas is the best value in Lisbon. €8-12 for soup, main, drink, and coffee. Available weekdays, noon-3pm.

**Reservations** — Helpful at popular restaurants on weekends. Many places are first-come; arrive early (8pm) to avoid waiting.

**Alfama navigation** — GPS struggles in the labyrinth. Just wander and trust that you'll find something good. You will.`
      }
    ],

    highlights: [
      { name: "Pastel de Nata at Manteigaria", type: "Snack", neighborhood: "Chiado", time: "Morning" },
      { name: "Ginjinha Shot Standing Up", type: "Drink", neighborhood: "Rossio / Baixa", time: "Any time" },
      { name: "Menu do Dia at a Tasca", type: "Meal", neighborhood: "Alfama / Mouraria", time: "12-3pm" },
      { name: "Grilled Sardines", type: "Meal", neighborhood: "Alfama waterfront", time: "Dinner" },
      { name: "Sunset Wine at a Miradouro", type: "Drink", neighborhood: "Graça / Portas do Sol", time: "6-8pm" },
      { name: "Time Out Market Grazing", type: "Experience", neighborhood: "Cais do Sodré", time: "Evening" }
    ]
  },
  vienna: {
    intro: `Viennese cuisine is the edible legacy of an empire—Bohemian, Hungarian, Italian, and Germanic influences fused over centuries into something uniquely indulgent. Schnitzel, Sachertorte, and Tafelspitz define the tradition, but Vienna's food scene has evolved beyond museum pieces. A new generation of chefs is reimagining classics while the legendary coffeehouse culture remains gloriously unchanged. Wine flows from vineyards within city limits, and the ritual of coffee and cake remains sacred. Here's how to eat and drink like a Wiener.`,

    sections: [
      {
        title: "The Essentials",
        content: `Start your morning at a **Kaffeehaus** (coffeehouse) with a **Melange** (similar to cappuccino) and perhaps a **Kipferl** (crescent roll) or something from the pastry case. Viennese breakfast traditions are modest—coffee and bread—but the pastries tempt.

**Lunch** can be substantial or light. Look for **Mittagsmenü** (lunch menu) at traditional restaurants—two or three courses at good value. Würstelstände (sausage stands) provide quick, authentic bites.

**Dinner** starts around 6:30–7pm—earlier than Mediterranean cities. Traditional restaurants (Beisln) fill up; reservations help on weekends. Kitchens typically close by 9:30–10pm at classic spots.

**The Jause** is Vienna's afternoon snack tradition—coffee and cake, or bread with cold cuts. Embrace it around 4pm when energy flags.`
      },
      {
        title: "What to Eat",
        content: `**Wiener Schnitzel** — The definitive dish: veal pounded thin, breaded, and fried in butter until the coating billows. Traditionally served with potato salad, parsley, and lemon. Figlmüller is famous (and touristy); Schnitzelwirt and Gasthaus Pöschl are more local.

**Tafelspitz** — Boiled beef with apple-horseradish sauce and rösti potatoes. The Habsburg court's favorite—Emperor Franz Joseph ate it daily. Plachutta has made it a specialty.

**Sachertorte** — Dense chocolate cake with apricot jam, glazed in chocolate. Hotel Sacher and Demel both claim the original recipe (there was a lawsuit). Both are excellent.

**Apfelstrudel** — Apple strudel, best with thin, hand-pulled dough. Often served warm with vanilla sauce or whipped cream.

**Käsekrainer** — Cheese-filled sausage from a Würstelstand, eaten standing with mustard and a Semmel (roll). The 2am classic.

**Kaiserschmarrn** — Shredded pancake with powdered sugar and plum compote. Named for Emperor Franz Joseph (allegedly his favorite).`
      },
      {
        title: "Where to Drink",
        content: `**Coffeehouses** — Not just cafés but cultural institutions. Order a Melange, Verlängerter (elongated espresso), or Einspänner (espresso with whipped cream in a glass). Stay as long as you like—this is the tradition. Café Central, Café Sperl, Café Hawelka, and Café Prückel are landmarks.

**Wine** — Vienna is the only major city with significant vineyards within its limits. **Gemischter Satz** (field blend white) is the local specialty. Taste at **Heurigen** (wine taverns) in Grinzing, Neustift, or Nussdorf—take tram D to the end of the line.

**Beer** — Less famous than wine but solid. Ottakringer is the local brewery. Beer gardens and Gastgärten (restaurant patios) fill on warm evenings.

**Cocktails** — The scene has grown. Barfly's, Tür 7, and Roberto American Bar (Adolf Loos-designed, tiny, legendary) are classics. Hotel bars in palaces offer opulent settings.

**Spritzer** — Wine mixed with soda water. The Austrian default for casual drinking, especially in summer.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Innere Stadt (1st)** — Historic center has tourist traps but also classics: Figlmüller, Plachutta, Zum Schwarzen Kameel. Higher prices; choose carefully.

**Naschmarkt** — Vienna's legendary market. Produce, spices, cheese, olives, and restaurant stalls. Go on Saturday for the flea market extension. Arrive before noon to beat crowds.

**Neubau (7th)** — The foodie neighborhood. Contemporary restaurants, natural wine bars, and brunch spots cluster around the Spittelberg area. More creative, less traditional.

**Josefstadt (8th)** — Quieter, more residential. Traditional Beisln (bistros) that cater to locals. Excellent for authentic Viennese dining without tourist markup.

**Leopoldstadt (2nd)** — Emerging area near the Prater. Multicultural food scene, hip cafés, and the Karmelitermarkt for weekend browsing.

**Wieden (4th) / Margareten (5th)** — South of the center. Excellent neighborhood restaurants, good value, and fewer tourists. Where Viennese actually eat regularly.`
      },
      {
        title: "Practical Tips",
        content: `**Tipping:** Round up or add 5-10% at restaurants. Tell the waiter the total you want to pay when they bring the bill—don't leave money on the table.

**Coffee house rules:** No rushing. One coffee = unlimited time. Water comes automatically. Newspapers are provided. Wait for service—don't approach the counter.

**Reservations:** Helpful at popular restaurants on weekends. Traditional Beisln are often walk-in friendly.

**Sunday closures:** Many smaller restaurants close Sunday. Plan ahead or stick to hotel restaurants and tourist areas.

**Heurigen etiquette:** Order wine by the Viertel (quarter liter) or Achtel (eighth). Food is often self-service buffet. Cash preferred at traditional spots.

**Kitchen hours:** Traditional restaurants close kitchens by 9:30-10pm. Don't arrive at 9pm expecting a leisurely meal.`
      }
    ],

    highlights: [
      { name: "Coffee & Sachertorte at a Kaffeehaus", type: "Experience", neighborhood: "Café Central, Sperl, or Demel", time: "Afternoon" },
      { name: "Schnitzel at Figlmüller or Local Beisl", type: "Meal", neighborhood: "Innere Stadt / Josefstadt", time: "Lunch or Dinner" },
      { name: "Naschmarkt Grazing", type: "Experience", neighborhood: "4th district", time: "Morning (Sat for flea market)" },
      { name: "Heuriger Evening in Grinzing", type: "Drink", neighborhood: "Grinzing / Neustift", time: "Evening" },
      { name: "Würstelstand Late-Night Käsekrainer", type: "Snack", neighborhood: "Any (Bitzinger near Opera is classic)", time: "Late night" },
      { name: "Apfelstrudel Warm from the Oven", type: "Dessert", neighborhood: "Café Landtmann or Café Korb", time: "Afternoon" }
    ]
  },
  berlin: {
    intro: `Berlin's food scene is as eclectic and unpretentious as the city itself—a collision of Turkish döner culture, Vietnamese influences, modern sustainability-focused restaurants, and traditional German comfort food. This isn't a city of white tablecloths; it's a city where the best meal might come from a market stall, a converted warehouse, or a döner shop that's been perfecting the same recipe since 1972. The key is understanding that Berlin rewards the curious over the conventional.`,

    sections: [
      {
        title: "The Essentials",
        content: `Berlin operates on late rhythms. **Frühstück** (breakfast) extends until 3pm at most cafés—a cultural statement as much as a meal. Döner kebab culture runs deep; this is where the modern döner was essentially invented, and locals will debate Mustafa's vs Imren vs Rüyam with religious intensity. **Currywurst** remains the iconic street food, though visitors often find it more cultural experience than culinary revelation. For sit-down German food, look for "Kneipe" (pub-restaurants) serving schnitzel, eisbein, and kartoffelsalat to locals rather than tourist-focused Biergartens near major sights.`
      },
      {
        title: "What to Eat",
        content: `**Döner Kebab**: The Berlin döner differs from its Turkish ancestor—stuffed into bread pockets with yogurt sauce, vegetables, and spices. Skip the tourist-area versions. **Currywurst**: Sliced sausage in curry-tomato sauce. Konnopke's Imbiss has served it since 1930. **Königsberger Klopse**: East German meatballs in white caper sauce—hearty and underrated. **Vietnamese**: Dong Xuan Center and scattered Pho restaurants reflect the Vietnamese community that's been here since East German times. **Modern German**: New wave restaurants like CODA and Nobelhart & Schmutzig have put Berlin on the fine dining map with hyper-local, zero-waste approaches.`
      },
      {
        title: "Where to Drink",
        content: `Berlin's bar culture starts late (after 10pm) and runs until sunrise—literally. **Spätis** (corner shops selling beer and everything else) are where nights often begin. Craft beer has exploded via spots like BRLO, Vagabund, and Stone Brewing's Berlin outpost. For cocktails, seek out hidden bars in Kreuzberg and Neukölln. German wine remains underrated—Rieslings and Spätburgunder appear on serious wine lists. Club Mate and Fritz-Kola are the local caffeine-fuel alternatives. And remember: Berghain's bar is actually excellent, if you can get past the door.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Kreuzberg**: The heart of Turkish-German food culture, plus modern vegetarian and vegan dining. **Neukölln**: Young, diverse, affordable—international flavors from Syrian to Sudanese to Korean. **Prenzlauer Berg**: Brunch culture central, farmers markets on Sundays, family-friendly cafés. **Mitte**: Fine dining and trendy openings, but also tourist traps—choose carefully. **Wedding**: The next Neukölln—immigrant food communities, cheap eats, authentic flavors without hipster markups. **Markthalle Neun** in Kreuzberg hosts Thursday Street Food markets that capture the whole scene in one hall.`
      },
      {
        title: "Practical Tips",
        content: `Cash is king—many Berlin restaurants still don't take cards (though this is slowly changing). Tipping 10% is standard; round up for small bills. Reservations matter for popular spots but many places run first-come-first-served. Vegetarians and vegans will find Berlin exceptionally welcoming. Many restaurants offer "Mittagstisch" (lunch menu) with significantly cheaper prices. Learn to love bread—German bakery culture is exceptional and appears at every meal. Markets like Markthalle Neun, Turkish Market on Maybachufer, and Winterfeldtplatz farmers market offer the best grazing experiences.`
      }
    ],
    highlights: [
      { name: "Döner Kebab from Mustafa's or Imren", type: "Food", neighborhood: "Kreuzberg", time: "Late lunch / Late night" },
      { name: "Markthalle Neun Street Food Thursday", type: "Experience", neighborhood: "Kreuzberg", time: "Evening" },
      { name: "Späti Drinks to Start the Night", type: "Drink", neighborhood: "Any", time: "Evening" },
      { name: "Vietnamese Pho at a Prenzlauer Berg Spot", type: "Food", neighborhood: "Prenzlauer Berg", time: "Lunch" },
      { name: "Sunday Brunch with Bloody Marys", type: "Experience", neighborhood: "Prenzlauer Berg / Kreuzberg", time: "Late morning" },
      { name: "Currywurst at Konnopke's Imbiss", type: "Food", neighborhood: "Prenzlauer Berg (under U-Bahn)", time: "Lunch" }
    ]
  },
  florence: {
    intro: `Florentine cuisine is defined by restraint—the Tuscan belief that quality ingredients need minimal intervention. This is the birthplace of the Renaissance but also of ribollita, bistecca alla fiorentina, and the radical idea that bread doesn't need salt when you have exceptional olive oil. Florence doesn't chase trends; it perfects traditions. The key is understanding that the best meal often happens at family-run trattorias that haven't changed their menu in decades.`,

    sections: [
      {
        title: "The Essentials",
        content: `Florence operates on strict Italian meal rhythms. **Pranzo** (lunch) runs 12:30-2:30pm; dinner starts at 7:30pm earliest, with 8:30pm being more typical. Florentine cuisine is cucina povera elevated—humble ingredients treated with respect. The bread is intentionally saltless (pane sciocco), designed to complement rather than compete with intensely flavored Tuscan cured meats and olive oil. Restaurants often charge **coperto** (cover charge) of €2-4—this is normal and covers bread and service. Central Market (Mercato Centrale) offers excellent food hall dining upstairs but the real action is downstairs in the actual market.`
      },
      {
        title: "What to Eat",
        content: `**Bistecca alla Fiorentina**: The iconic T-bone from Chianina cattle, charred outside, ruby-red inside, served by the kilo. Sharing is expected. **Ribollita**: Bread soup with cavolo nero, cannellini beans, and vegetables—peasant food perfected. **Lampredotto**: Tripe sandwich from street carts—Florence's true street food, not for the timid. **Schiacciata**: Florentine flatbread, especially when filled with porchetta or prosciutto. **Crostini Neri**: Chicken liver pâté on toast, the essential Tuscan antipasto. **Pappa al Pomodoro**: Another bread soup, this one tomato-based, summer comfort food. **Gelato**: Florence takes gelato seriously—look for natural colors and covered containers.`
      },
      {
        title: "Where to Drink",
        content: `Tuscany means Chianti, Brunello, and Vino Nobile—serious reds that pair with the local cuisine. Many trattorias serve excellent house wine by the quarter-liter at reasonable prices. **Enotecas** (wine bars) offer tastings and deep selections. Aperitivo culture thrives from 6-9pm, when €10-12 buys a drink and access to substantial buffets—effectively a light dinner. The Oltrarno neighborhood hosts some of the city's best wine bars. Negroni was invented here (at Caffè Casoni, now Caffè Cavalli), making it the essential aperitivo order.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Sant'Ambrogio**: The locals' market, surrounded by authentic trattorias that haven't discovered tourists. **Oltrarno**: Artisan neighborhood across the Arno with excellent wine bars, traditional restaurants, and that slightly-off-the-beaten-path feeling. **San Lorenzo**: Central Market area—crowded but the market itself rewards exploration. **Santa Croce**: Mix of tourist traps and genuine trattorias; research before wandering. **Around Piazza Santo Spirito**: Evening energy, good aperitivo spots, young local crowd. Avoid the immediate Duomo surroundings for food—rent is too high for quality.`
      },
      {
        title: "Practical Tips",
        content: `Reservations essential for dinner at popular trattorias—call ahead or use TheFork app. Cover charge (coperto) is standard; service is usually included. Lunch offers better value and shorter waits. "Tourist menus" are almost always inferior—order à la carte. Ask for "acqua del rubinetto" (tap water) if you want free water, though many restaurants push bottled. Coffee is consumed standing at the bar, quickly, for about €1.20. Sitting at a table often doubles or triples the price. Learn the gelato warning signs: unnaturally bright colors, piled-high displays, and any place advertising itself to tourists. Vivoli and Gelateria dei Neri remain reliable.`
      }
    ],
    highlights: [
      { name: "Bistecca alla Fiorentina for Two", type: "Food", neighborhood: "Trattoria Mario or Buca Mario", time: "Dinner" },
      { name: "Lampredotto from a Cart", type: "Food", neighborhood: "Near Sant'Ambrogio or San Lorenzo", time: "Lunch" },
      { name: "Aperitivo on Piazza Santo Spirito", type: "Drink", neighborhood: "Oltrarno", time: "Early evening" },
      { name: "Morning Espresso Standing at the Bar", type: "Drink", neighborhood: "Any historic café", time: "Morning" },
      { name: "Mercato Centrale Downstairs Exploration", type: "Experience", neighborhood: "San Lorenzo", time: "Morning" },
      { name: "Gelato from Vivoli or Gelateria dei Neri", type: "Dessert", neighborhood: "Santa Croce area", time: "Afternoon" }
    ]
  },
  budapest: {
    intro: `Budapest's food scene bridges East and West—paprika-spiced stews meet Habsburg-era coffeehouse culture meet a new generation of chefs reinterpreting everything. This is hearty, soulful cooking: goulash that warms you from the inside, chimney cakes that shouldn't work but absolutely do, and a ruin bar culture that spawned some of Europe's most interesting casual dining. The city's thermal bath culture even extends to food—you'll find yourself craving heavy, restorative meals after hours of soaking.`,

    sections: [
      {
        title: "The Essentials",
        content: `Hungarian cuisine centers on **paprika**—not just heat but depth, sweetness, and that distinctive red color that defines the cooking. Meal structure follows Central European patterns: substantial lunch, lighter dinner, with coffee and cake filling the afternoon. The historic **kávéház** (coffeehouse) tradition rivals Vienna's—these ornate spaces serve as living rooms, offices, and cultural institutions. Tipping 10-15% is customary; many restaurants add service automatically, so check your bill. The Jewish Quarter has evolved from heritage site to the city's most dynamic dining neighborhood, though quality varies wildly.`
      },
      {
        title: "What to Eat",
        content: `**Gulyás (Goulash)**: The real thing is a soup, not a stew—paprika-beef broth with potatoes and csipetke noodles. **Pörkölt**: The actual stew, braised meat in paprika-onion sauce. **Lángos**: Deep-fried dough topped with sour cream and cheese—street food perfection, especially at markets. **Kürtőskalács (Chimney Cake)**: Spiral-cooked sweet dough rolled in sugar—the aroma is inescapable. **Töltött Káposzta**: Stuffed cabbage, especially good in winter. **Paprikás Csirke**: Chicken in paprika-sour cream sauce with nokedli (Hungarian dumplings). **Dobos Torta and Somlói Galuska**: The two essential Hungarian desserts, best at historic coffeehouses.`
      },
      {
        title: "Where to Drink",
        content: `Hungary's wine deserves more attention—**Tokaji** (sweet wines from volcanic soils), **Egri Bikavér** (Bull's Blood reds), and emerging dry whites from Villány and Balaton. The ruin bar phenomenon began at Szimpla Kert and spread globally, but originals like Szimpla, Instant, and Fogas still deliver the chaotic, unexpected energy that defines Budapest nightlife. **Pálinka** (fruit brandy) appears at traditional meals—proper versions are sophisticated, not rotgut. Craft beer has exploded via spots like Élesztő and First Craft Beer. Thermal bath bars exist—Széchenyi has Sparty events combining soaking and clubbing.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Jewish Quarter (District VII)**: Ruin bars, modern restaurants, and street food—highest density of options but also tourist markup. **Újlipótváros (District XIII)**: Local residential neighborhood with excellent everyday restaurants. **Buda Castle area**: Tourist-focused with exceptions; Baltazár and Pierrot remain reliable. **Central Market Hall**: Ground floor for produce and paprika, upstairs for lángos and quick meals. **Hold Street Market (renovated)**: Modern food hall with quality vendors. **Bartók Béla út in Buda**: Student-friendly prices, local crowds, emerging food scene.`
      },
      {
        title: "Practical Tips",
        content: `Cash preferred at traditional spots; cards work at modern restaurants. Lunch menus (napi menü) offer excellent value at local restaurants—two courses for €5-8. Paprika is the essential souvenir; buy at Central Market from dedicated spice vendors. Coffeehouses charge by time spent as well as consumption—this is traditional and expected. "Gypsy music" performances at tourist restaurants are often overpriced additions to mediocre food. The city's best modern restaurants (Costes, Borkonyha, Stand) have earned Michelin recognition without losing Hungarian identity. Forints are still preferred despite Hungary being in the EU—exchange rates at restaurants are usually unfavorable.`
      }
    ],
    highlights: [
      { name: "Real Gulyás at a Traditional Étterem", type: "Food", neighborhood: "Kéhli or Kádár Étkezde", time: "Lunch" },
      { name: "Lángos at Central Market Hall", type: "Food", neighborhood: "Central Market Hall (upstairs)", time: "Lunch" },
      { name: "Ruin Bar Hopping Starting at Szimpla", type: "Drink", neighborhood: "Jewish Quarter", time: "Evening" },
      { name: "Coffee and Cake at New York Café", type: "Experience", neighborhood: "Erzsébet körút", time: "Afternoon" },
      { name: "Wine Tasting at a Borbár", type: "Drink", neighborhood: "Various", time: "Evening" },
      { name: "Kürtőskalács Fresh from the Oven", type: "Dessert", neighborhood: "Any market or tourist area", time: "Afternoon" }
    ]
  },
  copenhagen: {
    intro: `Copenhagen invented New Nordic cuisine—the movement that put fermentation, foraging, and local seasonality at the center of modern gastronomy. But beyond the Noma phenomenon, this is a city of exceptional everyday food culture: perfect smørrebrød at lunch counters, some of the world's best bakeries, and a democratic approach to dining where quality matters more than pretension. Hot dogs and Michelin stars coexist without contradiction.`,

    sections: [
      {
        title: "The Essentials",
        content: `Danish food culture prizes quality ingredients over complex techniques. **Smørrebrød** (open sandwiches on dense rye bread) define lunch—this isn't simple food but an art form with strict rules about construction and toppings. Breakfast often means bakery runs for **wienerbrød** (the original Danish pastry) and exceptional coffee. Dinner restaurants tend toward expensive but portions are generous. The Meatpacking District (Kødbyen) has evolved from industrial slaughterhouses to the city's most dynamic dining district. Copenhagen is expensive even by Nordic standards—budget accordingly.`
      },
      {
        title: "What to Eat",
        content: `**Smørrebrød**: Dense rugbrød (rye bread) topped with herring, roast beef, egg, shrimp, or numerous other precisely arranged toppings. Not a sandwich—eaten with knife and fork. **Stegt Flæsk**: Crispy pork belly with parsley sauce and potatoes—Denmark's national dish. **Frikadeller**: Pan-fried meatballs, comfort food perfected. **Wienerbrød**: What the world calls "Danish pastries," but better at Copenhagen bakeries than anywhere else. **Pølser**: Danish hot dogs with remoulade, crispy onions, pickles—from a pølsevogn (hot dog cart). **New Nordic**: The Noma-influenced cuisine—fermentation, foraging, intense seasonality—that's spread to dozens of restaurants at various price points.`
      },
      {
        title: "Where to Drink",
        content: `Denmark's craft beer scene pioneered by Mikkeller has gone global, but the Copenhagen taprooms remain essential. Traditional pubs serve Carlsberg and Tuborg, but seek out **bodegas** for true local atmosphere—no-frills bars where regulars drink, smoke (outside now), and talk. Natural wine bars have exploded across the city. **Aquavit** (caraway-spiced spirit) accompanies traditional Danish meals, especially smørrebrød lunches. Coffee culture is exceptional—Denmark drinks more per capita than almost anywhere, and specialty roasters have raised the standard even higher.`
      },
      {
        title: "Neighborhoods for Food",
        content: `**Kødbyen (Meatpacking District)**: Industrial-chic restaurants, wine bars, nightlife—Copenhagen's coolest dining zone. **Vesterbro**: Trendy but not touristy; excellent casual dining and bars. **Nørrebro**: Multicultural, younger, emerging food scene beyond Nordic cuisine. **Torvehallerne**: Central market halls with high-quality vendors—perfect for smørrebrød and coffee. **Christianshavn**: Canal-side charm, excellent restaurants, Noma's neighborhood. **Nyhavn**: Iconic but touristy; better for drinks than food. **Refshaleøen**: Industrial island hosting Reffen street food market and innovative restaurants.`
      },
      {
        title: "Practical Tips",
        content: `Copenhagen is expensive—lunch often €20-30, dinner €50-100+ at mid-range restaurants. Reservations essential for popular spots; use the restaurant's own system or email directly. Smørrebrød restaurants often require advance ordering. Tipping is not expected (service included) but rounding up is appreciated. Cashless is nearly universal—many places won't accept cash. Lunch is often the best value for experiencing high-end restaurants. **Noma** reservations open months ahead and sell out instantly—plan early or try the wine bar. The bakery tradition rewards early risers; Hart Bageri, Juno, and Andersen & Maillard set the standard.`
      }
    ],
    highlights: [
      { name: "Traditional Smørrebrød Lunch", type: "Food", neighborhood: "Aamanns or Selma", time: "Lunch" },
      { name: "Morning Pastry Run to Hart or Juno", type: "Food", neighborhood: "Various", time: "Morning" },
      { name: "Pølser from a Classic Hot Dog Cart", type: "Food", neighborhood: "Any pølsevogn", time: "Late night" },
      { name: "Torvehallerne Market Grazing", type: "Experience", neighborhood: "Central / near Nørreport", time: "Lunch" },
      { name: "Meatpacking District Dinner", type: "Experience", neighborhood: "Kødbyen", time: "Dinner" },
      { name: "Natural Wine at a Vesterbro Bar", type: "Drink", neighborhood: "Vesterbro", time: "Evening" }
    ]
  }
};

// Default fallback
export const DEFAULT_FOOD_DATA = {
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
