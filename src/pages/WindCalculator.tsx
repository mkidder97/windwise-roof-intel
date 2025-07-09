import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Download, Save, Wind, Building, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CalculationForm {
  projectName: string;
  buildingHeight: number;
  buildingLength: number;
  buildingWidth: number;
  city: string;
  state: string;
  exposureCategory: "B" | "C" | "D";
  roofType: string;
  deckType: string;
  asceEdition: string;
  topographicFactor: number;
  directionalityFactor: number;
  calculationMethod: "Component" | "MWFRS";
}

interface CalculationResults {
  windSpeed: number;
  velocityPressure: number;
  fieldPressure: number;
  perimeterPressure: number;
  cornerPressure: number;
  maxPressure: number;
  kzFactor: number;
}

const exposureDescriptions = {
  B: "Urban/Suburban - Buildings, forests",
  C: "Open Terrain - Scattered obstructions",
  D: "Flat/Open Water - Unobstructed areas"
};

const asceEditions = [
  "ASCE 7-10",
  "ASCE 7-16", 
  "ASCE 7-22",
  "ASCE 7-24"
];

const roofTypes = [
  "Flat/Low Slope",
  "Steep Slope",
  "Curved",
  "Shed"
];

const deckTypes = [
  "Concrete",
  "Steel",
  "Wood",
  "Gypsum",
  "Lightweight Concrete"
];

