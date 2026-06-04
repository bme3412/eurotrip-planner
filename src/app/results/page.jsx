import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

/**
 * /results — now folded into the unified Discover surface. The ranked grid
 * lives as the Explore "List" view (same V4 ranking), so this route just
 * preserves old links/bookmarks by redirecting to /explore?view=list.
 */
export default async function ResultsPage({ searchParams }) {
  const params = (await searchParams) || {};
  const start = typeof params.start === 'string' ? params.start : undefined;
  const end = typeof params.end === 'string' ? params.end : undefined;

  if (!start || !end) {
    redirect('/');
  }

  redirect(`/explore?mode=dates&start=${start}&end=${end}&view=list`);
}
