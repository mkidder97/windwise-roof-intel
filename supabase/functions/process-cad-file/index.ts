import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingRequest {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  buildingGeometryId?: string;
}

interface ExtractedGeometry {
  shape_type: 'rectangle' | 'l_shape' | 'complex';
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
    length1?: number;
    width1?: number;
    length2?: number;
    width2?: number;
  };
  total_area?: number;
  perimeter_length?: number;
  corner_locations?: Array<{x: number; y: number}>;
}

interface ProcessingResult {
  success: boolean;
  extractedGeometry?: ExtractedGeometry;
  confidence: number;
  warnings: string[];
  requiresManualReview: boolean;
  processingMethod: string;
  extractedEntities?: any[];
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// File format detection
function detectFileFormat(fileName: string, fileContent?: Uint8Array): string {
  const extension = fileName.toLowerCase().split('.').pop();
  
  if (extension === 'dxf') return 'dxf';
  if (extension === 'pdf') return 'pdf';
  if (extension === 'dwg') return 'dwg';
  if (extension === 'svg') return 'svg';
  
  // Fallback to content analysis
  if (fileContent) {
    const contentStr = new TextDecoder().decode(fileContent.slice(0, 1000));
    if (contentStr.includes('SECTION') && contentStr.includes('ENTITIES')) return 'dxf';
    if (contentStr.startsWith('%PDF')) return 'pdf';
  }
  
  return 'unknown';
}

// DXF Processing (simplified implementation)
async function processDXFFile(fileContent: string): Promise<ProcessingResult> {
  console.log('Processing DXF file...');
  
  const warnings: string[] = [];
  let confidence = 50; // Start with medium confidence
  
  try {
    // Parse DXF entities (simplified - real implementation would use DXF parser library)
    const lines = fileContent.split('\n');
    const entities = extractDXFEntities(lines);
    
    console.log(`Found ${entities.length} entities in DXF file`);
    
    // Extract building outline
    const buildingOutline = extractBuildingOutline(entities);
    
    if (!buildingOutline || buildingOutline.length < 3) {
      warnings.push('Could not identify building outline - insufficient geometric data');
      return {
        success: false,
        confidence: 0,
        warnings,
        requiresManualReview: true,
        processingMethod: 'dxf_parser'
      };
    }
    
    // Analyze geometry
    const geometry = analyzeBuildingGeometry(buildingOutline);
    confidence = geometry.confidence;
    
    if (geometry.shape_type === 'complex') {
      warnings.push('Complex building shape detected - manual review recommended');
      confidence = Math.min(confidence, 60);
    }
    
    return {
      success: true,
      extractedGeometry: {
        shape_type: geometry.shape_type,
        dimensions: geometry.dimensions,
        total_area: geometry.total_area,
        perimeter_length: geometry.perimeter_length,
        corner_locations: geometry.corner_locations
      },
      confidence,
      warnings,
      requiresManualReview: confidence < 80,
      processingMethod: 'dxf_parser',
      extractedEntities: entities.slice(0, 100) // Limit for response size
    };
    
  } catch (error) {
    console.error('DXF processing error:', error);
    return {
      success: false,
      confidence: 0,
      warnings: [`DXF processing failed: ${error.message}`],
      requiresManualReview: true,
      processingMethod: 'dxf_parser'
    };
  }
}

// PDF Processing (simplified implementation)
async function processPDFFile(fileContent: Uint8Array): Promise<ProcessingResult> {
  console.log('Processing PDF file...');
  
  const warnings: string[] = [];
  let confidence = 30; // Lower confidence for PDF processing
  
  try {
    // Convert to text for dimension extraction
    const textContent = await extractPDFText(fileContent);
    
    // Extract dimensions using regex patterns
    const dimensions = extractDimensionsFromText(textContent);
    
    if (dimensions.length === 0) {
      warnings.push('No dimensions found in PDF - manual input required');
      return {
        success: false,
        confidence: 0,
        warnings,
        requiresManualReview: true,
        processingMethod: 'pdf_text_extraction'
      };
    }
    
    // Attempt to determine building shape from dimensions
    const geometry = interpretDimensions(dimensions);
    confidence = geometry.confidence;
    
    warnings.push('PDF processing has limited accuracy - verify all dimensions');
    
    return {
      success: true,
      extractedGeometry: geometry,
      confidence,
      warnings,
      requiresManualReview: true, // Always require review for PDF
      processingMethod: 'pdf_text_extraction'
    };
    
  } catch (error) {
    console.error('PDF processing error:', error);
    return {
      success: false,
      confidence: 0,
      warnings: [`PDF processing failed: ${error.message}`],
      requiresManualReview: true,
      processingMethod: 'pdf_text_extraction'
    };
  }
}

// DXF Entity extraction (simplified)
function extractDXFEntities(lines: string[]): any[] {
  const entities = [];
  let currentEntity: any = {};
  let inEntity = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '0' && lines[i + 1]?.trim() === 'LINE') {
      if (inEntity && currentEntity.type) {
        entities.push({ ...currentEntity });
      }
      currentEntity = { type: 'LINE' };
      inEntity = true;
      i++; // Skip next line
    } else if (line === '0' && lines[i + 1]?.trim() === 'LWPOLYLINE') {
      if (inEntity && currentEntity.type) {
        entities.push({ ...currentEntity });
      }
      currentEntity = { type: 'LWPOLYLINE', points: [] };
      inEntity = true;
      i++; // Skip next line
    } else if (inEntity) {
      const code = parseInt(line);
      const value = lines[i + 1]?.trim();
      
      if (!isNaN(code) && value !== undefined) {
        // Parse coordinate data
        if (code === 10) currentEntity.x1 = parseFloat(value);
        if (code === 20) currentEntity.y1 = parseFloat(value);
        if (code === 11) currentEntity.x2 = parseFloat(value);
        if (code === 21) currentEntity.y2 = parseFloat(value);
        
        i++; // Skip value line
      }
    }
  }
  
  if (inEntity && currentEntity.type) {
    entities.push(currentEntity);
  }
  
  return entities.filter(e => e.type && (e.x1 !== undefined || e.points?.length > 0));
}

