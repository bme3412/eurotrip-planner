import ResultsSkeleton from '@/components/home/ResultsSkeleton';

/**
 * Streamed instantly on navigation to /results while the server ranks cities.
 * Matches the real grid's layout so the swap to results is seamless.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-8 md:py-10">
        {/* Title placeholder */}
        <div className="space-y-2 mb-6">
          <div className="h-9 w-2/3 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
        </div>
        <ResultsSkeleton />
      </div>
    </div>
  );
}
