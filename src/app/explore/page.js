import Link from "next/link";

import { getCitiesData } from "@/generated/cityIndex";
import ExploreMap from "./ExploreMap";

export const metadata = {
  title: "Explore Europe — Interactive Map",
  description:
    "Browse European cities on an interactive map. Click any city to dive in.",
};

export default function ExplorePage() {
  const destinations = getCitiesData().map((city) => ({
    title: city.name,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    description: city.description,
  }));

  return (
    <div className="h-screen w-full flex flex-col">
      <main className="flex-grow relative">
        <ExploreMap destinations={destinations} />

        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Link
            href="/city-guides"
            className="bg-white px-4 py-2 rounded-full shadow-md text-blue-600 font-medium hover:bg-blue-50 transition-colors"
          >
            City Guides
          </Link>
          <Link
            href="/plan"
            className="bg-white px-4 py-2 rounded-full shadow-md text-blue-600 font-medium hover:bg-blue-50 transition-colors"
          >
            Start Planning
          </Link>
        </div>
      </main>
    </div>
  );
}
