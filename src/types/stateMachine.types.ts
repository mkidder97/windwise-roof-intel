import type { ProfessionalCalculationResults, ProfessionalCalculationForm, WindSpeedData } from './wind-calculator';

export type CalculationState = 
  | { type: 'idle' }
  | { type: 'loading'; operation: string; progress?: number }
  | { type: 'calculating'; progress: number; stage: string }
  | { type: 'complete'; results: ProfessionalCalculationResults; timestamp: number }
  | { type: 'error'; error: string; canRetry: boolean; lastKnownState?: any };

export interface StateMachineContext {
  formData: ProfessionalCalculationForm;
  windSpeedData: WindSpeedData | null;
  enclosureData: EnclosureClassification | null;
  history: CalculationState[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface EnclosureClassification {
  type: 'enclosed' | 'partially_enclosed' | 'open';
  ratio: number;
  warnings: string[];
  gcpi_positive: number;
  gcpi_negative: number;
}

export interface CalculationTransition {
  from: CalculationState['type'];
  to: CalculationState['type'];
  trigger: string;
  guard?: (context: StateMachineContext) => boolean;
  action?: (context: StateMachineContext) => Partial<StateMachineContext>;
}

export interface CacheEntry {
  key: string;
  data: ProfessionalCalculationResults;
  timestamp: number;
  ttl: number;
  hitCount: number;
}

export interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  averageCalculationTime: number;
}