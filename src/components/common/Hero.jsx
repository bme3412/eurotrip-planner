'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Reusable hero section with optional background image and overlay.
 * Keeps typography and spacing consistent across pages.
 */
export default function Hero({
  backgroundImageSrc,
  backgroundAlt = '',
  gradientOverlay = 'from-fuchsia-600/40 via-pink-600/40 to-rose-600/40',
  darkOverlayOpacity = 'bg-black/30',
  heightClass = 'h-[62vh] min-h-[460px]',
  chipText,
  title,
  subtitle,
  description,
  primaryCta, // { label, href?, onClick?, disabled?, variant?: 'solid' | 'outline' }
  secondaryCta // { label, href?, onClick?, variant?: 'solid' | 'outline' }
}) {
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
      {backgroundImageSrc && (
        <Image src={backgroundImageSrc} alt={backgroundAlt} fill className="object-cover" priority />
      )}
      {/* Overlays */}
      {backgroundImageSrc && (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientOverlay}`} />
          <div className={`absolute inset-0 ${darkOverlayOpacity}`} />
        </>
      )}
      <div className="relative z-10 h-full">
        <div className="mx-auto max-w-6xl h-full flex items-center px-6">
          <div className={`${backgroundImageSrc ? 'text-white' : 'text-zinc-900'} max-w-3xl`}>
            {chipText && (
              <span className={`inline-block rounded-full ${backgroundImageSrc ? 'bg-white/20 text-white' : 'bg-zinc-900/5 text-zinc-700'} px-4 py-2 text-sm font-medium backdrop-blur-sm`}>
                {chipText}
              </span>
            )}
            {title && (
              <h1 className={`mt-4 font-extrabold tracking-tight ${backgroundImageSrc ? 'text-5xl md:text-7xl' : 'text-4xl md:text-5xl'}`}>{title}</h1>
            )}
            {subtitle && (
              <p className={`mt-2 ${backgroundImageSrc ? 'text-2xl md:text-3xl text-white/90' : 'text-xl md:text-2xl text-zinc-700'}`}>{subtitle}</p>
            )}
            {description && (
              <p className={`mt-6 ${backgroundImageSrc ? 'text-white/90' : 'text-zinc-700'} text-base md:text-lg`}>{description}</p>
            )}
            {(primaryCta || secondaryCta) && (
              <div className="mt-8 flex flex-wrap gap-3">
                <Button cta={primaryCta} tone={backgroundImageSrc ? 'light' : 'dark'} />
                <Button cta={secondaryCta} tone={backgroundImageSrc ? 'light' : 'dark'} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


