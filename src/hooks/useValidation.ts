import { useState, useEffect, useCallback, useMemo } from 'react';
import { validateWindLoadInputs } from '@/utils/windLoadValidation';
import type { ProfessionalCalculationForm, ValidationState } from '@/types/wind-calculator';

interface UseValidationOptions {
  enableRealTimeValidation?: boolean;
  debounceMs?: number;
  validateOnMount?: boolean;
}

export function useValidation(options: UseValidationOptions = {}) {
  const { 
    enableRealTimeValidation = true, 
    debounceMs = 500,
    validateOnMount = false 
  } = options;

  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: false,
    errors: [],
    warnings: []
  });

  const [validationHistory, setValidationHistory] = useState<ValidationState[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Memoized validation function to prevent unnecessary re-renders
  const validateForm = useCallback(async (formData: Partial<ProfessionalCalculationForm>): Promise<ValidationState> => {
    setIsValidating(true);
    
    try {
      // Create validation input with required fields
      const validationInput = {
        height: formData.buildingHeight || 0,
        windSpeed: 120, // Default wind speed for validation
        exposureCategory: formData.exposureCategory || 'C',
        buildingLength: formData.buildingLength || 0,
        buildingWidth: formData.buildingWidth || 0,
        city: formData.city,
        state: formData.state
      };
      
      const result = validateWindLoadInputs(validationInput);
      
      // Enhanced validation with cross-component checks
      const enhancedResult = await performCrossComponentValidation(formData, result);
      
      setValidationState(enhancedResult);
      
      // Add to history for undo/redo functionality
      setValidationHistory(prev => {
        const newHistory = [enhancedResult, ...prev.slice(0, 9)]; // Keep last 10
        return newHistory;
      });
      
      return enhancedResult;
    } catch (error) {
      console.error('Form validation error:', error);
      
      const errorResult: ValidationState = {
        isValid: false,
        errors: ['Validation error occurred'],
        warnings: []
      };
      
      setValidationState(errorResult);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Cross-component validation for complex interdependencies
  const performCrossComponentValidation = useCallback(async (
    formData: Partial<ProfessionalCalculationForm>, 
    baseResult: ValidationState
  ): Promise<ValidationState> => {
    const errors = [...baseResult.errors];
    const warnings = [...baseResult.warnings];

    // Professional mode validations
    if (formData.professionalMode) {
      if (!formData.riskCategory) {
        errors.push('Risk category is required for professional calculations');
      }
      
      if (formData.topographicFactor && (formData.topographicFactor < 1 || formData.topographicFactor > 3)) {
        warnings.push('Topographic factor should typically be between 1.0 and 3.0');
      }
      
      if (formData.effectiveWindArea && formData.effectiveWindArea < 10) {
        warnings.push('Effective wind area less than 10 sq ft may require special consideration');
      }
    }

    // Building geometry validations
    if (formData.buildingHeight && formData.buildingLength && formData.buildingWidth) {
      const aspectRatio = Math.max(formData.buildingLength, formData.buildingWidth) / 
                         Math.min(formData.buildingLength, formData.buildingWidth);
      
      if (aspectRatio > 5) {
        warnings.push('High aspect ratio building may require additional wind tunnel testing');
      }
      
      const heightToWidth = formData.buildingHeight / Math.min(formData.buildingLength, formData.buildingWidth);
      if (heightToWidth > 5) {
        warnings.push('Tall, slender building may require detailed dynamic analysis');
      }
    }

    // Enclosure classification validations
    if (formData.buildingClassification === 'partially_enclosed') {
      warnings.push('Partially enclosed buildings require careful internal pressure analysis');
      
      if (!formData.includeInternalPressure) {
        errors.push('Internal pressure must be included for partially enclosed buildings');
      }
    }

    // Location-specific validations
    if (formData.state && formData.city) {
      // Add specific state/local code warnings
      const highWindStates = ['FL', 'TX', 'LA', 'MS', 'AL', 'SC', 'NC'];
      if (highWindStates.includes(formData.state)) {
        warnings.push('High wind region - verify local amendments to building codes');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  // Debounced real-time validation
  const debouncedValidate = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    
    return (formData: Partial<ProfessionalCalculationForm>) => {
      if (!enableRealTimeValidation) return;
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        validateForm(formData);
      }, debounceMs);
    };
  }, [enableRealTimeValidation, debounceMs, validateForm]);

  const clearValidation = useCallback(() => {
    setValidationState({
      isValid: false,
      errors: [],
      warnings: []
    });
    setValidationHistory([]);
  }, []);

  // Get validation summary for display
  const validationSummary = useMemo(() => ({
    hasErrors: validationState.errors.length > 0,
    hasWarnings: validationState.warnings.length > 0,
    errorCount: validationState.errors.length,
    warningCount: validationState.warnings.length,
    isComplete: validationState.isValid && validationState.errors.length === 0,
    canProceed: validationState.errors.length === 0, // Warnings don't block
  }), [validationState]);

  // Get most recent validation from history
  const getPreviousValidation = useCallback((index: number = 0): ValidationState | null => {
    return validationHistory[index] || null;
  }, [validationHistory]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      validateForm({});
    }
  }, [validateOnMount, validateForm]);

  return {
    validationState,
    validationSummary,
    validationHistory,
    isValidating,
    validateForm,
    debouncedValidate,
    clearValidation,
    getPreviousValidation,
    // Utilities
    hasErrors: validationState.errors.length > 0,
    hasWarnings: validationState.warnings.length > 0,
    canProceed: validationState.errors.length === 0,
  };
}