'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

/**
 * Optimized Image component with lazy loading and blur placeholder
 */
export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  priority = false,
  className = '',
  objectFit = 'cover',
  quality = 75,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} object-${objectFit}`}
        onLoadingComplete={() => setIsLoaded(true)}
        {...props}
      />
    </div>
  );
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasIntersected, options]);

  return { targetRef, isIntersecting, hasIntersected };
}

/**
 * Lazy load wrapper component
 */
export function LazyLoadWrapper({ children, placeholder = null, threshold = 0.1 }) {
  const { targetRef, hasIntersected } = useIntersectionObserver({ threshold });

  return (
    <div ref={targetRef}>
      {hasIntersected ? children : placeholder || <div className="h-32 bg-gray-100 animate-pulse rounded" />}
    </div>
  );
}

/**
 * Progressive image loader with blur effect
 */
export function ProgressiveImage({ 
  src, 
  placeholderSrc, 
  alt, 
  className = '',
  ...props 
}) {
  const [imgSrc, setImgSrc] = useState(placeholderSrc || src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
    };
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`transition-all duration-500 ${
        isLoading ? 'blur-sm scale-105' : 'blur-0 scale-100'
      } ${className}`}
      {...props}
    />
  );
}

/**
 * Image preloader utility
 */
export const preloadImages = (imageUrls) => {
  if (typeof window === 'undefined') return;
  
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Debounce utility for performance
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle utility for scroll/resize events
 */
export function useThrottle(callback, delay = 100) {
  const lastRan = useRef(Date.now());

  return (...args) => {
    if (Date.now() - lastRan.current >= delay) {
      callback(...args);
      lastRan.current = Date.now();
    }
  };
}

/**
 * Viewport size hook with throttling
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return viewport;
}

/**
 * Check if device is mobile
 */
export function useIsMobile(breakpoint = 768) {
  const { width } = useViewport();
  return width < breakpoint;
}

/**
 * Prefetch data on hover
 */
export function usePrefetch() {
  const prefetchedUrls = useRef(new Set());

  const prefetch = (url) => {
    if (prefetchedUrls.current.has(url)) return;
    
    prefetchedUrls.current.add(url);
    
    // Use Next.js router prefetch or fetch
    if (typeof window !== 'undefined') {
      fetch(url, { method: 'HEAD' }).catch(() => {});
    }
  };

  return { prefetch };
}

