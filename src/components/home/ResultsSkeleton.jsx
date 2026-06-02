/**
 * ResultsSkeleton — shimmer placeholder for the ranked-results grid.
 *
 * Shared by the /results route's loading.js (shown instantly on navigation while
 * the server ranks cities) so the loading state matches the real grid's layout.
 */
export default function ResultsSkeleton({ cards = 6 }) {
  return (
    <div className="pt-6">
      <div className="h-14 bg-amber-50 border border-amber-100 rounded-2xl animate-pulse mb-6" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden border border-gray-100 animate-pulse"
          >
            <div className="h-44 bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-14 bg-amber-50 rounded-xl" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
