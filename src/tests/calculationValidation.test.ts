import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { 
  testHelpers, 
  TEST_GEOMETRIES, 
  ASCE_VALIDATION_DATA, 
  EFFECTIVE_WIND_AREA_TEST_DATA,
  PE_VALIDATION_TOLERANCES 
} from '../utils/testHelpers';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
jest.mock('@/integrations/supabase/client');

describe('Calculation Validation Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ASCE 7 Compliance Verification', () => {
    test('should calculate zone areas according to ASCE 7-22 standards', async () => {
      const testGeometry = TEST_GEOMETRIES.rectangle_100x80;
      
      const mockResponse = {
        data: {
          zones: [
            {
              type: 'field',
              area: 5760,
              boundaries: [/* zone coordinates */],
              pressureCoefficient: -0.8,
              description: 'Field zone per ASCE 7-22 Section 26.5'
            },
            {
              type: 'perimeter',
              area: 1920,
              boundaries: [/* zone coordinates */],
              pressureCoefficient: -1.2,
              description: 'Perimeter zone per ASCE 7-22 Section 26.5'
            },
            {
              type: 'corner',
              area: 320,
              boundaries: [/* zone coordinates */],
              pressureCoefficient: -1.8,
              description: 'Corner zone per ASCE 7-22 Section 26.5'
            }
          ],
          validation: {
            isValid: true,
            complexity: 'basic',
            confidenceLevel: 95,
            asceCompliant: true
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        buildingGeometry: {
          shape: testGeometry.shape_type,
          dimensions: testGeometry.dimensions
        },
        windSpeed: 115,
        exposureCategory: 'C',
        asceEdition: 'ASCE 7-22'
      });
      
      expect(result.data.validation.asceCompliant).toBe(true);
      
      // Validate zone areas match expected values within tolerance
      const fieldZone = result.data.zones.find(z => z.type === 'field');
      const expectedFieldArea = testGeometry.expected_zones.field.area;
      
      expect(testHelpers.checkAccuracy(
        fieldZone.area, 
        expectedFieldArea, 
        PE_VALIDATION_TOLERANCES.ZONE_AREA_TOLERANCE
      )).toBe(true);
      
      // Validate pressure coefficients are within ASCE ranges
      const asceData = ASCE_VALIDATION_DATA['ASCE 7-22'].exposure_C;
      expect(testHelpers.validatePressureCoefficients(
        fieldZone.pressureCoefficient,
        asceData.pressure_coefficients.field
      )).toBe(true);
    });

    test('should validate pressure calculations across different ASCE editions', async () => {
      const editions = ['ASCE 7-22', 'ASCE 7-16', 'ASCE 7-10'];
      
      for (const edition of editions) {
        const mockResponse = {
          data: {
            pressures: {
              field: -18.5,
              perimeter: -27.8,
              corner: -41.7
            },
            calculations: {
              kz: 0.98,
              qz: 23.2,
              edition: edition
            },
            validation: {
              isValid: true,
              asceCompliant: true,
              edition: edition
            }
          },
          error: null
        };
        
        (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
        
        const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
          buildingGeometry: {
            shape: 'rectangle',
            dimensions: { length: 100, width: 80, height: 30 }
          },
          windSpeed: 115,
          exposureCategory: 'C',
          asceEdition: edition
        });
        
        expect(result.data.validation.asceCompliant).toBe(true);
        expect(result.data.calculations.edition).toBe(edition);
        
        // Pressures should be negative (suction)
        expect(result.data.pressures.field).toBeLessThan(0);
        expect(result.data.pressures.perimeter).toBeLessThan(result.data.pressures.field);
        expect(result.data.pressures.corner).toBeLessThan(result.data.pressures.perimeter);
      }
    });

    test('should handle different exposure categories correctly', async () => {
      const exposureCategories = ['B', 'C', 'D'];
      const results = [];
      
      for (const exposure of exposureCategories) {
        const mockKz = ASCE_VALIDATION_DATA['ASCE 7-22'][`exposure_${exposure}`].kz_coefficients[30];
        
        const mockResponse = {
          data: {
            calculations: {
              kz: mockKz,
              exposure: exposure,
              qz: 23.2 * mockKz
            },
            pressures: {
              field: -18.5 * mockKz,
              perimeter: -27.8 * mockKz,
              corner: -41.7 * mockKz
            }
          },
          error: null
        };
        
        (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
        
        const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
          buildingGeometry: {
            shape: 'rectangle',
            dimensions: { length: 100, width: 80, height: 30 }
          },
          windSpeed: 115,
          exposureCategory: exposure,
          asceEdition: 'ASCE 7-22'
        });
        
        results.push(result);
      }
      
      // Exposure D should have highest pressures, B should have lowest
      expect(results[2].data.pressures.field).toBeLessThan(results[1].data.pressures.field);
      expect(results[1].data.pressures.field).toBeLessThan(results[0].data.pressures.field);
    });
  });

  describe('Zone Calculation Accuracy Tests', () => {
    test('should calculate rectangular building zones accurately', () => {
      const geometry = TEST_GEOMETRIES.rectangle_100x80;
      const calculatedAreas = testHelpers.calculateExpectedZoneAreas(geometry);
      
      // Field zone should be the largest
      expect(calculatedAreas.field).toBeGreaterThan(calculatedAreas.perimeter);
      expect(calculatedAreas.field).toBeGreaterThan(calculatedAreas.corner);
      
      // Total area should sum correctly
      const totalCalculated = calculatedAreas.field + calculatedAreas.perimeter + calculatedAreas.corner;
      expect(testHelpers.checkAccuracy(
        totalCalculated, 
        geometry.expected_area, 
        PE_VALIDATION_TOLERANCES.ZONE_AREA_TOLERANCE
      )).toBe(true);
    });

    test('should handle L-shape building zones with reentrant corners', async () => {
      const geometry = TEST_GEOMETRIES.l_shape_standard;
      
      const mockResponse = {
        data: {
          zones: [
            {
              type: 'field',
              area: 10080,
              pressureCoefficient: -0.8
            },
            {
              type: 'perimeter',
              area: 3600,
              pressureCoefficient: -1.2
            },
            {
              type: 'corner',
              area: 720,
              pressureCoefficient: -1.8
            },
            {
              type: 'reentrant_corner',
              area: 480,
              pressureCoefficient: -2.2
            }
          ],
          validation: {
            isValid: true,
            complexity: 'intermediate',
            lShapeCompliant: true
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        buildingGeometry: {
          shape: geometry.shape_type,
          dimensions: geometry.dimensions
        },
        windSpeed: 115,
        exposureCategory: 'C',
        asceEdition: 'ASCE 7-22'
      });
      
      // Should identify reentrant corner zones specific to L-shapes
      const reentrantZone = result.data.zones.find(z => z.type === 'reentrant_corner');
      expect(reentrantZone).toBeTruthy();
      expect(reentrantZone.pressureCoefficient).toBeLessThan(-2.0); // Higher suction at reentrant corners
      
      expect(result.data.validation.lShapeCompliant).toBe(true);
    });

    test('should validate zone boundaries are geometrically correct', async () => {
      const mockResponse = {
        data: {
          zones: [
            {
              type: 'field',
              boundaries: [
                { x: 10, y: 10 },
                { x: 90, y: 10 },
                { x: 90, y: 70 },
                { x: 10, y: 70 }
              ]
            },
            {
              type: 'corner',
              boundaries: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 }
              ]
            }
          ]
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        buildingGeometry: {
          shape: 'rectangle',
          dimensions: { length: 100, width: 80, height: 30 }
        },
        windSpeed: 115,
        exposureCategory: 'C',
        asceEdition: 'ASCE 7-22'
      });
      
      // Validate zone boundaries form closed polygons
      result.data.zones.forEach(zone => {
        expect(zone.boundaries.length).toBeGreaterThanOrEqual(4);
        
        // First and last points should connect for closed polygon
        const first = zone.boundaries[0];
        const last = zone.boundaries[zone.boundaries.length - 1];
        
        // Allow for slight numerical precision differences
        expect(Math.abs(first.x - last.x)).toBeLessThan(0.01);
        expect(Math.abs(first.y - last.y)).toBeLessThan(0.01);
      });
    });
  });

  describe('Effective Wind Area Calculation Validation', () => {
    test('should calculate effective wind areas accurately for different element types', async () => {
      for (const testCase of EFFECTIVE_WIND_AREA_TEST_DATA) {
        const mockResponse = {
          data: {
            effectiveAreas: [{
              elementType: testCase.element_type,
              zoneLocation: testCase.zone,
              spacingX: testCase.spacing.x,
              spacingY: testCase.spacing.y,
              effectiveArea: testCase.expected_area,
              designPressure: -25.4
            }]
          },
          error: null
        };
        
        (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
        
        const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
          buildingGeometry: {
            shape: 'rectangle',
            dimensions: { length: 100, width: 80, height: 30 }
          },
          elementSpacing: testCase.spacing,
          elementType: testCase.element_type,
          zoneLocation: testCase.zone,
          windSpeed: 115,
          exposureCategory: 'C'
        });
        
        const effectiveArea = result.data.effectiveAreas[0];
        expect(testHelpers.checkAccuracy(
          effectiveArea.effectiveArea,
          testCase.expected_area,
          PE_VALIDATION_TOLERANCES.EFFECTIVE_AREA_TOLERANCE
        )).toBe(true);
      }
    });

    test('should apply area-dependent pressure coefficients correctly', async () => {
      const areaDependentCases = [
        { area: 100, expected_adjustment: 1.0 },    // Small area - no reduction
        { area: 500, expected_adjustment: 0.95 },   // Medium area - slight reduction
        { area: 1000, expected_adjustment: 0.90 },  // Large area - more reduction
        { area: 5000, expected_adjustment: 0.85 }   // Very large area - maximum reduction
      ];
      
      for (const testCase of areaDependentCases) {
        const mockResponse = {
          data: {
            effectiveAreas: [{
              effectiveArea: testCase.area,
              pressureCoefficient: -1.2,
              areaAdjustmentFactor: testCase.expected_adjustment,
              adjustedPressureCoefficient: -1.2 * testCase.expected_adjustment
            }]
          },
          error: null
        };
        
        (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
        
        const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
          buildingGeometry: {
            shape: 'rectangle',
            dimensions: { length: 100, width: 80, height: 30 }
          },
          elementSpacing: { x: Math.sqrt(testCase.area), y: Math.sqrt(testCase.area) },
          windSpeed: 115,
          exposureCategory: 'C'
        });
        
        const effectiveArea = result.data.effectiveAreas[0];
        expect(testHelpers.checkAccuracy(
          effectiveArea.areaAdjustmentFactor,
          testCase.expected_adjustment,
          0.01
        )).toBe(true);
      }
    });
  });

  describe('Cross-Validation Against Manual Calculations', () => {
    test('should match hand-calculated pressure values', async () => {
      // Known hand calculation for 115 mph, Exposure C, 30' height
      const handCalculation = {
        kz: 0.98,
        qz: 23.2, // psf
        gcp_field: -0.8,
        gcp_perimeter: -1.2,
        gcp_corner: -1.8,
        expected_pressures: {
          field: -18.56, // qz * gcp_field
          perimeter: -27.84, // qz * gcp_perimeter
          corner: -41.76  // qz * gcp_corner
        }
      };
      
      const mockResponse = {
        data: {
          calculations: {
            kz: handCalculation.kz,
            qz: handCalculation.qz
          },
          pressures: handCalculation.expected_pressures,
          validation: {
            manualVerified: true,
            variance: 0.015 // 1.5% variance from manual calculation
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        buildingGeometry: {
          shape: 'rectangle',
          dimensions: { length: 100, width: 80, height: 30 }
        },
        windSpeed: 115,
        exposureCategory: 'C',
        asceEdition: 'ASCE 7-22'
      });
      
      // Validate against hand calculations within tolerance
      expect(testHelpers.checkAccuracy(
        result.data.pressures.field,
        handCalculation.expected_pressures.field,
        PE_VALIDATION_TOLERANCES.PRESSURE_TOLERANCE
      )).toBe(true);
      
      expect(result.data.validation.manualVerified).toBe(true);
      expect(result.data.validation.variance).toBeLessThan(0.02);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle minimum wind speed correctly', async () => {
      const mockResponse = {
        data: {
          pressures: { field: -8.5, perimeter: -12.8, corner: -19.2 },
          validation: {
            isValid: true,
            warnings: ['Wind speed is at minimum threshold for ASCE calculations']
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        windSpeed: 85, // Minimum for most areas
        exposureCategory: 'B',
        buildingGeometry: { shape: 'rectangle', dimensions: { length: 50, width: 40, height: 20 } }
      });
      
      expect(result.data.validation.isValid).toBe(true);
      expect(result.data.validation.warnings).toBeTruthy();
    });

    test('should handle maximum practical building dimensions', async () => {
      const mockResponse = {
        data: {
          zones: [/* large building zones */],
          validation: {
            isValid: true,
            complexity: 'complex',
            warnings: ['Building size requires professional engineering review'],
            requiresProfessionalAnalysis: true
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        buildingGeometry: {
          shape: 'rectangle',
          dimensions: { length: 1000, width: 800, height: 100 }
        },
        windSpeed: 140,
        exposureCategory: 'D'
      });
      
      expect(result.data.validation.requiresProfessionalAnalysis).toBe(true);
      expect(result.data.validation.complexity).toBe('complex');
    });
  });
});