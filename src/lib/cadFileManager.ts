import { supabase } from "@/integrations/supabase/client";

// Constants for CAD file management
export const CAD_CONFIG = {
  BUCKET_NAME: 'cad-files',
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: ['.dwg', '.dxf', '.pdf', '.svg'],
  ALLOWED_MIME_TYPES: [
    'application/acad',
    'application/x-autocad', 
    'application/dwg',
    'application/dxf',
    'application/pdf',
    'image/svg+xml'
  ]
};

export interface CADFileMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  userId: string;
  uploadedAt: Date;
}

export interface CADUploadResult {
  success: boolean;
  filePath?: string;
  geometryId?: string;
  error?: string;
  metadata?: CADFileMetadata;
}

export interface CADFileValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates CAD file before upload
 */
export function validateCADFile(file: File): CADFileValidation {
  const errors: string[] = [];
  
  // Check file size
  if (file.size > CAD_CONFIG.MAX_FILE_SIZE) {
    errors.push(
      `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds ${CAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit`
    );
  }
  
  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!CAD_CONFIG.ALLOWED_TYPES.includes(fileExtension)) {
    errors.push(
      `Unsupported format: ${fileExtension}. Supported: ${CAD_CONFIG.ALLOWED_TYPES.join(', ')}`
    );
  }
  
  // Check MIME type if available
  if (file.type && !CAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
    console.warn(`MIME type ${file.type} not in allowed list, but continuing based on extension`);
  }
  
  // Check file name validity
  if (!file.name || file.name.length > 255) {
    errors.push('Invalid file name or name too long (max 255 characters)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates unique file path for CAD file
 */
export function generateCADFilePath(file: File, userId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
  
  return `${userId}/${timestamp}-${sanitizedName}`;
}

/**
 * Uploads CAD file to Supabase Storage with metadata
 */
export async function uploadCADFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<CADUploadResult> {
  try {
    // Validate file first
    const validation = validateCADFile(file);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }
    
    // Generate file path
    const filePath = generateCADFilePath(file, user.id);
    
    // Simulate progress for upload
    onProgress?.(25);
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CAD_CONFIG.BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: {
          userId: user.id,
          originalName: file.name,
          fileSize: file.size.toString(),
          fileType: file.type || 'unknown'
        }
      });
    
    if (uploadError) {
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      };
    }
    
    onProgress?.(75);
    
    // Create metadata object
    const metadata: CADFileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || file.name.split('.').pop() || 'unknown',
      userId: user.id,
      uploadedAt: new Date()
    };
    
    // Save to building_geometries table
    const { data: geometryData, error: geometryError } = await supabase
      .from('building_geometries')
      .insert({
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        shape_type: 'complex', // Default until processed
        dimensions: { extracted: false },
        cad_file_url: filePath,
        processing_status: 'pending',
        file_size: file.size,
        file_type: metadata.fileType
      })
      .select()
      .single();
    
    if (geometryError) {
      // Clean up uploaded file if geometry creation fails
      await supabase.storage
        .from(CAD_CONFIG.BUCKET_NAME)
        .remove([filePath]);
      
      return {
        success: false,
        error: `Failed to save geometry record: ${geometryError.message}`
      };
    }
    
    onProgress?.(100);
    
    return {
      success: true,
      filePath,
      geometryId: geometryData.id,
      metadata
    };
    
  } catch (error) {
    console.error('CAD upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Generates signed URL for CAD file access
 */
export async function getCADFileUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(CAD_CONFIG.BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

/**
 * Gets public URL for CAD file (since bucket is public)
 */
export function getCADFilePublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(CAD_CONFIG.BUCKET_NAME)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Deletes CAD file and cleans up references
 */
export async function deleteCADFile(filePath: string, geometryId?: string): Promise<boolean> {
  try {
    // Remove file from storage
    const { error: storageError } = await supabase.storage
      .from(CAD_CONFIG.BUCKET_NAME)
      .remove([filePath]);
    
    if (storageError) {
      console.error('Failed to delete file from storage:', storageError);
      return false;
    }
    
    // Update geometry record if provided
    if (geometryId) {
      const { error: geometryError } = await supabase
        .from('building_geometries')
        .update({
          cad_file_url: null,
          processing_status: 'failed',
          processing_error: 'File deleted'
        })
        .eq('id', geometryId);
      
      if (geometryError) {
        console.error('Failed to update geometry record:', geometryError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting CAD file:', error);
    return false;
  }
}

/**
 * Updates processing status for a geometry record
 */
export async function updateProcessingStatus(
  geometryId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string,
  processedData?: any
): Promise<boolean> {
  try {
    const updateData: any = {
      processing_status: status,
      processed_at: new Date().toISOString()
    };
    
    if (error) {
      updateData.processing_error = error;
    }
    
    if (processedData) {
      updateData.dimensions = processedData.dimensions || updateData.dimensions;
      updateData.zone_calculations = processedData.zone_calculations || updateData.zone_calculations;
      updateData.total_area = processedData.total_area || updateData.total_area;
      updateData.perimeter_length = processedData.perimeter_length || updateData.perimeter_length;
      updateData.shape_type = processedData.shape_type || updateData.shape_type;
    }
    
    const { error: updateError } = await supabase
      .from('building_geometries')
      .update(updateData)
      .eq('id', geometryId);
    
    return !updateError;
  } catch (error) {
    console.error('Error updating processing status:', error);
    return false;
  }
}

/**
 * Gets CAD file info and processing status
 */
export async function getCADFileInfo(geometryId: string) {
  try {
    const { data, error } = await supabase
      .from('building_geometries')
      .select('*')
      .eq('id', geometryId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      filePath: data.cad_file_url,
      processingStatus: data.processing_status,
      processingError: data.processing_error,
      fileSize: data.file_size,
      fileType: data.file_type,
      processedAt: data.processed_at,
      dimensions: data.dimensions,
      zoneCalculations: data.zone_calculations,
      totalArea: data.total_area,
      perimeterLength: data.perimeter_length,
      shapeType: data.shape_type
    };
  } catch (error) {
    console.error('Error getting CAD file info:', error);
    return null;
  }
}

/**
 * Lists CAD files for current user
 */
export async function listUserCADFiles() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('building_geometries')
      .select('*')
      .not('cad_file_url', 'is', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error listing CAD files:', error);
      return [];
    }
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      filePath: item.cad_file_url,
      processingStatus: item.processing_status,
      fileSize: item.file_size,
      fileType: item.file_type,
      createdAt: item.created_at,
      processedAt: item.processed_at
    }));
  } catch (error) {
    console.error('Error listing CAD files:', error);
    return [];
  }
}

/**
 * Checks storage quota usage for user
 */
export async function checkStorageQuota(): Promise<{ used: number; limit: number; available: number } | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }
    
    // Get total file size for user
    const { data, error } = await supabase
      .from('building_geometries')
      .select('file_size')
      .not('cad_file_url', 'is', null);
    
    if (error) {
      return null;
    }
    
    const used = data.reduce((total, item) => total + (item.file_size || 0), 0);
    const limit = 1024 * 1024 * 1024; // 1GB limit per user
    const available = limit - used;
    
    return { used, limit, available };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return null;
  }
}