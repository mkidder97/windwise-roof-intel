import type { CalculationState, StateMachineContext, CalculationTransition } from '@/types/stateMachine.types';

export class CalculationStateMachine {
  private state: CalculationState;
  private context: StateMachineContext;
  private listeners: Set<(state: CalculationState, context: StateMachineContext) => void> = new Set();
  private history: CalculationState[] = [];
  private maxHistorySize = 50;

  constructor(initialState: CalculationState, initialContext: StateMachineContext) {
    this.state = initialState;
    this.context = initialContext;
    this.addToHistory(initialState);
  }

  private transitions: CalculationTransition[] = [
    {
      from: 'idle',
      to: 'loading',
      trigger: 'START_CALCULATION',
    },
    {
      from: 'loading',
      to: 'calculating',
      trigger: 'BEGIN_PROCESSING',
    },
    {
      from: 'calculating',
      to: 'complete',
      trigger: 'CALCULATION_SUCCESS',
    },
    {
      from: 'calculating',
      to: 'error',
      trigger: 'CALCULATION_ERROR',
    },
    {
      from: 'error',
      to: 'calculating',
      trigger: 'RETRY',
      guard: (context) => this.state.type === 'error' && this.state.canRetry,
    },
    {
      from: 'complete',
      to: 'idle',
      trigger: 'RESET',
    },
    {
      from: 'error',
      to: 'idle',
      trigger: 'RESET',
    },
  ];

  private addToHistory(state: CalculationState): void {
    this.history.push(state);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    this.context.history = [...this.history];
    this.context.canUndo = this.history.length > 1;
  }

  public transition(trigger: string, payload?: any): boolean {
    const transition = this.transitions.find(
      t => t.from === this.state.type && t.trigger === trigger
    );

    if (!transition) {
      console.warn(`No transition found for ${this.state.type} -> ${trigger}`);
      return false;
    }

    if (transition.guard && !transition.guard(this.context)) {
      console.warn(`Transition guard failed for ${this.state.type} -> ${trigger}`);
      return false;
    }

    const newState = this.createNewState(transition.to, payload);
    
    if (transition.action) {
      const contextUpdate = transition.action(this.context);
      this.context = { ...this.context, ...contextUpdate };
    }

    this.state = newState;
    this.addToHistory(newState);
    this.notifyListeners();
    
    return true;
  }

  private createNewState(type: CalculationState['type'], payload?: any): CalculationState {
    switch (type) {
      case 'idle':
        return { type: 'idle' };
      case 'loading':
        return { 
          type: 'loading', 
          operation: payload?.operation || 'Preparing calculation...',
          progress: payload?.progress || 0
        };
      case 'calculating':
        return { 
          type: 'calculating', 
          progress: payload?.progress || 0,
          stage: payload?.stage || 'Processing...'
        };
      case 'complete':
        return { 
          type: 'complete', 
          results: payload?.results,
          timestamp: Date.now()
        };
      case 'error':
        return { 
          type: 'error', 
          error: payload?.error || 'Unknown error occurred',
          canRetry: payload?.canRetry !== false,
          lastKnownState: this.state
        };
      default:
        return { type: 'idle' };
    }
  }

  public updateProgress(progress: number, stage?: string): void {
    if (this.state.type === 'calculating') {
      this.state = {
        ...this.state,
        progress: Math.max(0, Math.min(100, progress)),
        stage: stage || this.state.stage
      };
      this.notifyListeners();
    }
  }

  public undo(): boolean {
    if (this.history.length <= 1) return false;
    
    this.history.pop(); // Remove current state
    const previousState = this.history[this.history.length - 1];
    this.state = previousState;
    this.context.canUndo = this.history.length > 1;
    this.context.canRedo = true;
    this.notifyListeners();
    
    return true;
  }

  public getState(): CalculationState {
    return this.state;
  }

  public getContext(): StateMachineContext {
    return this.context;
  }

  public subscribe(listener: (state: CalculationState, context: StateMachineContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state, this.context));
  }

  public reset(): void {
    this.transition('RESET');
  }
}