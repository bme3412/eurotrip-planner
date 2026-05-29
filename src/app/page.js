import dynamic from "next/dynamic";
import HomeClient from "./HomeClient";

// ISR: re-render the home page at most once per hour. Content is static, so
// an hour of staleness is fine.
export const revalidate = 3600;

// Hero V2 stays available behind ?v=2 — server-side gate, no client Suspense.
const HeroV2 = dynamic(() => import("@/components/home/v2/Hero"));

export default async function Page({ searchParams }) {
  const params = (await searchParams) || {};
  if (params.v === "2") {
    return <HeroV2 />;
  }

  return <HomeClient />;
}
