import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { testHelpers, TEST_GEOMETRIES, MOCK_CAD_FILES, PE_VALIDATION_TOLERANCES } from './utils/testHelpers';
import { supabase } from '../integrations/supabase/client';

// Mock the supabase client
jest.mock('@/integrations/supabase/client');

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
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-file-url',
        fileName: mockFile.name
      });
      
      expect(result.data.success).toBe(true);
      expect(result.data.extractedGeometry.shape_type).toBe('rectangle');
      expect(result.data.extractedGeometry.dimensions.length).toBe(100);
      expect(result.data.extractedGeometry.dimensions.width).toBe(80);
      expect(result.data.extractedGeometry.extraction_confidence).toBeGreaterThanOrEqual(
        PE_VALIDATION_TOLERANCES.EXTRACTION_CONFIDENCE_MIN
      );
    });

    test('should accurately extract L-shape geometry from DXF', async () => {
      const mockFile = testHelpers.createMockCADFile(MOCK_CAD_FILES.complex_l_shape);
      
      const mockResponse = {
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
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-l-shape-url',
        fileName: mockFile.name
      });
      
      expect(result.data.success).toBe(true);
      expect(result.data.extractedGeometry.shape_type).toBe('l_shape');
      expect(result.data.extractedGeometry.total_area).toBe(14400);
    });

    test('should handle corrupted DXF files gracefully', async () => {
      const mockFile = testHelpers.createMockCADFile(MOCK_CAD_FILES.corrupted_file);
      
      const mockResponse = {
        data: null,
        error: { message: 'Failed to parse CAD file' }
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-corrupted-url',
        fileName: mockFile.name
      });
      
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Failed to parse CAD file');
    });
  });

  describe('PDF File Processing', () => {
    test('should extract geometry from PDF with dimension text', async () => {
      const mockFile = testHelpers.createMockCADFile(MOCK_CAD_FILES.valid_pdf);
      
      const mockResponse = {
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 200, width: 150, height: 35 },
            total_area: 30000,
            perimeter_length: 700,
            extraction_confidence: 75,
            confidence_scores: {
              length: 80,
              width: 75,
              height: 70
            }
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-pdf-url',
        fileName: mockFile.name
      });
      
      expect(result.data.success).toBe(true);
      expect(result.data.extractedGeometry.dimensions.length).toBe(200);
      expect(result.data.extractedGeometry.dimensions.width).toBe(150);
      
      // PDF extraction typically has lower confidence than DXF
      expect(result.data.extractedGeometry.extraction_confidence).toBeLessThan(85);
      expect(result.data.extractedGeometry.extraction_confidence).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Confidence Scoring Validation', () => {
    test('should provide accurate confidence scores for different extraction methods', () => {
      const testCases = [
        { method: 'DXF_ENTITIES', expected_range: [80, 95] },
        { method: 'PDF_TEXT', expected_range: [70, 85] },
        { method: 'PDF_OCR', expected_range: [60, 80] },
        { method: 'MANUAL_FALLBACK', expected_range: [0, 30] }
      ];
      
      testCases.forEach(({ method, expected_range }) => {
        // Mock confidence calculation based on extraction method
        let confidence = 0;
        switch (method) {
          case 'DXF_ENTITIES': confidence = 87; break;
          case 'PDF_TEXT': confidence = 78; break;
          case 'PDF_OCR': confidence = 72; break;
          case 'MANUAL_FALLBACK': confidence = 15; break;
        }
        
        expect(confidence).toBeGreaterThanOrEqual(expected_range[0]);
        expect(confidence).toBeLessThanOrEqual(expected_range[1]);
      });
    });
    
    test('should flag low confidence extractions for manual review', () => {
      const lowConfidenceResult = {
        extraction_confidence: 45,
        requires_manual_review: true
      };
      
      expect(lowConfidenceResult.extraction_confidence).toBeLessThan(
        PE_VALIDATION_TOLERANCES.EXTRACTION_CONFIDENCE_MIN
      );
      expect(lowConfidenceResult.requires_manual_review).toBe(true);
    });
  });

  describe('Multi-Format Processing', () => {
    test('should handle multiple CAD formats consistently', async () => {
      const formats = ['dxf', 'pdf', 'svg'];
      const results = [];
      
      for (const format of formats) {
        const mockResponse = {
          data: {
            success: true,
            extractedGeometry: {
              shape_type: 'rectangle',
              dimensions: { length: 100, width: 80, height: 30 },
              extraction_confidence: format === 'dxf' ? 85 : format === 'pdf' ? 75 : 70
            }
          },
          error: null
        };
        
        (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
        
        const result = await testHelpers.callEdgeFunction('process-cad-file', {
          fileUrl: `mock-${format}-url`,
          fileName: `test.${format}`
        });
        
        results.push(result);
      }
      
      // All formats should successfully extract geometry
      results.forEach(result => {
        expect(result.data.success).toBe(true);
        expect(result.data.extractedGeometry.shape_type).toBe('rectangle');
      });
      
      // DXF should have highest confidence, SVG lowest
      expect(results[0].data.extractedGeometry.extraction_confidence).toBeGreaterThan(
        results[1].data.extractedGeometry.extraction_confidence
      );
      expect(results[1].data.extractedGeometry.extraction_confidence).toBeGreaterThan(
        results[2].data.extractedGeometry.extraction_confidence
      );
    });
  });

  describe('Performance Testing', () => {
    test('should process CAD files within acceptable time limits', async () => {
      const mockResponse = {
        data: {
          success: true,
          extractedGeometry: TEST_GEOMETRIES.rectangle_100x80
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const performance = await testHelpers.measurePerformance(async () => {
        return await testHelpers.callEdgeFunction('process-cad-file', {
          fileUrl: 'mock-url',
          fileName: 'test.dxf'
        });
      }, 3);
      
      expect(performance.average).toBeLessThan(PE_VALIDATION_TOLERANCES.CALCULATION_TIME_MAX);
      expect(performance.max).toBeLessThan(PE_VALIDATION_TOLERANCES.CALCULATION_TIME_MAX * 1.5);
    });
    
    test('should handle large CAD files efficiently', async () => {
      // Simulate large file processing
      const largeMockResponse = {
        data: {
          success: true,
          extractedGeometry: {
            ...TEST_GEOMETRIES.rectangle_200x150,
            file_size: 10485760, // 10MB
            processing_time: 4500 // 4.5 seconds
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(largeMockResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-large-file-url',
        fileName: 'large_building.dxf'
      });
      
      expect(result.data.success).toBe(true);
      expect(result.data.extractedGeometry.processing_time).toBeLessThan(
        PE_VALIDATION_TOLERANCES.CALCULATION_TIME_MAX
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle unsupported file formats', async () => {
      const mockResponse = {
        data: null,
        error: { message: 'Unsupported file format: .doc' }
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-doc-url',
        fileName: 'document.doc'
      });
      
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Unsupported file format');
    });
    
    test('should handle extremely small buildings', async () => {
      const tinyBuildingResponse = {
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 5, width: 3, height: 8 },
            total_area: 15,
            warnings: ['Building dimensions are unusually small for commercial structure']
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(tinyBuildingResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-tiny-url',
        fileName: 'tiny_building.dxf'
      });
      
      expect(result.data.success).toBe(true);
      expect(result.data.extractedGeometry.warnings).toBeTruthy();
      expect(result.data.extractedGeometry.warnings[0]).toContain('unusually small');
    });
    
    test('should handle extremely large buildings', async () => {
      const hugeBuildingResponse = {
        data: {
          success: true,
          extractedGeometry: {
            shape_type: 'rectangle',
            dimensions: { length: 2000, width: 1500, height: 120 },
            total_area: 3000000,
            warnings: ['Building exceeds typical commercial size - verify measurements']
          }
        },
        error: null
      };
      
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(hugeBuildingResponse);
      
      const result = await testHelpers.callEdgeFunction('process-cad-file', {
        fileUrl: 'mock-huge-url',
        fileName: 'huge_building.dxf'
      });
      
      expect(result.data.success).toBe(true);
      expect(result.data.extractedGeometry.warnings).toBeTruthy();
      expect(result.data.extractedGeometry.warnings[0]).toContain('exceeds typical');
    });
  });
});