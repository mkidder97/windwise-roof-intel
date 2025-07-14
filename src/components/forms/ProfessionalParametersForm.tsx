import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Shield, Award, FileText } from 'lucide-react';
import { CADUploadManager } from '@/components/CADUploadManager';
import type { ProfessionalParameters } from '@/types/wind-calculator';

interface ProfessionalParametersFormProps {
  onParametersChange?: (params: ProfessionalParameters) => void;
  showCADUpload?: boolean;
}

export const ProfessionalParametersForm: React.FC<ProfessionalParametersFormProps> = ({
  onParametersChange,
  showCADUpload = true
}) => {
  const form = useFormContext();

  const handleParameterChange = (field: string, value: any) => {
    if (onParametersChange) {
      const currentValues = form.getValues();
      const params: ProfessionalParameters = {
        buildingClassification: field === 'buildingClassification' ? value : currentValues.buildingClassification,
        riskCategory: field === 'riskCategory' ? value : currentValues.riskCategory,
        includeInternalPressure: field === 'includeInternalPressure' ? value : currentValues.includeInternalPressure,
        topographicType: field === 'topographicType' ? value : currentValues.topographicType,
        hillHeight: field === 'hillHeight' ? value : currentValues.hillHeight,
        distanceFromCrest: field === 'distanceFromCrest' ? value : currentValues.distanceFromCrest,
        effectiveWindArea: field === 'effectiveWindArea' ? value : currentValues.effectiveWindArea,
        engineeringNotes: field === 'engineeringNotes' ? value : currentValues.engineeringNotes
      };
      onParametersChange(params);
    }
  };

  return (
    <div className="space-y-6">
      {/* Building Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Building Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="buildingClassification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enclosure Classification</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleParameterChange('buildingClassification', value);
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select enclosure type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="enclosed">
                        <div>
                          <div className="font-medium">Enclosed</div>
                          <div className="text-xs text-muted-foreground">Standard buildings with limited openings</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="partially_enclosed">
                        <div>
                          <div className="font-medium">Partially Enclosed</div>
                          <div className="text-xs text-muted-foreground">Buildings with dominant openings</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="open">
                        <div>
                          <div className="font-medium">Open</div>
                          <div className="text-xs text-muted-foreground">Buildings with large openings on all sides</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="riskCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Category</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleParameterChange('riskCategory', value);
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="I">
                        <div>
                          <div className="font-medium">Category I</div>
                          <div className="text-xs text-muted-foreground">Low hazard to human life</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="II">
                        <div>
                          <div className="font-medium">Category II</div>
                          <div className="text-xs text-muted-foreground">Standard occupancy</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="III">
                        <div>
                          <div className="font-medium">Category III</div>
                          <div className="text-xs text-muted-foreground">Substantial hazard to human life</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="IV">
                        <div>
                          <div className="font-medium">Category IV</div>
                          <div className="text-xs text-muted-foreground">Essential facilities</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center space-x-2">
            <FormField
              control={form.control}
              name="includeInternalPressure"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(value) => {
                        field.onChange(value);
                        handleParameterChange('includeInternalPressure', value);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Include Internal Pressure</FormLabel>
                    <div className="text-xs text-muted-foreground">
                      Include internal pressure effects in calculations
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Topographic Effects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Topographic Effects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="topographicType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Topographic Feature Type</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleParameterChange('topographicType', value);
                  }} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select topographic feature" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None - Flat terrain</SelectItem>
                    <SelectItem value="hill">Hill</SelectItem>
                    <SelectItem value="ridge">Ridge</SelectItem>
                    <SelectItem value="escarpment">Escarpment</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch('topographicType') !== 'none' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hillHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feature Height (ft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const value = parseFloat(e.target.value);
                          field.onChange(value);
                          handleParameterChange('hillHeight', value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="distanceFromCrest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance from Crest (ft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const value = parseFloat(e.target.value);
                          field.onChange(value);
                          handleParameterChange('distanceFromCrest', value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Advanced Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="effectiveWindArea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective Wind Area (sq ft)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={e => {
                      const value = parseFloat(e.target.value);
                      field.onChange(value);
                      handleParameterChange('effectiveWindArea', value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="engineeringNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Engineering Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter engineering notes, assumptions, or special considerations..."
                    rows={4}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      handleParameterChange('engineeringNotes', e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* CAD Upload */}
      {showCADUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              CAD Documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CADUploadManager 
              onGeometryExtracted={() => {}}
              onError={(error) => console.error('CAD upload error:', error)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};