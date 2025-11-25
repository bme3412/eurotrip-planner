/**
 * Video Optimization Utilities
 * Handles preloading, caching, and performance optimizations for video streaming
 */

class VideoOptimizer {
  constructor() {
    this.preloadedVideos = new Map();
    this.loadingVideos = new Set();
    this.videoCache = new Map();
  }

  /**
   * Preload a video for better performance
   * @param {string} src - Video source URL
   * @returns {Promise} - Promise that resolves when video is preloaded
   */
  async preloadVideo(src) {
    if (this.preloadedVideos.has(src)) {
      return this.preloadedVideos.get(src);
    }

    if (this.loadingVideos.has(src)) {
      // Wait for existing loading to complete
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (this.preloadedVideos.has(src)) {
            resolve(this.preloadedVideos.get(src));
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    this.loadingVideos.add(src);

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        this.preloadedVideos.set(src, video);
        this.loadingVideos.delete(src);
        resolve(video);
      };

      video.onerror = () => {
        this.loadingVideos.delete(src);
        reject(new Error(`Failed to preload video: ${src}`));
      };

      video.src = src;
    });
  }

  /**
   * Get optimized video settings based on device capabilities
   * @returns {Object} - Optimized video settings
   */
  getOptimizedSettings() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    let quality = 'high';
    let preload = 'metadata';

    // Adjust quality based on connection
    if (connection) {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        quality = 'low';
        preload = 'none';
      } else if (connection.effectiveType === '3g') {
        quality = 'medium';
        preload = 'metadata';
      }
    }

    // Adjust for mobile devices
    if (isMobile) {
      quality = Math.min(quality, 'medium');
      preload = 'metadata';
    }

    return {
      quality,
      preload,
      isMobile,
      hasSlowConnection: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g'
    };
  }

  /**
   * Create a video element with optimized settings
   * @param {string} src - Video source
   * @param {Object} options - Video options
   * @returns {HTMLVideoElement} - Optimized video element
   */
  createOptimizedVideo(src, options = {}) {
    const settings = this.getOptimizedSettings();
    const video = document.createElement('video');
    
    // Apply optimized settings
    video.muted = true;
    video.playsInline = true;
    video.preload = options.preload || settings.preload;
    video.loop = options.loop !== false;
    video.autoplay = options.autoplay !== false;
    
    // Set source
    video.src = src;
    
    return video;
  }

  /**
   * Check if video format is supported
   * @param {string} format - Video format (mp4, webm, etc.)
   * @returns {boolean} - Whether format is supported
   */
  isFormatSupported(format) {
    const video = document.createElement('video');
    return video.canPlayType(`video/${format}`) !== '';
  }

  /**
   * Get the best video format for the current browser
   * @param {Array} formats - Available formats
   * @returns {string} - Best supported format
   */
  getBestFormat(formats) {
    const supportedFormats = ['webm', 'mp4', 'ogg'];
    
    for (const format of supportedFormats) {
      if (formats.includes(format) && this.isFormatSupported(format)) {
        return format;
      }
    }
    
    return 'mp4'; // Default fallback
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.preloadedVideos.clear();
    this.loadingVideos.clear();
    this.videoCache.clear();
  }
}

// Create singleton instance
const videoOptimizer = new VideoOptimizer();

export default videoOptimizer; 