// Extract building outline from entities
function extractBuildingOutline(entities: any[]): Array<{x: number; y: number}> {
  const points: Array<{x: number; y: number}> = [];
  
  // Extract line endpoints and polyline points
  entities.forEach(entity => {
    if (entity.type === 'LINE' && entity.x1 !== undefined) {
      points.push({ x: entity.x1, y: entity.y1 });
      points.push({ x: entity.x2, y: entity.y2 });
    } else if (entity.type === 'LWPOLYLINE' && entity.points) {
      points.push(...entity.points);
    }
  });
  
  if (points.length === 0) return [];
  
  // Find boundary points (simplified - real implementation would use computational geometry)
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  
  // Return rectangular outline for now
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
}

// Analyze building geometry from outline
function analyzeBuildingGeometry(outline: Array<{x: number; y: number}>): any {
  if (outline.length < 3) {
    return { confidence: 0, shape_type: 'complex' };
  }
  
  // Calculate dimensions
  const minX = Math.min(...outline.map(p => p.x));
  const maxX = Math.max(...outline.map(p => p.x));
  const minY = Math.min(...outline.map(p => p.y));
  const maxY = Math.max(...outline.map(p => p.y));
  
  const length = Math.abs(maxX - minX);
  const width = Math.abs(maxY - minY);
  const area = length * width;
  const perimeter = 2 * (length + width);
  
  // Determine shape (simplified analysis)
  let shape_type: 'rectangle' | 'l_shape' | 'complex' = 'rectangle';
  let confidence = 70;
  
  if (outline.length === 4) {
    shape_type = 'rectangle';
    confidence = 85;
  } else if (outline.length > 4 && outline.length <= 8) {
    shape_type = 'l_shape';
    confidence = 60;
  } else {
    shape_type = 'complex';
    confidence = 40;
  }
  
  return {
    shape_type,
    dimensions: {
      length: Math.round(length),
      width: Math.round(width),
      height: 20 // Default height - typically not in plan view
    },
    total_area: Math.round(area),
    perimeter_length: Math.round(perimeter),
    corner_locations: outline,
    confidence
  };
}

