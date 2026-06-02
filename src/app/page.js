import dynamic from "next/dynamic";
import HomeClient from "./HomeClient";

// ISR: re-render the home page at most once per hour. Content is static, so
// an hour of staleness is fine.
export const revalidate = 3600;

// Hero V2 stays available behind ?v=2 — server-side gate, no client Suspense.
const HeroV2 = dynamic(() => import("@/components/home/v2/Hero"));

// Compute the default date range on the server so the value is identical on the
// server render and on client hydration. Computing it in the client (via
// `new Date().toISOString()`) diverges between UTC and the browser's timezone —
// most visibly on month boundaries — which caused a hydration mismatch that left
// the hero's "Plan Trip" handler detached.
function getInitialDates() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const toIso = (d) => d.toISOString().slice(0, 10);
  return { mode: "dates", start: toIso(start), end: toIso(end) };
}

export default async function Page({ searchParams }) {
  const params = (await searchParams) || {};
  if (params.v === "2") {
    return <HeroV2 />;
  }

  return <HomeClient initialDates={getInitialDates()} />;
}
