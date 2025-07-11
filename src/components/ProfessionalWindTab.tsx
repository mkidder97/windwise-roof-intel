import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Calculator, Download, Save, Wind, Building, MapPin, 
  AlertTriangle, CheckCircle, Info, FileText, Upload,
  Ruler, Target, Settings, BarChart3, TrendingUp, Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CADUploadManager } from '@/components/CADUploadManager';
import BuildingGeometryVisualizer from '@/components/BuildingGeometryVisualizer';

interface ProfessionalFormData {
  // Building geometry
  buildingShape: 'rectangle' | 'l_shape' | 'cad_upload';
  buildingHeight: number;
  buildingLength: number;
  buildingWidth: number;
  // L-shape specific
  length1?: number;
  width1?: number;
  length2?: number;
  width2?: number;
  
  // Project info
  projectName: string;
  city: string;
  state: string;
  exposureCategory: 'B' | 'C' | 'D';
  asceEdition: string;
  
  // Effective wind area
  elementType: 'fastener' | 'panel' | 'structural_member';
  spacingX: number;
  spacingY: number;
  zoneLocation: 'field' | 'perimeter' | 'corner';
}

interface ZoneCalculationResult {
  zones: Array<{
    type: 'field' | 'perimeter' | 'corner';
    area: number;
    boundaries: Array<{x: number; y: number}>;
    pressureCoefficient: number;
    description: string;
  }>;
  pressures: {
    field: number;
    perimeter: number;
    corner: number;
    internal?: {
      positive: number;
      negative: number;
    };
  };
  effectiveAreas: Array<{
    elementType: string;
    zoneLocation: string;
    spacingX: number;
    spacingY: number;
    effectiveArea: number;
    designPressure: number;
  }>;
  validation: {
    isValid: boolean;
    complexity: 'basic' | 'intermediate' | 'complex';
    warnings: Array<{
      severity: 'info' | 'warning' | 'critical';
      message: string;
      asceReference?: string;
      recommendation?: string;
    }>;
    requiresProfessionalAnalysis: boolean;
    confidenceLevel: number;
    recommendations: string[];
  };
}

interface ProfessionalWindTabProps {
  onSubmit?: (data: ProfessionalFormData) => void;
  defaultValues?: Partial<ProfessionalFormData>;
  className?: string;
}

