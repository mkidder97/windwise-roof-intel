import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuildingGeometry {
  shape: 'rectangle' | 'l_shape' | 'complex';
  dimensions: {
    length: number;
    width: number;
    height: number;
    // L-shape specific dimensions
    length1?: number;
    width1?: number;
    length2?: number;
    width2?: number;
    // Offset for L-shape positioning
    offsetX?: number;
    offsetY?: number;
    [key: string]: any;
  };
  name?: string;
}

interface ValidationWarning {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  asceReference?: string;
  recommendation?: string;
}

interface ValidationResult {
  isValid: boolean;
  complexity: 'basic' | 'intermediate' | 'complex';
  warnings: ValidationWarning[];
  requiresProfessionalAnalysis: boolean;
  confidenceLevel: number; // 0-100
  recommendations: string[];
}

interface ZoneResult {
  type: 'field' | 'perimeter' | 'corner';
  area: number;
  boundaries: Array<{x: number; y: number}>; // Coordinate array for complex shapes
  pressureCoefficient: number;
  description: string;
  zoneWidth?: number; // For ASCE 7 compliance documentation
  uncertaintyBounds?: {
    lower: number;
    upper: number;
  };
}

interface EffectiveWindArea {
  elementType: 'fastener' | 'panel' | 'structural_member';
  zoneLocation: 'field' | 'perimeter' | 'corner';
  spacingX: number;
  spacingY: number;
  effectiveArea: number;
  designPressure: number;
}

interface CalculationResponse {
  zones: ZoneResult[];
  pressures: {
    field: number;
    perimeter: number;
    corner: number;
    internal?: {
      positive: number;
      negative: number;
    };
  };
  effectiveAreas: EffectiveWindArea[];
  validation: ValidationResult;
  metadata: {
    calculationMethod: string;
    asceEdition: string;
    windParameters: {
      windSpeed: number;
      exposureCategory: string;
      height: number;
    };
    uncertaintyBounds: {
      lower: number;
      upper: number;
    };
  };
}