// PDF text extraction (simplified)
async function extractPDFText(fileContent: Uint8Array): Promise<string> {
  // This is a simplified implementation
  // Real implementation would use a PDF parsing library
  const decoder = new TextDecoder();
  let text = decoder.decode(fileContent);
  
  // Extract readable text from PDF structure
  const textMatches = text.match(/\([^)]+\)/g) || [];
  return textMatches.join(' ');
}

// Extract dimensions from text
function extractDimensionsFromText(text: string): Array<{value: number; unit: string; type: string}> {
  const dimensions = [];
  
  // Common dimension patterns
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:ft|feet|')/gi,
    /(\d+(?:\.\d+)?)\s*(?:in|inches|")/gi,
    /(\d+(?:\.\d+)?)\s*(?:m|meter|metres)/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const value = parseFloat(match);
      if (value > 0 && value < 1000) { // Reasonable building dimension
        dimensions.push({
          value,
          unit: match.includes('ft') || match.includes("'") ? 'ft' : 
                match.includes('in') || match.includes('"') ? 'in' : 'm',
          type: 'extracted'
        });
      }
    });
  });
  
  return dimensions;
}

// Interpret dimensions to determine building geometry
function interpretDimensions(dimensions: Array<{value: number; unit: string}>): any {
  if (dimensions.length < 2) {
    return { confidence: 0, shape_type: 'complex' };
  }
  
  // Convert all to feet
  const feetDimensions = dimensions.map(d => {
    let value = d.value;
    if (d.unit === 'in') value /= 12;
    if (d.unit === 'm') value *= 3.28084;
    return value;
  }).filter(v => v > 5 && v < 500); // Reasonable building dimensions
  
  if (feetDimensions.length >= 2) {
    const sorted = feetDimensions.sort((a, b) => b - a);
    return {
      shape_type: 'rectangle',
      dimensions: {
        length: Math.round(sorted[0]),
        width: Math.round(sorted[1]),
        height: 20
      },
      total_area: Math.round(sorted[0] * sorted[1]),
      perimeter_length: Math.round(2 * (sorted[0] + sorted[1])),
      confidence: 50
    };
  }
  
  return { confidence: 0, shape_type: 'complex' };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('CAD file processing request received');
    
    const { fileUrl, fileName, fileSize, buildingGeometryId }: ProcessingRequest = await req.json();
    
    if (!fileUrl || !fileName) {
      throw new Error('Missing required parameters: fileUrl, fileName');
    }
    
    console.log(`Processing file: ${fileName} (${fileSize} bytes)`);
    
    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cad-files')
      .download(fileUrl);
    
    if (downloadError) {
      throw new Error(`File download failed: ${downloadError.message}`);
    }
    
    const fileContent = new Uint8Array(await fileData.arrayBuffer());
    const fileFormat = detectFileFormat(fileName, fileContent);
    
    console.log(`Detected file format: ${fileFormat}`);
    
    let result: ProcessingResult;
    
    switch (fileFormat) {
      case 'dxf':
        const textContent = new TextDecoder().decode(fileContent);
        result = await processDXFFile(textContent);
        break;
      case 'pdf':
        result = await processPDFFile(fileContent);
        break;
      default:
        result = {
          success: false,
          confidence: 0,
          warnings: [`Unsupported file format: ${fileFormat}. Supported formats: DXF, PDF`],
          requiresManualReview: true,
          processingMethod: 'format_detection'
        };
    }
    
    // Update building geometry record if ID provided
    if (buildingGeometryId && result.success) {
      const { error: updateError } = await supabase
        .from('building_geometries')
        .update({
          processing_status: result.requiresManualReview ? 'requires_review' : 'completed',
          processed_at: new Date().toISOString(),
          zone_calculations: result.extractedGeometry,
          total_area: result.extractedGeometry?.total_area,
          perimeter_length: result.extractedGeometry?.perimeter_length
        })
        .eq('id', buildingGeometryId);
      
      if (updateError) {
        console.error('Failed to update building geometry:', updateError);
        result.warnings.push('Failed to save processing results to database');
      }
    }
    
    console.log(`Processing completed: ${result.success ? 'SUCCESS' : 'FAILED'}, confidence: ${result.confidence}%`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('CAD processing error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      confidence: 0,
      warnings: [`Processing failed: ${error.message}`],
      requiresManualReview: true,
      processingMethod: 'error_handler'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});