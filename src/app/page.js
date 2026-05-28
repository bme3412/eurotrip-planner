import dynamic from "next/dynamic";
import HomeClient from "./HomeClient";
import { getHomeData } from "./_data/getHomeData";

// ISR: re-render the home page at most once per hour. The ranking snapshot
// is essentially static day-to-day, so an hour of staleness is fine.
export const revalidate = 3600;

// Hero V2 stays available behind ?v=2 — server-side gate, no client Suspense.
const HeroV2 = dynamic(() => import("@/components/home/v2/Hero"));

export default async function Page({ searchParams }) {
  const params = (await searchParams) || {};
  if (params.v === "2") {
    return <HeroV2 />;
  }

  const initialData = await getHomeData();
  return <HomeClient initialData={initialData} />;
}
