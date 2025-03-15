'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';

export default function MemoriesPage() {
  const years = Array.from({ length: 20 }, (_, i) => 2025 - i); // Most recent years first
  const [activeYearIndex, setActiveYearIndex] = useState(0);
  const [allPhotos, setAllPhotos] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  
  // Create refs for each year section properly
  const yearSectionRefs = useRef(years.map(() => React.createRef()));
  
  // Track scroll position and determine active year
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      setScrollY(scrollContainerRef.current.scrollTop);
      
      // Determine which year section is most visible
      const viewportHeight = window.innerHeight;
      const viewportMiddle = scrollY + (viewportHeight / 2);
      
      // Find which year section is most in view
      let closestSectionIndex = 0;
      let closestSectionDistance = Infinity;
      
      yearSectionRefs.current.forEach((ref, index) => {
        if (ref && ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const sectionMiddle = rect.top + (rect.height / 2);
          const distance = Math.abs(sectionMiddle - (viewportHeight / 2));
          
          if (distance < closestSectionDistance) {
            closestSectionDistance = distance;
            closestSectionIndex = index;
          }
        }
      });
      
      setActiveYearIndex(closestSectionIndex);
    };
    
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initialize with a scroll event to set the initial active year
      handleScroll();
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [scrollY]);
  
  // Load all photos when component mounts
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call to load photos for all years
    setTimeout(() => {
      const photosByYear = {};
      
      // For each year, generate sample photos
      years.forEach(year => {
        // Generate between 5-12 photos per year
        const count = Math.floor(Math.random() * 8) + 5;
        
        photosByYear[year] = Array.from({ length: count }, (_, i) => ({
          id: `${year}-${i}`,
          src: `/path/to/${year}-photo-${i}.jpg`, // This would be your actual path
          caption: `${year} European Adventure - Photo ${i + 1}`,
          location: getRandomLocation(),
          date: `${getRandomMonth()} ${year}`,
        }));
      });
      
      setAllPhotos(photosByYear);
      setIsLoading(false);
    }, 1000);
  }, []);
  
  // Scroll to a specific year section
  const scrollToYear = (index) => {
    const ref = yearSectionRefs.current[index];
    if (ref && ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  
  // Helper functions for sample data
  function getRandomLocation() {
    const locations = [
      'Paris, France', 
      'Rome, Italy', 
      'Barcelona, Spain', 
      'Amsterdam, Netherlands',
      'Vienna, Austria',
      'Prague, Czech Republic',
      'Berlin, Germany',
      'Zurich, Switzerland',
      'Lisbon, Portugal',
      'Budapest, Hungary'
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }
  
  function getRandomMonth() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[Math.floor(Math.random() * months.length)];
  }
  
  // For demonstration, using placeholder images
  const getPlaceholderImage = (index, year) => {
    // In a real app, you would use actual image paths from your data
    const imageIds = [
      '237', '238', '239', '240', '241', '242', 
      '243', '244', '245', '246', '247', '248'
    ];
    const id = imageIds[index % imageIds.length];
    return `https://picsum.photos/id/${id}/800/600`;
  };

  return (
    <div className="h-screen bg-slate-900 flex overflow-hidden">
      {/* Horizontal year selector at the top */}
      <div className="fixed top-0 left-0 right-0 bg-slate-800/90 backdrop-blur-sm flex px-2 py-3 z-30">
        <div className="flex items-center space-x-1 w-full overflow-x-auto scrollbar-none pb-1">
          {years.map((year, index) => (
            <motion.button
              key={year}
              onClick={() => scrollToYear(index)}
              className={`px-3 py-1 rounded-md text-sm transition-all duration-200 flex-shrink-0
                ${index === activeYearIndex 
                  ? 'bg-blue-500 text-white font-medium' 
                  : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {year}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Main scrollable content */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
      >
        {isLoading ? (
          <div className="h-screen flex items-center justify-center">
            <motion.div 
              className="text-white text-xl flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading your memories...
            </motion.div>
          </div>
        ) : (
          <>
            {years.map((year, yearIndex) => {
              const yearPhotos = allPhotos[year] || [];
              return (
                <section 
                  key={year}
                  ref={yearSectionRefs.current[yearIndex]}
                  className="min-h-screen snap-start relative pt-14"
                >
                  {/* Background gradient for the year section */}
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-800 opacity-80" />
                  
                  {/* Background image for the year section */}
                  {yearPhotos.length > 0 && (
                    <div className="absolute inset-0 opacity-10 bg-center bg-cover filter blur-sm" style={{
                      backgroundImage: `url(${getPlaceholderImage(0, year)})`
                    }} />
                  )}
                  
                  {/* Simple minimal year indicator */}
                  <motion.div 
                    className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm rounded-md px-3 py-1"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    viewport={{ once: false }}
                  >
                    <div className="text-sm font-medium text-slate-400">Year</div>
                    <div className="text-white text-2xl font-medium">{year}</div>
                  </motion.div>
                  
                  {yearPhotos.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-white text-lg bg-slate-800/80 rounded-lg p-6 backdrop-blur-sm">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="text-center">No memories found for {year}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="container mx-auto h-full pt-12 pb-8 px-2 sm:px-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 auto-rows-max">
                        {yearPhotos.map((photo, photoIndex) => (
                          <motion.div
                            key={photo.id}
                            className="bg-slate-800/90 backdrop-blur-sm rounded-md overflow-hidden shadow-md border border-slate-700/50"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: Math.min(photoIndex * 0.05, 0.3) }}
                            viewport={{ once: false, margin: "-50px" }}
                            whileHover={{ y: -2, scale: 1.01 }}
                          >
                            <div className="aspect-w-16 aspect-h-9">
                              <img 
                                src={getPlaceholderImage(photoIndex, year)} 
                                alt={photo.caption}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-3">
                              <h3 className="text-white font-medium text-sm sm:text-base mb-1 truncate">{photo.caption}</h3>
                              <div className="flex items-center text-xs sm:text-sm text-slate-300">
                                <span className="truncate max-w-24 sm:max-w-full">{photo.location}</span>
                                <span className="mx-1 flex-shrink-0">•</span>
                                <span className="flex-shrink-0">{photo.date}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}