// Route-level loading UI: renders immediately on navigation to a city page,
// while the RSC payload (city data + static HTML) streams in from the server.
// Keeps the shell structurally similar to the real page so there's no layout
// jump when content arrives.

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumbs */}
      <div className="px-6 pt-4">
        <div className="mx-auto max-w-6xl">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="relative mt-4 h-[380px] w-full overflow-hidden bg-gray-200">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 20%, #e5e7eb 40%, #e5e7eb 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
        <div className="absolute bottom-8 left-0 right-0 px-6">
          <div className="mx-auto max-w-6xl space-y-3">
            <div className="h-6 w-28 bg-white/30 rounded-full animate-pulse" />
            <div className="h-10 w-72 bg-white/40 rounded animate-pulse" />
            <div className="h-4 w-96 max-w-full bg-white/30 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex gap-6 py-3 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-24 bg-gray-100 rounded animate-pulse flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-11/12 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-10/12 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-9/12 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-64 w-full bg-gray-100 rounded-xl animate-pulse mt-6" />
          </div>
          <div className="space-y-4">
            <div className="h-40 w-full bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-40 w-full bg-gray-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
