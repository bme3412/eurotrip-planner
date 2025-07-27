/**
 * Performance Monitoring Utility
 * Tracks cache performance and map operation metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      mapOperations: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      responseCount: 0
    };
    
    this.operationTimers = new Map();
    this.history = [];
  }

  /**
   * Start timing an operation
   */
  startTimer(operationName) {
    this.operationTimers.set(operationName, performance.now());
  }

  /**
   * End timing an operation and record metrics
   */
  endTimer(operationName, success = true) {
    const startTime = this.operationTimers.get(operationName);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.operationTimers.delete(operationName);

    // Update metrics
    this.metrics.mapOperations++;
    this.metrics.totalResponseTime += duration;
    this.metrics.responseCount++;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.responseCount;

    // Record in history
    this.history.push({
      operation: operationName,
      duration,
      timestamp: Date.now(),
      success
    });

    // Keep only last 100 entries
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }

    return duration;
  }

  /**
   * Record cache hit
   */
  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  /**
   * Record API call
   */
  recordApiCall() {
    this.metrics.apiCalls++;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? (this.metrics.cacheHits / total) * 100 : 0;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    return {
      cacheHitRate: this.getCacheHitRate(),
      averageResponseTime: this.metrics.averageResponseTime,
      totalOperations: this.metrics.mapOperations,
      totalApiCalls: this.metrics.apiCalls,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses
    };
  }

  /**
   * Get recent performance history
   */
  getRecentHistory(limit = 20) {
    return this.history.slice(-limit);
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      mapOperations: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      responseCount: 0
    };
    this.history = [];
    this.operationTimers.clear();
  }

  /**
   * Export metrics for debugging
   */
  exportMetrics() {
    return {
      metrics: this.metrics,
      history: this.history,
      cacheHitRate: this.getCacheHitRate(),
      timestamp: Date.now()
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export the singleton and class
export { performanceMonitor as default, PerformanceMonitor };

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