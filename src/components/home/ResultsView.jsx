'use client';

import { useRouter } from 'next/navigation';
import ResultsGrid from '../ResultsGrid';

/**
 * ResultsView — client wrapper for the /results page.
 *
 * The /results route ranks cities on the server and hands the items here.
 * ResultsGrid already owns sort state, view modes (list/plot/compare) and its
 * own header, so this wrapper only supplies the page container and the
 * "← Change dates" navigation back to the homepage.
 */
export default function ResultsView({ results, dates }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-8 md:py-10">
        <ResultsGrid
          results={results}
          dates={dates}
          onChangeDates={() => router.push('/')}
        />
      </div>
    </div>
  );
}
