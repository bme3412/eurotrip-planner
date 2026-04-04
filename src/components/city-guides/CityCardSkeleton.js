'use client';

export default function CityCardSkeleton() {
  return (
    <div className="group relative">
      <div className="card overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Image skeleton with shimmer effect */}
        <div 
          className="relative h-48 overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 20%, #f3f4f6 40%, #f3f4f6 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite'
          }}
        >
          {/* Top left badge skeleton */}
          <div className="absolute top-3 left-3 h-7 w-24 bg-white/70 backdrop-blur-sm rounded-full"></div>
          
          {/* City name skeleton at bottom */}
          <div className="absolute bottom-4 left-4 space-y-2">
            <div className="h-6 w-28 bg-white/60 rounded"></div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="p-5">
          {/* Description lines with subtle animation */}
          <div className="space-y-2.5 mb-4">
            <div 
              className="h-3.5 rounded-full w-full"
              style={{
                background: 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 20%, #f3f4f6 40%, #f3f4f6 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: '0.1s'
              }}
            ></div>
            <div 
              className="h-3.5 rounded-full w-5/6"
              style={{
                background: 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 20%, #f3f4f6 40%, #f3f4f6 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: '0.2s'
              }}
            ></div>
          </div>
          {/* Button skeleton */}
          <div className="flex items-center justify-between">
            <div 
              className="h-4 w-24 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #dbeafe 0%, #bfdbfe 20%, #dbeafe 40%, #dbeafe 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: '0.3s'
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

