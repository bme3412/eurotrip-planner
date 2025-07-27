"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

/**
 * Interactive Header Component with Single Stable Video
 */
const InteractiveHeader = ({ 
  title = "European Travel Planner",
  subtitle = "Discover your perfect European adventure" 
}) => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);
  
  // Use a single, stable video that looks good as background
  const backgroundVideo = {
    mp4Src: "/videos/florence-pontevechio.mp4", 
    location: "Florence",
    country: "Italy"
  };

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  return (
    <header className="relative h-screen overflow-hidden">
      {/* Single Stable Video Background */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          onLoadedData={handleVideoLoad}
        >
          <source src={backgroundVideo.mp4Src} type="video/mp4" />
        </video>
        
        {/* Smooth overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="text-center text-white px-4 max-w-4xl">
          {/* Location Badge */}
          <div className="inline-flex items-center bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <span className="text-sm font-medium">
              📍 {backgroundVideo.location}, {backgroundVideo.country}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
            {title}
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl lg:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
            {subtitle}
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/start-planning"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Start Planning Your Trip
            </Link>
            
            <Link
              href="/city-guides"
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 backdrop-blur-sm border border-white border-opacity-30"
            >
              Explore Destinations
            </Link>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {!videoLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center z-30">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Loading beautiful European destinations...</p>
          </div>
        </div>
      )}
    </header>
  );
};

export default InteractiveHeader;
