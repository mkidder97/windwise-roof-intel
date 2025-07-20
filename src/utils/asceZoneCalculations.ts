/**
 * ASCE 7-22 Compliant Zone Calculations with Zone 1' Support
 * Implements professional-grade pressure zone analysis
 */

import { analyzeZone1PrimeRequirements, getZone1PrimePressureCoefficients } from './zone1PrimeDetection';

export interface PressureZone {
  id: string;
  type: 'field' | 'perimeter' | 'corner' | 'field_prime' | 'perimeter_prime' | 'corner_prime';
  name: string;
  gcp: number;
  area: number;
  netPressure: number;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isZone1Prime: boolean;
  description: string;
  asceReference: string;
}

export interface ZoneCalculationResults {
  zones: PressureZone[];
  zone1PrimeRequired: boolean;
  zone1PrimeAnalysis: any;
  maxPressure: number;
  controllingZone: string;
  affectedArea: {
    standard: number;
    zone1Prime: number;
    total: number;
  };
  professionalNotes: string[];
  calculations: {
    velocityPressure: number;
    internalPressure: {
      positive: number;
      negative: number;
    };
  };
}

/**
 * Calculate all pressure zones for a rectangular building with Zone 1' analysis
 */
export function calculateBuildingPressureZones(
  buildingLength: number,
  buildingWidth: number,
  buildingHeight: number,
  velocityPressure: number,
  exposureCategory: string,
  internalPressureCoefficients: { positive: number; negative: number },
  effectiveWindArea: number = 10
): ZoneCalculationResults {
  
  // Perform Zone 1' analysis
  const zone1PrimeAnalysis = analyzeZone1PrimeRequirements(
    buildingLength, buildingWidth, buildingHeight, exposureCategory, effectiveWindArea
  );

  const zones: PressureZone[] = [];
  const professionalNotes: string[] = [];

  // Calculate zone dimensions based on ASCE 7-22
  const cornerDimension = Math.min(
    buildingLength * 0.1,
    buildingWidth * 0.1,
    3 * buildingHeight,
    buildingLength / 10,
    buildingWidth / 10
  );

  // Ensure minimum corner size
  const finalCornerDim = Math.max(cornerDimension, 3);
  
  // Perimeter zone width (edge strips)
  const perimeterWidth = Math.min(
    buildingLength * 0.1,
    buildingWidth * 0.1,
    2 * buildingHeight,
    10
  );

  professionalNotes.push(`Corner zone dimension: ${finalCornerDim.toFixed(1)}' per ASCE 7-22`);
  professionalNotes.push(`Perimeter zone width: ${perimeterWidth.toFixed(1)}' per ASCE 7-22`);

  // Create zones based on Zone 1' requirements
  if (zone1PrimeAnalysis.isRequired) {
    zones.push(...createZone1PrimeZones(
      buildingLength, buildingWidth, finalCornerDim, perimeterWidth,
      velocityPressure, internalPressureCoefficients, effectiveWindArea, zone1PrimeAnalysis
    ));
    professionalNotes.push(`Zone 1' required: ${zone1PrimeAnalysis.explanation}`);
  } else {
    zones.push(...createStandardZones(
      buildingLength, buildingWidth, finalCornerDim, perimeterWidth,
      velocityPressure, internalPressureCoefficients, effectiveWindArea
    ));
    professionalNotes.push('Standard zones apply - no Zone 1\' enhancement required');
  }

  // Calculate areas
  const zone1PrimeZones = zones.filter(z => z.isZone1Prime);
  const standardZones = zones.filter(z => !z.isZone1Prime);
  
  const affectedArea = {
    standard: standardZones.reduce((sum, z) => sum + z.area, 0),
    zone1Prime: zone1PrimeZones.reduce((sum, z) => sum + z.area, 0),
    total: zones.reduce((sum, z) => sum + z.area, 0)
  };

  // Debug logging
  console.log('🔧 Zone Calculation Debug:', {
    totalZones: zones.length,
    zoneTypes: zones.map(z => z.type),
    pressures: zones.map(z => ({ name: z.name, pressure: z.netPressure, gcp: z.gcp })),
    velocityPressure,
    internalPressure: internalPressureCoefficients
  });

  // Find controlling zone
  const maxPressure = Math.max(...zones.map(z => z.netPressure));
  const controllingZone = zones.find(z => z.netPressure === maxPressure)?.name || 'Unknown';

  return {
    zones,
    zone1PrimeRequired: zone1PrimeAnalysis.isRequired,
    zone1PrimeAnalysis,
    maxPressure,
    controllingZone,
    affectedArea,
    professionalNotes,
    calculations: {
      velocityPressure,
      internalPressure: internalPressureCoefficients
    }
  };
}

/**
 * Create Zone 1' enhanced pressure zones
 */
function createZone1PrimeZones(
  length: number,
  width: number,
  cornerDim: number,
  perimeterWidth: number,
  qz: number,
  gcpi: { positive: number; negative: number },
  effectiveWindArea: number,
  zone1PrimeAnalysis: any
): PressureZone[] {
  const zones: PressureZone[] = [];

  // Corner zones (Zone 1' enhanced)
  const cornerCoeff = getZone1PrimePressureCoefficients(
    zone1PrimeAnalysis.aspectRatio, zone1PrimeAnalysis.heightRatio, effectiveWindArea, 'corner'
  );
  
  const cornerPressure = qz * cornerCoeff.gcp;
  // Correct net pressure calculation: For suction (negative GCP), add internal pressure
  const cornerNetPressure = Math.abs(cornerPressure) + (qz * Math.abs(gcpi.positive));
  
  // Four corner zones
  const cornerArea = cornerDim * cornerDim;
  const cornerZones = [
    { id: 'corner-nw', name: 'Northwest Corner (Zone 1\')', x: 0, y: 0 },
    { id: 'corner-ne', name: 'Northeast Corner (Zone 1\')', x: length - cornerDim, y: 0 },
    { id: 'corner-sw', name: 'Southwest Corner (Zone 1\')', x: 0, y: width - cornerDim },
    { id: 'corner-se', name: 'Southeast Corner (Zone 1\')', x: length - cornerDim, y: width - cornerDim }
  ];

  cornerZones.forEach(corner => {
    zones.push({
      id: corner.id,
      type: 'corner_prime',
      name: corner.name,
      gcp: cornerCoeff.gcp,
      area: cornerArea,
      netPressure: cornerNetPressure,
      location: {
        x: corner.x,
        y: corner.y,
        width: cornerDim,
        height: cornerDim
      },
      isZone1Prime: true,
      description: `Enhanced corner zone with ${zone1PrimeAnalysis.pressureIncrease}% increase`,
      asceReference: cornerCoeff.source
    });
  });

  // Always create standard corner zones (Zone 1)
  const standardCornerCoeff = getZone1PrimePressureCoefficients(1.0, 0.5, effectiveWindArea, 'corner');
  const standardCornerPressure = qz * standardCornerCoeff.gcp;
  const standardCornerNetPressure = Math.abs(standardCornerPressure) + (qz * Math.abs(gcpi.positive));
  
  const standardCornerZones = [
    { id: 'corner-std-nw', name: 'Northwest Corner', x: 0, y: 0 },
    { id: 'corner-std-ne', name: 'Northeast Corner', x: length - cornerDim, y: 0 },
    { id: 'corner-std-sw', name: 'Southwest Corner', x: 0, y: width - cornerDim },
    { id: 'corner-std-se', name: 'Southeast Corner', x: length - cornerDim, y: width - cornerDim }
  ];

  standardCornerZones.forEach(corner => {
    zones.push({
      id: corner.id,
      type: 'corner',
      name: corner.name,
      gcp: standardCornerCoeff.gcp,
      area: cornerArea,
      netPressure: standardCornerNetPressure,
      location: {
        x: corner.x,
        y: corner.y,
        width: cornerDim,
        height: cornerDim
      },
      isZone1Prime: false,
      description: 'Standard corner zone (Zone 1)',
      asceReference: standardCornerCoeff.source
    });
  });

  // Always create standard perimeter zone (Zone 2)
  const perimeterCoeff = getZone1PrimePressureCoefficients(1.0, 0.5, effectiveWindArea, 'perimeter');
  const perimeterPressure = qz * perimeterCoeff.gcp;
  const perimeterNetPressure = Math.abs(perimeterPressure) + (qz * Math.abs(gcpi.positive));

  zones.push({
    id: 'perimeter-north',
    type: 'perimeter',
    name: 'North Perimeter',
    gcp: perimeterCoeff.gcp,
    area: (length - 2 * cornerDim) * perimeterWidth,
    netPressure: perimeterNetPressure,
    location: {
      x: cornerDim,
      y: 0,
      width: length - 2 * cornerDim,
      height: perimeterWidth
    },
    isZone1Prime: false,
    description: 'Standard perimeter zone (Zone 2)',
    asceReference: 'ASCE 7-22 Figure 26.11-1'
  });

  // Enhanced perimeter zones for highly elongated buildings (Zone 1' perimeter)
  if (zone1PrimeAnalysis.aspectRatio >= 3.0) {
    const enhancedPerimeterCoeff = getZone1PrimePressureCoefficients(
      zone1PrimeAnalysis.aspectRatio, zone1PrimeAnalysis.heightRatio, effectiveWindArea, 'perimeter'
    );
    
    const enhancedPerimeterPressure = qz * enhancedPerimeterCoeff.gcp;
    const enhancedPerimeterNetPressure = Math.abs(enhancedPerimeterPressure) + (qz * Math.abs(gcpi.positive));

    zones.push({
      id: 'perimeter-north-prime',
      type: 'perimeter_prime',
      name: 'North Perimeter (Zone 1\')',
      gcp: enhancedPerimeterCoeff.gcp,
      area: (length - 2 * cornerDim) * perimeterWidth,
      netPressure: enhancedPerimeterNetPressure,
      location: {
        x: cornerDim,
        y: 0,
        width: length - 2 * cornerDim,
        height: perimeterWidth
      },
      isZone1Prime: true,
      description: 'Enhanced perimeter zone for elongated building',
      asceReference: enhancedPerimeterCoeff.source
    });
  }

  // Field zone (center area)
  const fieldCoeff = getZone1PrimePressureCoefficients(
    zone1PrimeAnalysis.aspectRatio, zone1PrimeAnalysis.heightRatio, effectiveWindArea, 'field'
  );
  
  const fieldPressure = qz * fieldCoeff.gcp;
  const fieldNetPressure = Math.abs(fieldPressure) + (qz * Math.abs(gcpi.positive));
  
  const fieldWidth = width - 2 * perimeterWidth;
  const fieldLength = length - 2 * perimeterWidth;
  
  if (fieldWidth > 0 && fieldLength > 0) {
    zones.push({
      id: 'field-center',
      type: 'field',
      name: 'Field Zone',
      gcp: fieldCoeff.gcp,
      area: fieldLength * fieldWidth,
      netPressure: fieldNetPressure,
      location: {
        x: perimeterWidth,
        y: perimeterWidth,
        width: fieldLength,
        height: fieldWidth
      },
      isZone1Prime: false,
      description: 'Interior field zone',
      asceReference: fieldCoeff.source
    });
  }

  return zones;
}

/**
 * Create standard pressure zones (no Zone 1' enhancement)
 */
function createStandardZones(
  length: number,
  width: number,
  cornerDim: number,
  perimeterWidth: number,
  qz: number,
  gcpi: { positive: number; negative: number },
  effectiveWindArea: number
): PressureZone[] {
  const zones: PressureZone[] = [];

  // Standard corner zones
  const cornerCoeff = getZone1PrimePressureCoefficients(1.0, 0.5, effectiveWindArea, 'corner');
  const cornerPressure = qz * cornerCoeff.gcp;
  const cornerNetPressure = Math.abs(cornerPressure) + (qz * Math.abs(gcpi.positive));
  
  const cornerArea = cornerDim * cornerDim;
  const cornerZones = [
    { id: 'corner-nw', name: 'Northwest Corner', x: 0, y: 0 },
    { id: 'corner-ne', name: 'Northeast Corner', x: length - cornerDim, y: 0 },
    { id: 'corner-sw', name: 'Southwest Corner', x: 0, y: width - cornerDim },
    { id: 'corner-se', name: 'Southeast Corner', x: length - cornerDim, y: width - cornerDim }
  ];

  cornerZones.forEach(corner => {
    zones.push({
      id: corner.id,
      type: 'corner',
      name: corner.name,
      gcp: cornerCoeff.gcp,
      area: cornerArea,
      netPressure: cornerNetPressure,
      location: {
        x: corner.x,
        y: corner.y,
        width: cornerDim,
        height: cornerDim
      },
      isZone1Prime: false,
      description: 'Standard corner zone',
      asceReference: cornerCoeff.source
    });
  });

  // Standard perimeter zones
  const perimeterCoeff = getZone1PrimePressureCoefficients(1.0, 0.5, effectiveWindArea, 'perimeter');
  const perimeterPressure = qz * perimeterCoeff.gcp;
  const perimeterNetPressure = Math.abs(perimeterPressure) + (qz * Math.abs(gcpi.positive));

  zones.push({
    id: 'perimeter-north',
    type: 'perimeter',
    name: 'North Perimeter',
    gcp: perimeterCoeff.gcp,
    area: (length - 2 * cornerDim) * perimeterWidth,
    netPressure: perimeterNetPressure,
    location: {
      x: cornerDim,
      y: 0,
      width: length - 2 * cornerDim,
      height: perimeterWidth
    },
    isZone1Prime: false,
    description: 'Standard perimeter zone',
    asceReference: perimeterCoeff.source
  });

  // Field zone
  const fieldCoeff = getZone1PrimePressureCoefficients(1.0, 0.5, effectiveWindArea, 'field');
  const fieldPressure = qz * fieldCoeff.gcp;
  const fieldNetPressure = Math.abs(fieldPressure) + (qz * Math.abs(gcpi.positive));
  
  const fieldWidth = width - 2 * perimeterWidth;
  const fieldLength = length - 2 * perimeterWidth;
  
  if (fieldWidth > 0 && fieldLength > 0) {
    zones.push({
      id: 'field-center',
      type: 'field',
      name: 'Field Zone',
      gcp: fieldCoeff.gcp,
      area: fieldLength * fieldWidth,
      netPressure: fieldNetPressure,
      location: {
        x: perimeterWidth,
        y: perimeterWidth,
        width: fieldLength,
        height: fieldWidth
      },
      isZone1Prime: false,
      description: 'Interior field zone',
      asceReference: fieldCoeff.source
    });
  }

  return zones;
}

/**
 * Get professional validation summary
 */
export function getZoneCalculationSummary(results: ZoneCalculationResults): string {
  const { zones, zone1PrimeRequired, zone1PrimeAnalysis, affectedArea } = results;
  
  let summary = `Pressure zone analysis complete for building. `;
  
  if (zone1PrimeRequired) {
    summary += `Zone 1' enhancement required due to ${zone1PrimeAnalysis.aspectRatio.toFixed(1)}:1 aspect ratio. `;
    summary += `Enhanced zones cover ${affectedArea.zone1Prime.toFixed(0)} sq ft (${((affectedArea.zone1Prime/affectedArea.total)*100).toFixed(1)}% of roof). `;
    summary += `Pressure increase: ${zone1PrimeAnalysis.pressureIncrease}%. `;
  } else {
    summary += `Standard zones apply - no Zone 1' enhancement required. `;
  }
  
  summary += `Controlling zone: ${results.controllingZone} at ${results.maxPressure.toFixed(1)} psf. `;
  summary += `Total analyzed area: ${affectedArea.total.toFixed(0)} sq ft across ${zones.length} zones.`;
  
  return summary;
}