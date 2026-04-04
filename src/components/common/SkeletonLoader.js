'use client';

import React from 'react';

export const SkeletonCard = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}>
    <div className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer"></div>
  </div>
);

export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-4 bg-gray-200 rounded animate-pulse ${
          i === lines - 1 ? 'w-4/5' : 'w-full'
        }`}
      ></div>
    ))}
  </div>
);

export const SkeletonImage = ({ className = '', aspectRatio = '16/9' }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
    style={{ aspectRatio }}
  >
    <div className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer flex items-center justify-center">
      <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    </div>
  </div>
);

export const SkeletonAttractionCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <SkeletonImage className="w-full h-48" />
    <div className="p-4">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3 animate-pulse"></div>
      <SkeletonText lines={2} />
      <div className="flex gap-2 mt-4">
        <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
        <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
      </div>
    </div>
  </div>
);

export const SkeletonMapLoader = () => (
  <div className="relative w-full h-[600px] bg-gray-100 rounded-xl overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer"></div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🗺️</div>
        <div className="h-4 bg-gray-300 rounded w-32 mx-auto animate-pulse"></div>
      </div>
    </div>
  </div>
);

export const SkeletonTabContent = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <SkeletonAttractionCard />
      <SkeletonAttractionCard />
      <SkeletonAttractionCard />
    </div>
  </div>
);

export const SkeletonOverview = () => (
  <div className="space-y-8">
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
      <SkeletonText lines={4} />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SkeletonCard className="h-32" />
      <SkeletonCard className="h-32" />
      <SkeletonCard className="h-32" />
    </div>
  </div>
);

