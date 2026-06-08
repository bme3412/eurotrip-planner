// Route-level loading UI: itinerary hero + day-list skeleton (light, app-congruent)
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fafaf7]">
      {/* Hero skeleton */}
      <div className="relative h-[280px] w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, #e4e4e7 0%, #f4f4f5 20%, #e4e4e7 40%, #e4e4e7 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <div className="absolute bottom-8 left-0 right-0 px-6">
          <div className="mx-auto max-w-4xl space-y-3">
            <div className="h-4 w-24 bg-white/40 rounded-full animate-pulse" />
            <div className="h-10 w-64 bg-white/50 rounded animate-pulse" />
            <div className="h-4 w-80 bg-white/40 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Book immediately section skeleton */}
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="h-4 w-40 bg-zinc-200 rounded animate-pulse mb-4" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>

        {/* Day-by-day skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
            <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse" />
            <div className="h-6 w-16 bg-zinc-100 rounded animate-pulse" />
          </div>

          {/* Day cards skeleton */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
              {/* Day header */}
              <div className="border-b border-zinc-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 bg-zinc-200 rounded animate-pulse" />
                  <div className="h-5 w-24 bg-zinc-200 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-zinc-100 rounded animate-pulse ml-auto" />
                </div>
              </div>
              {/* Time blocks */}
              <div className="px-5 py-4 space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex gap-4">
                    <div className="w-14 h-4 bg-zinc-100 rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-48 bg-zinc-200 rounded animate-pulse" />
                      <div className="h-4 w-64 bg-zinc-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
