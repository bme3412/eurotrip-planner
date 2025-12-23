'use client';

export default function CityCardSkeleton() {
  return (
    <div className="group relative animate-pulse">
      <div className="card overflow-hidden">
        {/* Image skeleton */}
        <div className="relative h-48 bg-gray-200">
          {/* Top left badge skeleton */}
          <div className="absolute top-3 left-3 h-7 w-24 bg-gray-300 rounded-full"></div>
          {/* Top right badge skeleton */}
          <div className="absolute top-3 right-3 h-7 w-20 bg-gray-300 rounded-full"></div>
          {/* City name skeleton */}
          <div className="absolute bottom-4 left-4 h-6 w-32 bg-gray-300 rounded"></div>
        </div>
        
        {/* Content skeleton */}
        <div className="p-5">
          {/* Description lines */}
          <div className="space-y-2 mb-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          {/* Button skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

