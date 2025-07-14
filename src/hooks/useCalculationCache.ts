import { useState, useEffect, useCallback } from 'react';
import { cacheManager } from '@/utils/cacheManager';
import type { ProfessionalCalculationResults, ProfessionalCalculationForm, WindSpeedData } from '@/types/wind-calculator';
import type { CacheMetrics } from '@/types/stateMachine.types';

interface UseCalculationCacheOptions {
  enableCache?: boolean;
  customTTL?: number;
  preloadCommon?: boolean;
}

export function useCalculationCache(options: UseCalculationCacheOptions = {}) {
  const { enableCache = true, customTTL, preloadCommon = false } = options;
  const [metrics, setMetrics] = useState<CacheMetrics>(cacheManager.getMetrics());
  const [cacheInfo, setCacheInfo] = useState(cacheManager.getCacheInfo());

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(cacheManager.getMetrics());
      setCacheInfo(cacheManager.getCacheInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cached calculation function
  const calculateWithCache = useCallback(async (
    formData: ProfessionalCalculationForm,
    windSpeedData: WindSpeedData | undefined,
    calculateFunction: (data: ProfessionalCalculationForm, windData?: WindSpeedData) => Promise<ProfessionalCalculationResults>
  ): Promise<ProfessionalCalculationResults> => {
    if (!enableCache) {
      return await calculateFunction(formData, windSpeedData);
    }

    // Check cache first
    const cachedResult = cacheManager.get(formData, windSpeedData);
    if (cachedResult) {
      console.log('📊 Cache hit - returning cached result');
      return cachedResult;
    }

    console.log('📊 Cache miss - performing calculation');
    const startTime = Date.now();
    
    try {
      const result = await calculateFunction(formData, windSpeedData);
      const calculationTime = Date.now() - startTime;
      
      // Store in cache
      cacheManager.set(formData, result, windSpeedData, customTTL);
      
      // Update average calculation time
      const currentMetrics = cacheManager.getMetrics();
      const newAverage = currentMetrics.averageCalculationTime === 0
        ? calculationTime
        : (currentMetrics.averageCalculationTime + calculationTime) / 2;
      
      currentMetrics.averageCalculationTime = newAverage;
      
      console.log(`📊 Calculation completed in ${calculationTime}ms and cached`);
      return result;
    } catch (error) {
      console.error('📊 Calculation failed:', error);
      throw error;
    }
  }, [enableCache, customTTL]);

  // Check if calculation is cached
  const isCached = useCallback((
    formData: ProfessionalCalculationForm,
    windSpeedData?: WindSpeedData
  ): boolean => {
    return enableCache ? cacheManager.has(formData, windSpeedData) : false;
  }, [enableCache]);

  // Get cached result without triggering calculation
  const getCachedResult = useCallback((
    formData: ProfessionalCalculationForm,
    windSpeedData?: WindSpeedData
  ): ProfessionalCalculationResults | null => {
    return enableCache ? cacheManager.get(formData, windSpeedData) : null;
  }, [enableCache]);

  // Clear cache
  const clearCache = useCallback(() => {
    cacheManager.clear();
    setMetrics(cacheManager.getMetrics());
    setCacheInfo(cacheManager.getCacheInfo());
  }, []);

  // Get popular calculations
  const getPopularCalculations = useCallback((limit = 10) => {
    return cacheManager.getPopularEntries(limit);
  }, []);

  // Preload cache with common calculations
  const preloadCache = useCallback((commonCalculations: Array<{
    formData: ProfessionalCalculationForm;
    result: ProfessionalCalculationResults;
    windSpeedData?: WindSpeedData;
  }>) => {
    if (enableCache) {
      cacheManager.preload(commonCalculations);
      setMetrics(cacheManager.getMetrics());
      setCacheInfo(cacheManager.getCacheInfo());
    }
  }, [enableCache]);

  // Cache status indicators
  const cacheStatus = {
    isEnabled: enableCache,
    hitRate: metrics.hitRate,
    totalRequests: metrics.totalRequests,
    isHealthy: metrics.hitRate > 60, // Consider 60%+ hit rate as healthy
    isEmpty: cacheInfo.memoryEntries === 0,
    isFull: cacheInfo.memoryUsagePercent > 90,
  };

  return {
    // Core functions
    calculateWithCache,
    isCached,
    getCachedResult,
    clearCache,
    preloadCache,
    
    // Analytics
    metrics,
    cacheInfo,
    cacheStatus,
    getPopularCalculations,
    
    // Utilities
    enableCache,
    customTTL,
  };
}