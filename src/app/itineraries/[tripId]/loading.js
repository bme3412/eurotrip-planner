// Route-level loading UI: itinerary hero + day-list skeleton
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0c0c0e]">
      {/* Hero skeleton */}
      <div className="relative h-[280px] w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-zinc-800"
          style={{
            background: 'linear-gradient(90deg, #27272a 0%, #3f3f46 20%, #27272a 40%, #27272a 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/40 to-transparent" />
        <div className="absolute bottom-8 left-0 right-0 px-6">
          <div className="mx-auto max-w-4xl space-y-3">
            <div className="h-4 w-24 bg-white/20 rounded-full animate-pulse" />
            <div className="h-10 w-64 bg-white/30 rounded animate-pulse" />
            <div className="h-4 w-80 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Book immediately section skeleton */}
        <div className="mb-8 rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-5">
          <div className="h-4 w-40 bg-zinc-700 rounded animate-pulse mb-4" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>

        {/* Day-by-day skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="h-4 w-32 bg-zinc-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Day cards skeleton */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-800 bg-[#111113] overflow-hidden">
              {/* Day header */}
              <div className="border-b border-zinc-800 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-5 w-24 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse ml-auto" />
                </div>
              </div>
              {/* Time blocks */}
              <div className="px-5 py-4 space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex gap-4">
                    <div className="w-14 h-4 bg-zinc-800 rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-48 bg-zinc-700 rounded animate-pulse" />
                      <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
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
