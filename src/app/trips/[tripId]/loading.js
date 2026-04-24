// Route-level loading UI: shared trip skeleton
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 py-12">
      <div className="mx-auto max-w-3xl px-4 space-y-8">
        {/* Header skeleton */}
        <div className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-xl backdrop-blur">
          <div className="h-3 w-28 bg-indigo-100 rounded animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded mt-3 animate-pulse" />
          <div className="h-4 w-48 bg-slate-100 rounded mt-2 animate-pulse" />
          <div className="flex gap-2 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 w-20 bg-indigo-50 rounded-full animate-pulse" />
            ))}
          </div>
        </div>

        {/* Day cards skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-xl backdrop-blur"
          >
            {/* Day header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-indigo-100 rounded-full animate-pulse" />
              <div>
                <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-slate-100 rounded mt-1 animate-pulse" />
              </div>
            </div>

            {/* Time blocks skeleton */}
            <div className="space-y-4 mt-6">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex gap-4">
                  <div className="w-12 h-4 bg-slate-200 rounded animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-slate-100 rounded mt-1 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
