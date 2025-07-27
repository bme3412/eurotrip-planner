/**
 * Performance monitoring utilities
 */

// Web Vitals tracking
export function trackWebVitals(metric) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }
}

// Simple performance timer
export class PerformanceTimer {
  constructor(name) {
    this.name = name;
    this.startTime = performance.now();
  }
  
  end() {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${this.name}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
}

// Cache performance monitoring
export const cacheMetrics = {
  hits: 0,
  misses: 0,
  
  recordHit() {
    this.hits++;
  },
  
  recordMiss() {
    this.misses++;
  },
  
  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
  },
  
  reset() {
    this.hits = 0;
    this.misses = 0;
  }
};

// Bundle size monitoring
export function logBundleSize() {
  if (typeof window !== 'undefined' && 'connection' in navigator) {
    const connection = navigator.connection;
    console.log('📦 Bundle optimization metrics:', {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    });
  }
}

// Memory usage monitoring
export function logMemoryUsage() {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = performance.memory;
    console.log('🧠 Memory usage:', {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
    });
  }
} 