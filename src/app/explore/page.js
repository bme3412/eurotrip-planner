import { getCitiesData } from "@/generated/cityIndex";
import ExploreMap from "./ExploreMap";

export const metadata = {
  title: "Explore Europe — Interactive Map",
  description:
    "Browse European cities on an interactive map. Click any city to dive in.",
};

export default function ExplorePage() {
  const destinations = getCitiesData().map((city) => ({
    id: city.id,
    title: city.name,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    description: city.description,
    thumbnail: city.thumbnail,
  }));

  // Phase 3: the floating top-right "City Guides" / "Start Planning" CTAs
  // were removed. The map is the page. Per-city actions live in the
  // selected-city card; the shortlist tray (phase 5) will own the
  // persistent "start planning" affordance.
  return (
    <div className="h-screen w-full flex flex-col">
      <main className="flex-grow relative">
        <ExploreMap destinations={destinations} />
      </main>
    </div>
  );
}
