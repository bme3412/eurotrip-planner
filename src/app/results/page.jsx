import { redirect } from 'next/navigation';
import { getRankedSuggestions } from '@/lib/discovery/getRankedSuggestions';
import ResultsView from '@/components/home/ResultsView';

export const runtime = 'nodejs';

// Identical date ranges are cached for an hour, mirroring /api/suggestions.
export const revalidate = 3600;

export const metadata = {
  title: 'Your ranked cities · Eurotrip Planner',
};

/**
 * /results — ranked cities for a chosen date range.
 *
 * Replaces the old homepage window-event → client-fetch → bottom-sheet-modal flow.
 * Dates arrive as query params (see serializeDates in src/hooks/useTripDates.js):
 *   /results?mode=dates&start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Ranking runs on the server via the shared getRankedSuggestions helper (no HTTP
 * round-trip), and results.js streams in behind results/loading.js.
 */
export default async function ResultsPage({ searchParams }) {
  const params = (await searchParams) || {};
  const start = typeof params.start === 'string' ? params.start : undefined;
  const end = typeof params.end === 'string' ? params.end : undefined;

  if (!start || !end) {
    redirect('/');
  }

  // V4 flat list — same request the homepage previously POSTed to /api/suggestions.
  const result = await getRankedSuggestions({
    startDate: start,
    endDate: end,
    limit: 30,
    version: 4,
    flat: true,
  });

  if (!result.ok) {
    // Invalid dates (e.g. end <= start) — send the user back to pick again.
    redirect('/');
  }

  const items = result.data?.items ?? [];

  return <ResultsView results={items} dates={{ start, end }} />;
}
