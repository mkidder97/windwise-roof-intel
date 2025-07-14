import { useState, useEffect } from 'react';
import { validateWindLoadInputs } from '@/utils/windLoadValidation';
import type { ProfessionalCalculationForm, ValidationState } from '@/types/wind-calculator';

export function useValidation() {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: false,
    errors: [],
    warnings: []
  });

  const validateForm = (formData: Partial<ProfessionalCalculationForm>) => {
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
      
      setValidationState({
        isValid: result.isValid,
        errors: result.errors || [],
        warnings: result.warnings || []
      });
      
      return result;
    } catch (error) {
      console.error('Form validation error:', error);
      
      setValidationState({
        isValid: false,
        errors: ['Validation error occurred'],
        warnings: []
      });
      
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        warnings: []
      };
    }
  };

  const clearValidation = () => {
    setValidationState({
      isValid: false,
      errors: [],
      warnings: []
    });
  };

  return {
    validationState,
    validateForm,
    clearValidation
  };
}