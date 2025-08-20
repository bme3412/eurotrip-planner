'use client';

import { useEffect, useRef } from 'react';

const VideoPreloader = ({ videos, thumbnails = [] }) => {
  const preloadedElements = useRef(new Set());

  useEffect(() => {
    // Track elements created in this effect execution
    const elementsCreated = new Set();
    
    // Only preload thumbnails if they're actually being used
    if (thumbnails.length > 0) {
      thumbnails.forEach(thumbnailSrc => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = thumbnailSrc;
        document.head.appendChild(link);
        elementsCreated.add(link);
      });
    }

    // Don't preload videos with link tags - they cause warnings
    // Instead, use hidden video elements for actual preloading
    videos.forEach(videoSrc => {
      const video = document.createElement('video');
      video.src = videoSrc;
      video.preload = 'metadata';
      video.muted = true;
      video.style.display = 'none';
      document.body.appendChild(video);
      elementsCreated.add(video);
      
      // Remove the video element after a short delay
      setTimeout(() => {
        if (document.body.contains(video)) {
          document.body.removeChild(video);
        }
      }, 3000);
    });

    // Cleanup function
    return () => {
      // Clean up only the elements created in this effect execution
      elementsCreated.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    };
  }, [videos, thumbnails]);

  return null; // This component doesn't render anything
};

export default VideoPreloader; 