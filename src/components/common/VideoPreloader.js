'use client';

import { useEffect, useRef } from 'react';

const VideoPreloader = ({ videos, thumbnails = [] }) => {
  const preloadedElements = useRef(new Set());

  useEffect(() => {
    // Only preload thumbnails if they're actually being used
    if (thumbnails.length > 0) {
      thumbnails.forEach(thumbnailSrc => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = thumbnailSrc;
        document.head.appendChild(link);
        preloadedElements.current.add(link);
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
      preloadedElements.current.add(video);
      
      // Remove the video element after a short delay
      setTimeout(() => {
        if (document.body.contains(video)) {
          document.body.removeChild(video);
          preloadedElements.current.delete(video);
        }
      }, 3000);
    });

    // Cleanup function
    return () => {
      preloadedElements.current.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      preloadedElements.current.clear();
    };
  }, [videos, thumbnails]);

  return null; // This component doesn't render anything
};

export default VideoPreloader; 