// Comprehensive validation system
function validateGeometry(geometry: BuildingGeometry, windSpeed: number, exposureCategory: string): ValidationResult {
  const warnings: ValidationWarning[] = [];
  const recommendations: string[] = [];
  let complexity: 'basic' | 'intermediate' | 'complex' = 'basic';
  let requiresProfessionalAnalysis = false;
  let confidenceLevel = 100;
  
  const { length, width, height } = geometry.dimensions;
  
  // 1. Input Validation
  if (!length || !width || !height || length <= 0 || width <= 0 || height <= 0) {
    return { 
      isValid: false, 
      complexity: 'basic', 
      warnings: [{ severity: 'critical', message: 'Invalid building dimensions provided' }],
      requiresProfessionalAnalysis: true,
      confidenceLevel: 0,
      recommendations: ['Verify building dimensions and re-submit calculation']
    };
  }
  
  // Dimension reasonableness checks
  if (length < 10 || width < 10) {
    warnings.push({
      severity: 'warning',
      message: 'Very small building dimensions detected',
      recommendation: 'Verify measurements are in correct units (feet)'
    });
    confidenceLevel -= 10;
  }
  
  if (length > 1000 || width > 1000) {
    warnings.push({
      severity: 'warning',
      message: 'Very large building detected',
      asceReference: 'ASCE 7 Section 26.5',
      recommendation: 'Consider wind tunnel testing for large structures'
    });
    complexity = 'intermediate';
    confidenceLevel -= 15;
  }
  
  if (height < 5) {
    warnings.push({
      severity: 'info',
      message: 'Low-rise building confirmed',
      asceReference: 'ASCE 7 Section 26.2'
    });
  }
  
  if (height > 60) {
    warnings.push({
      severity: 'critical',
      message: 'Building exceeds low-rise classification (>60 ft)',
      asceReference: 'ASCE 7 Section 26.2',
      recommendation: 'High-rise building analysis required'
    });
    requiresProfessionalAnalysis = true;
    complexity = 'complex';
    confidenceLevel = 0;
  }
  
  // 2. Aspect ratio and geometry checks
  const aspectRatio = Math.max(length, width) / Math.min(length, width);
  if (aspectRatio > 3) {
    complexity = 'intermediate';
    confidenceLevel -= 10;
    warnings.push({
      severity: 'warning',
      message: `High aspect ratio detected (${aspectRatio.toFixed(1)}:1)`,
      recommendation: 'Consider additional wind analysis for elongated buildings'
    });
  }
  
  if (aspectRatio > 10) {
    warnings.push({
      severity: 'critical',
      message: 'Extremely high aspect ratio may invalidate simplified method',
      asceReference: 'ASCE 7 Section 26.5.1',
      recommendation: 'Professional wind analysis strongly recommended'
    });
    requiresProfessionalAnalysis = true;
    complexity = 'complex';
    confidenceLevel -= 25;
  }
  
  // Height to width ratio check
  const heightToWidth = height / Math.min(length, width);
  if (heightToWidth > 1) {
    complexity = 'intermediate';
    warnings.push({
      severity: 'warning',
      message: `Height-to-width ratio: ${heightToWidth.toFixed(1)}`,
      recommendation: 'Verify simplified method applicability'
    });
    confidenceLevel -= 5;
  }
  
  if (heightToWidth > 2.5) {
    warnings.push({
      severity: 'critical',
      message: 'Building height may require different analysis method',
      asceReference: 'ASCE 7 Section 26.5.1',
      recommendation: 'Consider analytical or wind tunnel procedure'
    });
    requiresProfessionalAnalysis = true;
    complexity = 'complex';
    confidenceLevel -= 20;
  }
  
  // 3. Shape-specific validation
  if (geometry.shape === 'l_shape') {
    complexity = 'intermediate';
    confidenceLevel -= 10;
    
    const { length1, width1, length2, width2 } = geometry.dimensions;
    if (!length1 || !width1 || !length2 || !width2) {
      warnings.push({
        severity: 'critical',
        message: 'Incomplete L-shape dimensions',
        recommendation: 'Provide all leg dimensions for accurate calculation'
      });
      return { 
        isValid: false, 
        complexity, 
        warnings,
        requiresProfessionalAnalysis: true,
        confidenceLevel: 0,
        recommendations: ['Complete L-shape dimensional input']
      };
    }
    
    // Validate L-shape proportions
    const leg1Area = length1 * width1;
    const leg2Area = length2 * width2;
    const totalApproxArea = leg1Area + leg2Area;
    
    if (Math.abs(leg1Area - leg2Area) / Math.max(leg1Area, leg2Area) > 0.5) {
      warnings.push({
        severity: 'warning',
        message: 'Significantly unequal L-shape legs detected',
        recommendation: 'Verify geometry and consider re-entrant corner effects'
      });
      confidenceLevel -= 10;
    }
    
    warnings.push({
      severity: 'info',
      message: 'L-shaped building requires careful zone definition at re-entrant corners',
      asceReference: 'ASCE 7 Figure 26.5-1'
    });
  }
  
  if (geometry.shape === 'complex') {
    complexity = 'complex';
    requiresProfessionalAnalysis = true;
    confidenceLevel = Math.min(confidenceLevel, 60);
    warnings.push({
      severity: 'critical',
      message: 'Complex geometry detected',
      asceReference: 'ASCE 7 Section 26.5.1',
      recommendation: 'Professional engineering review required'
    });
  }
  
  // 4. Wind parameter validation
  if (windSpeed < 85) {
    warnings.push({
      severity: 'info',
      message: 'Low wind speed region'
    });
  }
  
  if (windSpeed > 200) {
    warnings.push({
      severity: 'warning',
      message: 'High wind speed requires special attention',
      recommendation: 'Verify local wind speed requirements'
    });
    confidenceLevel -= 5;
  }
  
  if (!['B', 'C', 'D'].includes(exposureCategory)) {
    warnings.push({
      severity: 'critical',
      message: 'Invalid exposure category'
    });
    return { 
      isValid: false, 
      complexity, 
      warnings,
      requiresProfessionalAnalysis: true,
      confidenceLevel: 0,
      recommendations: ['Select valid exposure category (B, C, or D)']
    };
  }
  
  // 5. Professional requirements detection
  if (height > 30 && exposureCategory === 'D') {
    warnings.push({
      severity: 'warning',
      message: 'High building in open exposure',
      recommendation: 'Consider enhanced analysis for critical applications'
    });
    confidenceLevel -= 5;
  }
  
  // Generate recommendations
  if (complexity === 'intermediate') {
    recommendations.push('Consider professional review for critical applications');
  }
  
  if (complexity === 'complex' || requiresProfessionalAnalysis) {
    recommendations.push('Professional engineering analysis required');
    recommendations.push('Consider wind tunnel testing for critical structures');
  }
  
  if (confidenceLevel < 80) {
    recommendations.push('Verify results with alternative calculation methods');
  }
  
  return {
    isValid: true,
    complexity,
    warnings,
    requiresProfessionalAnalysis,
    confidenceLevel: Math.max(confidenceLevel, 0),
    recommendations
  };
}

