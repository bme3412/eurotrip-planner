export async function POST(request) {
  const { dates } = await request.json();
  const monthKey = (() => {
    if (dates?.mode === "month" && dates.month) return Number(dates.month.split("-")[1]);
    if (dates?.start) return Number(dates.start.split("-")[1]);
    return new Date().getMonth() + 1;
  })();

  const seed = (monthKey % 12) + 1;
  const base = [
    {
      id: "1",
      title: "Amalfi Coast, Italy",
      subtitle: "Cliffside villages, coastal hikes, and lemon groves.",
      tags: ["Beaches", "Scenic", "Foodie"],
      score: 9.6 - Math.abs(seed - 6) * 0.2,
      popularity: 92,
      value: 70,
      image: "https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?q=80&w=1200&auto=format&fit=crop",
      why: "Ideal sea temps and shoulder‑season crowds.",
    },
    {
      id: "2",
      title: "Edinburgh Fringe, Scotland",
      subtitle: "World’s largest arts festival across the city.",
      tags: ["Festivals", "Culture", "Nightlife"],
      score: 9.4 - Math.abs(seed - 8) * 0.3,
      popularity: 95,
      value: 60,
      image: "https://images.unsplash.com/photo-1544989164-31dc3c645987?q=80&w=1200&auto=format&fit=crop",
      why: "Peak festival energy with long daylight hours.",
    },
    {
      id: "3",
      title: "Azores, Portugal",
      subtitle: "Volcanic lakes, whale watching, and lush trails.",
      tags: ["Nature", "Adventure", "Remote"],
      score: 9.1 - Math.abs(seed - 5) * 0.25,
      popularity: 75,
      value: 82,
      image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop",
      why: "Green season landscapes and flight deals.",
    },
    {
      id: "4",
      title: "Munich Oktoberfest, Germany",
      subtitle: "Iconic beer tents and Bavarian folk culture.",
      tags: ["Festivals", "Culture"],
      score: 9.3 - Math.abs(seed - 9) * 0.35,
      popularity: 98,
      value: 55,
      image: "https://images.unsplash.com/photo-1603398749947-8500f2e90b3f?q=80&w=1200&auto=format&fit=crop",
      why: "Once‑a‑year event timed to late Sep–Oct.",
    },
    {
      id: "5",
      title: "Madeira, Portugal",
      subtitle: "Levadas, dramatic coastlines, and eternal spring.",
      tags: ["Hiking", "Mild Weather", "Scenery"],
      score: 8.9 - Math.abs(seed - 4) * 0.2,
      popularity: 70,
      value: 85,
      image: "https://images.unsplash.com/photo-1521292270410-a8c0b0d7b903?q=80&w=1200&auto=format&fit=crop",
      why: "Reliable weather and shoulder‑season pricing.",
    },
  ];

  await new Promise((r) => setTimeout(r, 450));

  return new Response(
    JSON.stringify({ items: base.sort((a, b) => b.score - a.score) }),
    { headers: { "Content-Type": "application/json" } }
  );
}

