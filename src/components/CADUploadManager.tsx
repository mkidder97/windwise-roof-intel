import { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GeometryData {
  shape_type: 'rectangle' | 'l_shape' | 'complex';
  dimensions: {
    height: number;
    [key: string]: any;
  };
  zone_calculations?: any;
  total_area?: number;
  perimeter_length?: number;
}

interface CADUploadManagerProps {
  onGeometryExtracted: (geometry: GeometryData, geometryId: string) => void;
  onError: (error: string) => void;
  existingGeometry?: GeometryData & { id: string; name: string; cad_file_url?: string };
}

interface UploadProgress {
  progress: number;
  phase: 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
}

interface FileValidation {
  isValid: boolean;
  errors: string[];
}

const SUPPORTED_FORMATS = ['.dwg', '.dxf', '.pdf', '.svg'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function CADUploadManager({ 
  onGeometryExtracted, 
  onError, 
  existingGeometry 
}: CADUploadManagerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingResults, setProcessingResults] = useState<any>(null);
  const { toast } = useToast();

  // Validate file format and size
  const validateFile = useCallback((file: File): FileValidation => {
    const errors: string[] = [];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 50MB limit`);
    }
    
    // Check file format
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(fileExtension)) {
      errors.push(`Unsupported format: ${fileExtension}. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Generate unique file path
  const generateFilePath = useCallback((file: File, userId: string): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${userId}/${timestamp}-${sanitizedName}`;
  }, []);

  // Upload file to Supabase Storage
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const filePath = generateFilePath(file, user.id);
    
    setUploadProgress({
      progress: 0,
      phase: 'uploading',
      message: 'Uploading CAD file...'
    });

    const { data, error } = await supabase.storage
      .from('cad-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    setUploadProgress({
      progress: 100,
      phase: 'processing',
      message: 'Processing CAD file...'
    });

    return filePath;
  }, [generateFilePath]);

  // Mock CAD processing (in real implementation, this would call a processing service)
  const processCADFile = useCallback(async (filePath: string, fileName: string): Promise<GeometryData> => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock geometry extraction based on file type
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    let mockGeometry: GeometryData;
    
    switch (fileExtension) {
      case 'dwg':
      case 'dxf':
        mockGeometry = {
          shape_type: 'complex',
          dimensions: {
            length: 200,
            width: 150,
            height: 30,
            extractedFromCAD: true
          },
          zone_calculations: {
            field_zone: { area: 25000, gcp: -0.9 },
            perimeter_zone: { area: 5000, gcp: -1.4 },
            corner_zones: { area: 1000, gcp: -2.0 }
          },
          total_area: 30000,
          perimeter_length: 700
        };
        break;
      case 'pdf':
        mockGeometry = {
          shape_type: 'rectangle',
          dimensions: {
            length: 180,
            width: 120,
            height: 25,
            extractedFromPDF: true
          },
          total_area: 21600,
          perimeter_length: 600
        };
        break;
      case 'svg':
        mockGeometry = {
          shape_type: 'l_shape',
          dimensions: {
            length1: 200,
            width1: 100,
            length2: 100,
            width2: 80,
            height: 28,
            extractedFromSVG: true
          },
          total_area: 28000,
          perimeter_length: 760
        };
        break;
      default:
        throw new Error('Unsupported file format for processing');
    }
    
    return mockGeometry;
  }, []);

  // Save geometry to database
  const saveGeometry = useCallback(async (
    geometry: GeometryData, 
    fileName: string, 
    filePath: string
  ): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('building_geometries')
      .insert({
        name: fileName.replace(/\.[^/.]+$/, ''), // Remove file extension
        shape_type: geometry.shape_type,
        dimensions: geometry.dimensions,
        zone_calculations: geometry.zone_calculations || {},
        cad_file_url: filePath,
        total_area: geometry.total_area,
        perimeter_length: geometry.perimeter_length
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save geometry: ${error.message}`);
    }

    return data.id;
  }, []);

  // Handle file upload process
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setSelectedFile(file);
      setProcessingResults(null);
      
      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        onError(validation.errors.join(', '));
        return;
      }

      // Upload file
      const filePath = await uploadFile(file);
      
      // Process CAD file
      const geometry = await processCADFile(filePath, file.name);
      
      // Save to database
      const geometryId = await saveGeometry(geometry, file.name, filePath);
      
      setUploadProgress({
        progress: 100,
        phase: 'complete',
        message: 'CAD file processed successfully!'
      });

      setProcessingResults({
        geometry,
        fileName: file.name,
        filePath,
        geometryId
      });

      toast({
        title: "CAD File Processed",
        description: `Successfully extracted geometry from ${file.name}`,
      });

      // Call parent callback
      onGeometryExtracted(geometry, geometryId);

    } catch (error) {
      console.error('CAD upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setUploadProgress({
        progress: 0,
        phase: 'error',
        message: errorMessage
      });

      onError(errorMessage);
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [validateFile, uploadFile, processCADFile, saveGeometry, onGeometryExtracted, onError, toast]);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Clear upload state
  const clearUpload = useCallback(() => {
    setSelectedFile(null);
    setUploadProgress(null);
    setProcessingResults(null);
  }, []);

  // Retry upload
  const retryUpload = useCallback(() => {
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  }, [selectedFile, handleFileUpload]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          CAD File Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Geometry Display */}
        {existingGeometry && !processingResults && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Current geometry: <strong>{existingGeometry.name}</strong> 
              ({existingGeometry.shape_type}) - {existingGeometry.total_area?.toLocaleString()} sq ft
              {existingGeometry.cad_file_url && (
                <Badge variant="secondary" className="ml-2">CAD File Attached</Badge>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Zone */}
        {!uploadProgress && (
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Upload CAD File</h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop your CAD file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supported formats: {SUPPORTED_FORMATS.join(', ')} (max 50MB)
            </p>
            <Button 
              variant="outline"
              onClick={() => document.getElementById('cad-file-input')?.click()}
            >
              Choose File
            </Button>
            <input
              id="cad-file-input"
              type="file"
              className="hidden"
              accept={SUPPORTED_FORMATS.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {uploadProgress.phase === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploadProgress.phase === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploadProgress.phase === 'complete' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {uploadProgress.phase === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                <span className="text-sm font-medium">{uploadProgress.message}</span>
              </div>
              {uploadProgress.phase !== 'complete' && (
                <Button variant="ghost" size="sm" onClick={clearUpload}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
              </div>
            )}

            {uploadProgress.phase !== 'error' && (
              <Progress value={uploadProgress.progress} className="w-full" />
            )}

            {uploadProgress.phase === 'error' && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={retryUpload}>
                  Retry Upload
                </Button>
                <Button variant="ghost" size="sm" onClick={clearUpload}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Processing Results */}
        {processingResults && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  <strong>Geometry extracted from:</strong> {processingResults.fileName}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Shape:</strong> {processingResults.geometry.shape_type.replace('_', ' ')}
                  </div>
                  <div>
                    <strong>Total Area:</strong> {processingResults.geometry.total_area?.toLocaleString()} sq ft
                  </div>
                  <div>
                    <strong>Perimeter:</strong> {processingResults.geometry.perimeter_length?.toLocaleString()} ft
                  </div>
                  <div>
                    <strong>Dimensions:</strong> 
                    {Object.entries(processingResults.geometry.dimensions)
                      .filter(([key]) => !key.includes('extracted'))
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ')
                    }
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={clearUpload} className="mt-2">
                  Upload Another File
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• CAD files will be analyzed to extract building dimensions and geometry</p>
          <p>• Processed geometry will be used for accurate wind zone calculations</p>
          <p>• Files are stored securely and associated with your calculations</p>
        </div>
      </CardContent>
    </Card>
  );
}