// Enhanced rectangular zone calculation with ASCE 7 compliance
function calculateRectangularZones(geometry: BuildingGeometry): ZoneResult[] {
  const { length, width, height } = geometry.dimensions;
  const zones: ZoneResult[] = [];
  
  // ASCE 7 zone width calculations per Section 26.5
  const minDimension = Math.min(length, width);
  const cornerZoneSize = Math.min(0.1 * minDimension, 0.4 * height, 3.0);
  const perimeterZoneSize = Math.min(0.1 * minDimension, 0.4 * height, 10.0);
  
  // Ensure minimum zone sizes for very small buildings
  const actualCornerSize = Math.max(cornerZoneSize, 3.0);
  const actualPerimeterSize = Math.max(perimeterZoneSize, 3.0);
  
  // Corner zones (4 corners) with coordinate arrays
  const cornerArea = actualCornerSize * actualCornerSize;
  const cornerPositions = [
    { name: 'Southwest', x: 0, y: 0 },
    { name: 'Southeast', x: length - actualCornerSize, y: 0 },
    { name: 'Northwest', x: 0, y: width - actualCornerSize },
    { name: 'Northeast', x: length - actualCornerSize, y: width - actualCornerSize }
  ];
  
  cornerPositions.forEach((pos, i) => {
    zones.push({
      type: 'corner',
      area: cornerArea,
      boundaries: [
        { x: pos.x, y: pos.y },
        { x: pos.x + actualCornerSize, y: pos.y },
        { x: pos.x + actualCornerSize, y: pos.y + actualCornerSize },
        { x: pos.x, y: pos.y + actualCornerSize }
      ],
      pressureCoefficient: -2.0,
      description: `Corner Zone ${i + 1} (${pos.name})`,
      zoneWidth: actualCornerSize,
      uncertaintyBounds: { lower: -2.5, upper: -1.5 }
    });
  });
  
  // Perimeter zones (4 sides, excluding corners)
  const perimeterZones = [
    {
      name: 'South Edge',
      boundaries: [
        { x: actualCornerSize, y: 0 },
        { x: length - actualCornerSize, y: 0 },
        { x: length - actualCornerSize, y: actualPerimeterSize },
        { x: actualCornerSize, y: actualPerimeterSize }
      ],
      area: (length - 2 * actualCornerSize) * actualPerimeterSize
    },
    {
      name: 'North Edge',
      boundaries: [
        { x: actualCornerSize, y: width - actualPerimeterSize },
        { x: length - actualCornerSize, y: width - actualPerimeterSize },
        { x: length - actualCornerSize, y: width },
        { x: actualCornerSize, y: width }
      ],
      area: (length - 2 * actualCornerSize) * actualPerimeterSize
    },
    {
      name: 'West Edge',
      boundaries: [
        { x: 0, y: actualCornerSize },
        { x: actualPerimeterSize, y: actualCornerSize },
        { x: actualPerimeterSize, y: width - actualCornerSize },
        { x: 0, y: width - actualCornerSize }
      ],
      area: (width - 2 * actualCornerSize) * actualPerimeterSize
    },
    {
      name: 'East Edge',
      boundaries: [
        { x: length - actualPerimeterSize, y: actualCornerSize },
        { x: length, y: actualCornerSize },
        { x: length, y: width - actualCornerSize },
        { x: length - actualPerimeterSize, y: width - actualCornerSize }
      ],
      area: (width - 2 * actualCornerSize) * actualPerimeterSize
    }
  ];
  
  perimeterZones.forEach((zone, i) => {
    if (zone.area > 0) {
      zones.push({
        type: 'perimeter',
        area: zone.area,
        boundaries: zone.boundaries,
        pressureCoefficient: -1.4,
        description: `Perimeter Zone ${i + 1} (${zone.name})`,
        zoneWidth: actualPerimeterSize,
        uncertaintyBounds: { lower: -1.8, upper: -1.0 }
      });
    }
  });
  
  // Field zone (interior area)
  const fieldLength = length - 2 * actualPerimeterSize;
  const fieldWidth = width - 2 * actualPerimeterSize;
  const fieldArea = fieldLength * fieldWidth;
  
  if (fieldArea > 0) {
    zones.push({
      type: 'field',
      area: fieldArea,
      boundaries: [
        { x: actualPerimeterSize, y: actualPerimeterSize },
        { x: length - actualPerimeterSize, y: actualPerimeterSize },
        { x: length - actualPerimeterSize, y: width - actualPerimeterSize },
        { x: actualPerimeterSize, y: width - actualPerimeterSize }
      ],
      pressureCoefficient: -0.9,
      description: 'Field Zone (Interior)',
      uncertaintyBounds: { lower: -1.1, upper: -0.7 }
    });
  }
  
  return zones;
}

