/**
 * Server-side fetch of the data the homepage needs above the fold.
 *
 * Called from `src/app/page.js` (a Server Component) so the rankings are
 * inlined into the initial HTML — no client-side skeleton flash.
 *
 * The page itself sets `revalidate = 3600`, so this runs at most once
 * per hour per server instance.
 */

import { headers } from "next/headers";

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getCurrentMonthRange(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { startDate: toIso(start), endDate: toIso(end) };
}

function getNextNDaysRange(days, today = new Date()) {
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return { startDate: toIso(today), endDate: toIso(end) };
}

async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  try {
    const hdrs = await headers();
    const host = hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") || "http";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() can throw outside a request context (e.g. build time)
  }
  return `http://localhost:${process.env.PORT || 3000}`;
}

async function fetchSuggestions({ startDate, endDate, limit }) {
  const base = await getBaseUrl();
  const url = `${base}/api/suggestions?startDate=${startDate}&endDate=${endDate}&limit=${limit}&v=4&flat=true`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch (err) {
    console.warn("[getHomeData] fetchSuggestions failed:", err?.message || err);
    return [];
  }
}

export async function getHomeData() {
  const monthRange = getCurrentMonthRange();
  const monthName = new Date().toLocaleString("en-US", { month: "long" });
  const monthYear = new Date().getFullYear();

  const tickerRange = getNextNDaysRange(30);

  const [monthlyCities, tickerCities] = await Promise.all([
    fetchSuggestions({ ...monthRange, limit: 6 }),
    fetchSuggestions({ startDate: tickerRange.startDate, endDate: tickerRange.endDate, limit: 5 }),
  ]);

  return {
    monthName,
    monthYear,
    monthlyCities,
    tickerCities,
  };
}
