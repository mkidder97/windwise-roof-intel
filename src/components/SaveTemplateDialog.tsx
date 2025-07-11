import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Building, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGeometryTemplates } from '@/hooks/useGeometryTemplates';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geometry: {
    shape_type: string;
    dimensions: any;
    total_area?: number;
    perimeter_length?: number;
  };
  onSave?: (templateId: string) => void;
}

const buildingTypes = [
  'Office Building',
  'Warehouse',
  'Retail Store',
  'Manufacturing Facility',
  'School',
  'Hospital',
  'Residential Complex',
  'Mixed Use',
  'Other'
];

const commonUseCases = [
  'Rooftop Equipment',
  'Solar Panels',
  'HVAC Systems',
  'Structural Analysis',
  'Membrane Replacement',
  'New Construction',
  'Renovation',
  'Maintenance Access'
];

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  open,
  onOpenChange,
  geometry,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    building_type: '',
    typical_use_cases: [] as string[],
    is_shared: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { saveTemplate, loading } = useGeometryTemplates();
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    
    if (formData.name.length > 50) {
      newErrors.name = 'Template name must be 50 characters or less';
    }
    
    if (formData.description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const template = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        building_type: formData.building_type || undefined,
        typical_use_cases: formData.typical_use_cases.length > 0 ? formData.typical_use_cases : undefined,
        is_shared: formData.is_shared,
        geometry_data: {
          ...geometry,
          saved_at: new Date().toISOString()
        }
      };

      const savedTemplate = await saveTemplate(template);
      
      onSave?.(savedTemplate.id);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        building_type: '',
        typical_use_cases: [],
        is_shared: false
      });
      setErrors({});
      
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleUseCaseToggle = (useCase: string) => {
    setFormData(prev => ({
      ...prev,
      typical_use_cases: prev.typical_use_cases.includes(useCase)
        ? prev.typical_use_cases.filter(uc => uc !== useCase)
        : [...prev.typical_use_cases, useCase]
    }));
  };

  const generateSuggestedName = () => {
    const shape = geometry.shape_type.replace('_', ' ');
    const area = Math.round((geometry.total_area || 0) / 1000) * 1000;
    return `${shape} - ${area.toLocaleString()} sq ft`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this building geometry as a reusable template for future projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template preview */}
          <Alert>
            <Building className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div>Shape: <strong>{geometry.shape_type.replace('_', ' ')}</strong></div>
                <div>Area: <strong>{(geometry.total_area || 0).toLocaleString()} ft²</strong></div>
                <div>Perimeter: <strong>{(geometry.perimeter_length || 0).toLocaleString()} ft</strong></div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Template name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="template-name"
                placeholder="Enter template name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={errors.name ? 'border-red-500' : ''}
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, name: generateSuggestedName() }))}
              >
                Suggest
              </Button>
            </div>
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Optional description of this template's typical use cases..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={errors.description ? 'border-red-500' : ''}
              rows={3}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{errors.description && <span className="text-red-500">{errors.description}</span>}</span>
              <span>{formData.description.length}/200</span>
            </div>
          </div>

          {/* Building type */}
          <div className="space-y-2">
            <Label>Building Type</Label>
            <Select 
              value={formData.building_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, building_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select building type (optional)" />
              </SelectTrigger>
              <SelectContent>
                {buildingTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Use cases */}
          <div className="space-y-2">
            <Label>Typical Use Cases</Label>
            <div className="grid grid-cols-2 gap-2">
              {commonUseCases.map(useCase => (
                <div key={useCase} className="flex items-center space-x-2">
                  <Checkbox
                    id={`usecase-${useCase}`}
                    checked={formData.typical_use_cases.includes(useCase)}
                    onCheckedChange={() => handleUseCaseToggle(useCase)}
                  />
                  <Label 
                    htmlFor={`usecase-${useCase}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {useCase}
                  </Label>
                </div>
              ))}
            </div>
            {formData.typical_use_cases.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.typical_use_cases.map(useCase => (
                  <Badge key={useCase} variant="secondary" className="text-xs">
                    {useCase}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Sharing options */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="share-template"
                checked={formData.is_shared}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_shared: !!checked }))}
              />
              <Label htmlFor="share-template" className="cursor-pointer">
                Share with team
              </Label>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Shared templates can be used by other team members for their projects. 
                You can change this setting later.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading || !formData.name.trim()}
          >
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveTemplateDialog;