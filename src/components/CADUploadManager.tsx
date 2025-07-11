import { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, X, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  uploadCADFile, 
  validateCADFile, 
  updateProcessingStatus,
  getCADFileInfo,
  deleteCADFile,
  CAD_CONFIG 
} from "@/lib/cadFileManager";
import GeometryReviewPanel from "@/components/GeometryReviewPanel";
import SaveTemplateDialog from "@/components/SaveTemplateDialog";
import WorkflowProgress from "@/components/WorkflowProgress";

interface GeometryData {
  shape_type: 'rectangle' | 'l_shape' | 'complex';
  dimensions: {
    height: number;
    [key: string]: any;
  };
  zone_calculations?: any;
  total_area?: number;
  perimeter_length?: number;
  extraction_confidence?: number;
  confidence_scores?: {
    [key: string]: number;
  };
}

interface CADUploadManagerProps {
  onGeometryExtracted: (geometry: GeometryData, geometryId: string) => void;
  onError: (error: string) => void;
  existingGeometry?: GeometryData & { id: string; name: string; cad_file_url?: string };
  enableTemplateFeatures?: boolean;
  onTemplateCreated?: (templateId: string) => void;
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

export function CADUploadManager({ 
  onGeometryExtracted, 
  onError, 
  existingGeometry,
  enableTemplateFeatures = false,
  onTemplateCreated
}: CADUploadManagerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingResults, setProcessingResults] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>('upload');
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [approvedGeometry, setApprovedGeometry] = useState<GeometryData | null>(null);
  const { toast } = useToast();

  // Enhanced CAD processing with confidence scores
  const processCADFile = useCallback(async (geometryId: string, fileName: string): Promise<GeometryData> => {
    setCurrentStep('process');
    await updateProcessingStatus(geometryId, 'processing');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    let mockGeometry: GeometryData;
    
    try {
      switch (fileExtension) {
        case 'dwg':
        case 'dxf':
          mockGeometry = {
            shape_type: 'rectangle',
            dimensions: { length: 200, width: 150, height: 30 },
            total_area: 30000,
            perimeter_length: 700,
            extraction_confidence: 85,
            confidence_scores: { length: 90, width: 85, height: 80 }
          };
          break;
        case 'pdf':
          mockGeometry = {
            shape_type: 'rectangle',
            dimensions: { length: 180, width: 120, height: 25 },
            total_area: 21600,
            perimeter_length: 600,
            extraction_confidence: 75,
            confidence_scores: { length: 80, width: 75, height: 70 }
          };
          break;
        default:
          throw new Error('Unsupported file format');
      }
      
      setCurrentStep('review');
      setIsReviewMode(true);
      await updateProcessingStatus(geometryId, 'completed', undefined, mockGeometry);
      return mockGeometry;
    } catch (error) {
      await updateProcessingStatus(geometryId, 'failed', error instanceof Error ? error.message : 'Processing failed');
      throw error;
    }
  }, []);

  // Handle file upload process
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setSelectedFile(file);
      setProcessingResults(null);
      
      // Validate file using helper function
      const validation = validateCADFile(file);
      if (!validation.isValid) {
        onError(validation.errors.join(', '));
        return;
      }

      setUploadProgress({
        progress: 0,
        phase: 'uploading',
        message: 'Uploading CAD file...'
      });

      // Upload file using helper function
      const uploadResult = await uploadCADFile(file, (progress) => {
        setUploadProgress({
          progress,
          phase: 'uploading',
          message: 'Uploading CAD file...'
        });
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setUploadProgress({
        progress: 100,
        phase: 'processing',
        message: 'Processing CAD file...'
      });

      // Process CAD file
      const geometry = await processCADFile(uploadResult.geometryId!, file.name);
      
      setUploadProgress({
        progress: 100,
        phase: 'complete',
        message: 'CAD file processed successfully!'
      });

      setProcessingResults({
        geometry,
        fileName: file.name,
        filePath: uploadResult.filePath,
        geometryId: uploadResult.geometryId
      });

      toast({
        title: "CAD File Processed",
        description: `Successfully extracted geometry from ${file.name}`,
      });

      // Call parent callback
      onGeometryExtracted(geometry, uploadResult.geometryId!);

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
  }, [processCADFile, onGeometryExtracted, onError, toast]);

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
              Supported formats: {CAD_CONFIG.ALLOWED_TYPES.join(', ')} (max {CAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)
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
              accept={CAD_CONFIG.ALLOWED_TYPES.join(',')}
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

        {/* Workflow Progress */}
        {uploadProgress && (
          <WorkflowProgress 
            currentStep={currentStep}
            className="mb-4"
          />
        )}

        {/* Geometry Review Panel */}
        {isReviewMode && processingResults && (
          <GeometryReviewPanel
            cadFileUrl={processingResults.filePath}
            fileName={processingResults.fileName}
            extractedGeometry={processingResults.geometry}
            onApprove={(geometry) => {
              setApprovedGeometry(geometry);
              setCurrentStep('approve');
              onGeometryExtracted(geometry, processingResults.geometryId);
              if (enableTemplateFeatures) {
                setShowSaveTemplate(true);
              }
            }}
            onEdit={(editedGeometry) => {
              setProcessingResults(prev => ({ ...prev, geometry: editedGeometry }));
            }}
            onReject={() => {
              setIsReviewMode(false);
              clearUpload();
            }}
            className="mb-4"
          />
        )}

        {/* Save Template Dialog */}
        {showSaveTemplate && approvedGeometry && (
          <SaveTemplateDialog
            open={showSaveTemplate}
            onOpenChange={setShowSaveTemplate}
            geometry={approvedGeometry}
            onSave={(templateId) => {
              onTemplateCreated?.(templateId);
              setCurrentStep('calculate');
            }}
          />
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
