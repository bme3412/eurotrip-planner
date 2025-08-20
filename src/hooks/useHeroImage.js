import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for efficient hero image loading with fallbacks and preloading
 * @param {string} cityName - The city name
 * @param {string} country - The country name
 * @returns {object} Hero image data and loading state
 */
export const useHeroImage = (cityName, country) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Validate inputs
  const isValidCityName = cityName && typeof cityName === 'string';
  const isValidCountry = country && typeof country === 'string';

  // Generate image sources with priority order
  const imageSources = useMemo(() => {
    if (!isValidCityName || !isValidCountry) {
      return ['/images/city-placeholder.svg'];
    }

    return [
      `/images/city-page/${country}/${cityName}-hero.jpeg`,
      `/images/city-page/${cityName}-hero.jpeg`,
      `/images/city-page/${country}/${cityName}.jpeg`,
      `/images/city-page/${cityName}.jpeg`,
      '/images/city-placeholder.svg'
    ];
  }, [cityName, country, isValidCityName, isValidCountry]);

  const currentImageSrc = imageSources[currentImageIndex];

  // Preload next image in the fallback chain
  useEffect(() => {
    if (currentImageIndex < imageSources.length - 1) {
      const nextImage = new window.Image();
      nextImage.src = imageSources[currentImageIndex + 1];
    }
  }, [currentImageIndex, imageSources]);

  // Reset state when city/country changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setIsLoading(true);
    setHasError(false);
  }, [cityName, country]);

  const handleImageError = () => {
    if (currentImageIndex < imageSources.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  return {
    currentImageSrc,
    imageSources,
    isLoading,
    hasError,
    handleImageError,
    handleImageLoad,
    fallbackCount: imageSources.length - 1,
    currentFallbackIndex: currentImageIndex
  };
};