// Enhanced L-shape zone calculation with re-entrant corner handling
function calculateLShapeZones(geometry: BuildingGeometry): ZoneResult[] {
  const zones: ZoneResult[] = [];
  const { dimensions } = geometry;
  
  const length1 = dimensions.length1!;
  const width1 = dimensions.width1!;
  const length2 = dimensions.length2!;
  const width2 = dimensions.width2!;
  const height = dimensions.height;
  const offsetX = dimensions.offsetX || 0;
  const offsetY = dimensions.offsetY || 0;
  
  // Calculate zones for Leg 1 (primary leg)
  const leg1Geometry: BuildingGeometry = {
    shape: 'rectangle',
    dimensions: { length: length1, width: width1, height }
  };
  const leg1Zones = calculateRectangularZones(leg1Geometry);
  
  // Calculate zones for Leg 2 (secondary leg)
  const leg2Geometry: BuildingGeometry = {
    shape: 'rectangle',
    dimensions: { length: length2, width: width2, height }
  };
  const leg2Zones = calculateRectangularZones(leg2Geometry);
  
  // Add Leg 1 zones (no offset)
  zones.push(...leg1Zones.map(zone => ({
    ...zone,
    description: `Leg 1 - ${zone.description}`
  })));
  
  // Add Leg 2 zones with proper positioning
  zones.push(...leg2Zones.map(zone => ({
    ...zone,
    description: `Leg 2 - ${zone.description}`,
    boundaries: zone.boundaries.map(point => ({
      x: point.x + length1 + offsetX,
      y: point.y + offsetY
    }))
  })));
  
  // Calculate re-entrant corner zones
  const minDimension = Math.min(Math.min(length1, width1), Math.min(length2, width2));
  const reentrantSize = Math.min(0.1 * minDimension, 0.4 * height, 10.0);
  const actualReentrantSize = Math.max(reentrantSize, 5.0); // Minimum size for re-entrant
  
  // Primary re-entrant corner (inside corner of L)
  const reentrantX = length1;
  const reentrantY = width1;
  
  zones.push({
    type: 'corner',
    area: actualReentrantSize * actualReentrantSize,
    boundaries: [
      { x: reentrantX - actualReentrantSize, y: reentrantY - actualReentrantSize },
      { x: reentrantX, y: reentrantY - actualReentrantSize },
      { x: reentrantX, y: reentrantY },
      { x: reentrantX - actualReentrantSize, y: reentrantY }
    ],
    pressureCoefficient: -3.0, // Higher suction at re-entrant corners
    description: 'Re-entrant Corner Zone (Primary)',
    zoneWidth: actualReentrantSize,
    uncertaintyBounds: { lower: -3.5, upper: -2.5 }
  });
  
  // Additional re-entrant corner zones if legs create multiple inside corners
  if (width2 > width1) {
    // Additional corner zone for extended leg
    zones.push({
      type: 'corner',
      area: actualReentrantSize * actualReentrantSize,
      boundaries: [
        { x: reentrantX, y: width1 },
        { x: reentrantX + actualReentrantSize, y: width1 },
        { x: reentrantX + actualReentrantSize, y: width1 + actualReentrantSize },
        { x: reentrantX, y: width1 + actualReentrantSize }
      ],
      pressureCoefficient: -3.0,
      description: 'Re-entrant Corner Zone (Secondary)',
      zoneWidth: actualReentrantSize,
      uncertaintyBounds: { lower: -3.5, upper: -2.5 }
    });
  }
  
  // Enhanced perimeter zones at L-junction
  const junctionPerimeterSize = Math.max(actualReentrantSize, 8.0);
  
  // Junction perimeter zone along the inside edge
  zones.push({
    type: 'perimeter',
    area: (Math.min(length1, length2) - actualReentrantSize) * junctionPerimeterSize,
    boundaries: [
      { x: reentrantX - junctionPerimeterSize, y: reentrantY },
      { x: reentrantX, y: reentrantY },
      { x: reentrantX, y: reentrantY + Math.min(width2 - width1, 20) },
      { x: reentrantX - junctionPerimeterSize, y: reentrantY + Math.min(width2 - width1, 20) }
    ],
    pressureCoefficient: -2.2, // Enhanced pressure at junction
    description: 'L-Junction Perimeter Zone',
    zoneWidth: junctionPerimeterSize,
    uncertaintyBounds: { lower: -2.8, upper: -1.6 }
  });
  
  return zones;
}

// Enhanced effective wind area engine with ASCE 7 Table 26.5-1 compliance
function calculateEffectiveWindAreas(
  zones: ZoneResult[], 
  elementSpacing: { x: number; y: number },
  windSpeed: number,
  exposureCategory: string,
  height: number
): EffectiveWindArea[] {
  const effectiveAreas: EffectiveWindArea[] = [];
  const elementTypes = ['fastener', 'panel', 'structural_member'] as const;
  
  // ASCE 7 effective area multipliers for different element types
  const getEffectiveAreaMultiplier = (elementType: string): number => {
    switch (elementType) {
      case 'fastener': return 1.0;
      case 'panel': return 4.0;
      case 'structural_member': return 25.0; // Updated for larger structural elements
      default: return 1.0;
    }
  };
  
  // Area-dependent pressure coefficient adjustments (ASCE 7 Table 26.5-1)
  const getAreaDependentCoefficient = (effectiveArea: number, baseCoeff: number): number => {
    if (effectiveArea <= 10) {
      return baseCoeff * 1.0; // Full coefficient for small areas
    } else if (effectiveArea <= 100) {
      // Linear interpolation between 10 and 100 sq ft
      const factor = 1.0 - (effectiveArea - 10) / 90 * 0.25;
      return baseCoeff * factor;
    } else if (effectiveArea <= 500) {
      // Linear interpolation between 100 and 500 sq ft
      const factor = 0.75 - (effectiveArea - 100) / 400 * 0.15;
      return baseCoeff * factor;
    } else {
      return baseCoeff * 0.6; // Minimum coefficient for large areas
    }
  };
  
  zones.forEach(zone => {
    elementTypes.forEach(elementType => {
      const spacingMultiplier = getEffectiveAreaMultiplier(elementType);
      
      // Calculate tributary area
      const tributaryArea = elementSpacing.x * elementSpacing.y * spacingMultiplier / 144; // Convert to sq ft
      
      // Effective area is limited by zone area and maximum practical limits
      const maxEffectiveArea = elementType === 'fastener' ? 100 : 
                             elementType === 'panel' ? 500 : 1000;
      
      const effectiveArea = Math.min(tributaryArea, zone.area, maxEffectiveArea);
      
      // Apply area-dependent coefficient adjustment
      const adjustedCoefficient = getAreaDependentCoefficient(effectiveArea, Math.abs(zone.pressureCoefficient));
      
      // Calculate design pressure using proper ASCE 7 methodology
      const Kz = getVelocityPressureCoefficient(height, exposureCategory);
      const qz = 0.00256 * Kz * 0.85 * 1.0 * windSpeed * windSpeed; // Basic velocity pressure
      const designPressure = qz * adjustedCoefficient;
      
      effectiveAreas.push({
        elementType,
        zoneLocation: zone.type,
        spacingX: elementSpacing.x,
        spacingY: elementSpacing.y,
        effectiveArea,
        designPressure
      });
    });
  });
  
  return effectiveAreas;
}

// Velocity pressure coefficient calculation
function getVelocityPressureCoefficient(height: number, exposureCategory: string): number {
  const alpha = exposureCategory === 'B' ? 7.0 : exposureCategory === 'C' ? 9.5 : 11.5;
  const zg = exposureCategory === 'B' ? 1200 : exposureCategory === 'C' ? 900 : 700;
  
  if (height <= 15) {
    return exposureCategory === 'B' ? 0.7 : exposureCategory === 'C' ? 0.85 : 1.03;
  }
  
  return 2.01 * Math.pow(height / zg, 2 / alpha);
}

// Enhanced pressure calculation with full ASCE 7 methodology
function calculateWindPressures(
  windSpeed: number, 
  exposureCategory: string, 
  height: number,
  asceEdition: string
): { field: number; perimeter: number; corner: number; internal: { positive: number; negative: number } } {
  
  // ASCE 7 parameters
  const Kz = getVelocityPressureCoefficient(height, exposureCategory);
  const Kzt = 1.0; // Topographic factor (assumed flat terrain)
  const Kd = 0.85; // Directionality factor for buildings
  const I = 1.0; // Importance factor (Risk Category II)
  
  // Calculate velocity pressure
  const qz = 0.00256 * Kz * Kzt * Kd * I * windSpeed * windSpeed;
  
  // External pressure coefficients (ASCE 7 Figure 26.5-1)
  const GCp_field = -0.9;
  const GCp_perimeter = -1.4;
  const GCp_corner = -2.0;
  
  // Internal pressure coefficients (enclosed building)
  const GCpi_positive = 0.18;
  const GCpi_negative = -0.18;
  
  // Calculate design pressures
  const fieldPressure = qz * Math.abs(GCp_field);
  const perimeterPressure = qz * Math.abs(GCp_perimeter);
  const cornerPressure = qz * Math.abs(GCp_corner);
  
  // Internal pressures
  const internalPositive = qz * GCpi_positive;
  const internalNegative = qz * Math.abs(GCpi_negative);
  
  return {
    field: fieldPressure,
    perimeter: perimeterPressure,
    corner: cornerPressure,
    internal: {
      positive: internalPositive,
      negative: internalNegative
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Building zones calculation request received');
    
    const { 
      buildingGeometry, 
      windSpeed, 
      exposureCategory, 
      asceEdition,
      elementSpacing = { x: 12, y: 12 },
      professionalMode = false
    } = await req.json();
    
    console.log('Input parameters:', { 
      shape: buildingGeometry?.shape, 
      windSpeed, 
      exposureCategory, 
      asceEdition,
      professionalMode 
    });
    
    // Comprehensive input validation
    if (!buildingGeometry || !windSpeed || !exposureCategory || !asceEdition) {
      throw new Error('Missing required parameters: buildingGeometry, windSpeed, exposureCategory, asceEdition');
    }
    
    if (windSpeed < 20 || windSpeed > 300) {
      throw new Error('Wind speed must be between 20 and 300 mph');
    }
    
    if (!['B', 'C', 'D'].includes(exposureCategory)) {
      throw new Error('Exposure category must be B, C, or D');
    }
    
    if (!['ASCE 7-10', 'ASCE 7-16', 'ASCE 7-22'].includes(asceEdition)) {
      throw new Error('ASCE edition must be ASCE 7-10, 7-16, or 7-22');
    }
    
    console.log(`Calculating zones for ${buildingGeometry.shape} building`);
    
    // Comprehensive geometry validation
    const validation = validateGeometry(buildingGeometry, windSpeed, exposureCategory);
    if (!validation.isValid) {
      const errorMessages = validation.warnings
        .filter(w => w.severity === 'critical')
        .map(w => w.message);
      throw new Error(`Invalid geometry: ${errorMessages.join(', ')}`);
    }
    
    // Calculate zones based on building shape
    let zones: ZoneResult[] = [];
    
    switch (buildingGeometry.shape) {
      case 'rectangle':
        zones = calculateRectangularZones(buildingGeometry);
        console.log(`Calculated ${zones.length} zones for rectangular building`);
        break;
      case 'l_shape':
        zones = calculateLShapeZones(buildingGeometry);
        console.log(`Calculated ${zones.length} zones for L-shaped building`);
        break;
      case 'complex':
        // For complex shapes, use rectangular approximation with enhanced warnings
        zones = calculateRectangularZones(buildingGeometry);
        validation.warnings.push({
          severity: 'critical',
          message: 'Complex geometry approximated as rectangular',
          asceReference: 'ASCE 7 Section 26.5.1',
          recommendation: 'Professional engineering review required for complex geometries'
        });
        validation.requiresProfessionalAnalysis = true;
        validation.confidenceLevel = Math.min(validation.confidenceLevel, 50);
        break;
      default:
        throw new Error(`Unsupported building shape: ${buildingGeometry.shape}`);
    }
    
    // Quality assurance - validate zone areas
    const totalZoneArea = zones.reduce((sum, zone) => sum + zone.area, 0);
    const buildingArea = buildingGeometry.dimensions.length * buildingGeometry.dimensions.width;
    const areaRatio = totalZoneArea / buildingArea;
    
    if (Math.abs(areaRatio - 1.0) > 0.1) {
      validation.warnings.push({
        severity: 'warning',
        message: `Zone area calculation discrepancy: ${(areaRatio * 100).toFixed(1)}% of building area`,
        recommendation: 'Verify zone boundary calculations'
      });
      validation.confidenceLevel -= 10;
    }
    
    // Calculate wind pressures with full ASCE 7 methodology
    const pressures = calculateWindPressures(
      windSpeed, 
      exposureCategory, 
      buildingGeometry.dimensions.height,
      asceEdition
    );
    
    console.log('Calculated pressures:', pressures);
    
    // Calculate effective wind areas with enhanced methodology
    const effectiveAreas = calculateEffectiveWindAreas(
      zones, 
      elementSpacing,
      windSpeed,
      exposureCategory,
      buildingGeometry.dimensions.height
    );
    
    console.log(`Calculated ${effectiveAreas.length} effective wind areas`);
    
    // Calculate uncertainty bounds
    const uncertaintyBounds = {
      lower: validation.confidenceLevel >= 90 ? 0.95 : 
             validation.confidenceLevel >= 70 ? 0.85 : 0.75,
      upper: validation.confidenceLevel >= 90 ? 1.05 : 
             validation.confidenceLevel >= 70 ? 1.15 : 1.25
    };
    
    // Prepare comprehensive response
    const response: CalculationResponse = {
      zones,
      pressures,
      effectiveAreas,
      validation,
      metadata: {
        calculationMethod: `ASCE ${asceEdition} Building Envelope Method`,
        asceEdition,
        windParameters: {
          windSpeed,
          exposureCategory,
          height: buildingGeometry.dimensions.height
        },
        uncertaintyBounds
      }
    };
    
    console.log(`Calculation completed successfully: ${zones.length} zones, confidence: ${validation.confidenceLevel}%`);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in calculate-building-zones function:', error);
    
    const errorResponse: CalculationResponse = {
      zones: [],
      pressures: { 
        field: 0, 
        perimeter: 0, 
        corner: 0,
        internal: { positive: 0, negative: 0 }
      },
      effectiveAreas: [],
      validation: {
        isValid: false,
        complexity: 'basic',
        warnings: [{ 
          severity: 'critical', 
          message: `Calculation failed: ${error.message}` 
        }],
        requiresProfessionalAnalysis: true,
        confidenceLevel: 0,
        recommendations: ['Review input parameters and retry calculation']
      },
      metadata: {
        calculationMethod: 'Error',
        asceEdition: 'Unknown',
        windParameters: {
          windSpeed: 0,
          exposureCategory: 'Unknown',
          height: 0
        },
        uncertaintyBounds: { lower: 0, upper: 0 }
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});