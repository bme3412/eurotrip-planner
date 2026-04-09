'use client';

import React, { useState, useRef, useEffect } from 'react';

/**
 * LazySection - Renders children only when section enters viewport
 *
 * @param {React.ReactNode} children - Content to render when visible
 * @param {React.ReactNode} skeleton - Placeholder to show before visible
 * @param {string} rootMargin - IntersectionObserver root margin (default: '200px')
 * @param {number} threshold - IntersectionObserver threshold (default: 0)
 * @param {boolean} disabled - If true, renders children immediately
 * @param {string} className - Additional classes for the wrapper
 * @param {function} onVisible - Callback when section becomes visible
 */
const LazySection = ({
  children,
  skeleton = null,
  rootMargin = '200px',
  threshold = 0,
  disabled = false,
  className = '',
  onVisible,
}) => {
  const [isVisible, setIsVisible] = useState(disabled);
  const [hasBeenVisible, setHasBeenVisible] = useState(disabled);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (disabled || hasBeenVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [disabled, hasBeenVisible, rootMargin, threshold, onVisible]);

  return (
    <div ref={sectionRef} className={className}>
      {hasBeenVisible ? children : skeleton}
    </div>
  );
};

export default LazySection;
