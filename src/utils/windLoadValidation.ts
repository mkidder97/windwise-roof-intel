/**
 * Comprehensive input validation for wind load calculations
 * Implements ASCE 7 parameter validation with engineering safety ranges
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRanges {
  min: number;
  max: number;
  typicalMin: number;
  typicalMax: number;
  unit: string;
}

// ASCE 7-22 based validation ranges
export const VALIDATION_RANGES = {
  height: {
    min: 5,
    max: 2000,
    typicalMin: 15,
    typicalMax: 500,
    unit: 'feet'
  },
  windSpeed: {
    min: 50,
    max: 300,
    typicalMin: 85,
    typicalMax: 250,
    unit: 'mph'
  },
  buildingLength: {
    min: 5,
    max: 10000,
    typicalMin: 10,
    typicalMax: 1000,
    unit: 'feet'
  },
  buildingWidth: {
    min: 5,
    max: 10000,
    typicalMin: 10,
    typicalMax: 1000,
    unit: 'feet'
  },
  effectiveArea: {
    min: 1,
    max: 100000,
    typicalMin: 10,
    typicalMax: 10000,
    unit: 'sq ft'
  }
} as const;

/**
 * Validates a numeric parameter against defined ranges
 */
export function validateParameter(
  value: number,
  paramName: keyof typeof VALIDATION_RANGES,
  label: string
): ValidationResult {
  const range = VALIDATION_RANGES[paramName];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check absolute limits
  if (value < range.min) {
    errors.push(`${label} must be at least ${range.min} ${range.unit}`);
  }
  if (value > range.max) {
    errors.push(`${label} cannot exceed ${range.max} ${range.unit}`);
  }

  // Check typical engineering ranges
  if (value < range.typicalMin && value >= range.min) {
    warnings.push(`${label} of ${value} ${range.unit} is below typical range (${range.typicalMin}-${range.typicalMax} ${range.unit}). Consider manual verification.`);
  }
  if (value > range.typicalMax && value <= range.max) {
    warnings.push(`${label} of ${value} ${range.unit} is above typical range (${range.typicalMin}-${range.typicalMax} ${range.unit}). Consider manual verification.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates building geometry for structural reasonableness
 */
export function validateBuildingGeometry(
  length: number,
  width: number,
  height: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Aspect ratio validation
  const aspectRatio = Math.max(length, width) / Math.min(length, width);
  if (aspectRatio > 5) {
    warnings.push(`Building aspect ratio of ${aspectRatio.toFixed(1)}:1 is unusual. Verify wind directionality effects.`);
  }

  // Height to width ratio
  const heightToWidth = height / Math.min(length, width);
  if (heightToWidth > 5) {
    warnings.push(`Building height-to-width ratio of ${heightToWidth.toFixed(1)}:1 may require special consideration for dynamic effects.`);
  }

  // Minimum dimension checks
  if (Math.min(length, width) < 10) {
    warnings.push('Very small building dimensions may not be suitable for ASCE 7 main wind force procedures.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates exposure category against building location context
 */
export function validateExposureCategory(
  exposureCategory: string,
  buildingHeight: number,
  context?: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Height-specific exposure warnings
  if (exposureCategory === 'B' && buildingHeight > 30) {
    warnings.push('Exposure B is rarely applicable for buildings over 30 feet. Verify terrain conditions within 2600 feet.');
  }

  if (exposureCategory === 'D' && buildingHeight < 15) {
    warnings.push('Exposure D for low buildings should be verified - consider if building is actually in coastal area.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Cross-validates related parameters for engineering consistency
 */
export function validateParameterConsistency(params: {
  height: number;
  windSpeed: number;
  exposureCategory: string;
  buildingLength: number;
  buildingWidth: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // High wind speed validation
  if (params.windSpeed > 200) {
    warnings.push('Wind speeds above 200 mph require special consideration and may exceed typical structural capabilities.');
  }

  // Low building with high exposure
  if (params.height < 20 && params.exposureCategory === 'D') {
    warnings.push('Low buildings in Exposure D are uncommon. Verify coastal/open terrain conditions.');
  }

  // Tall building considerations
  if (params.height > 160) {
    warnings.push('Buildings over 160 feet may require dynamic analysis per ASCE 7 Section 26.11.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive validation for all wind load calculation inputs
 */
export function validateWindLoadInputs(inputs: {
  height: number;
  windSpeed: number;
  exposureCategory: string;
  buildingLength: number;
  buildingWidth: number;
  city?: string;
  state?: string;
}): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate individual parameters
  const heightValidation = validateParameter(inputs.height, 'height', 'Building height');
  const windSpeedValidation = validateParameter(inputs.windSpeed, 'windSpeed', 'Wind speed');
  const lengthValidation = validateParameter(inputs.buildingLength, 'buildingLength', 'Building length');
  const widthValidation = validateParameter(inputs.buildingWidth, 'buildingWidth', 'Building width');

  // Validate geometry
  const geometryValidation = validateBuildingGeometry(
    inputs.buildingLength,
    inputs.buildingWidth,
    inputs.height
  );

  // Validate exposure category
  const exposureValidation = validateExposureCategory(
    inputs.exposureCategory,
    inputs.height
  );

  // Cross-validate consistency
  const consistencyValidation = validateParameterConsistency(inputs);

  // Aggregate all results
  [heightValidation, windSpeedValidation, lengthValidation, widthValidation, 
   geometryValidation, exposureValidation, consistencyValidation].forEach(result => {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Validates opening area for building enclosure classification
 */
export function validateOpeningArea(
  openingArea: number,
  totalWallArea: number,
  location: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (openingArea < 0) {
    errors.push('Opening area cannot be negative');
  }

  if (openingArea > totalWallArea) {
    errors.push('Opening area cannot exceed total wall area');
  }

  const openingRatio = openingArea / totalWallArea;
  if (openingRatio > 0.8) {
    warnings.push(`Opening ratio of ${(openingRatio * 100).toFixed(1)}% is very high for ${location} wall. Verify structural adequacy.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}