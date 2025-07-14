import { useState, useEffect, useRef, useCallback } from 'react';
import { CalculationStateMachine } from '@/utils/calculationStateMachine';
import type { CalculationState, StateMachineContext } from '@/types/stateMachine.types';
import type { ProfessionalCalculationForm, ProfessionalCalculationResults, WindSpeedData } from '@/types/wind-calculator';

interface UseCalculationStateMachineProps {
  initialFormData: ProfessionalCalculationForm;
  onStateChange?: (state: CalculationState, context: StateMachineContext) => void;
}

export function useCalculationStateMachine({ 
  initialFormData, 
  onStateChange 
}: UseCalculationStateMachineProps) {
  const [state, setState] = useState<CalculationState>({ type: 'idle' });
  const [context, setContext] = useState<StateMachineContext>({
    formData: initialFormData,
    windSpeedData: null,
    enclosureData: null,
    history: [],
    canUndo: false,
    canRedo: false,
  });

  const stateMachineRef = useRef<CalculationStateMachine | null>(null);

  // Initialize state machine
  useEffect(() => {
    const initialContext: StateMachineContext = {
      formData: initialFormData,
      windSpeedData: null,
      enclosureData: null,
      history: [],
      canUndo: false,
      canRedo: false,
    };

    stateMachineRef.current = new CalculationStateMachine(
      { type: 'idle' },
      initialContext
    );

    const unsubscribe = stateMachineRef.current.subscribe((newState, newContext) => {
      setState(newState);
      setContext(newContext);
      onStateChange?.(newState, newContext);
    });

    return unsubscribe;
  }, [initialFormData, onStateChange]);

  const startCalculation = useCallback(async (
    formData: ProfessionalCalculationForm,
    windSpeedData: WindSpeedData,
    calculateFunction: (data: ProfessionalCalculationForm, windData?: WindSpeedData) => Promise<ProfessionalCalculationResults>
  ) => {
    if (!stateMachineRef.current) return;

    try {
      // Update context with new data
      stateMachineRef.current.getContext().formData = formData;
      stateMachineRef.current.getContext().windSpeedData = windSpeedData;

      // Start calculation
      stateMachineRef.current.transition('START_CALCULATION', {
        operation: 'Initializing calculation...'
      });

      // Begin processing
      stateMachineRef.current.transition('BEGIN_PROCESSING', {
        progress: 0,
        stage: 'Processing wind parameters...'
      });

      // Simulate progress updates during calculation
      const progressInterval = setInterval(() => {
        const currentState = stateMachineRef.current?.getState();
        if (currentState?.type === 'calculating') {
          const newProgress = Math.min(currentState.progress + 10, 90);
          stateMachineRef.current?.updateProgress(newProgress, 'Calculating pressures...');
        }
      }, 200);

      // Perform actual calculation
      const results = await calculateFunction(formData, windSpeedData);

      clearInterval(progressInterval);

      // Complete calculation
      stateMachineRef.current.transition('CALCULATION_SUCCESS', {
        results,
      });

      return results;
    } catch (error) {
      stateMachineRef.current.transition('CALCULATION_ERROR', {
        error: error instanceof Error ? error.message : 'Calculation failed',
        canRetry: true,
      });
      throw error;
    }
  }, []);

  const retry = useCallback(() => {
    if (!stateMachineRef.current) return;
    stateMachineRef.current.transition('RETRY');
  }, []);

  const reset = useCallback(() => {
    if (!stateMachineRef.current) return;
    stateMachineRef.current.reset();
  }, []);

  const undo = useCallback(() => {
    if (!stateMachineRef.current) return;
    return stateMachineRef.current.undo();
  }, []);

  const updateProgress = useCallback((progress: number, stage?: string) => {
    if (!stateMachineRef.current) return;
    stateMachineRef.current.updateProgress(progress, stage);
  }, []);

  const updateContext = useCallback((updates: Partial<StateMachineContext>) => {
    if (!stateMachineRef.current) return;
    const currentContext = stateMachineRef.current.getContext();
    Object.assign(currentContext, updates);
  }, []);

  return {
    state,
    context,
    startCalculation,
    retry,
    reset,
    undo,
    updateProgress,
    updateContext,
    isIdle: state.type === 'idle',
    isLoading: state.type === 'loading',
    isCalculating: state.type === 'calculating',
    isComplete: state.type === 'complete',
    isError: state.type === 'error',
    canRetry: state.type === 'error' && state.canRetry,
    canUndo: context.canUndo,
    canRedo: context.canRedo,
  };
}