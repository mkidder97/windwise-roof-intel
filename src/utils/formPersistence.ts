import type { ProfessionalCalculationForm } from '@/types/wind-calculator';

interface FormPersistenceOptions {
  key: string;
  debounceMs?: number;
  maxHistory?: number;
  enableCompression?: boolean;
}

interface PersistedFormData {
  data: ProfessionalCalculationForm;
  timestamp: number;
  version: string;
  checksum: string;
}

interface FormHistory {
  current: PersistedFormData;
  previous: PersistedFormData[];
  maxHistory: number;
}

export class FormPersistenceManager {
  private options: Required<FormPersistenceOptions>;
  private debounceTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(data: ProfessionalCalculationForm) => void> = new Set();

  constructor(options: FormPersistenceOptions) {
    this.options = {
      debounceMs: 1000,
      maxHistory: 10,
      enableCompression: false,
      ...options,
    };

    // Listen for cross-tab changes
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  // Generate checksum for data integrity
  private generateChecksum(data: ProfessionalCalculationForm): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Save form data with debouncing
  public save(data: ProfessionalCalculationForm): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.performSave(data);
    }, this.options.debounceMs);
  }

  // Immediate save without debouncing
  public saveImmediate(data: ProfessionalCalculationForm): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.performSave(data);
  }

  private performSave(data: ProfessionalCalculationForm): void {
    try {
      const persistedData: PersistedFormData = {
        data,
        timestamp: Date.now(),
        version: '1.0.0',
        checksum: this.generateChecksum(data),
      };

      // Get current history
      const history = this.getHistory();
      
      // Add current data to history if it's different
      if (history.current && history.current.checksum !== persistedData.checksum) {
        history.previous.unshift(history.current);
        
        // Limit history size
        if (history.previous.length > this.options.maxHistory) {
          history.previous = history.previous.slice(0, this.options.maxHistory);
        }
      }

      // Update current data
      history.current = persistedData;

      // Save to localStorage
      localStorage.setItem(this.options.key, JSON.stringify(persistedData));
      localStorage.setItem(`${this.options.key}_history`, JSON.stringify(history));

      console.log('📝 Form data persisted:', this.options.key);
    } catch (error) {
      console.error('❌ Failed to persist form data:', error);
    }
  }

  // Load form data
  public load(): ProfessionalCalculationForm | null {
    try {
      const stored = localStorage.getItem(this.options.key);
      if (!stored) return null;

      const persistedData: PersistedFormData = JSON.parse(stored);
      
      // Verify data integrity
      const currentChecksum = this.generateChecksum(persistedData.data);
      if (currentChecksum !== persistedData.checksum) {
        console.warn('⚠️ Form data checksum mismatch, data may be corrupted');
        return null;
      }

      console.log('📖 Form data loaded:', this.options.key);
      return persistedData.data;
    } catch (error) {
      console.error('❌ Failed to load form data:', error);
      return null;
    }
  }

  // Get form history
  public getHistory(): FormHistory {
    try {
      const stored = localStorage.getItem(`${this.options.key}_history`);
      if (!stored) {
        return {
          current: null as any,
          previous: [],
          maxHistory: this.options.maxHistory,
        };
      }

      return JSON.parse(stored);
    } catch (error) {
      console.error('❌ Failed to load form history:', error);
      return {
        current: null as any,
        previous: [],
        maxHistory: this.options.maxHistory,
      };
    }
  }

  // Restore from history
  public restoreFromHistory(index: number): ProfessionalCalculationForm | null {
    const history = this.getHistory();
    
    if (index === -1 && history.current) {
      return history.current.data;
    }
    
    if (index >= 0 && index < history.previous.length) {
      const restored = history.previous[index];
      
      // Verify integrity
      const currentChecksum = this.generateChecksum(restored.data);
      if (currentChecksum !== restored.checksum) {
        console.warn('⚠️ Historical data checksum mismatch');
        return null;
      }
      
      return restored.data;
    }
    
    return null;
  }

  // Clear all persisted data
  public clear(): void {
    localStorage.removeItem(this.options.key);
    localStorage.removeItem(`${this.options.key}_history`);
    console.log('🗑️ Form data cleared:', this.options.key);
  }

  // Check if data exists
  public exists(): boolean {
    return localStorage.getItem(this.options.key) !== null;
  }

  // Get data age in milliseconds
  public getDataAge(): number | null {
    try {
      const stored = localStorage.getItem(this.options.key);
      if (!stored) return null;

      const persistedData: PersistedFormData = JSON.parse(stored);
      return Date.now() - persistedData.timestamp;
    } catch (error) {
      return null;
    }
  }

  // Subscribe to cross-tab changes
  public subscribe(listener: (data: ProfessionalCalculationForm) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Handle storage changes from other tabs
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === this.options.key && event.newValue) {
      try {
        const persistedData: PersistedFormData = JSON.parse(event.newValue);
        
        // Verify integrity
        const currentChecksum = this.generateChecksum(persistedData.data);
        if (currentChecksum === persistedData.checksum) {
          // Notify listeners of cross-tab changes
          this.listeners.forEach(listener => listener(persistedData.data));
          console.log('🔄 Form data synchronized from another tab');
        }
      } catch (error) {
        console.error('❌ Failed to sync form data from another tab:', error);
      }
    }
  }

  // Export data for backup
  public export(): string {
    const history = this.getHistory();
    const exportData = {
      current: history.current,
      previous: history.previous,
      exportedAt: Date.now(),
      version: '1.0.0',
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Import data from backup
  public import(data: string): boolean {
    try {
      const importData = JSON.parse(data);
      
      if (importData.current) {
        localStorage.setItem(this.options.key, JSON.stringify(importData.current));
      }
      
      if (importData.previous) {
        const history = {
          current: importData.current,
          previous: importData.previous,
          maxHistory: this.options.maxHistory,
        };
        localStorage.setItem(`${this.options.key}_history`, JSON.stringify(history));
      }
      
      console.log('📥 Form data imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import form data:', error);
      return false;
    }
  }
}

// Create default instance for wind calculator
export const windCalculatorPersistence = new FormPersistenceManager({
  key: 'windwise_calculator_form',
  debounceMs: 2000,
  maxHistory: 15,
  enableCompression: false,
});