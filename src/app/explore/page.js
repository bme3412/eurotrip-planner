import { getCitiesData } from "@/generated/cityIndex";
import ExploreMap from "./ExploreMap";

export const metadata = {
  title: "Explore Europe — Interactive Map",
  description:
    "Browse European cities on an interactive map. Click any city to dive in.",
};

export default async function ExplorePage({ searchParams }) {
  const destinations = getCitiesData().map((city) => ({
    id: city.id,
    title: city.name,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    description: city.description,
    thumbnail: city.thumbnail,
  }));

  // Date context handed off from the homepage "Plan Trip" flow
  // (/explore?mode=dates&start=…&end=…). When present, Explore seeds its
  // filters and ranks cities for these dates on arrival.
  const sp = (await searchParams) || {};
  const initialStart = sp.mode === "dates" && sp.start ? String(sp.start) : null;
  const initialEnd = sp.mode === "dates" && sp.end ? String(sp.end) : null;
  // ?view=list lands on the Discover list view (e.g. redirected from /results).
  const initialView = sp.view === "list" ? "list" : "map";

  return (
    <div className="h-screen w-full flex flex-col">
      <main className="flex-grow relative">
        <ExploreMap
          destinations={destinations}
          initialStart={initialStart}
          initialEnd={initialEnd}
          initialView={initialView}
        />
      </main>
    </div>
  );
}
