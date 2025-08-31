interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = __DEV__; // Only enable in development

  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata,
    };

    this.metrics.set(name, metric);
    console.log(`⏱️ Performance: Started "${name}"`);
  }

  end(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ Performance: No metric found for "${name}"`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    // Log performance result
    const status = this.getPerformanceStatus(name, duration);
    console.log(`${status.emoji} Performance: "${name}" completed in ${duration}ms ${status.message}`);
    
    if (metric.metadata) {
      console.log(`📊 Metadata:`, metric.metadata);
    }

    return duration;
  }

  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private getPerformanceStatus(name: string, duration: number): { emoji: string; message: string } {
    // Define performance thresholds based on operation type
    const thresholds = this.getThresholds(name);
    
    if (duration <= thresholds.excellent) {
      return { emoji: '🚀', message: '(Excellent!)' };
    } else if (duration <= thresholds.good) {
      return { emoji: '✅', message: '(Good)' };
    } else if (duration <= thresholds.acceptable) {
      return { emoji: '⚠️', message: '(Acceptable)' };
    } else {
      return { emoji: '🐌', message: '(Needs optimization)' };
    }
  }

  private getThresholds(name: string): { excellent: number; good: number; acceptable: number } {
    const lowerName = name.toLowerCase();
    
    // Document list loading
    if (lowerName.includes('document') && lowerName.includes('load')) {
      return { excellent: 500, good: 1000, acceptable: 2000 };
    }
    
    // Thumbnail generation
    if (lowerName.includes('thumbnail')) {
      return { excellent: 200, good: 500, acceptable: 1000 };
    }
    
    // Image optimization
    if (lowerName.includes('image') && lowerName.includes('optim')) {
      return { excellent: 1000, good: 2000, acceptable: 5000 };
    }
    
    // OCR processing
    if (lowerName.includes('ocr') || lowerName.includes('extract')) {
      return { excellent: 2000, good: 5000, acceptable: 10000 };
    }
    
    // App startup
    if (lowerName.includes('startup') || lowerName.includes('init')) {
      return { excellent: 1000, good: 2000, acceptable: 3000 };
    }
    
    // Default thresholds
    return { excellent: 100, good: 500, acceptable: 1000 };
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  clear(): void {
    this.metrics.clear();
  }

  generateReport(): string {
    const metrics = this.getAllMetrics().filter(m => m.duration !== undefined);
    
    if (metrics.length === 0) {
      return 'No performance metrics recorded.';
    }

    let report = '\n📊 Performance Report\n';
    report += '='.repeat(50) + '\n';
    
    metrics
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .forEach(metric => {
        const status = this.getPerformanceStatus(metric.name, metric.duration!);
        report += `${status.emoji} ${metric.name}: ${metric.duration}ms ${status.message}\n`;
        
        if (metric.metadata) {
          Object.entries(metric.metadata).forEach(([key, value]) => {
            report += `   ${key}: ${value}\n`;
          });
        }
      });
    
    report += '='.repeat(50);
    return report;
  }

  // Utility methods for common operations
  trackImageLoad(imageUri: string, metadata?: Record<string, any>) {
    const name = `Image Load: ${imageUri.split('/').pop() || 'unknown'}`;
    this.start(name, { imageUri, ...metadata });
    
    return {
      onLoad: () => this.end(name, { status: 'success' }),
      onError: (error: any) => this.end(name, { status: 'error', error: error?.message }),
    };
  }

  trackDocumentListLoad(count: number) {
    this.start('Document List Load', { documentCount: count });
    return () => this.end('Document List Load');
  }

  trackThumbnailGeneration(documentId: string) {
    this.start(`Thumbnail Generation: ${documentId}`, { documentId });
    return () => this.end(`Thumbnail Generation: ${documentId}`);
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions for common use cases
export const trackPerformance = {
  start: (name: string, metadata?: Record<string, any>) => performanceMonitor.start(name, metadata),
  end: (name: string, metadata?: Record<string, any>) => performanceMonitor.end(name, metadata),
  measure: <T>(name: string, fn: () => T, metadata?: Record<string, any>) => 
    performanceMonitor.measure(name, fn, metadata),
  measureAsync: <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) => 
    performanceMonitor.measureAsync(name, fn, metadata),
  imageLoad: (imageUri: string, metadata?: Record<string, any>) => 
    performanceMonitor.trackImageLoad(imageUri, metadata),
  documentListLoad: (count: number) => performanceMonitor.trackDocumentListLoad(count),
  thumbnailGeneration: (documentId: string) => performanceMonitor.trackThumbnailGeneration(documentId),
  report: () => console.log(performanceMonitor.generateReport()),
  clear: () => performanceMonitor.clear(),
};

export default performanceMonitor;