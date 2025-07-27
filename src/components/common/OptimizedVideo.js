'use client';

import React, { useState, useRef, useEffect } from 'react';

const OptimizedVideo = ({ 
  src, 
  fallbackImage, 
  alt, 
  className = "h-full w-full object-cover",
  onLoad,
  onError,
  ...props 
}) => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  const handleVideoLoad = () => {
    setVideoLoaded(true);
    if (onLoad) onLoad();
  };

  const handleVideoError = () => {
    setVideoError(true);
    if (onError) onError();
  };

  return (
    <div className="relative">
      {/* Show fallback image while video is loading or if video fails */}
      {(!videoLoaded || videoError) && fallbackImage && (
        <img
          src={fallbackImage}
          alt={alt}
          className={className}
        />
      )}

      {/* Video element */}
      {!videoError && (
        <video
          ref={videoRef}
          className={className}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          {...props}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}

      {/* Loading overlay */}
      {!videoLoaded && !videoError && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
};

export default OptimizedVideo; 