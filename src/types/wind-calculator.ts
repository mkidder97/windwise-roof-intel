export interface ProfessionalCalculationForm {
  // Basic project information
  projectName: string;
  buildingHeight: number;
  buildingLength: number;
  buildingWidth: number;
  city: string;
  state: string;
  exposureCategory: "B" | "C" | "D";
  roofType: string;
  deckType: string;
  asceEdition: string;
  topographicFactor: number;
  directionalityFactor: number;
  calculationMethod: "component_cladding" | "mwfrs";
  
  // Professional classification
  buildingClassification: "enclosed" | "partially_enclosed" | "open";
  riskCategory: "I" | "II" | "III" | "IV";
  includeInternalPressure: boolean;
  professionalMode: boolean;

  // Advanced professional features
  customWindSpeed?: number;
  windSpeedJustification?: string;
  topographicType: "none" | "hill" | "ridge" | "escarpment";
  hillHeight?: number;
  distanceFromCrest?: number;
  openingRatio?: number;
  effectiveWindArea?: number;
  engineeringNotes?: string;
  projectPhotos?: string[];
  
  // Project management
  projectId?: string;
  revisionNumber?: number;
  parentCalculationId?: string;
}

export interface ProfessionalCalculationResults {
  // Basic wind parameters
  windSpeed: number;
  windSpeedSource: "database" | "interpolated" | "custom" | "noaa";
  velocityPressure: number;
  kzContinuous: number;
  
  // Multi-zone pressures with area-dependent coefficients
  fieldPrimePressure?: number;
  fieldPressure: number;
  perimeterPressure: number;
  cornerPressure: number;
  maxPressure: number;
  controllingZone: string;
  
  // Internal pressure calculations
  gcpiPositive?: number;
  gcpiNegative?: number;
  netPressureField?: number;
  netPressurePerimeter?: number;
  netPressureCorner?: number;
  
  // Professional validation and metadata
  professionalAccuracy: boolean;
  internalPressureIncluded: boolean;
  peReady: boolean;
  calculationId?: string;
  
  // Validation flags and warnings
  requiresSpecialAnalysis: boolean;
  simplifiedMethodApplicable: boolean;
  uncertaintyBounds: {
    lower: number;
    upper: number;
    confidence: number;
  };
  warnings: string[];
  asceReferences: string[];
  
  // Calculation methodology
  methodologyUsed: string;
  assumptions: string[];
  
  // Backward compatibility
  kzFactor?: number;
}

export interface WindSpeedData {
  value: number;
  source: "database" | "interpolated" | "custom" | "manual";
  confidence: number;
  justification?: string;
  city?: string;
  state?: string;
  asceEdition?: string;
}

export interface BuildingDimensions {
  height: number;
  length: number;
  width: number;
  roofType: string;
  deckType: string;
}

export interface LocationData {
  city: string;
  state: string;
}

export interface ASCEParameters {
  edition: string;
  exposureCategory: "B" | "C" | "D";
  topographicFactor: number;
  directionalityFactor: number;
  calculationMethod: "component_cladding" | "mwfrs";
}

export interface ProfessionalParameters {
  buildingClassification: "enclosed" | "partially_enclosed" | "open";
  riskCategory: "I" | "II" | "III" | "IV";
  includeInternalPressure: boolean;
  topographicType: "none" | "hill" | "ridge" | "escarpment";
  hillHeight?: number;
  distanceFromCrest?: number;
  effectiveWindArea?: number;
  engineeringNotes?: string;
}

export interface BuildingOpening {
  id: string;
  type: 'window' | 'door' | 'vent' | 'garage';
  width: number;
  height: number;
  area: number;
  location: 'windward' | 'leeward' | 'side';
  glazingType?: 'ordinary' | 'impact_resistant';
  failurePressure?: number;
  isGlazed: boolean;
  canFail: boolean;
  x: number;
  y: number;
}

export interface ValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const exposureDescriptions = {
  B: "Urban/Suburban - Buildings, forests",
  C: "Open Terrain - Scattered obstructions",
  D: "Flat/Open Water - Unobstructed areas"
} as const;

export const asceEditions = [
  "ASCE 7-10",
  "ASCE 7-16", 
  "ASCE 7-22",
  "ASCE 7-24"
] as const;

export const roofTypes = [
  "Flat/Low Slope",
  "Steep Slope",
  "Curved",
  "Shed"
] as const;

export const deckTypes = [
  "Concrete",
  "Steel",
  "Wood",
  "Gypsum",
  "Lightweight Concrete"
] as const;