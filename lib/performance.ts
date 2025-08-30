// Performance monitoring utilities for cold start optimization

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private appStartTime: number;

  constructor() {
    this.appStartTime = Date.now();
    console.log('📊 Performance monitoring initialized');
  }

  startMetric(name: string): void {
    const startTime = Date.now();
    this.metrics.set(name, {
      name,
      startTime,
    });
    console.log(`⏱️ Started: ${name}`);
  }

  endMetric(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ Metric '${name}' not found`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    
    console.log(`✅ Completed: ${name} (${duration}ms)`);
    return duration;
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  getTotalAppStartTime(): number {
    return Date.now() - this.appStartTime;
  }

  logSummary(): void {
    const totalTime = this.getTotalAppStartTime();
    console.log('\n📊 Performance Summary:');
    console.log(`🚀 Total app start time: ${totalTime}ms`);
    
    const completedMetrics = this.getAllMetrics().filter(m => m.duration);
    if (completedMetrics.length > 0) {
      console.log('\n⏱️ Individual metrics:');
      completedMetrics
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .forEach(metric => {
          console.log(`  ${metric.name}: ${metric.duration}ms`);
        });
    }
    
    // Performance targets
    if (totalTime < 2000) {
      console.log('🎯 Excellent! App started in under 2 seconds');
    } else if (totalTime < 3000) {
      console.log('✅ Good! App started in under 3 seconds');
    } else {
      console.log('⚠️ App start time could be improved');
    }
  }

  // Measure async operations
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    this.startMetric(name);
    try {
      const result = await operation();
      this.endMetric(name);
      return result;
    } catch (error) {
      this.endMetric(name);
      throw error;
    }
  }

  // Measure sync operations
  measureSync<T>(name: string, operation: () => T): T {
    this.startMetric(name);
    try {
      const result = operation();
      this.endMetric(name);
      return result;
    } catch (error) {
      this.endMetric(name);
      throw error;
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions
export const startMetric = (name: string) => performanceMonitor.startMetric(name);
export const endMetric = (name: string) => performanceMonitor.endMetric(name);
export const measureAsync = <T>(name: string, operation: () => Promise<T>) => 
  performanceMonitor.measureAsync(name, operation);
export const measureSync = <T>(name: string, operation: () => T) => 
  performanceMonitor.measureSync(name, operation);
export const logPerformanceSummary = () => performanceMonitor.logSummary();

// React hook for component render timing
export const usePerformanceMetric = (name: string) => {
  const startTime = Date.now();
  
  return {
    end: () => {
      const duration = Date.now() - startTime;
      console.log(`🎨 Component ${name} rendered in ${duration}ms`);
      return duration;
    }
  };
};

// Auto-log summary after app is fully loaded
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.logSummary();
    }, 1000);
  });
} else {
  // For React Native
  setTimeout(() => {
    performanceMonitor.logSummary();
  }, 3000);
}