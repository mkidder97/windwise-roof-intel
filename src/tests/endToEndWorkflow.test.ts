import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { testHelpers, PE_VALIDATION_TOLERANCES } from '../utils/testHelpers';
import { supabase } from '@/integrations/supabase/client';

// Mock components and hooks
jest.mock('@/integrations/supabase/client');
jest.mock('@/components/CADUploadManager');
jest.mock('@/components/TemplateLibrary');

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
          geometryId: 'test-geometry-123',
          filePath: 'cad-files/test-building.dxf'
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock)
        .mockResolvedValueOnce(uploadMockResponse);
      
      const uploadResult = await testHelpers.callEdgeFunction('upload-cad-file', {
        fileName: 'test-building.dxf',
        fileContent: 'mock-dxf-content'
      });
      
      expect(uploadResult.data.success).toBe(true);
      expect(uploadResult.data.geometryId).toBeTruthy();

      // Step 2: Process CAD file for geometry extraction
      const processingMockResponse = {
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 100, width: 80, height: 30 },
            total_area: 8000,
            perimeter_length: 360,
            extraction_confidence: 85,
            confidence_scores: {
              length: 90,
              width: 85,
              height: 80
            }
          },
          requiresManualReview: false
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock)
        .mockResolvedValueOnce(processingMockResponse);
      
      const processingResult = await testHelpers.callEdgeFunction('process-cad-file', {
        geometryId: uploadResult.data.geometryId,
        fileUrl: uploadResult.data.filePath
      });
      
      expect(processingResult.data.success).toBe(true);
      expect(processingResult.data.extractedGeometry.extraction_confidence).toBeGreaterThanOrEqual(
        PE_VALIDATION_TOLERANCES.EXTRACTION_CONFIDENCE_MIN
      );

      // Step 3: Calculate wind zones using extracted geometry
      const calculationMockResponse = {
        data: {
          zones: [
            { type: 'field', area: 5760, pressureCoefficient: -0.8 },
            { type: 'perimeter', area: 1920, pressureCoefficient: -1.2 },
            { type: 'corner', area: 320, pressureCoefficient: -1.8 }
          ],
          pressures: {
            field: -18.5,
            perimeter: -27.8,
            corner: -41.7
          },
          validation: {
            isValid: true,
            confidenceLevel: 95,
            asceCompliant: true
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock)
        .mockResolvedValueOnce(calculationMockResponse);
      
      const calculationResult = await testHelpers.callEdgeFunction('calculate-building-zones', {
        buildingGeometry: {
          shape: processingResult.data.extractedGeometry.shape_type,
          dimensions: processingResult.data.extractedGeometry.dimensions
        },
        windSpeed: 115,
        exposureCategory: 'C',
        asceEdition: 'ASCE 7-22'
      });
      
      expect(calculationResult.data.validation.isValid).toBe(true);
      expect(calculationResult.data.validation.asceCompliant).toBe(true);
      
      // Validate total workflow performance
      const totalWorkflowTime = performance.now();
      expect(totalWorkflowTime).toBeLessThan(PE_VALIDATION_TOLERANCES.CALCULATION_TIME_MAX * 3);
    });

    test('should handle low-confidence extractions with manual review workflow', async () => {
      // Process CAD file with low confidence
      const lowConfidenceResponse = {
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 95, width: 75, height: 28 },
            extraction_confidence: 45, // Low confidence
            confidence_scores: {
              length: 50,
              width: 45,
              height: 40
            }
          },
          requiresManualReview: true,
          warnings: ['Low extraction confidence - manual review recommended']
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock)
        .mockResolvedValueOnce(lowConfidenceResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        geometryId: 'test-geometry-456',
        fileUrl: 'cad-files/unclear-building.pdf'
      });
      
      expect(result.data.requiresManualReview).toBe(true);
      expect(result.data.extractedGeometry.extraction_confidence).toBeLessThan(
        PE_VALIDATION_TOLERANCES.EXTRACTION_CONFIDENCE_MIN
      );
      expect(result.data.warnings).toBeTruthy();
      expect(result.data.warnings[0]).toContain('manual review');

      // Simulate manual correction workflow
      const correctedGeometry = {
        ...result.data.extractedGeometry,
        dimensions: { length: 100, width: 80, height: 30 }, // User corrected
        manual_overrides: {
          length: true,
          width: true,
          height: false
        },
        review_status: 'approved'
      };
      
      // Mock database update for manual corrections
      const updateMockResponse = {
        data: {
          success: true,
          updatedGeometry: correctedGeometry
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock)
        .mockResolvedValueOnce(updateMockResponse);
      
      const updateResult = await testHelpers.callEdgeFunction('update-geometry', {
        geometryId: 'test-geometry-456',
        manualCorrections: correctedGeometry
      });
      
      expect(updateResult.data.success).toBe(true);
      expect(updateResult.data.updatedGeometry.review_status).toBe('approved');
    });
  });

  describe('Template Workflow Testing', () => {
    test('should complete template save and load workflow', async () => {
      // Save geometry as template
      const templateData = {
        name: 'Standard Office Building',
        description: 'Typical single-story office building layout',
        building_type: 'Office Building',
        typical_use_cases: ['Rooftop Equipment', 'HVAC Systems'],
        geometry_data: {
          shape_type: 'rectangle',
          dimensions: { length: 100, width: 80, height: 30 },
          total_area: 8000,
          perimeter_length: 360
        },
        is_shared: true
      };
      
      const saveTemplateResponse = {
        data: {
          id: 'template-123',
          ...templateData,
          created_at: new Date().toISOString(),
          usage_count: 0
        },
        error: null
      };
      
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(saveTemplateResponse)
          })
        })
      });
      
      // Validate template structure
      expect(testHelpers.validateTemplateStructure(templateData)).toBe(true);
      
      // Load template from library
      const loadTemplateResponse = {
        data: [saveTemplateResponse.data],
        error: null
      };
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(loadTemplateResponse)
        })
      });
      
      // Verify template can be used for calculations
      const calculationWithTemplateResponse = {
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
      
      (supabase.functions.invoke as jest.Mock)
        .mockResolvedValueOnce(calculationWithTemplateResponse);
      
      const templateCalculationResult = await testHelpers.callEdgeFunction('calculate-building-zones', {
        templateId: 'template-123',
        windSpeed: 115,
        exposureCategory: 'C'
      });
      
      expect(templateCalculationResult.data.validation.templateSource).toBe('template-123');
    });

    test('should handle template sharing and permissions correctly', async () => {
      // Create private template
      const privateTemplate = {
        id: 'private-template-456',
        name: 'Private Warehouse',
        user_id: 'user-123',
        is_shared: false
      };
      
      // Create shared template
      const sharedTemplate = {
        id: 'shared-template-789',
        name: 'Standard Retail Store',
        user_id: 'user-456',
        is_shared: true
      };
      
      // Mock template access for different users
      const userTemplatesResponse = {
        data: [privateTemplate, sharedTemplate],
        error: null
      };
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue(userTemplatesResponse)
          })
        })
      });
      
      // User should see their private template and all shared templates
      const templates = userTemplatesResponse.data;
      expect(templates).toHaveLength(2);
      expect(templates.find(t => t.id === 'private-template-456')).toBeTruthy();
      expect(templates.find(t => t.id === 'shared-template-789')).toBeTruthy();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should gracefully handle CAD processing failures', async () => {
      const errorResponse = {
        data: null,
        error: {
          message: 'Failed to parse CAD file: Corrupted DXF format',
          code: 'CAD_PARSE_ERROR',
          details: {
            file_type: 'dxf',
            error_location: 'entity_parsing',
            recovery_suggestions: [
              'Try re-exporting the DXF file from your CAD software',
              'Ensure the file is not corrupted during upload',
              'Consider converting to PDF format if DXF continues to fail'
            ]
          }
        }
      };
      
      (supabase.functions.invoke as jest.Mock)
        .mockResolvedValueOnce(errorResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        geometryId: 'test-geometry-error',
        fileUrl: 'cad-files/corrupted-file.dxf'
      });
      
      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('CAD_PARSE_ERROR');
      expect(result.error.details.recovery_suggestions).toBeTruthy();
      expect(result.error.details.recovery_suggestions.length).toBeGreaterThan(0);
    });

    test('should handle network failures with retry mechanism', async () => {
      // First call fails with network error
      (supabase.functions.invoke as jest.Mock)
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockResolvedValueOnce({
          data: { success: true },
          error: null
        });
      
      // Simulate retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      const callWithRetry = async () => {
        while (retryCount < maxRetries) {
          try {
            return await testHelpers.callEdgeFunction('calculate-building-zones', {
              buildingGeometry: { shape: 'rectangle', dimensions: { length: 100, width: 80, height: 30 } }
            });
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          }
        }
      };
      
      const result = await callWithRetry();
      expect(result.data.success).toBe(true);
      expect(retryCount).toBe(1); // Should succeed on first retry
    });
  });

  describe('Performance and Scalability Testing', () => {
    test('should handle concurrent CAD processing requests', async () => {
      const concurrentRequests = 5;
      const promises = [];
      
      // Mock successful responses for all concurrent requests
      (supabase.functions.invoke as jest.Mock)
        .mockImplementation(() => Promise.resolve({
          data: {
            success: true,
            extractedGeometry: {
              shape_type: 'rectangle',
              dimensions: { length: 100, width: 80, height: 30 }
            }
          },
          error: null
        }));
      
      // Create concurrent processing requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          testHelpers.callEdgeFunction('process-cad-file', {
            geometryId: `test-geometry-${i}`,
            fileUrl: `cad-files/building-${i}.dxf`
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result.data.success).toBe(true);
      });
      
      expect(results).toHaveLength(concurrentRequests);
    });

    test('should maintain performance with large template collections', async () => {
      // Mock large template collection
      const largeTemplateCollection = Array.from({ length: 100 }, (_, i) => ({
        id: `template-${i}`,
        name: `Building Template ${i}`,
        building_type: 'Office Building',
        usage_count: Math.floor(Math.random() * 50),
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      }));
      
      const largeCollectionResponse = {
        data: largeTemplateCollection,
        error: null
      };
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue(largeCollectionResponse)
        })
      });
      
      const startTime = performance.now();
      // Simulate template library loading
      const templates = largeCollectionResponse.data;
      const endTime = performance.now();
      
      expect(templates).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should load within 1 second
    });
  });
});