export const ProfessionalWindTab: React.FC<ProfessionalWindTabProps> = ({
  onSubmit,
  defaultValues = {},
  className = ""
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [zoneResults, setZoneResults] = useState<ZoneCalculationResult | null>(null);
  const [selectedResultTab, setSelectedResultTab] = useState('overview');
  const [cadFileUrl, setCadFileUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ProfessionalFormData>({
    defaultValues: {
      buildingShape: 'rectangle',
      buildingHeight: 30,
      buildingLength: 100,
      buildingWidth: 80,
      projectName: '',
      city: '',
      state: '',
      exposureCategory: 'C',
      asceEdition: 'ASCE 7-22',
      elementType: 'fastener',
      spacingX: 12,
      spacingY: 12,
      zoneLocation: 'field',
      ...defaultValues
    }
  });

  const watchedValues = form.watch();
  const buildingShape = form.watch('buildingShape');

  // Calculate zones when geometry changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (watchedValues.buildingHeight && watchedValues.buildingLength && watchedValues.buildingWidth) {
        calculateZones();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [
    watchedValues.buildingShape,
    watchedValues.buildingHeight,
    watchedValues.buildingLength,
    watchedValues.buildingWidth,
    watchedValues.length1,
    watchedValues.width1,
    watchedValues.length2,
    watchedValues.width2
  ]);

  const calculateZones = async () => {
    if (!watchedValues.city || !watchedValues.state) return;

    setIsCalculating(true);
    
    try {
      const buildingGeometry = {
        shape: watchedValues.buildingShape === 'cad_upload' ? 'complex' : watchedValues.buildingShape,
        dimensions: {
          length: watchedValues.buildingLength,
          width: watchedValues.buildingWidth,
          height: watchedValues.buildingHeight,
          ...(watchedValues.buildingShape === 'l_shape' && {
            length1: watchedValues.length1,
            width1: watchedValues.width1,
            length2: watchedValues.length2,
            width2: watchedValues.width2
          })
        }
      };

      const { data, error } = await supabase.functions.invoke('calculate-building-zones', {
        body: {
          buildingGeometry,
          windSpeed: 120, // Will be looked up based on location
          exposureCategory: watchedValues.exposureCategory,
          asceEdition: watchedValues.asceEdition,
          elementSpacing: {
            x: watchedValues.spacingX,
            y: watchedValues.spacingY
          },
          professionalMode: true
        }
      });

      if (error) throw error;

      setZoneResults(data);
      
      toast({
        title: "Zone Calculation Complete",
        description: `Calculated ${data.zones.length} zones with ${data.validation.confidenceLevel}% confidence`,
      });

    } catch (error) {
      console.error('Zone calculation error:', error);
      toast({
        title: "Calculation Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFormSubmit = (data: ProfessionalFormData) => {
    onSubmit?.(data);
  };

  const handleCADGeometryExtracted = (geometry: any, geometryId: string) => {
    setCadFileUrl(geometry.cad_file_url || '');
    // Update form with extracted geometry if available
    if (geometry.dimensions) {
      form.setValue('buildingLength', geometry.dimensions.length || form.getValues('buildingLength'));
      form.setValue('buildingWidth', geometry.dimensions.width || form.getValues('buildingWidth'));
      form.setValue('buildingHeight', geometry.dimensions.height || form.getValues('buildingHeight'));
    }
    
    toast({
      title: "CAD File Processed",
      description: "Building geometry extracted from CAD file",
    });
  };

  const exportResults = async () => {
    if (!zoneResults) return;

    const reportData = {
      projectInfo: form.getValues(),
      zoneCalculations: zoneResults,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `wind-analysis-${form.getValues('projectName').replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Exported",
      description: "Professional wind analysis report downloaded",
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          
          {/* Building Geometry Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Building Geometry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Shape Selector */}
              <FormField
                control={form.control}
                name="buildingShape"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building Shape</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select building shape" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rectangle">Rectangle</SelectItem>
                        <SelectItem value="l_shape">L-Shape</SelectItem>
                        <SelectItem value="cad_upload">Upload CAD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dynamic Dimension Inputs */}
              {buildingShape === 'rectangle' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="buildingLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length (ft)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="buildingWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (ft)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="buildingHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (ft)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {buildingShape === 'l_shape' && (
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>L-Shape Configuration</AlertTitle>
                    <AlertDescription>
                      Define dimensions for both legs of the L-shaped building.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Leg 1 (Primary)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="length1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Length (ft)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="width1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Width (ft)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold">Leg 2 (Secondary)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="length2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Length (ft)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="width2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Width (ft)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="buildingHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building Height (ft)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(Number(e.target.value))}
                            className="max-w-32"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {buildingShape === 'cad_upload' && (
                <div className="space-y-4">
                  <CADUploadManager
                    onGeometryExtracted={handleCADGeometryExtracted}
                    onError={(error) => toast({
                      title: "Upload Error",
                      description: error,
                      variant: "destructive"
                    })}
                  />
                  
                  {cadFileUrl && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>CAD File Processed</AlertTitle>
                      <AlertDescription>
                        Building geometry extracted and ready for analysis.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Visual Preview */}
              {zoneResults && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-4">Building Visualization</h4>
                  <BuildingGeometryVisualizer
                    buildingShape={buildingShape === 'cad_upload' ? 'complex' : buildingShape}
                    dimensions={{
                      length: watchedValues.buildingLength,
                      width: watchedValues.buildingWidth,
                      height: watchedValues.buildingHeight,
                      length1: watchedValues.length1,
                      width1: watchedValues.width1,
                      length2: watchedValues.length2,
                      width2: watchedValues.width2
                    }}
                    zones={zoneResults.zones}
                    pressures={zoneResults.pressures}
                    showPressures={true}
                    interactive={true}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Effective Wind Area Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Effective Wind Area Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="elementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Element Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fastener">Fastener</SelectItem>
                          <SelectItem value="panel">Panel</SelectItem>
                          <SelectItem value="structural_member">Structural Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="spacingX"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spacing X (in)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="spacingY"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spacing Y (in)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="zoneLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone Location</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="field">Field</SelectItem>
                          <SelectItem value="perimeter">Perimeter</SelectItem>
                          <SelectItem value="corner">Corner</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Real-time effective area calculation */}
              {zoneResults && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-semibold mb-2">Calculated Effective Area</h5>
                  {zoneResults.effectiveAreas
                    .filter(ea => ea.elementType === watchedValues.elementType && ea.zoneLocation === watchedValues.zoneLocation)
                    .map((area, index) => (
                      <div key={index} className="text-sm space-y-1">
                        <div>Effective Area: <span className="font-medium">{area.effectiveArea.toFixed(1)} ft²</span></div>
                        <div>Design Pressure: <span className="font-medium">{area.designPressure.toFixed(1)} psf</span></div>
                      </div>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>

          {/* Professional Validation Display */}
          {zoneResults?.validation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Professional Validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Confidence Level */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Confidence Level</Label>
                    <Badge variant={zoneResults.validation.confidenceLevel >= 90 ? "default" : 
                                   zoneResults.validation.confidenceLevel >= 70 ? "secondary" : "destructive"}>
                      {zoneResults.validation.confidenceLevel}%
                    </Badge>
                  </div>
                  <Progress value={zoneResults.validation.confidenceLevel} className="h-2" />
                </div>

                {/* Complexity Level */}
                <div className="flex items-center justify-between">
                  <Label>Geometry Complexity</Label>
                  <Badge variant={zoneResults.validation.complexity === 'basic' ? "default" :
                                 zoneResults.validation.complexity === 'intermediate' ? "secondary" : "destructive"}>
                    {zoneResults.validation.complexity}
                  </Badge>
                </div>

                {/* Professional Analysis Flag */}
                {zoneResults.validation.requiresProfessionalAnalysis && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Professional Analysis Required</AlertTitle>
                    <AlertDescription>
                      This building configuration requires review by a licensed professional engineer.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warnings */}
                {zoneResults.validation.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold">Validation Messages</h5>
                    {zoneResults.validation.warnings.map((warning, index) => (
                      <Alert key={index}>
                        {getSeverityIcon(warning.severity)}
                        <AlertTitle className="capitalize">{warning.severity}</AlertTitle>
                        <AlertDescription className="space-y-1">
                          <div>{warning.message}</div>
                          {warning.asceReference && (
                            <div className="text-xs text-gray-600">Reference: {warning.asceReference}</div>
                          )}
                          {warning.recommendation && (
                            <div className="text-xs font-medium">Recommendation: {warning.recommendation}</div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {zoneResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Analysis Results
                  </div>
                  <Button onClick={exportResults} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedResultTab} onValueChange={setSelectedResultTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="zones">Zone Details</TabsTrigger>
                    <TabsTrigger value="effective">Effective Areas</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {zoneResults.pressures.field.toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-600">Field Pressure (psf)</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                              {zoneResults.pressures.perimeter.toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-600">Perimeter Pressure (psf)</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {zoneResults.pressures.corner.toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-600">Corner Pressure (psf)</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="zones" className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-4 py-2 text-left">Zone Type</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Area (ft²)</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Pressure (psf)</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zoneResults.zones.map((zone, index) => (
                            <tr key={index}>
                              <td className="border border-gray-200 px-4 py-2 capitalize">{zone.type}</td>
                              <td className="border border-gray-200 px-4 py-2">{zone.area.toFixed(1)}</td>
                              <td className="border border-gray-200 px-4 py-2">
                                {zoneResults.pressures[zone.type].toFixed(1)}
                              </td>
                              <td className="border border-gray-200 px-4 py-2">{zone.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="effective" className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-4 py-2 text-left">Element Type</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Zone</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Spacing</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Effective Area (ft²)</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">Design Pressure (psf)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zoneResults.effectiveAreas.map((area, index) => (
                            <tr key={index}>
                              <td className="border border-gray-200 px-4 py-2 capitalize">
                                {area.elementType.replace('_', ' ')}
                              </td>
                              <td className="border border-gray-200 px-4 py-2 capitalize">{area.zoneLocation}</td>
                              <td className="border border-gray-200 px-4 py-2">
                                {area.spacingX}" × {area.spacingY}"
                              </td>
                              <td className="border border-gray-200 px-4 py-2">{area.effectiveArea.toFixed(1)}</td>
                              <td className="border border-gray-200 px-4 py-2">{area.designPressure.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={calculateZones}
              disabled={isCalculating}
            >
              {isCalculating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Zones
                </>
              )}
            </Button>

            <Button type="submit" disabled={isCalculating || !zoneResults}>
              <Save className="h-4 w-4 mr-2" />
              Save Analysis
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProfessionalWindTab;