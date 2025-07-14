import type { CacheEntry, CacheMetrics } from '@/types/stateMachine.types';
import type { ProfessionalCalculationResults, ProfessionalCalculationForm, WindSpeedData } from '@/types/wind-calculator';

export class CalculationCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private metrics: CacheMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    averageCalculationTime: 0,
  };
  private maxMemoryCacheSize = 50;
  private defaultTTL = 1000 * 60 * 60; // 1 hour

  // Generate cache key from calculation parameters
  private generateCacheKey(formData: ProfessionalCalculationForm, windSpeedData?: WindSpeedData): string {
    const keyData = {
      // Core building parameters
      buildingHeight: formData.buildingHeight,
      buildingLength: formData.buildingLength,
      buildingWidth: formData.buildingWidth,
      exposureCategory: formData.exposureCategory,
      city: formData.city,
      state: formData.state,
      riskCategory: formData.riskCategory,
      // Wind data
      windSpeed: windSpeedData?.value || 120,
      // Professional mode settings
      professionalMode: formData.professionalMode,
      topographicFactor: formData.topographicFactor,
      directionalityFactor: formData.directionalityFactor,
    };

    return btoa(JSON.stringify(keyData)).replace(/[/+=]/g, '');
  }

  // Check if cache entry is valid
  private isValidEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  // Clean up expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Implement LRU eviction policy
  private evictLRUEntry(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  // Get cached result
  public get(formData: ProfessionalCalculationForm, windSpeedData?: WindSpeedData): ProfessionalCalculationResults | null {
    this.metrics.totalRequests++;
    
    const key = this.generateCacheKey(formData, windSpeedData);
    const entry = this.memoryCache.get(key);

    if (entry && this.isValidEntry(entry)) {
      entry.hitCount++;
      this.metrics.cacheHits++;
      this.updateHitRate();
      
      // Move to end (most recent)
      this.memoryCache.delete(key);
      this.memoryCache.set(key, entry);
      
      return entry.data;
    }

    this.metrics.cacheMisses++;
    this.updateHitRate();
    return null;
  }

  // Store calculation result
  public set(
    formData: ProfessionalCalculationForm, 
    result: ProfessionalCalculationResults,
    windSpeedData?: WindSpeedData,
    customTTL?: number
  ): void {
    this.cleanupExpiredEntries();

    // Check if we need to evict entries
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      this.evictLRUEntry();
    }

    const key = this.generateCacheKey(formData, windSpeedData);
    const entry: CacheEntry = {
      key,
      data: result,
      timestamp: Date.now(),
      ttl: customTTL || this.defaultTTL,
      hitCount: 0,
    };

    this.memoryCache.set(key, entry);
  }

  // Check if result exists in cache
  public has(formData: ProfessionalCalculationForm, windSpeedData?: WindSpeedData): boolean {
    const key = this.generateCacheKey(formData, windSpeedData);
    const entry = this.memoryCache.get(key);
    return entry ? this.isValidEntry(entry) : false;
  }

  // Clear all cache entries
  public clear(): void {
    this.memoryCache.clear();
    this.resetMetrics();
  }

  // Get cache statistics
  public getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  // Get cache size info
  public getCacheInfo() {
    return {
      memoryEntries: this.memoryCache.size,
      maxMemoryEntries: this.maxMemoryCacheSize,
      memoryUsagePercent: (this.memoryCache.size / this.maxMemoryCacheSize) * 100,
    };
  }

  // Update hit rate calculation
  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0;
  }

  // Reset metrics
  private resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      averageCalculationTime: 0,
    };
  }

  // Get most frequently accessed entries
  public getPopularEntries(limit = 10): Array<{ key: string; hitCount: number }> {
    return Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({ key: entry.key, hitCount: entry.hitCount }))
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);
  }

  // Preload cache with common calculations
  public preload(commonCalculations: Array<{
    formData: ProfessionalCalculationForm;
    result: ProfessionalCalculationResults;
    windSpeedData?: WindSpeedData;
  }>): void {
    commonCalculations.forEach(({ formData, result, windSpeedData }) => {
      this.set(formData, result, windSpeedData);
    });
  }
}

// Singleton instance
export const cacheManager = new CalculationCacheManager();