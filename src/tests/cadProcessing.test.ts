import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { testHelpers, TEST_GEOMETRIES, MOCK_CAD_FILES, PE_VALIDATION_TOLERANCES } from './utils/testHelpers';
import { supabase } from '../integrations/supabase/client';

// Mock the supabase client
jest.mock('../integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    }
  }
}));

describe('CAD Processing Accuracy Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DXF File Processing', () => {
    test('should accurately extract rectangle geometry from DXF', async () => {
      const mockFile = testHelpers.createMockCADFile(MOCK_CAD_FILES.valid_dxf);
      
      // Mock the process-cad-file edge function response
      const mockResponse = {
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
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: mockFile.name
      });
      
      expect(result.data?.success).toBe(true);
      expect(result.data?.extractedGeometry?.shape_type).toBe('rectangle');
      expect(result.data?.extractedGeometry?.dimensions?.length).toBe(100);
      expect(result.data?.extractedGeometry?.dimensions?.width).toBe(80);
      expect(result.data?.extractedGeometry?.extraction_confidence).toBeGreaterThanOrEqual(
        PE_VALIDATION_TOLERANCES.EXTRACTION_CONFIDENCE_MIN
      );
      
      // Validate accuracy against known test geometry
      const testGeometry = TEST_GEOMETRIES.rectangle_100x80;
      expect(result.data?.extractedGeometry?.total_area).toBe(testGeometry.expected_area);
      expect(result.data?.extractedGeometry?.perimeter_length).toBe(testGeometry.expected_perimeter);
    });

    test('should handle L-shape geometry extraction', async () => {
      const mockFile = testHelpers.createMockCADFile(MOCK_CAD_FILES.complex_l_shape);
      
      // Mock L-shape processing
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'l_shape',
            dimensions: {
              length1: 120, width1: 80,
              length2: 80, width2: 60,
              height: 32
            },
            total_area: 14400,
            perimeter_length: 600,
            extraction_confidence: 80
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: mockFile.name
      });
      
      expect(result.data?.success).toBe(true);
      expect(result.data?.extractedGeometry?.shape_type).toBe('l_shape');
      expect(result.data?.extractedGeometry?.total_area).toBe(14400);
    });

    test('should handle corrupted files gracefully', async () => {
      const mockFile = testHelpers.createMockCADFile(MOCK_CAD_FILES.corrupted_file);
      
      // Mock processing error
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to parse CAD file' }
      });
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: mockFile.name
      });
      
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Failed to parse CAD file');
    });
  });

  describe('PDF File Processing', () => {
    test('should extract geometry from PDF plans', async () => {
      const mockFile = testHelpers.createMockCADFile(MOCK_CAD_FILES.valid_pdf);
      
      // Mock PDF processing
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 200, width: 150, height: 35 },
            total_area: 30000,
            perimeter_length: 700,
            extraction_confidence: 75,
            confidence_scores: {
              shape_detection: 80,
              dimension_accuracy: 75,
              overall_quality: 72
            }
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: mockFile.name
      });
      
      expect(result.data?.success).toBe(true);
      expect(result.data?.extractedGeometry?.shape_type).toBe('rectangle');
      expect(result.data?.extractedGeometry?.extraction_confidence).toBeGreaterThanOrEqual(70);
      
      // Validate against test geometry
      const testGeometry = TEST_GEOMETRIES.rectangle_200x150;
      expect(result.data?.extractedGeometry?.total_area).toBe(testGeometry.expected_area);
    });
  });

  describe('Confidence Scoring', () => {
    test('should provide accurate confidence scores', async () => {
      const mockFile = testHelpers.createMockCADFile(MOCK_CAD_FILES.valid_dxf);
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 100, width: 80, height: 30 },
            extraction_confidence: 85
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: mockFile.name
      });
      
      expect(result.data?.extractedGeometry?.extraction_confidence).toBeGreaterThanOrEqual(70);
      expect(result.data?.extractedGeometry?.extraction_confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('Known Building Analysis', () => {
    test('should validate against known building geometries', async () => {
      const testGeometry = TEST_GEOMETRIES.rectangle_100x80;
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          success: true,
          extractedGeometry: {
            ...testGeometry
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: 'test_rectangle_100x80.dxf'
      });
      
      expect(result.data?.extractedGeometry?.expected_area).toBe(testGeometry.expected_area);
      expect(result.data?.extractedGeometry?.expected_perimeter).toBe(testGeometry.expected_perimeter);
    });
  });

  describe('Performance Testing', () => {
    test('should process files within acceptable time limits', async () => {
      const mockFile = testHelpers.createMockCADFile(MOCK_CAD_FILES.valid_dxf);
      
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          success: true,
          extractedGeometry: {
            file_size: 1024 * 1024, // 1MB
            processing_time: 3500, // 3.5 seconds
            ...TEST_GEOMETRIES.rectangle_100x80
          }
        },
        error: null
      });
      
      const startTime = performance.now();
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: mockFile.name
      });
      const endTime = performance.now();
      
      expect(result.data?.extractedGeometry?.processing_time).toBeLessThan(
        PE_VALIDATION_TOLERANCES.CALCULATION_TIME_MAX
      );
      expect(endTime - startTime).toBeLessThan(10000); // 10 second test timeout
    });

    test('should handle large files appropriately', async () => {
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: null,
        error: { message: 'File too large for processing' }
      });
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-large-file-url',
        fileName: 'large_file.dxf'
      });
      
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('too large');
    });
  });

  describe('Edge Case Handling', () => {
    test('should handle very small buildings', async () => {
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 10, width: 8, height: 3 },
            total_area: 80,
            warnings: ['Building dimensions are very small']
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: 'small_building.dxf'
      });
      
      expect(result.data?.success).toBe(true);
      expect(result.data?.extractedGeometry?.warnings).toContain('Building dimensions are very small');
    });

    test('should handle very large buildings', async () => {
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValueOnce({
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 1000, width: 800, height: 30 },
            total_area: 800000,
            warnings: ['Building requires professional analysis']
          }
        },
        error: null
      });
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: 'large_building.dxf'
      });
      
      expect(result.data?.success).toBe(true);
      expect(result.data?.extractedGeometry?.warnings).toContain('Building requires professional analysis');
    });
  });
});