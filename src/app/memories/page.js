'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';

export default function MemoriesPage() {
  const years = Array.from({ length: 20 }, (_, i) => 2006 + i);
  const [selectedYear, setSelectedYear] = useState(2023);
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  
  // For the parallax effect - defined outside of render to follow React hooks rules
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  
  // Define transform functions early to follow React hooks rules
  const backgroundScaleTransform = useTransform(scrollYProgress, [0, 1], [1.1, 1]);
  const mainImageYTransform = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const mainImageScaleTransform = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const captionYTransform = useTransform(scrollYProgress, [0, 1], [0, 30]);
  const prevButtonXTransform = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const nextButtonXTransform = useTransform(scrollYProgress, [0, 1], [0, 30]);
  const thumbnailsYTransform = useTransform(scrollYProgress, [0, 1], [0, 50]);

  // Create a fixed set of thumbnail transforms instead of generating them dynamically
  const thumbnailTransforms = [
    useTransform(scrollYProgress, [0, 1], [0, 20]), // idx % 3 === 0
    useTransform(scrollYProgress, [0, 1], [0, 30]), // idx % 3 === 1
    useTransform(scrollYProgress, [0, 1], [0, 40])  // idx % 3 === 2
  ];

  // Sample photo data - in a real app you would fetch this from an API or data file
  // organized by year
  useEffect(() => {
    // Simulate loading photos for the selected year
    setIsLoading(true);
    
    // This would normally be an API call or data import
    setTimeout(() => {
      // Generate sample photos for the selected year
      const samplePhotos = Array.from({ length: 12 }, (_, i) => ({
        id: `${selectedYear}-${i}`,
        src: `/path/to/${selectedYear}-photo-${i}.jpg`, // This would be your actual path
        caption: `${selectedYear} European Adventure - Photo ${i + 1}`,
        location: getRandomLocation(),
        date: `${getRandomMonth()} ${selectedYear}`,
        depth: Math.random() * 0.4 + 0.1 // Random depth factor for parallax effect
      }));
      
      setPhotos(samplePhotos);
      setCurrentIndex(0);
      setIsLoading(false);
    }, 500);
  }, [selectedYear]);

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

  // Navigation functions
  const nextPhoto = () => {
    if (photos.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const prevPhoto = () => {
    if (photos.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };

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

  // Helper function to get the appropriate thumbnail transform based on index
  const getThumbnailTransform = (idx) => {
    return thumbnailTransforms[idx % 3];
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Year selector - vertical sidebar */}
      <div className="w-20 md:w-24 bg-slate-800 flex flex-col items-center py-4 overflow-y-auto">
        <div className="text-white font-semibold mb-4">YEARS</div>
        {years.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-medium my-2 transition-all duration-300
              ${selectedYear === year 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
          >
            {year}
          </button>
        ))}
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={containerRef}
          className="h-screen relative flex flex-col"
        >
          {/* Background parallax element */}
          <div className="absolute inset-0 overflow-hidden">
            {!isLoading && photos.length > 0 && (
              <motion.div
                className="absolute inset-0 opacity-20 bg-center bg-cover filter blur-sm"
                style={{
                  backgroundImage: `url(${getPlaceholderImage(currentIndex, selectedYear)})`,
                  scale: backgroundScaleTransform,
                }}
              />
            )}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-white text-xl">Loading photos from {selectedYear}...</div>
            </div>
          )}
          
          {/* Photo display area */}
          {!isLoading && photos.length > 0 && (
            <div className="flex-1 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedYear}-${currentIndex}`}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -100, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8"
                >
                  {/* Parallax layers */}
                  <div className="relative max-w-4xl w-full max-h-full">
                    {/* Main photo with parallax effect */}
                    <div className="bg-black rounded-lg overflow-hidden shadow-2xl relative">
                      {/* Main photo */}
                      <motion.div
                        ref={imageRef}
                        className="relative overflow-hidden"
                        style={{ 
                          transformStyle: "preserve-3d",
                          perspective: "1000px"
                        }}
                      >
                        <motion.img
                          src={getPlaceholderImage(currentIndex, selectedYear)}
                          alt={photos[currentIndex].caption}
                          className="w-full h-auto object-cover max-h-[80vh]"
                          style={{ 
                            y: mainImageYTransform,
                            scale: mainImageScaleTransform,
                          }}
                        />
                      </motion.div>
                      
                      {/* Caption overlay with its own parallax movement (moves slower than the image) */}
                      <motion.div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white"
                        style={{ 
                          y: captionYTransform,
                        }}
                      >
                        <motion.h2 
                          className="text-2xl font-bold"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          {photos[currentIndex].caption}
                        </motion.h2>
                        <motion.div 
                          className="flex items-center mt-2"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <span className="text-lg">{photos[currentIndex].location}</span>
                          <span className="mx-2">•</span>
                          <span className="text-lg">{photos[currentIndex].date}</span>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {/* Navigation buttons with parallax depth effect */}
              <motion.button 
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 text-white"
                aria-label="Previous photo"
                style={{ 
                  x: prevButtonXTransform,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </motion.button>
              
              <motion.button 
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 text-white"
                aria-label="Next photo"
                style={{ 
                  x: nextButtonXTransform,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </motion.button>
            </div>
          )}
          
          {/* Empty state */}
          {!isLoading && photos.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-white text-xl">No photos found for {selectedYear}</div>
            </div>
          )}
          
          {/* Photo navigation/thumbnails at bottom with staggered parallax effects */}
          {!isLoading && photos.length > 0 && (
            <motion.div 
              className="bg-slate-800/80 backdrop-blur-sm p-4 overflow-x-auto z-20"
              style={{ 
                y: thumbnailsYTransform,
              }}
            >
              <div className="flex space-x-2 items-center">
                {photos.map((photo, idx) => (
                  <motion.button
                    key={photo.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative flex-shrink-0 h-16 w-24 overflow-hidden rounded 
                      ${idx === currentIndex ? 'ring-2 ring-blue-500' : 'opacity-60 hover:opacity-100'}`}
                    whileHover={{ 
                      y: -5, 
                      scale: 1.05,
                      transition: { duration: 0.2 } 
                    }}
                    style={{ 
                      y: getThumbnailTransform(idx),
                    }}
                  >
                    <img
                      src={getPlaceholderImage(idx, selectedYear)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
              <div className="text-white text-center mt-2">
                {currentIndex + 1} of {photos.length} photos from {selectedYear}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}