export default function WindCalculator() {
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<CalculationForm>({
    defaultValues: {
      projectName: "",
      buildingHeight: 30,
      buildingLength: 100,
      buildingWidth: 80,
      city: "",
      state: "",
      exposureCategory: "C",
      roofType: "Flat/Low Slope",
      deckType: "Steel",
      asceEdition: "ASCE 7-22",
      topographicFactor: 1.0,
      directionalityFactor: 0.85,
      calculationMethod: "Component",
    },
  });

  // ASCE 7 Wind Pressure Calculation Engine
  const calculateWindPressure = async (data: CalculationForm): Promise<CalculationResults> => {
    setIsCalculating(true);
    
    try {
      // Step 1: Get wind speed from database
      const { data: windData, error: windError } = await supabase
        .from('wind_speeds')
        .select('wind_speed')
        .eq('city', data.city)
        .eq('state', data.state)
        .eq('asce_edition', data.asceEdition)
        .single();

      const windSpeed = windData?.wind_speed || 120; // Default fallback

      // Step 2: Calculate Kz factor based on exposure and height
      let kzFactor: number;
      const height = data.buildingHeight;
      
      switch (data.exposureCategory) {
        case "B":
          if (height <= 30) kzFactor = 0.70;
          else if (height <= 40) kzFactor = 0.76;
          else if (height <= 50) kzFactor = 0.81;
          else if (height <= 70) kzFactor = 0.88;
          else kzFactor = 0.94;
          break;
        case "C":
          if (height <= 15) kzFactor = 0.85;
          else if (height <= 20) kzFactor = 0.90;
          else if (height <= 30) kzFactor = 0.98;
          else if (height <= 40) kzFactor = 1.04;
          else if (height <= 50) kzFactor = 1.09;
          else kzFactor = 1.13;
          break;
        case "D":
          if (height <= 15) kzFactor = 1.03;
          else if (height <= 20) kzFactor = 1.08;
          else if (height <= 30) kzFactor = 1.15;
          else if (height <= 40) kzFactor = 1.21;
          else if (height <= 50) kzFactor = 1.26;
          else kzFactor = 1.31;
          break;
        default:
          kzFactor = 1.0;
      }

      // Step 3: Calculate velocity pressure (qz)
      const velocityPressure = 0.00256 * kzFactor * data.topographicFactor * data.directionalityFactor * Math.pow(windSpeed, 2);

      // Step 4: Calculate pressures for different zones
      let fieldGCp, perimeterGCp, cornerGCp;
      
      if (data.calculationMethod === "Component") {
        // Component and Cladding coefficients
        fieldGCp = -0.9;     // Field of roof
        perimeterGCp = -1.4; // Perimeter zone
        cornerGCp = -2.4;    // Corner zone
      } else {
        // MWFRS coefficients
        fieldGCp = -0.7;
        perimeterGCp = -1.2;
        cornerGCp = -1.8;
      }

      const fieldPressure = Math.abs(velocityPressure * fieldGCp);
      const perimeterPressure = Math.abs(velocityPressure * perimeterGCp);
      const cornerPressure = Math.abs(velocityPressure * cornerGCp);
      const maxPressure = Math.max(fieldPressure, perimeterPressure, cornerPressure);

      return {
        windSpeed,
        velocityPressure,
        fieldPressure,
        perimeterPressure,
        cornerPressure,
        maxPressure,
        kzFactor
      };
    } finally {
      setIsCalculating(false);
    }
  };

  const onSubmit = async (data: CalculationForm) => {
    const calculationResults = await calculateWindPressure(data);
    setResults(calculationResults);
    
    toast({
      title: "Calculation Complete",
      description: `Max pressure: ${calculationResults.maxPressure.toFixed(1)} psf`,
    });
  };

  const saveCalculation = async () => {
    if (!results) return;
    
    setIsSaving(true);
    const formData = form.getValues();
    
    try {
      const { error } = await supabase.from('calculations').insert({
        project_name: formData.projectName,
        building_height: formData.buildingHeight,
        building_length: formData.buildingLength,
        building_width: formData.buildingWidth,
        city: formData.city,
        state: formData.state,
        exposure_category: formData.exposureCategory,
        roof_type: formData.roofType,
        deck_type: formData.deckType,
        asce_edition: formData.asceEdition,
        wind_speed: results.windSpeed,
        topographic_factor: formData.topographicFactor,
        directionality_factor: formData.directionalityFactor,
        calculation_method: formData.calculationMethod,
        field_pressure: results.fieldPressure,
        perimeter_pressure: results.perimeterPressure,
        corner_pressure: results.cornerPressure,
        max_pressure: results.maxPressure,
        input_parameters: formData as any,
        results: results as any,
      });

      if (error) throw error;

      toast({
        title: "Calculation Saved",
        description: "Your calculation has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save calculation.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
          <Calculator className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">ASCE Wind Pressure Calculator</h1>
          <p className="text-muted-foreground">Professional wind load calculations per ASCE 7 standards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Building Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Project Details */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter project name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="buildingHeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (ft)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="buildingLength"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Length (ft)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
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
                              <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Location */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Location</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter city" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter state" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Technical Parameters */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wind className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">ASCE Parameters</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="asceEdition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ASCE Edition</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ASCE edition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {asceEditions.map((edition) => (
                                  <SelectItem key={edition} value={edition}>{edition}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="exposureCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exposure Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select exposure" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(exposureDescriptions).map(([key, desc]) => (
                                  <SelectItem key={key} value={key}>
                                    <div>
                                      <div className="font-medium">Category {key}</div>
                                      <div className="text-xs text-muted-foreground">{desc}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="roofType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Roof Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select roof type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {roofTypes.map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deckType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deck Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select deck type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {deckTypes.map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="calculationMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Calculation Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Component">Component & Cladding</SelectItem>
                                <SelectItem value="MWFRS">Main Wind Force</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Advanced Factors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <FormField
                        control={form.control}
                        name="topographicFactor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Topographic Factor (Kzt)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="directionalityFactor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Directionality Factor (Kd)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-engineering hover:opacity-90" 
                    disabled={isCalculating}
                  >
                    {isCalculating ? "Calculating..." : "Calculate Wind Pressure"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {results && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wind className="h-5 w-5 text-success" />
                  Calculation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center p-3 bg-gradient-data rounded-lg">
                    <span className="text-sm font-medium">Wind Speed</span>
                    <Badge variant="outline" className="bg-card">
                      {results.windSpeed} mph
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gradient-data rounded-lg">
                    <span className="text-sm font-medium">Velocity Pressure</span>
                    <Badge variant="outline" className="bg-card">
                      {results.velocityPressure.toFixed(1)} psf
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Zone Pressures</h4>
                    
                    <div className="flex justify-between items-center p-3 bg-success-light rounded-lg">
                      <span className="text-sm">Field Pressure</span>
                      <Badge className="bg-success text-success-foreground">
                        {results.fieldPressure.toFixed(1)} psf
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-warning-light rounded-lg">
                      <span className="text-sm">Perimeter Pressure</span>
                      <Badge className="bg-warning text-warning-foreground">
                        {results.perimeterPressure.toFixed(1)} psf
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                      <span className="text-sm">Corner Pressure</span>
                      <Badge variant="destructive">
                        {results.cornerPressure.toFixed(1)} psf
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-primary-light rounded-lg border-2 border-primary">
                      <span className="font-semibold">Maximum Pressure</span>
                      <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
                        {results.maxPressure.toFixed(1)} psf
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4">
                  <Button
                    onClick={saveCalculation}
                    disabled={isSaving}
                    variant="outline"
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}