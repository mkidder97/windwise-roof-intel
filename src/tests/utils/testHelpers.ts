// Test utilities for CAD processing and calculation validation
import { supabase } from '../../integrations/supabase/client';

// Known test geometries for validation
export const TEST_GEOMETRIES = {
  rectangle_100x80: {
    shape_type: 'rectangle' as const,
    dimensions: { length: 100, width: 80, height: 30 },
    expected_area: 8000,
    expected_perimeter: 360,
    expected_zones: {
      field: { area: 5760, coefficient_range: [-0.9, -0.7] },
      perimeter: { area: 1920, coefficient_range: [-1.4, -1.0] },
      corner: { area: 320, coefficient_range: [-2.0, -1.5] }
    }
  },
  
  rectangle_200x150: {
    shape_type: 'rectangle' as const,
    dimensions: { length: 200, width: 150, height: 35 },
    expected_area: 30000,
    expected_perimeter: 700,
    expected_zones: {
      field: { area: 22500, coefficient_range: [-0.9, -0.7] },
      perimeter: { area: 6000, coefficient_range: [-1.4, -1.0] },
      corner: { area: 1500, coefficient_range: [-2.0, -1.5] }
    }
  },

  l_shape_standard: {
    shape_type: 'l_shape' as const,
    dimensions: { 
      length1: 120, width1: 80, 
      length2: 80, width2: 60, 
      height: 32 
    },
    expected_area: 14400, // (120*80) + (80*60)
    expected_perimeter: 600, // Simplified L-shape perimeter
    expected_zones: {
      field: { area: 10080, coefficient_range: [-0.9, -0.7] },
      perimeter: { area: 3600, coefficient_range: [-1.4, -1.0] },
      corner: { area: 720, coefficient_range: [-2.0, -1.5] },
      reentrant_corner: { area: 480, coefficient_range: [-2.5, -2.0] }
    }
  }
};

// ASCE 7 validation data for different editions
export const ASCE_VALIDATION_DATA = {
  'ASCE 7-22': {
    exposure_B: {
      kz_coefficients: { 15: 0.57, 20: 0.62, 25: 0.66, 30: 0.70 },
      pressure_coefficients: {
        field: { min: -0.9, max: -0.7 },
        perimeter: { min: -1.4, max: -1.0 },
        corner: { min: -2.0, max: -1.5 }
      }
    },
    exposure_C: {
      kz_coefficients: { 15: 0.85, 20: 0.90, 25: 0.94, 30: 0.98 },
      pressure_coefficients: {
        field: { min: -0.9, max: -0.7 },
        perimeter: { min: -1.4, max: -1.0 },
        corner: { min: -2.0, max: -1.5 }
      }
    },
    exposure_D: {
      kz_coefficients: { 15: 1.03, 20: 1.08, 25: 1.12, 30: 1.15 },
      pressure_coefficients: {
        field: { min: -0.9, max: -0.7 },
        perimeter: { min: -1.4, max: -1.0 },
        corner: { min: -2.0, max: -1.5 }
      }
    }
  }
};

// Effective wind area test data
export const EFFECTIVE_WIND_AREA_TEST_DATA = [
  {
    spacing: { x: 12, y: 12 },
    expected_area: 144,
    element_type: 'fastener',
    zone: 'field'
  },
  {
    spacing: { x: 24, y: 24 },
    expected_area: 576,
    element_type: 'panel',
    zone: 'perimeter'
  },
  {
    spacing: { x: 6, y: 6 },
    expected_area: 36,
    element_type: 'fastener',
    zone: 'corner'
  }
];

// Mock CAD file content for testing
export const MOCK_CAD_FILES = {
  valid_dxf: {
    fileName: 'test_building_100x80.dxf',
    content: 'MOCK_DXF_CONTENT_100x80',
    expected_extraction: {
      shape_type: 'rectangle',
      dimensions: { length: 100, width: 80, height: 30 },
      confidence: 85
    }
  },
  
  valid_pdf: {
    fileName: 'test_building_200x150.pdf',
    content: 'MOCK_PDF_CONTENT_200x150',
    expected_extraction: {
      shape_type: 'rectangle',
      dimensions: { length: 200, width: 150, height: 35 },
      confidence: 75
    }
  },
  
  complex_l_shape: {
    fileName: 'test_l_shape_building.dxf',
    content: 'MOCK_DXF_CONTENT_L_SHAPE',
    expected_extraction: {
      shape_type: 'l_shape',
      dimensions: { 
        length1: 120, width1: 80, 
        length2: 80, width2: 60, 
        height: 32 
      },
      confidence: 80
    }
  },
  
  corrupted_file: {
    fileName: 'corrupted_file.dxf',
    content: 'CORRUPTED_CONTENT_INVALID',
    expected_extraction: null,
    expected_error: 'Failed to parse CAD file'
  }
};

// Test helper functions
export const testHelpers = {
  // Calculate expected zone areas based on building dimensions
  calculateExpectedZoneAreas(geometry: any) {
    const { length, width, height } = geometry.dimensions;
    const area = length * width;
    
    // Simplified zone calculation for testing
    const cornerWidth = Math.min(length, width, height) * 0.1;
    const perimeterWidth = Math.min(length, width) * 0.1;
    
    const cornerArea = 4 * (cornerWidth * cornerWidth);
    const perimeterArea = 2 * ((length - 2 * cornerWidth) * perimeterWidth) + 
                         2 * ((width - 2 * cornerWidth) * perimeterWidth);
    const fieldArea = area - cornerArea - perimeterArea;
    
    return {
      field: Math.max(0, fieldArea),
      perimeter: Math.max(0, perimeterArea),
      corner: Math.max(0, cornerArea)
    };
  },

  // Validate pressure coefficient ranges
  validatePressureCoefficients(calculated: number, expected_range: [number, number], tolerance = 0.05) {
    const [min, max] = expected_range;
    return calculated >= (min - tolerance) && calculated <= (max + tolerance);
  },

  // Check calculation accuracy within tolerance
  checkAccuracy(calculated: number, expected: number, tolerance = 0.02) {
    const percentError = Math.abs((calculated - expected) / expected);
    return percentError <= tolerance;
  },

  // Generate test wind conditions
  generateTestWindConditions() {
    return [
      { speed: 90, exposure: 'B', edition: 'ASCE 7-22' },
      { speed: 115, exposure: 'C', edition: 'ASCE 7-22' },
      { speed: 140, exposure: 'D', edition: 'ASCE 7-22' },
      { speed: 100, exposure: 'C', edition: 'ASCE 7-16' }
    ];
  },

  // Create mock CAD file for upload testing
  createMockCADFile(mockFile: typeof MOCK_CAD_FILES[keyof typeof MOCK_CAD_FILES]) {
    const blob = new Blob([mockFile.content], { type: 'application/octet-stream' });
    return new File([blob], mockFile.fileName, { type: 'application/octet-stream' });
  },

  // Validate template data structure
  validateTemplateStructure(template: any) {
    const requiredFields = ['name', 'geometry_data', 'building_type'];
    const geometryFields = ['shape_type', 'dimensions', 'total_area'];
    
    const hasRequiredFields = requiredFields.every(field => field in template);
    const hasGeometryFields = geometryFields.every(field => field in template.geometry_data);
    
    return hasRequiredFields && hasGeometryFields;
  },

  // Performance measurement helper
  async measurePerformance(testFunction: () => Promise<any>, iterations = 1) {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await testFunction();
      const end = performance.now();
      times.push(end - start);
    }
    
    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      times
    };
  },

  // Edge function test helper
  async callEdgeFunction(functionName: string, payload: any) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });
    
    return { data, error };
  }
};

// Professional engineering validation constants
export const PE_VALIDATION_TOLERANCES = {
  ZONE_AREA_TOLERANCE: 0.01, // 1% tolerance for zone area calculations
  PRESSURE_TOLERANCE: 0.02,  // 2% tolerance for pressure calculations
  EFFECTIVE_AREA_TOLERANCE: 0.01, // 1% tolerance for effective wind area
  EXTRACTION_CONFIDENCE_MIN: 70, // Minimum confidence for CAD extraction
  CALCULATION_TIME_MAX: 5000 // Maximum 5 seconds for complex calculations
};

export default testHelpers;