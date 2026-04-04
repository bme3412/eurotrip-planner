'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useHeroImage } from '@/hooks/useHeroImage';

/**
 * Reusable hero section with optional background image and overlay.
 * Keeps typography and spacing consistent across pages.
 */
export default function Hero({
  backgroundImageSrc,
  backgroundImageFallbacks = [],
  backgroundAlt = '',
  cityName,
  country,
  gradientOverlay = null, // Set to null to disable colored overlay
  darkOverlayOpacity = 'bg-black/55',
  heightClass = 'min-h-[400px] lg:min-h-[480px]',
  chipText,
  title,
  subtitle,
  description,
  primaryCta, // { label, href?, onClick?, disabled?, variant?: 'solid' | 'outline' }
  secondaryCta, // { label, href?, onClick?, variant?: 'outline' }
  actionElement // Optional React element to render next to title (e.g., save button)
}) {
  // Always call the hook, but handle conditional logic inside
  const heroImageData = useHeroImage(cityName, country);
  
  // Use the hook result if cityName and country are provided, otherwise use props
  const finalImageData = cityName && country && typeof cityName === 'string' && typeof country === 'string'
    ? heroImageData
    : {
        currentImageSrc: backgroundImageSrc || backgroundImageFallbacks[0] || '/images/city-placeholder.svg',
        isLoading: false,
        hasError: false,
        handleImageError: () => {},
        handleImageLoad: () => {}
      };

  const currentImageSrc = finalImageData.currentImageSrc;
  const hasValidImage = currentImageSrc && currentImageSrc !== '/images/city-placeholder.svg';

  // Ensure we have valid text content
  const safeTitle = title || 'City';
  const safeSubtitle = subtitle || 'A City to Explore';
  const safeDescription = description || 'Discover the magic of this amazing city.';
  const safeChipText = chipText; // No fallback - only show if explicitly provided

  const Button = ({ cta, tone = 'light' }) => {
    if (!cta) return null;
    const base = 'px-5 py-3 rounded-lg font-medium transition-colors';
    const variants = {
      solid: tone === 'light' ? 'bg-white text-gray-900 hover:bg-zinc-100' : 'bg-blue-600 text-white hover:bg-blue-700',
      outline: tone === 'light' ? 'bg-transparent border border-white/80 text-white hover:bg-white/10' : 'bg-transparent border border-gray-300 text-gray-800 hover:bg-gray-50'
    };
    const cls = `${base} ${variants[cta.variant || 'solid']} ${cta.disabled ? 'opacity-60 pointer-events-none' : ''}`;
    if (cta.href && !cta.disabled) {
      return <Link href={cta.href} className={cls}>{cta.label}</Link>;
    }
    return (
      <button onClick={cta.onClick} disabled={!!cta.disabled} className={cls}>
        {cta.label}
      </button>
    );
  };

  return (
    <div className={`relative ${heightClass} w-full overflow-hidden rounded-none`}>
      {currentImageSrc && (
        <Image 
          src={currentImageSrc} 
          alt={backgroundAlt} 
          fill 
          className="object-cover" 
          priority 
          onError={finalImageData.handleImageError}
          onLoad={finalImageData.handleImageLoad}
        />
      )}
      
      {/* Loading indicator */}
      {finalImageData.isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      )}
      
      {/* Overlays */}
      {hasValidImage && (
        <>
          {gradientOverlay && (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradientOverlay}`} />
          )}
          <div className={`absolute inset-0 ${darkOverlayOpacity}`} />
          {/* Top gradient for header blend */}
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/60 via-black/35 to-transparent pointer-events-none" />
          {/* Left gradient for text readability while keeping image visible */}
          <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-black/45 via-black/25 to-transparent pointer-events-none" />
        </>
      )}
      
      <div className="relative z-10 h-full pt-10 sm:pt-14 md:pt-16 pb-6">
        <div className="mx-auto max-w-7xl h-full flex items-start px-4 sm:px-6">
          <div className={`${hasValidImage ? 'text-white drop-shadow-lg' : 'text-zinc-900'} max-w-3xl`}>
            {safeChipText && (
              <span className={`inline-block rounded-full ${hasValidImage ? 'bg-white/20 text-white' : 'bg-zinc-900/5 text-zinc-700'} px-4 py-2 text-sm font-medium backdrop-blur-sm`}>
                {safeChipText}
              </span>
            )}
            {safeTitle && (
              <div className="mt-6 flex items-center gap-4">
                <h1 className={`font-extrabold tracking-tight drop-shadow-sm ${hasValidImage ? 'text-4xl sm:text-5xl md:text-6xl' : 'text-4xl md:text-5xl'}`}>{safeTitle}</h1>
                {actionElement && (
                  <div className="shrink-0">{actionElement}</div>
                )}
              </div>
            )}
            {safeSubtitle && (
              <p className={`mt-2 leading-snug ${hasValidImage ? 'text-2xl md:text-3xl text-white/90 drop-shadow-sm' : 'text-xl md:text-2xl text-zinc-700'}`}>{safeSubtitle}</p>
            )}
            {safeDescription && (
              <p className={`mt-5 ${hasValidImage ? 'text-white/95 drop-shadow-sm' : 'text-zinc-700'} text-[17px] md:text-lg leading-8 md:leading-9 font-medium max-w-3xl`}>
                {safeDescription}
              </p>
            )}
            {(primaryCta || secondaryCta) && (
              <div className="mt-7 flex flex-wrap gap-3">
                <Button cta={primaryCta} tone={hasValidImage ? 'light' : 'dark'} />
                <Button cta={secondaryCta} tone={hasValidImage ? 'light' : 'dark'} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


