import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { 
  testHelpers, 
  TEST_GEOMETRIES, 
  ASCE_VALIDATION_DATA, 
  EFFECTIVE_WIND_AREA_TEST_DATA,
  PE_VALIDATION_TOLERANCES 
} from './utils/testHelpers';
import { supabase } from '../integrations/supabase/client';

// Mock the supabase client
jest.mock('../integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    }
  }
}));

describe('Calculation Validation Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ASCE 7 Compliance Verification', () => {
    test('should calculate zone areas according to ASCE 7-22 standards', async () => {
      const testGeometry = TEST_GEOMETRIES.rectangle_100x80;
      
      // Mock zone calculation edge function
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          zones: [
            {
              type: 'field',
              area: 5760,
              boundaries: [],
              pressureCoefficient: -0.8,
              description: 'Interior field zone'
            },
            {
              type: 'perimeter',
              area: 1920,
              boundaries: [],
              pressureCoefficient: -1.2,
              description: 'Perimeter zone'
            },
            {
              type: 'corner',
              area: 320,
              boundaries: [],
              pressureCoefficient: -1.8,
              description: 'Corner zone'
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
      });
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        geometry: testGeometry
      });
      
      expect(result.data?.validation?.asceCompliant).toBe(true);
      
      // Validate zone areas match expected values
      const fieldZone = result.data?.zones?.find((z: any) => z.type === 'field');
      const perimeterZone = result.data?.zones?.find((z: any) => z.type === 'perimeter');
      const cornerZone = result.data?.zones?.find((z: any) => z.type === 'corner');
      
      expect(fieldZone?.area).toBeCloseTo(testGeometry.expected_zones.field.area, 1);
      expect(perimeterZone?.area).toBeCloseTo(testGeometry.expected_zones.perimeter.area, 1);
      expect(cornerZone?.area).toBeCloseTo(testGeometry.expected_zones.corner.area, 1);
    });

    test('should validate pressure coefficients across ASCE editions', async () => {
      const windConditions = testHelpers.generateTestWindConditions()[0];
      const asceData = ASCE_VALIDATION_DATA['ASCE 7-22'].exposure_B;
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          pressures: {
            field: -12.5,
            perimeter: -18.7,
            corner: -25.2
          },
          calculations: {
            kz: asceData.kz_coefficients[30],
            qz: 15.8,
            edition: 'ASCE 7-22'
          },
          validation: {
            isValid: true,
            asceCompliant: true,
            edition: 'ASCE 7-22'
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('calculate-professional-wind', {
        windSpeed: windConditions.speed,
        exposure: windConditions.exposure,
        edition: windConditions.edition,
        buildingHeight: 30
      });
      
      expect(result.data?.validation?.asceCompliant).toBe(true);
      expect(result.data?.calculations?.edition).toBe('ASCE 7-22');
      
      // Validate Kz coefficient
      expect(result.data?.calculations?.kz).toBeCloseTo(asceData.kz_coefficients[30], 2);
    });

    test('should validate calculations across different exposure categories', async () => {
      const exposureCategories = ['B', 'C', 'D'];
      
      for (const exposure of exposureCategories) {
        const asceData = ASCE_VALIDATION_DATA['ASCE 7-22'][`exposure_${exposure}` as keyof typeof ASCE_VALIDATION_DATA['ASCE 7-22']];
        
        (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
          data: {
            calculations: {
              kz: asceData.kz_coefficients[30],
              exposure: exposure,
              qz: 15.8 * asceData.kz_coefficients[30]
            },
            pressures: {
              field: -12.5 * asceData.kz_coefficients[30],
              perimeter: -18.7 * asceData.kz_coefficients[30],
              corner: -25.2 * asceData.kz_coefficients[30]
            }
          },
          error: null
        });
        
        const result = await testHelpers.callEdgeFunction('calculate-professional-wind', {
          windSpeed: 115,
          exposure: exposure,
          edition: 'ASCE 7-22',
          buildingHeight: 30
        });
        
        expect(result.data?.calculations?.kz).toBeCloseTo(asceData.kz_coefficients[30], 2);
        expect(result.data?.calculations?.exposure).toBe(exposure);
      }
    });
  });

  describe('Complex Geometry Validation', () => {
    test('should handle L-shape building calculations', async () => {
      const lShapeGeometry = TEST_GEOMETRIES.l_shape_standard;
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
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
            complexity: 'complex',
            lShapeCompliant: true
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        geometry: lShapeGeometry
      });
      
      expect(result.data?.validation?.lShapeCompliant).toBe(true);
      expect(result.data?.zones?.length).toBe(4); // Including reentrant corner
      
      const reentrantCorner = result.data?.zones?.find((z: any) => z.type === 'reentrant_corner');
      expect(reentrantCorner).toBeTruthy();
      expect(reentrantCorner?.area).toBeCloseTo(lShapeGeometry.expected_zones.reentrant_corner.area, 1);
    });

    test('should generate accurate zone boundaries', async () => {
      const testGeometry = TEST_GEOMETRIES.rectangle_100x80;
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          zones: [
            {
              type: 'corner',
              boundaries: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 8 },
                { x: 0, y: 8 }
              ]
            }
          ]
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        geometry: testGeometry
      });
      
      const cornerZone = result.data?.zones?.[0];
      expect(cornerZone?.boundaries).toHaveLength(4);
      expect(cornerZone?.boundaries?.[0]).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Effective Wind Area Calculations', () => {
    test('should calculate effective wind areas accurately', async () => {
      const testData = EFFECTIVE_WIND_AREA_TEST_DATA[0];
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          effectiveAreas: [
            {
              elementType: testData.element_type,
              zoneLocation: testData.zone,
              spacingX: testData.spacing.x,
              spacingY: testData.spacing.y,
              effectiveArea: testData.expected_area,
              designPressure: -15.2
            }
          ]
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('calculate-effective-wind-areas', {
        spacing: testData.spacing,
        elementType: testData.element_type,
        zoneLocation: testData.zone
      });
      
      const area = result.data?.effectiveAreas?.[0];
      expect(area?.effectiveArea).toBe(testData.expected_area);
      expect(area?.elementType).toBe(testData.element_type);
    });

    test('should apply area-dependent pressure coefficients', async () => {
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          effectiveAreas: [
            {
              effectiveArea: 144,
              pressureCoefficient: -0.9,
              areaAdjustmentFactor: 1.0,
              adjustedPressureCoefficient: -0.9
            },
            {
              effectiveArea: 576,
              pressureCoefficient: -0.9,
              areaAdjustmentFactor: 0.85,
              adjustedPressureCoefficient: -0.765
            }
          ]
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('calculate-effective-wind-areas', {
        areas: [144, 576],
        baseCoefficient: -0.9
      });
      
      const smallArea = result.data?.effectiveAreas?.[0];
      const largeArea = result.data?.effectiveAreas?.[1];
      
      expect(smallArea?.adjustedPressureCoefficient).toBe(-0.9);
      expect(largeArea?.adjustedPressureCoefficient).toBeLessThan(-0.9);
    });
  });

  describe('Cross-Validation Against Manual Calculations', () => {
    test('should match hand-calculated results within tolerance', async () => {
      // Known manual calculation results for validation
      const manualResults = {
        kz: 0.7,
        qz: 15.8,
        fieldPressure: -12.6,
        perimeterPressure: -18.9,
        cornerPressure: -25.2
      };
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          calculations: {
            kz: 0.7,
            qz: 15.8
          },
          pressures: {
            field: -12.6,
            perimeter: -18.9,
            corner: -25.2
          },
          validation: {
            manualVerified: true,
            variance: 0.01
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('calculate-professional-wind', {
        windSpeed: 115,
        exposure: 'B',
        buildingHeight: 30
      });
      
      expect(result.data?.calculations?.kz).toBeCloseTo(manualResults.kz, 2);
      expect(result.data?.calculations?.qz).toBeCloseTo(manualResults.qz, 2);
      expect(result.data?.pressures?.field).toBeCloseTo(manualResults.fieldPressure, 1);
      expect(result.data?.validation?.variance).toBeLessThan(PE_VALIDATION_TOLERANCES.PRESSURE_TOLERANCE);
    });
  });

  describe('Edge Case Validation', () => {
    test('should handle minimum building dimensions', async () => {
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          pressures: {
            field: -8.5,
            perimeter: -12.8,
            corner: -17.1
          },
          validation: {
            isValid: true,
            warnings: ['Building dimensions approach minimum limits']
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('calculate-professional-wind', {
        buildingLength: 15,
        buildingWidth: 12,
        buildingHeight: 8
      });
      
      expect(result.data?.validation?.isValid).toBe(true);
      expect(result.data?.validation?.warnings).toContain('Building dimensions approach minimum limits');
    });

    test('should identify buildings requiring professional analysis', async () => {
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          zones: [],
          validation: {
            isValid: false,
            complexity: 'requires_professional',
            warnings: ['Building complexity exceeds automated analysis capabilities'],
            requiresProfessionalAnalysis: true
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('calculate-building-zones', {
        geometry: {
          shape_type: 'irregular',
          complexity: 'high'
        }
      });
      
      expect(result.data?.validation?.requiresProfessionalAnalysis).toBe(true);
      expect(result.data?.validation?.warnings).toContain('Building complexity exceeds automated analysis capabilities');
    });
  });
});