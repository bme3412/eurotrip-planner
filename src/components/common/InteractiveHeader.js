import React from 'react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import TravelFilterBox from './TravelFilterBox';
import { AnimatePresence, motion } from 'framer-motion';

const InteractiveHeader = (props) => {
  // Props
  const { onSearch } = props;
  
  // State hooks
  const [hoveredVideo, setHoveredVideo] = useState(null);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Refs
  const videoRefs = useRef({});
  const transitionTimeoutRef = useRef(null);
  
  // Updated video data with new file paths (using months instead of seasons)
  const videos = [
    { id: 'video14', src: '/videos/pamplona-runningofbulls.mp4', name: 'Running of the Bulls', orientation: 'portrait', location: 'Pamplona', month: 'July', country: 'Spain', flag: '🇪🇸' },
    { id: 'video2', src: '/videos/venice-gondola.mp4', name: 'Venice Gondola', orientation: 'portrait', location: 'Venice', month: 'April', country: 'Italy', flag: '🇮🇹' },
    { id: 'video4', src: '/videos/lisbon-tram.mp4', name: 'Lisbon Tram', orientation: 'portrait', location: 'Lisbon', month: 'May', country: 'Portugal', flag: '🇵🇹' },
    { id: 'video3', src: '/videos/zurich-river-tower.mp4', name: 'Zurich River', orientation: 'portrait', location: 'Zurich', month: 'July', country: 'Switzerland', flag: '🇨🇭' },
    { id: 'video5', src: '/videos/paris-notre-dame.mp4', name: 'Notre Dame', orientation: 'portrait', location: 'Paris', month: 'October', country: 'France', flag: '🇫🇷' },
    { id: 'video6', src: '/videos/florence-pontevechio.mp4', name: 'Ponte Vecchio', orientation: 'portrait', location: 'Florence', month: 'August', country: 'Italy', flag: '🇮🇹' },
    { id: 'video7', src: '/videos/paris-seine.mp4', name: 'Seine River', orientation: 'portrait', location: 'Paris', month: 'May', country: 'France', flag: '🇫🇷' },
    { id: 'video8', src: '/videos/cote-dazur-pano.mp4', name: 'Côte d\'Azur', orientation: 'portrait', location: 'Côte d\'Azur', month: 'August', country: 'France', flag: '🇫🇷' },
    { id: 'video9', src: '/videos/piran-waterfront.mp4', name: 'Piran Waterfront', orientation: 'portrait', location: 'Piran', month: 'July', country: 'Slovenia', flag: '🇸🇮' },
    { id: 'video10', src: '/videos/paris-pont-des-arts.mp4', name: 'Pont des Arts', orientation: 'portrait', location: 'Paris', month: 'September', country: 'France', flag: '🇫🇷' },
    { id: 'video11', src: '/videos/venice-boat-taxi.mp4', name: 'Venice Boat Taxi', orientation: 'portrait', location: 'Venice', month: 'April', country: 'Italy', flag: '🇮🇹' },
    { id: 'video12', src: '/videos/ljubljana-canal.mp4', name: 'Ljubljana Canal', orientation: 'portrait', location: 'Ljubljana', month: 'June', country: 'Slovenia', flag: '🇸🇮' },
    { id: 'video13', src: '/videos/paris-saint-germain-des-pres.mp4', name: 'Saint-Germain-des-Prés', orientation: 'portrait', location: 'Paris', month: 'May', country: 'France', flag: '🇫🇷' },
  ];
  
  // Process videos (no webm support needed based on file list)
  const processedVideos = videos.map(video => ({
    ...video,
    mp4Src: video.src
  }));
  
  // State for tracking which videos are currently visible - starting with Pamplona (0), Venice (1), and Lisbon (2)
  const [visibleIndices, setVisibleIndices] = useState([0, 1, 2]);
  
  // Simplify getting the current videos
  const currentVideos = visibleIndices.map(idx => processedVideos[idx % processedVideos.length]);
  
  // Improved event handlers for smoother transitions with debounce
  const handleNextVideo = (e) => {
    if (e) e.stopPropagation();
    
    // Set direction first for a more immediate visual cue
    setDirection(1); // Set direction to right-to-left
    
    // Handle UI feedback
    setIsTransitioning(true);
    
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      // Shift all videos one position to the left
      setVisibleIndices(current => {
        return current.map(idx => (idx + 1) % processedVideos.length);
      });
      
      // Reset transitioning state after transition completes
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 200); // Even shorter duration for more responsive feedback
    });
  };
  
  const handlePrevVideo = (e) => {
    if (e) e.stopPropagation();
    
    // Set direction first for a more immediate visual cue
    setDirection(-1); // Set direction to left-to-right
    
    // Handle UI feedback
    setIsTransitioning(true);
    
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      // Shift all videos one position to the right
      setVisibleIndices(current => {
        return current.map(idx => (idx - 1 + processedVideos.length) % processedVideos.length);
      });
      
      // Reset transitioning state after transition completes
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 200); // Even shorter duration for more responsive feedback
    });
  };
  
  const handleMouseEnter = (videoId) => {
    setHoveredVideo(videoId);
  };
  
  const handleMouseLeave = () => {
    setHoveredVideo(null);
  };

  const handleSearchSubmit = (searchData) => {
    console.log('Search submitted:', searchData);
    if (onSearch) {
      onSearch(searchData);
    }
  };

  // Improved dot navigation with smoother animation handling
  const handleDotClick = (idx) => {
    // Set transitioning state for UI feedback
    setIsTransitioning(true);
    
    // Determine the direction for animation
    const currentFirstIdx = visibleIndices[0];
    const distanceRight = (idx - currentFirstIdx + processedVideos.length) % processedVideos.length;
    const distanceLeft = (currentFirstIdx - idx + processedVideos.length) % processedVideos.length;
    
    // Choose the shortest path
    const newDirection = distanceRight <= distanceLeft ? 1 : -1;
    setDirection(newDirection);
    
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      // Set new visible indices with direct assignment for better performance
      setVisibleIndices([
        idx % processedVideos.length,
        (idx + 1) % processedVideos.length,
        (idx + 2) % processedVideos.length
      ]);
      
      // Reset transitioning state after the animation completes
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 200);
    });
  };

  // More effective video preloading that works with Next.js
  useEffect(() => {
    // Use a more reliable method for video preloading
    const videoCache = {};
    
    // Create video elements for each source but don't attach to DOM
    processedVideos.forEach(video => {
      // Don't create unnecessary elements - just preload the sources
      const xhr = new XMLHttpRequest();
      xhr.open('GET', video.mp4Src, true);
      xhr.responseType = 'blob';
      
      // Use a lower priority and just get the first chunk
      xhr.setRequestHeader('Range', 'bytes=0-300000');
      xhr.send();
      
      // Store reference to avoid garbage collection
      videoCache[video.id] = xhr;
    });
    
    // Cleanup function
    return () => {
      // Abort any pending requests
      Object.values(videoCache).forEach(xhr => {
        if (xhr && xhr.readyState !== 4) {
          xhr.abort();
        }
      });
    };
  }, []);

  // Fixed video handling to address AbortError
  useEffect(() => {
    // Create a map to track which videos are currently loaded
    const loadedVideos = new Map();
    
    // Function to safely play a video with proper error handling
    const safePlayVideo = async (videoEl) => {
      if (!videoEl) return;
      
      // Ensure video is ready to play
      videoEl.muted = true;
      
      try {
        // Check if video is already playing
        if (videoEl.paused) {
          await videoEl.play();
        }
      } catch (error) {
        // Ignore AbortError as it's normal during transitions
        if (error.name !== 'AbortError') {
          console.error('Video playback error:', error);
        }
      }
    };

    // Function to load and prepare videos - more conservative approach
    const prepareVisibleVideos = async () => {
      // Focus only on visible videos - avoid excessive preloading
      for (let i = 0; i < visibleIndices.length; i++) {
        const idx = visibleIndices[i];
        const key = `video-${idx}`;
        const videoEl = videoRefs.current[key];
        
        if (videoEl) {
          // Only set source if not already loaded to prevent AbortError
          if (!loadedVideos.has(key)) {
            loadedVideos.set(key, true);
            // No need to call load() manually - the browser handles this
            // when the src is set via the source element in the JSX
          }
          
          // Play after a short delay to ensure DOM updates are complete
          setTimeout(() => {
            safePlayVideo(videoEl);
          }, 50 * i); // Stagger video playback slightly
        }
      }
    };
    
    // Schedule using RAF for smoother performance
    let frameId = requestAnimationFrame(() => {
      prepareVisibleVideos();
    });
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(transitionTimeoutRef.current);
      
      // Just pause videos rather than removing them
      // This prevents unnecessary DOM manipulations that can cause errors
      Object.values(videoRefs.current).forEach(videoEl => {
        if (videoEl && !videoEl.paused) {
          try {
            videoEl.pause();
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
      });
    };
  }, [visibleIndices]);

  // Even smoother animation variants with simplified transitions
  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.98,
      // Removed blur effect as it can cause performance issues
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.98,
    })
  };

  // Render
  return (
    <div className="relative">
      {/* Main container with fixed aspect ratio */}
      <div className="relative h-screen max-h-[800px] w-full overflow-hidden bg-gradient-to-b from-black via-slate-900 to-slate-50">
        {/* Navigation Links in upper right */}
        <div className="absolute top-6 right-8 z-20 flex space-x-6">
          <Link 
            href="/city-guides" 
            className="text-white font-semibold text-lg px-3 py-1.5 rounded backdrop-blur-sm bg-black/40 hover:bg-black/60 shadow-md transition-all duration-300"
          >
            City Guides
          </Link>
          <Link 
            href="/explore" 
            className="text-white font-semibold text-lg px-3 py-1.5 rounded backdrop-blur-sm bg-black/40 hover:bg-black/60 shadow-md transition-all duration-300"
          >
            Explore
          </Link>
          <Link 
            href="/memories" 
            className="text-white font-semibold text-lg px-3 py-1.5 rounded backdrop-blur-sm bg-black/40 hover:bg-black/60 shadow-md transition-all duration-300"
          >
            Memories
          </Link>
        </div>
        
        {/* Background video grid */}
        <div className="absolute inset-0 p-4 overflow-hidden grid grid-cols-3 grid-rows-6 gap-4">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            {currentVideos.map((video, idx) => (
              <motion.div
                key={`video-${visibleIndices[idx]}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  type: 'tween', // Changed to tween for more consistent timing
                  ease: 'easeInOut',
                  duration: 0.3  // Faster transition
                }}
                className="col-span-1 row-span-6 relative overflow-hidden rounded-xl shadow-xl"
              >
                <div 
                  className={`h-full w-full transition-all duration-500 ${
                    hoveredVideo === `video-${visibleIndices[idx]}` ? 'scale-[1.02]' : ''
                  }`}
                  onMouseEnter={() => handleMouseEnter(`video-${visibleIndices[idx]}`)}
                  onMouseLeave={handleMouseLeave}
                >
                  <video
                    key={`vid-${visibleIndices[idx]}`} 
                    ref={el => { if (el) videoRefs.current[`video-${visibleIndices[idx]}`] = el; }}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="auto"
                    poster="/videos/poster-image.jpg" // Optional: add a poster image placeholder
                  >
                    <source src={video.mp4Src} type="video/mp4" />
                    Your browser does not support video.
                  </video>
                  <div 
                    className={`absolute inset-0 bg-gradient-to-t from-black/60 to-black/20 transition-opacity duration-300 ${
                      hoveredVideo === `video-${visibleIndices[idx]}` ? 'opacity-40' : 'opacity-60'
                    }`}
                  ></div>
                  
                  {/* Caption overlay with enhanced typography and layout */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black to-transparent text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold tracking-wide">{video.location}, {video.country}</h3>
                        <p className="text-base font-medium opacity-90">{video.month}</p>
                      </div>
                      <span className="text-4xl ml-3" aria-label={`Flag of ${video.country}`}>{video.flag}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* Carousel navigation arrows - now with smoother transitions */}
        <motion.button 
          className="absolute left-8 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white/80 p-3 rounded-full text-slate-800 shadow-lg transition-all duration-300"
          onClick={handlePrevVideo}
          aria-label="Previous video"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
          initial={{ opacity: 0.8 }}
          animate={{ 
            opacity: isTransitioning ? 0.7 : 0.8,
            scale: isTransitioning ? 0.98 : 1
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </motion.button>
        
        <motion.button 
          className="absolute right-8 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white/80 p-3 rounded-full text-slate-800 shadow-lg transition-all duration-300"
          onClick={handleNextVideo}
          aria-label="Next video"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
          initial={{ opacity: 0.8 }}
          animate={{ 
            opacity: isTransitioning ? 0.7 : 0.8,
            scale: isTransitioning ? 0.98 : 1
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </motion.button>
        
        {/* Carousel indicators - now with smoother transitions */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
          {processedVideos.map((_, idx) => (
            <motion.button 
              key={`carousel-dot-${idx}`}
              onClick={() => handleDotClick(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                visibleIndices.includes(idx) 
                  ? 'bg-white' 
                  : 'bg-white/40 hover:bg-white/70'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0.7 }}
              animate={{
                scale: visibleIndices.includes(idx) ? 1.1 : 1,
                opacity: visibleIndices.includes(idx) ? 1 : 0.7,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 17
              }}
              aria-label={`View starting with video ${idx + 1}`}
            />
          ))}
        </div>
        
        {/* Filter Overlay - centered */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full max-w-md px-4 pointer-events-auto">
            <TravelFilterBox videos={videos} onSearch={handleSearchSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveHeader;