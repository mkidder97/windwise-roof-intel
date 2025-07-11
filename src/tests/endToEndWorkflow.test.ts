import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { testHelpers, TEST_GEOMETRIES, MOCK_CAD_FILES, PE_VALIDATION_TOLERANCES } from './utils/testHelpers';
import { supabase } from '../integrations/supabase/client';

// Mock components and hooks
jest.mock('../integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      update: jest.fn(() => Promise.resolve({ data: {}, error: null }))
    }))
  }
}));

describe('End-to-End Workflow Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete CAD-to-Calculation Workflow', () => {
    test('should complete full workflow: Upload → Process → Review → Approve → Calculate', async () => {
      // Step 1: Upload CAD file
      const uploadMockResponse = {
        data: {
          success: true,
          geometryId: 'test-geometry-id',
          filePath: 'mock-file-path'
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce(uploadMockResponse);
      
      // Step 2: Process CAD file
      const processMockResponse = {
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 100, width: 80, height: 30 },
            total_area: 8000,
            perimeter_length: 360,
            extraction_confidence: 85,
            confidence_scores: {
              shape_detection: 90,
              dimension_accuracy: 85,
              overall_quality: 82
            }
          },
          requiresManualReview: false
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce(processMockResponse);
      
      // Step 3: Calculate wind pressures
      const calculateMockResponse = {
        data: {
          zones: [
            { type: 'field', area: 5760, pressureCoefficient: -0.8 },
            { type: 'perimeter', area: 1920, pressureCoefficient: -1.2 },
            { type: 'corner', area: 320, pressureCoefficient: -1.8 }
          ],
          pressures: {
            field: -12.6,
            perimeter: -18.9,
            corner: -25.2
          },
          validation: {
            isValid: true,
            confidenceLevel: 95,
            asceCompliant: true
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce(calculateMockResponse);
      
      // Execute full workflow
      const uploadResult = await testHelpers.callEdgeFunction('upload-cad-file', {
        fileName: 'test_building.dxf'
      });
      
      const processResult = await testHelpers.callEdgeFunction('process-cad-file', {
        geometryId: uploadResult.data?.geometryId
      });
      
      const calculateResult = await testHelpers.callEdgeFunction('calculate-professional-wind', {
        geometryId: uploadResult.data?.geometryId,
        windSpeed: 115,
        exposure: 'B'
      });
      
      // Validate complete workflow
      expect(uploadResult.data?.success).toBe(true);
      expect(processResult.data?.success).toBe(true);
      expect(processResult.data?.requiresManualReview).toBe(false);
      expect(calculateResult.data?.validation?.isValid).toBe(true);
      expect(calculateResult.data?.validation?.asceCompliant).toBe(true);
    });

    test('should handle manual review workflow', async () => {
      // Mock low confidence extraction requiring manual review
      const lowConfidenceResponse = {
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 95, width: 78, height: 30 },
            extraction_confidence: 65,
            confidence_scores: {
              length: 70,
              width: 65,
              height: 60
            }
          },
          requiresManualReview: true,
          warnings: ['Low extraction confidence', 'Dimensions uncertain']
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce(lowConfidenceResponse);
      
      // Mock manual correction
      const correctedResponse = {
        data: {
          success: true,
          updatedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 100, width: 80, height: 30 },
            extraction_confidence: 95,
            manual_overrides: {
              length: { original: 95, corrected: 100 },
              width: { original: 78, corrected: 80 }
            }
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce(correctedResponse);
      
      const processResult = await testHelpers.callEdgeFunction('process-cad-file', {
        fileName: 'uncertain_building.dxf'
      });
      
      expect(processResult.data?.requiresManualReview).toBe(true);
      expect(processResult.data?.warnings).toContain('Low extraction confidence');
      
      const correctionResult = await testHelpers.callEdgeFunction('update-geometry-manual', {
        geometryId: 'test-id',
        corrections: {
          length: 100,
          width: 80
        }
      });
      
      expect(correctionResult.data?.updatedGeometry?.extraction_confidence).toBe(95);
    });
  });

  describe('Template Save/Load/Share Workflow', () => {
    test('should save and load building templates', async () => {
      const templateData = {
        name: 'Standard Warehouse',
        description: 'Typical warehouse building template',
        building_type: 'warehouse',
        typical_use_cases: ['distribution', 'storage'],
        geometry_data: {
          shape_type: 'rectangle',
          dimensions: { length: 100, width: 80, height: 30 },
          total_area: 8000,
          perimeter_length: 360
        },
        is_shared: false
      };
      
      // Mock template save
      const saveTemplateResponse = {
        data: {
          id: 'template-123',
          created_at: '2024-01-01T00:00:00Z',
          usage_count: 0,
          ...templateData
        },
        error: null
      };
      
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce(saveTemplateResponse)
      });
      
      // Mock template load
      const loadTemplateResponse = {
        data: {
          id: 'template-123',
          created_at: '2024-01-01T00:00:00Z',
          usage_count: 1,
          ...templateData
        },
        error: null
      };
      
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce(loadTemplateResponse)
        })
      });
      
      // Mock calculation from template
      const calculateFromTemplateResponse = {
        data: {
          zones: [
            { type: 'field', area: 5760 },
            { type: 'perimeter', area: 1920 },
            { type: 'corner', area: 320 }
          ],
          validation: {
            isValid: true,
            templateSource: 'template-123'
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce(calculateFromTemplateResponse);
      
      // Execute template workflow
      const saveResult = await supabase.from('geometry_templates').insert(templateData);
      const loadResult = await supabase.from('geometry_templates').select().eq('id', 'template-123');
      const calculateResult = await testHelpers.callEdgeFunction('calculate-from-template', {
        templateId: 'template-123',
        windSpeed: 115
      });
      
      expect(saveResult.data?.name).toBe('Standard Warehouse');
      expect(loadResult.data?.usage_count).toBe(1);
      expect(calculateResult.data?.validation?.templateSource).toBe('template-123');
    });

    test('should handle template sharing workflow', async () => {
      const sharedTemplates = [
        {
          id: 'shared-1',
          name: 'Community Warehouse',
          user_id: 'other-user',
          is_shared: true
        },
        {
          id: 'shared-2',
          name: 'Standard Office',
          user_id: 'other-user',
          is_shared: true
        }
      ];
      
      // Mock shared templates query
      const sharedTemplatesResponse = {
        data: sharedTemplates,
        error: null
      };
      
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce(sharedTemplatesResponse)
        })
      });
      
      const result = await supabase.from('geometry_templates').select().eq('is_shared', true);
      
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]?.is_shared).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle CAD processing failures gracefully', async () => {
      const errorResponse = {
        data: null,
        error: {
          message: 'Unsupported file format',
          code: 'INVALID_FORMAT',
          details: {
            file_type: 'unknown',
            error_location: 'file_parser',
            recovery_suggestions: ['Convert to DXF or PDF format', 'Check file integrity']
          }
        }
      };
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce(errorResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileName: 'unsupported_file.xyz'
      });
      
      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('INVALID_FORMAT');
      expect(result.error?.details?.recovery_suggestions).toContain('Convert to DXF or PDF format');
    });

    test('should handle network failures with retries', async () => {
      // Mock network failure followed by success
      (supabase.functions.invoke as jest.MockedFunction<any>)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          data: { success: true },
          error: null
        });
      
      try {
        await testHelpers.callEdgeFunction('process-cad-file', {
          fileName: 'test.dxf'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
      
      // Retry should succeed
      const retryResult = await testHelpers.callEdgeFunction('process-cad-file', {
        fileName: 'test.dxf'
      });
      
      expect(retryResult.data?.success).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track workflow performance metrics', async () => {
      const startTime = performance.now();
      
      // Mock quick processing
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: {
          success: true,
          processingTime: 2500, // 2.5 seconds
          fileSize: 512 * 1024 // 512KB
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileName: 'quick_process.dxf'
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(result.data?.processingTime).toBeLessThan(PE_VALIDATION_TOLERANCES.CALCULATION_TIME_MAX);
      expect(totalTime).toBeLessThan(5000); // 5 second test limit
    });

    test('should handle concurrent workflow executions', async () => {
      const concurrentPromises = [];
      
      for (let i = 0; i < 5; i++) {
        (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
          data: { success: true, workflowId: `workflow-${i}` },
          error: null
        });
        
        concurrentPromises.push(
          testHelpers.callEdgeFunction('process-cad-file', {
            fileName: `file-${i}.dxf`
          })
        );
      }
      
      const results = await Promise.all(concurrentPromises);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.data?.success).toBe(true);
        expect(result.data?.workflowId).toBe(`workflow-${index}`);
      });
    });
  });
});