import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Edit3, Check, X, AlertTriangle, FileText, 
  ZoomIn, ZoomOut, RotateCcw, Save 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import BuildingGeometryVisualizer from '@/components/BuildingGeometryVisualizer';
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';

interface ExtractedGeometry {
  shape_type: 'rectangle' | 'l_shape' | 'complex';
  dimensions: {
    length: number;
    width: number;
    height: number;
    length1?: number;
    width1?: number;
    length2?: number;
    width2?: number;
  };
  total_area: number;
  perimeter_length: number;
  extraction_confidence: number;
  confidence_scores: {
    [key: string]: number;
  };
}

interface GeometryReviewPanelProps {
  cadFileUrl: string;
  fileName: string;
  extractedGeometry: ExtractedGeometry;
  onApprove: (geometry: ExtractedGeometry) => void;
  onEdit: (editedGeometry: ExtractedGeometry) => void;
  onReject: () => void;
  className?: string;
}

export const GeometryReviewPanel: React.FC<GeometryReviewPanelProps> = ({
  cadFileUrl,
  fileName,
  extractedGeometry,
  onApprove,
  onEdit,
  onReject,
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDimensions, setEditedDimensions] = useState(extractedGeometry.dimensions);
  const [previewZoom, setPreviewZoom] = useState(1);
  const cadPreviewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Calculate real-time geometry updates
  const updatedGeometry = {
    ...extractedGeometry,
    dimensions: editedDimensions,
    total_area: calculateTotalArea(editedDimensions, extractedGeometry.shape_type),
    perimeter_length: calculatePerimeter(editedDimensions, extractedGeometry.shape_type)
  };

  function calculateTotalArea(dims: typeof editedDimensions, shape: string): number {
    if (shape === 'l_shape' && dims.length1 && dims.width1 && dims.length2 && dims.width2) {
      return (dims.length1 * dims.width1) + (dims.length2 * dims.width2);
    }
    return dims.length * dims.width;
  }

  function calculatePerimeter(dims: typeof editedDimensions, shape: string): number {
    if (shape === 'l_shape' && dims.length1 && dims.width1 && dims.length2 && dims.width2) {
      // Simplified L-shape perimeter calculation
      return 2 * (dims.length1 + dims.width1 + dims.length2 + dims.width2);
    }
    return 2 * (dims.length + dims.width);
  }

  const handleDimensionChange = (field: string, value: number) => {
    setEditedDimensions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApprove = () => {
    if (isEditing) {
      onEdit(updatedGeometry);
      setIsEditing(false);
      toast({
        title: "Geometry Updated",
        description: "Manual corrections applied successfully",
      });
    } else {
      onApprove(extractedGeometry);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    toast({
      title: "Edit Mode Enabled",
      description: "You can now modify the extracted dimensions",
    });
  };

  const handleCancelEdit = () => {
    setEditedDimensions(extractedGeometry.dimensions);
    setIsEditing(false);
  };

  const renderCADPreview = () => {
    // Simplified CAD file preview - in production this would render actual CAD content
    return (
      <div 
        ref={cadPreviewRef}
        className="relative bg-gray-50 border rounded-lg overflow-hidden"
        style={{ height: '400px' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <FileText className="h-12 w-12 mx-auto text-gray-400" />
            <p className="text-sm text-gray-600">CAD File Preview</p>
            <p className="text-xs text-gray-500">{fileName}</p>
          </div>
        </div>
        
        {/* Extracted dimensions overlay */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded text-xs space-y-1">
          <div>Length: {extractedGeometry.dimensions.length}'</div>
          <div>Width: {extractedGeometry.dimensions.width}'</div>
          <div>Height: {extractedGeometry.dimensions.height}'</div>
        </div>

        {/* Preview controls */}
        <div className="absolute top-4 right-4 flex gap-1">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPreviewZoom(z => Math.min(3, z * 1.2))}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPreviewZoom(z => Math.max(0.3, z / 1.2))}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPreviewZoom(1)}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDimensionInputs = () => {
    const geometry = isEditing ? updatedGeometry : extractedGeometry;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Extracted Dimensions</h4>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleStartEdit}>
              <Edit3 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {extractedGeometry.shape_type === 'rectangle' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Length (ft)</Label>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedDimensions.length}
                    onChange={(e) => handleDimensionChange('length', Number(e.target.value))}
                    className="flex-1"
                  />
                ) : (
                  <Input
                    value={geometry.dimensions.length}
                    disabled
                    className="flex-1"
                  />
                )}
                <ConfidenceIndicator 
                  confidence={extractedGeometry.confidence_scores?.length || 0}
                  size="sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Width (ft)</Label>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedDimensions.width}
                    onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                    className="flex-1"
                  />
                ) : (
                  <Input
                    value={geometry.dimensions.width}
                    disabled
                    className="flex-1"
                  />
                )}
                <ConfidenceIndicator 
                  confidence={extractedGeometry.confidence_scores?.width || 0}
                  size="sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Height (ft)</Label>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedDimensions.height}
                    onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                    className="flex-1"
                  />
                ) : (
                  <Input
                    value={geometry.dimensions.height}
                    disabled
                    className="flex-1"
                  />
                )}
                <ConfidenceIndicator 
                  confidence={extractedGeometry.confidence_scores?.height || 0}
                  size="sm"
                />
              </div>
            </div>
          </div>
        )}

        {extractedGeometry.shape_type === 'l_shape' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-medium">Leg 1 (Primary)</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Length (ft)</Label>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editedDimensions.length1 || 0}
                          onChange={(e) => handleDimensionChange('length1', Number(e.target.value))}
                          className="flex-1"
                        />
                      ) : (
                        <Input
                          value={geometry.dimensions.length1 || 0}
                          disabled
                          className="flex-1"
                        />
                      )}
                      <ConfidenceIndicator 
                        confidence={extractedGeometry.confidence_scores?.length1 || 0}
                        size="sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Width (ft)</Label>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editedDimensions.width1 || 0}
                          onChange={(e) => handleDimensionChange('width1', Number(e.target.value))}
                          className="flex-1"
                        />
                      ) : (
                        <Input
                          value={geometry.dimensions.width1 || 0}
                          disabled
                          className="flex-1"
                        />
                      )}
                      <ConfidenceIndicator 
                        confidence={extractedGeometry.confidence_scores?.width1 || 0}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h5 className="font-medium">Leg 2 (Secondary)</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Length (ft)</Label>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editedDimensions.length2 || 0}
                          onChange={(e) => handleDimensionChange('length2', Number(e.target.value))}
                          className="flex-1"
                        />
                      ) : (
                        <Input
                          value={geometry.dimensions.length2 || 0}
                          disabled
                          className="flex-1"
                        />
                      )}
                      <ConfidenceIndicator 
                        confidence={extractedGeometry.confidence_scores?.length2 || 0}
                        size="sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Width (ft)</Label>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editedDimensions.width2 || 0}
                          onChange={(e) => handleDimensionChange('width2', Number(e.target.value))}
                          className="flex-1"
                        />
                      ) : (
                        <Input
                          value={geometry.dimensions.width2 || 0}
                          disabled
                          className="flex-1"
                        />
                      )}
                      <ConfidenceIndicator 
                        confidence={extractedGeometry.confidence_scores?.width2 || 0}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Building Height (ft)</Label>
              <div className="flex items-center gap-2 max-w-32">
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedDimensions.height}
                    onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                    className="flex-1"
                  />
                ) : (
                  <Input
                    value={geometry.dimensions.height}
                    disabled
                    className="flex-1"
                  />
                )}
                <ConfidenceIndicator 
                  confidence={extractedGeometry.confidence_scores?.height || 0}
                  size="sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Calculated metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <Label className="text-sm text-muted-foreground">Total Area</Label>
            <p className="font-medium">{updatedGeometry.total_area.toLocaleString()} ft²</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Perimeter</Label>
            <p className="font-medium">{updatedGeometry.perimeter_length.toLocaleString()} ft</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Geometry Review</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {extractedGeometry.shape_type.replace('_', ' ')}
            </Badge>
            <ConfidenceIndicator 
              confidence={extractedGeometry.extraction_confidence}
              showLabel
            />
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Confidence Alert */}
        {extractedGeometry.extraction_confidence < 80 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Low extraction confidence ({extractedGeometry.extraction_confidence}%). 
              Please review and verify all dimensions carefully.
            </AlertDescription>
          </Alert>
        )}

        {/* Side-by-side display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CAD Preview */}
          <div className="space-y-2">
            <Label className="font-medium">CAD File Preview</Label>
            {renderCADPreview()}
          </div>
          
          {/* Geometry Visualization */}
          <div className="space-y-2">
            <Label className="font-medium">Extracted Geometry</Label>
            <BuildingGeometryVisualizer
              buildingShape={updatedGeometry.shape_type}
              dimensions={updatedGeometry.dimensions}
              className="h-auto"
              interactive={false}
            />
          </div>
        </div>

        <Separator />

        {/* Dimension Editor */}
        {renderDimensionInputs()}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={onReject}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Reject & Manual Input
          </Button>
          
          <div className="flex gap-2">
            {isEditing && (
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            )}
            <Button onClick={handleApprove}>
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Approve Geometry
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeometryReviewPanel;