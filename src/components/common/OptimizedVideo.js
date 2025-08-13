'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const videoRef = useRef(null);

  const handleVideoLoad = () => {
    setVideoLoaded(true);
    if (onLoad) onLoad();
  };

  const handleVideoError = () => {
    setVideoError(true);
    if (onError) onError();
  };

  const handleCanPlay = async () => {
    const video = videoRef.current;
    if (video && video.paused) {
      try {
        await video.play();
      } catch (error) {
        console.log('Autoplay prevented:', error);
        setAutoplayBlocked(true);
      }
    }
  };

  const handlePlayClick = async () => {
    const video = videoRef.current;
    if (video) {
      try {
        await video.play();
        setAutoplayBlocked(false);
      } catch (error) {
        console.log('Play failed:', error);
      }
    }
  };

  return (
    <div className="relative">
      {/* Show fallback image while video is loading or if video fails */}
      {(!videoLoaded || videoError) && fallbackImage && (
        <Image
          src={fallbackImage}
          alt={alt}
          width={1920}
          height={1080}
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
          onCanPlay={handleCanPlay}
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

      {/* Autoplay blocked overlay */}
      {autoplayBlocked && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <button
            onClick={handlePlayClick}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm border border-white border-opacity-30"
          >
            <svg className="w-6 h-6 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Play Video
          </button>
        </div>
      )}
    </div>
  );
};

export default OptimizedVideo; 