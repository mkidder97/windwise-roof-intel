/**
 * Smart Zone 1' Detection Engine
 * Implements ASCE 7-22 Zone 1' (Zone 1 Prime) requirements for elongated buildings
 */

export interface Zone1PrimeAnalysis {
  isRequired: boolean;
  triggers: Zone1PrimeTrigger[];
  aspectRatio: number;
  heightRatio: number;
  recommendedZones: Zone1PrimeZone[];
  pressureIncrease: number;
  confidence: number;
  explanation: string;
  asceReference: string;
  warnings: string[];
}

export interface Zone1PrimeTrigger {
  type: 'aspect_ratio' | 'height_ratio' | 'exposure_effect' | 'component_size';
  triggered: boolean;
  value: number;
  threshold: number;
  description: string;
  impact: string;
}

export interface Zone1PrimeZone {
  type: 'corner_1_prime' | 'perimeter_1_prime';
  location: string;
  pressureCoefficient: number;
  affectedArea: number;
  description: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Analyze building for Zone 1' requirements
 */
export function analyzeZone1PrimeRequirements(
  buildingLength: number,
  buildingWidth: number,
  buildingHeight: number,
  exposureCategory: string,
  effectiveWindArea: number = 10
): Zone1PrimeAnalysis {
  // Calculate aspect ratios
  const lengthToWidth = buildingLength / buildingWidth;
  const widthToLength = buildingWidth / buildingLength;
  const aspectRatio = Math.max(lengthToWidth, widthToLength);
  
  // Calculate height ratio (h/D where D is across-wind dimension)
  const acrossWindDimension = Math.min(buildingLength, buildingWidth);
  const heightRatio = buildingHeight / acrossWindDimension;
  
  // Initialize triggers
  const triggers: Zone1PrimeTrigger[] = [
    {
      type: 'aspect_ratio',
      triggered: aspectRatio >= 2.0,
      value: aspectRatio,
      threshold: 2.0,
      description: 'Building aspect ratio (L/W or W/L)',
      impact: aspectRatio >= 2.0 ? `${aspectRatio.toFixed(1)}:1 ratio creates wind acceleration at corners` : 'Standard wind flow patterns'
    },
    {
      type: 'height_ratio',
      triggered: heightRatio >= 1.0,
      value: heightRatio,
      threshold: 1.0,
      description: 'Height to across-wind dimension ratio (h/D)',
      impact: heightRatio >= 1.0 ? 'Tall building enhances corner wind effects' : 'Low-profile building'
    },
    {
      type: 'exposure_effect',
      triggered: (exposureCategory === 'C' || exposureCategory === 'D') && aspectRatio >= 2.0,
      value: aspectRatio,
      threshold: 2.0,
      description: 'Exposure category enhancement',
      impact: (exposureCategory === 'C' || exposureCategory === 'D') && aspectRatio >= 2.0 ? 
        'Open terrain amplifies elongated building effects' : 'Sheltered or standard conditions'
    },
    {
      type: 'component_size',
      triggered: effectiveWindArea <= 10,
      value: effectiveWindArea,
      threshold: 10,
      description: 'Small component tributary area',
      impact: effectiveWindArea <= 10 ? 'Small elements see higher localized pressures' : 'Large tributary areas'
    }
  ];

  // Determine if Zone 1' is required
  const aspectTrigger = triggers.find(t => t.type === 'aspect_ratio')!;
  const heightTrigger = triggers.find(t => t.type === 'height_ratio')!;
  const exposureTrigger = triggers.find(t => t.type === 'exposure_effect')!;
  
  const isRequired = aspectTrigger.triggered || (heightTrigger.triggered && aspectRatio >= 1.5);
  
  // Calculate pressure increase percentage
  let pressureIncrease = 0;
  if (isRequired) {
    if (aspectRatio >= 3.0) pressureIncrease = 30;
    else if (aspectRatio >= 2.5) pressureIncrease = 25;
    else if (aspectRatio >= 2.0) pressureIncrease = 20;
    else if (heightRatio >= 1.0) pressureIncrease = 15;
    
    // Exposure category bonus
    if (exposureTrigger.triggered) pressureIncrease += 5;
  }

  // Generate Zone 1' zones if required
  const recommendedZones: Zone1PrimeZone[] = [];
  if (isRequired) {
    // Corner zones (Zone 1')
    const cornerSize = Math.min(buildingLength * 0.1, buildingWidth * 0.1, buildingHeight * 0.5);
    const corner1PrimeGcp = aspectRatio >= 2.5 ? -3.2 : -2.8;
    
    recommendedZones.push(
      {
        type: 'corner_1_prime',
        location: 'Windward corners',
        pressureCoefficient: corner1PrimeGcp,
        affectedArea: cornerSize * cornerSize * 4, // 4 corners
        description: `Enhanced corner zones: ${cornerSize.toFixed(0)}' × ${cornerSize.toFixed(0)}'`,
        coordinates: { x: 0, y: 0, width: cornerSize, height: cornerSize }
      }
    );

    // Perimeter zones if highly elongated
    if (aspectRatio >= 3.0) {
      const perimeter1PrimeGcp = -2.0;
      recommendedZones.push({
        type: 'perimeter_1_prime',
        location: 'Leading edge perimeter',
        pressureCoefficient: perimeter1PrimeGcp,
        affectedArea: Math.min(buildingLength, buildingWidth) * buildingHeight * 0.1,
        description: 'Enhanced perimeter zones along leading edge',
        coordinates: { x: cornerSize, y: 0, width: Math.min(buildingLength, buildingWidth) - 2*cornerSize, height: cornerSize }
      });
    }
  }

  // Calculate confidence level
  let confidence = 95;
  if (aspectRatio < 1.8 && heightRatio < 0.8) confidence = 85;
  if (effectiveWindArea > 100) confidence -= 5;

  // Generate explanation
  const explanation = generateZone1PrimeExplanation(
    aspectRatio, heightRatio, pressureIncrease, isRequired, buildingLength, buildingWidth
  );

  // Generate warnings
  const warnings: string[] = [];
  if (isRequired && pressureIncrease > 25) {
    warnings.push('High pressure increase detected - requires professional engineering review');
  }
  if (aspectRatio >= 4.0) {
    warnings.push('Extremely elongated building - consider wind tunnel testing');
  }
  if (heightRatio >= 2.0) {
    warnings.push('Very tall building - additional analysis may be required');
  }

  return {
    isRequired,
    triggers,
    aspectRatio,
    heightRatio,
    recommendedZones,
    pressureIncrease,
    confidence,
    explanation,
    asceReference: 'ASCE 7-16/7-22 Figure 26.11-1A, Section 26.11.1',
    warnings
  };
}

/**
 * Generate user-friendly explanation of Zone 1' requirements
 */
function generateZone1PrimeExplanation(
  aspectRatio: number,
  heightRatio: number,
  pressureIncrease: number,
  isRequired: boolean,
  length: number,
  width: number
): string {
  if (!isRequired) {
    return `This ${length}' × ${width}' building has a ${aspectRatio.toFixed(1)}:1 aspect ratio, which creates standard wind flow patterns. Zone 1' enhanced pressures are not required.`;
  }

  let explanation = `This ${length}' × ${width}' building requires Zone 1' enhanced pressures because it's ${aspectRatio.toFixed(1)} times longer than wide. `;
  
  if (aspectRatio >= 3.0) {
    explanation += 'Highly elongated buildings create significant wind acceleration around corners, ';
  } else if (aspectRatio >= 2.5) {
    explanation += 'Elongated buildings cause wind to accelerate around corners, ';
  } else {
    explanation += 'The building geometry causes enhanced wind effects at corners, ';
  }
  
  explanation += `resulting in ${pressureIncrease}% higher loads than standard calculations. `;
  
  if (heightRatio >= 1.0) {
    explanation += `The building's height (${heightRatio.toFixed(1)}× the width) further amplifies these effects. `;
  }
  
  explanation += 'These enhanced zones affect corner areas and require stronger fastening patterns for safety.';
  
  return explanation;
}

/**
 * Get Zone 1' pressure coefficients based on building geometry
 */
export function getZone1PrimePressureCoefficients(
  aspectRatio: number,
  heightRatio: number,
  effectiveWindArea: number,
  zone: 'corner' | 'perimeter' | 'field'
): { gcp: number; isZone1Prime: boolean; source: string } {
  // Determine if this qualifies for Zone 1'
  const isZone1Prime = aspectRatio >= 2.0 || (heightRatio >= 1.0 && aspectRatio >= 1.5);
  
  if (!isZone1Prime) {
    // Standard zones
    return getStandardPressureCoefficients(effectiveWindArea, zone);
  }

  // Zone 1' pressure coefficients
  let gcp: number;
  switch (zone) {
    case 'corner':
      if (aspectRatio >= 3.0) gcp = effectiveWindArea <= 10 ? -3.4 : -3.0;
      else if (aspectRatio >= 2.5) gcp = effectiveWindArea <= 10 ? -3.2 : -2.8;
      else gcp = effectiveWindArea <= 10 ? -2.8 : -2.5;
      break;
    case 'perimeter':
      if (aspectRatio >= 3.0) gcp = effectiveWindArea <= 10 ? -2.2 : -1.8;
      else gcp = effectiveWindArea <= 10 ? -2.0 : -1.6;
      break;
    case 'field':
      // Field zones typically don't get Zone 1' enhancement
      gcp = effectiveWindArea <= 10 ? -1.0 : -0.8;
      break;
  }

  return {
    gcp,
    isZone1Prime: true,
    source: `ASCE 7-22 Figure 26.11-1A (Zone 1')`
  };
}

/**
 * Standard pressure coefficients for non-Zone 1' buildings
 */
function getStandardPressureCoefficients(
  effectiveWindArea: number,
  zone: 'corner' | 'perimeter' | 'field'
): { gcp: number; isZone1Prime: boolean; source: string } {
  let gcp: number;
  switch (zone) {
    case 'corner':
      gcp = effectiveWindArea <= 10 ? -2.5 : (effectiveWindArea <= 100 ? -2.4 : -2.0);
      break;
    case 'perimeter':
      gcp = effectiveWindArea <= 10 ? -1.5 : (effectiveWindArea <= 100 ? -1.4 : -1.2);
      break;
    case 'field':
      gcp = effectiveWindArea <= 10 ? -1.0 : (effectiveWindArea <= 100 ? -0.9 : -0.8);
      break;
  }

  return {
    gcp,
    isZone1Prime: false,
    source: 'ASCE 7-16 Figure 26.11-1'
  };
}