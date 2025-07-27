'use client';

import { useEffect } from 'react';

const VideoPreloader = ({ videos, thumbnails = [] }) => {
  useEffect(() => {
    // Preload thumbnails first (they're tiny and load instantly)
    thumbnails.forEach(thumbnailSrc => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = thumbnailSrc;
      document.head.appendChild(link);
    });

    // Preload videos with lower priority
    videos.forEach(videoSrc => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = videoSrc;
      link.type = 'video/mp4';
      document.head.appendChild(link);
      
      // Also create a video element to start loading
      const video = document.createElement('video');
      video.src = videoSrc;
      video.preload = 'metadata';
      video.muted = true;
      video.style.display = 'none';
      document.body.appendChild(video);
      
      // Remove the video element after a short delay
      setTimeout(() => {
        if (document.body.contains(video)) {
          document.body.removeChild(video);
        }
      }, 2000);
    });
  }, [videos, thumbnails]);

  return null; // This component doesn't render anything
};

export default VideoPreloader; 