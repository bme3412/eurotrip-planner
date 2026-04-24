// Route-level loading UI: wizard skeleton for the planning page
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 sm:py-20 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-xl">
        {/* Header skeleton */}
        <div className="text-center mb-10">
          <div className="h-8 w-64 bg-slate-200 rounded-lg mx-auto animate-pulse" />
          <div className="h-4 w-80 bg-slate-100 rounded mx-auto mt-3 animate-pulse" />
        </div>

        {/* Progress bar skeleton */}
        <div className="flex items-center justify-between mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
              {i < 3 && <div className="w-12 h-1 bg-slate-200 mx-2 animate-pulse" />}
            </div>
          ))}
        </div>

        {/* Card skeleton */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-4" />
          <div className="h-4 w-72 bg-slate-100 rounded animate-pulse mb-8" />

          {/* Form field skeleton */}
          <div className="space-y-4">
            <div className="h-14 w-full bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-14 w-full bg-slate-100 rounded-xl animate-pulse" />
          </div>

          {/* Button skeleton */}
          <div className="mt-8 flex justify-end">
            <div className="h-12 w-32 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
