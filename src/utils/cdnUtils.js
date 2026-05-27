/**
 * CDN Utilities for EuroTrip Planner
 * Manages CDN URLs for videos and images
 */

// Get CDN URL from environment or fallback to local
const getCDNUrl = () => {
  return process.env.NEXT_PUBLIC_CDN_URL || '';
};

// Check if CDN is enabled
export const isCDNEnabled = () => {
  return !!getCDNUrl();
};

// Get full URL for JSON/data assets (e.g., under /data/**)
export const getDataUrl = (dataPath) => {
  if (!dataPath) return dataPath;
  const cdnUrl = getCDNUrl();
  const cleanPath = dataPath.startsWith('/') ? dataPath.slice(1) : dataPath;
  if (cdnUrl && cleanPath.startsWith('data/')) {
    return `${cdnUrl}/${cleanPath}`;
  }
  // Preserve leading slash for same-origin paths so relative paths resolve correctly
  return dataPath.startsWith('/') ? dataPath : `/${cleanPath}`;
};

// Get full URL for a video
export const getVideoUrl = (videoPath) => {
  const cdnUrl = getCDNUrl();
  if (cdnUrl && videoPath) {
    // Remove leading slash if present
    const cleanPath = videoPath.startsWith('/') ? videoPath.slice(1) : videoPath;
    return `${cdnUrl}/${cleanPath}`;
  }
  return videoPath;
};

// Get full URL for an image
export const getImageUrl = (imagePath) => {
  const cdnUrl = getCDNUrl();
  
  // If CDN is enabled, use CloudFront
  if (cdnUrl && imagePath) {
    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    
    // Map city images to the correct S3 path
    if (cleanPath.startsWith('images/') && !cleanPath.includes('city-thumbnails/') && !cleanPath.includes('video-thumbnails/')) {
      // Convert /images/paris.jpeg to /images/city-thumbnails/paris.jpeg
      const cityName = cleanPath.replace('images/', '').replace('.jpeg', '');
      return `${cdnUrl}/images/city-thumbnails/${cityName}.jpeg`;
    }
    
    return `${cdnUrl}/${cleanPath}`;
  }
  
  // For local development, map new format to old format
  if (imagePath && imagePath.includes('/images/') && !imagePath.includes('-thumbnail')) {
    // Convert /images/paris.jpeg to /images/paris-thumbnail.jpeg
    const cityName = imagePath.replace('/images/', '').replace('.jpeg', '');
    return `/images/${cityName}-thumbnail.jpeg`;
  }
  
  return imagePath;
};

// Get optimized video URL with fallback
export const getOptimizedVideoUrl = (videoPath, fallbackPath = null) => {
  const cdnUrl = getVideoUrl(videoPath);
  
  // If CDN is enabled, try WebM first, then MP4
  if (isCDNEnabled() && videoPath) {
    const webmPath = videoPath.replace('.mp4', '.webm');
    const webmUrl = getVideoUrl(webmPath);
    
    return {
      webm: webmUrl,
      mp4: cdnUrl,
      fallback: fallbackPath || videoPath
    };
  }
  
  // Local fallback
  return {
    webm: videoPath.replace('.mp4', '.webm'),
    mp4: videoPath,
    fallback: fallbackPath || videoPath
  };
};

// Preload multiple assets
export const preloadAssets = (assets) => {
  if (typeof window === 'undefined') return; // Server-side
  
  assets.forEach(asset => {
    const link = document.createElement('link');
    link.rel = 'preload';
    
    if (asset.endsWith('.mp4') || asset.endsWith('.webm')) {
      // Don't preload videos with link tags to avoid warnings
      return;
    } else if (asset.endsWith('.jpg') || asset.endsWith('.jpeg') || asset.endsWith('.jpeg')) {
      link.as = 'image';
    } else if (asset.endsWith('.css')) {
      link.as = 'style';
    } else if (asset.endsWith('.js')) {
      link.as = 'script';
    } else {
      link.as = 'fetch';
    }
    
    link.href = asset;
    document.head.appendChild(link);
  });
};

// Performance monitoring
export const logCDNPerformance = (url, startTime) => {
  if (typeof window === 'undefined') return; // Server-side
  
  const loadTime = performance.now() - startTime;
  const isCDN = isCDNEnabled() && url.includes(getCDNUrl());

  // Send to analytics if available
  if (window.gtag) {
    window.gtag('event', 'asset_load', {
      'asset_type': url.includes('.mp4') ? 'video' : 'image',
      'load_time': loadTime,
      'source': isCDN ? 'cdn' : 'local',
      'url': url
    });
  }
};

// CDN health check
export const checkCDNHealth = async () => {
  if (!isCDNEnabled()) {
    return false;
  }

  try {
    const testUrl = `${getCDNUrl()}/images/video-thumbnails/lisbon-tram-thumbnail.jpg`;
    const response = await fetch(testUrl, { method: 'HEAD' });

    if (response.ok) {
      return true;
    } else {
      console.warn(`CDN unhealthy - ${response.status}`);
      return false;
    }
  } catch (error) {
    console.warn(`CDN error - ${error.message}`);
    return false;
  }
}; 