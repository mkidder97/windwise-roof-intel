import { memo, useCallback, useMemo } from 'react';
import type { ProfessionalCalculationForm, ProfessionalCalculationResults } from '@/types/wind-calculator';

// Memoized calculation components for performance
export const MemoizedBuildingParametersForm = memo(function BuildingParametersForm(props: any) {
  // Component implementation will be enhanced with memoization
  return null; // Placeholder
});

export const MemoizedCalculationResults = memo(function CalculationResults(props: any) {
  // Component implementation will be enhanced with memoization
  return null; // Placeholder
});

// Performance optimization hooks
export function useOptimizedCalculations() {
  // Memoize expensive calculation functions
  const calculateWindPressure = useCallback(async (
    formData: ProfessionalCalculationForm
  ): Promise<ProfessionalCalculationResults> => {
    // This will be the optimized version of wind calculations
    // with proper memoization and caching
    throw new Error('Not implemented yet');
  }, []);

  const memoizedFormData = useMemo(() => {
    // Memoize form data transformations
    return {};
  }, []);

  return {
    calculateWindPressure,
    memoizedFormData,
  };
}

// Bundle optimization utilities
export const loadComponentLazily = (componentName: string) => {
  // Dynamic imports for code splitting
  switch (componentName) {
    case 'ReportGenerator':
      return import('@/components/ReportGenerator');
    case 'MaterialFinder':
      return import('@/pages/MaterialFinder');
    default:
      throw new Error(`Unknown component: ${componentName}`);
  }
};

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  public startTiming(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      
      this.metrics.get(label)!.push(duration);
      
      // Keep only last 100 measurements
      const measurements = this.metrics.get(label)!;
      if (measurements.length > 100) {
        measurements.shift();
      }
      
      console.log(`⚡ ${label}: ${duration.toFixed(2)}ms`);
    };
  }

  public getAverageTime(label: string): number {
    const measurements = this.metrics.get(label) || [];
    if (measurements.length === 0) return 0;
    
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }

  public getMetrics() {
    const result: Record<string, { average: number; count: number; latest: number }> = {};
    
    for (const [label, measurements] of this.metrics.entries()) {
      result[label] = {
        average: this.getAverageTime(label),
        count: measurements.length,
        latest: measurements[measurements.length - 1] || 0,
      };
    }
    
    return result;
  }

  public reportMetrics() {
    console.table(this.getMetrics());
  }
}

export const performanceMonitor = new PerformanceMonitor();
