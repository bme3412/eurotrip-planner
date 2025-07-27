'use client';

import React, { useState } from 'react';

const HeaderSection = ({ 
  title, 
  subtitle, 
  videoSrc, 
  overlayOpacity = 0.5,
  height = 'auto',  // 'auto', 'full', or specific height like '500px'
  showPauseButton = false,
  animatedText = false,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const defaultVideoSrc = '/videos/compressed/florence-pontevechio.mp4';
  const videoSource = videoSrc || defaultVideoSrc;
  
  // Calculate height
  let heightClass = "py-24"; // Default padding
  if (height === 'full') {
    heightClass = "h-screen";
  } else if (height !== 'auto') {
    // This will be handled with inline style
  }
  
  // Toggle video playback
  const togglePlayPause = () => {
    const video = document.getElementById('background-video');
    if (isPaused) {
      video.play();
    } else {
      video.pause();
    }
    setIsPaused(!isPaused);
  };

  return (
    <header 
      className={`relative overflow-hidden ${heightClass}`}
      style={height !== 'auto' && height !== 'full' ? { height } : {}}
    >
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <video
          id="background-video"
          autoPlay
          loop
          muted
          playsInline
          className="absolute min-w-full min-h-full object-cover w-full h-full"
        >
          <source src={videoSource} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Dark overlay to ensure text is readable */}
        <div 
          className={`absolute inset-0 bg-black z-10`}
          style={{ opacity: overlayOpacity }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className={`text-5xl font-extrabold tracking-tight text-white ${
          animatedText ? 'animate-fade-in' : ''
        }`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-6 text-xl text-white ${
            animatedText ? 'animate-slide-up delay-300' : ''
          }`}>
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Optional play/pause button */}
      {showPauseButton && (
        <button 
          onClick={togglePlayPause}
          className="absolute bottom-4 right-4 z-30 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 text-white transition-all duration-300"
        >
          {isPaused ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          )}
        </button>
      )}
    </header>
  );
};

export default HeaderSection;