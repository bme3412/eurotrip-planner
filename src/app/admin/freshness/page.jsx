/**
 * Dev-only freshness dashboard.
 *
 * Reads `src/generated/freshness.json` at build/RSC time and renders a
 * per-section "last updated" matrix. Each cell has a button that POSTs to
 * `/api/admin/refresh`, which shells out to `scripts/refresh/index.mjs`.
 *
 * The page returns 404 in production so it never ships to users. To enable
 * locally, run `npm run dev` and visit /admin/freshness.
 */
import { notFound } from 'next/navigation';
import freshness from '@/generated/freshness.json';
import FreshnessTable from './FreshnessTable';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · Freshness' };

export default function FreshnessPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const rows = Object.entries(freshness)
    .map(([citySlug, value]) => ({
      citySlug,
      country: value.country,
      importedAt: value.importedAt,
      sections: value.sections || {},
    }))
    .sort((a, b) => `${a.country}/${a.citySlug}`.localeCompare(`${b.country}/${b.citySlug}`));

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Content freshness</h1>
        <p className="mt-1 text-sm text-gray-600">
          {rows.length} cities. Source: <code>src/generated/freshness.json</code>. Click a
          cell to refresh that (city, section) pair via the refresh CLI.
        </p>
      </header>
      <FreshnessTable rows={rows} />
    </main>
  );
}
