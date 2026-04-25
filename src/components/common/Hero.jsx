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
  showImageOverlays = true,
  heightClass = 'min-h-[400px] lg:min-h-[480px]',
  imagePositionClass = 'object-center',
  eyebrow,
  chipText,
  metaItems = [],
  title,
  subtitle,
  description,
  primaryCta, // { label, href?, onClick?, disabled?, variant?: 'solid' | 'outline' }
  secondaryCta, // { label, href?, onClick?, variant?: 'outline' }
  insightPanel,
  actionElement // Optional React element to render next to title (e.g., save button)
}) {
  const shouldUseCityImage = !backgroundImageSrc;
  // Always call the hook, but disable its fallback preload chain for curated image sources.
  const heroImageData = useHeroImage(
    shouldUseCityImage ? cityName : undefined,
    shouldUseCityImage ? country : undefined
  );
  
  // Explicit image sources are used for curated hero art; otherwise fall back to the city image convention.
  const finalImageData = backgroundImageSrc
    ? {
        currentImageSrc: backgroundImageSrc || backgroundImageFallbacks[0] || '/images/city-placeholder.svg',
        isLoading: false,
        hasError: false,
        handleImageError: () => {},
        handleImageLoad: () => {}
      }
    : cityName && country && typeof cityName === 'string' && typeof country === 'string'
      ? heroImageData
      : {
          currentImageSrc: backgroundImageFallbacks[0] || '/images/city-placeholder.svg',
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
  const safeMetaItems = Array.isArray(metaItems) ? metaItems.filter(Boolean) : [];

  const Button = ({ cta, tone = 'light' }) => {
    if (!cta) return null;
    const base = 'inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-semibold transition-colors';
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
          sizes="100vw"
          className={`object-cover ${imagePositionClass}`}
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
      {hasValidImage && showImageOverlays && (
        <>
          {gradientOverlay && (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradientOverlay}`} />
          )}
          <div className={`absolute inset-0 ${darkOverlayOpacity}`} />
          {/* Top gradient for header blend */}
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/55 via-black/25 to-transparent pointer-events-none" />
          {/* Left gradient for text readability while keeping image visible */}
          <div className="absolute inset-y-0 left-0 w-full md:w-3/4 bg-gradient-to-r from-black/65 via-black/35 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
        </>
      )}
      
      <div className="relative z-10 h-full pt-16 sm:pt-20 md:pt-24 pb-8">
        <div className={`mx-auto grid h-full max-w-7xl items-center gap-8 px-4 sm:px-6 ${insightPanel ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
          <div className={`${hasValidImage ? 'text-white drop-shadow-lg' : 'text-zinc-900'} max-w-2xl`}>
            <div className="flex flex-wrap items-center gap-3">
              {eyebrow && (
                <span className={`inline-flex rounded-full ${hasValidImage ? 'bg-white/15 text-white ring-white/25' : 'bg-zinc-900/5 text-zinc-700 ring-zinc-900/10'} px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 backdrop-blur-sm`}>
                  {eyebrow}
                </span>
              )}
              {safeChipText && (
                <span className={`inline-flex rounded-full ${hasValidImage ? 'bg-white/15 text-white ring-white/25' : 'bg-zinc-900/5 text-zinc-700 ring-zinc-900/10'} px-3 py-1 text-xs font-semibold ring-1 backdrop-blur-sm`}>
                  {safeChipText}
                </span>
              )}
              {actionElement && (
                <div className="ml-auto sm:ml-0">{actionElement}</div>
              )}
            </div>
            {safeTitle && (
              <h1 className={`mt-5 font-extrabold tracking-tight drop-shadow-sm ${hasValidImage ? 'text-5xl sm:text-6xl md:text-7xl' : 'text-4xl md:text-5xl'}`}>{safeTitle}</h1>
            )}
            {safeSubtitle && (
              <p className={`mt-3 max-w-xl leading-tight ${hasValidImage ? 'text-2xl md:text-3xl text-white/90 drop-shadow-sm' : 'text-xl md:text-2xl text-zinc-700'}`}>{safeSubtitle}</p>
            )}
            {safeDescription && (
              <p className={`mt-5 ${hasValidImage ? 'text-white/90 drop-shadow-sm' : 'text-zinc-700'} max-w-xl text-base md:text-lg leading-7 font-medium`}>
                {safeDescription}
              </p>
            )}
            {safeMetaItems.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {safeMetaItems.map((item) => (
                  <span
                    key={`${item.label}-${item.value}`}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${hasValidImage ? 'bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-sm' : 'bg-white text-zinc-700 ring-1 ring-zinc-200'}`}
                  >
                    <span className={hasValidImage ? 'text-white/65' : 'text-zinc-500'}>{item.label}: </span>
                    {item.value}
                  </span>
                ))}
              </div>
            )}
            {(primaryCta || secondaryCta) && (
              <div className="mt-7 flex flex-wrap gap-3">
                <Button cta={primaryCta} tone={hasValidImage ? 'light' : 'dark'} />
                <Button cta={secondaryCta} tone={hasValidImage ? 'light' : 'dark'} />
              </div>
            )}
          </div>
          {insightPanel && (
            <aside className={`hidden rounded-3xl p-5 shadow-2xl ring-1 lg:block ${hasValidImage ? 'bg-white/14 text-white ring-white/20 backdrop-blur-xl' : 'bg-white text-zinc-900 ring-zinc-200'}`}>
              {insightPanel.label && (
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${hasValidImage ? 'text-white/65' : 'text-zinc-500'}`}>
                  {insightPanel.label}
                </p>
              )}
              {insightPanel.title && (
                <h2 className="mt-2 text-xl font-bold leading-tight">{insightPanel.title}</h2>
              )}
              {Array.isArray(insightPanel.items) && insightPanel.items.length > 0 && (
                <dl className="mt-5 space-y-4">
                  {insightPanel.items.map((item) => (
                    <div key={`${item.label}-${item.value}`} className={`rounded-2xl p-4 ${hasValidImage ? 'bg-white/12' : 'bg-zinc-50'}`}>
                      <dt className={`text-xs font-semibold uppercase tracking-wide ${hasValidImage ? 'text-white/60' : 'text-zinc-500'}`}>{item.label}</dt>
                      <dd className="mt-1 text-sm font-semibold">{item.value}</dd>
                      {item.detail && (
                        <dd className={`mt-1 text-xs leading-5 ${hasValidImage ? 'text-white/65' : 'text-zinc-500'}`}>{item.detail}</dd>
                      )}
                    </div>
                  ))}
                </dl>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}


