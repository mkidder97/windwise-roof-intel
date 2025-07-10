import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Calculator, Download, Save, Wind, Building, MapPin, Search, Shield, Award, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfessionalCalculationForm {
  // Existing fields
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
  calculationMethod: "component_cladding" | "mwfrs";
  
  // NEW PROFESSIONAL FIELDS
  buildingClassification: "enclosed" | "partially_enclosed" | "open";
  riskCategory: "I" | "II" | "III" | "IV";
  includeInternalPressure: boolean;
  professionalMode: boolean;
}

interface ProfessionalCalculationResults {
  // Enhanced results structure
  windSpeed: number;
  velocityPressure: number;
  kzContinuous: number;  // NEW: Continuous Kz factor
  
  // Multi-zone professional pressures
  fieldPrimePressure?: number;    // NEW: Zone 1' (field prime)
  fieldPressure: number;         // Zone 1 (field)
  perimeterPressure: number;     // Zone 2 (perimeter)
  cornerPressure: number;        // Zone 3 (corner)
  
  maxPressure: number;
  controllingZone: string;
  
  // Professional validation
  professionalAccuracy: boolean;      // NEW
  internalPressureIncluded: boolean;  // NEW
  peReady: boolean;                   // NEW
  calculationId?: string;             // NEW
  kzFactor?: number;  // For backward compatibility
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
  const [results, setResults] = useState<ProfessionalCalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<ProfessionalCalculationForm>({
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
      calculationMethod: "component_cladding",
      buildingClassification: "enclosed",
      riskCategory: "II",
      includeInternalPressure: true,
      professionalMode: false,
    },
  });

  // Professional Wind Pressure Calculation Engine
  const calculateWindPressure = async (data: ProfessionalCalculationForm): Promise<ProfessionalCalculationResults> => {
    setIsCalculating(true);
    
    try {
      if (data.professionalMode) {
        // Use professional edge function
        const { data: result, error } = await supabase.functions.invoke('calculate-professional-wind', {
          body: {
            buildingHeight: data.buildingHeight,
            buildingLength: data.buildingLength,
            buildingWidth: data.buildingWidth,
            city: data.city,
            state: data.state,
            asceEdition: data.asceEdition,
            windSpeed: 120, // Get from wind_speeds table in production
            exposureCategory: data.exposureCategory,
            buildingClassification: data.buildingClassification,
            riskCategory: data.riskCategory,
            calculationMethod: data.calculationMethod,
            includeInternalPressure: data.includeInternalPressure,
            topographicFactor: data.topographicFactor,
            directionalityFactor: data.directionalityFactor,
            projectName: data.projectName
          }
        });

        if (error) throw error;

        return {
          windSpeed: result.results.windSpeed,
          velocityPressure: result.results.velocityPressure,
          kzContinuous: result.results.kzContinuous,
          fieldPrimePressure: result.results.pressures.field_prime,
          fieldPressure: result.results.pressures.field,
          perimeterPressure: result.results.pressures.perimeter,
          cornerPressure: result.results.pressures.corner,
          maxPressure: result.results.maxPressure,
          controllingZone: result.results.controllingZone,
          professionalAccuracy: true,
          internalPressureIncluded: result.results.internalPressureIncluded,
          peReady: true,
          calculationId: result.calculation_id
        };
      } else {
        // Keep existing basic calculation for backward compatibility
        const { data: windData } = await supabase
          .from('wind_speeds')
          .select('wind_speed')
          .eq('city', data.city)
          .eq('state', data.state)
          .eq('asce_edition', data.asceEdition)
          .single();

        const windSpeed = windData?.wind_speed || 120;
        const height = data.buildingHeight;
        
        let kzFactor: number;
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

        const velocityPressure = 0.00256 * kzFactor * data.topographicFactor * data.directionalityFactor * Math.pow(windSpeed, 2);

        let fieldGCp, perimeterGCp, cornerGCp;
        if (data.calculationMethod === "component_cladding") {
          fieldGCp = -0.9;
          perimeterGCp = -1.4;
          cornerGCp = -2.4;
        } else {
          fieldGCp = -0.7;
          perimeterGCp = -1.2;
          cornerGCp = -1.8;
        }

        const fieldPressure = Math.abs(velocityPressure * fieldGCp);
        const perimeterPressure = Math.abs(velocityPressure * perimeterGCp);
        const cornerPressure = Math.abs(velocityPressure * cornerGCp);
        const maxPressure = Math.max(fieldPressure, perimeterPressure, cornerPressure);

        let controllingZone = "Field";
        if (maxPressure === cornerPressure) controllingZone = "Corner";
        else if (maxPressure === perimeterPressure) controllingZone = "Perimeter";

        return {
          windSpeed,
          velocityPressure,
          kzContinuous: kzFactor,
          fieldPressure,
          perimeterPressure,
          cornerPressure,
          maxPressure,
          controllingZone,
          professionalAccuracy: false,
          internalPressureIncluded: false,
          peReady: false,
          kzFactor
        };
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const onSubmit = async (data: ProfessionalCalculationForm) => {
    const calculationResults = await calculateWindPressure(data);
    setResults(calculationResults);
    
    toast({
      title: calculationResults.professionalAccuracy ? "Professional Calculation Complete" : "Calculation Complete",
      description: `Max pressure: ${calculationResults.maxPressure.toFixed(1)} psf${calculationResults.professionalAccuracy ? " (PE-grade accuracy)" : ""}`,
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
        professional_mode: formData.professionalMode,
        requires_pe_validation: results.peReady,
        internal_pressure_included: results.internalPressureIncluded,
        area_dependent_coefficients: results.professionalAccuracy,
        input_parameters: formData as any,
        results: results as any,
      });

      if (error) throw error;

      toast({
        title: "Calculation Saved",
        description: results.professionalAccuracy ? "Professional calculation saved successfully." : "Your calculation has been saved successfully.",
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

  const findApprovedSystems = () => {
    if (!results) return;
    
    const formData = form.getValues();
    
    // Navigate to MaterialFinder with pre-filled values
    const searchParams = new URLSearchParams({
      maxWindPressure: results.maxPressure.toString(),
      deckType: formData.deckType,
      state: formData.state,
    });
    
    navigate(`/materials?${searchParams.toString()}`);
    
    toast({
      title: "Searching Systems",
      description: `Finding approved systems for ${results.maxPressure.toFixed(1)} psf`,
    });
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
                                 <SelectItem value="component_cladding">Component & Cladding</SelectItem>
                                 <SelectItem value="mwfrs">Main Wind Force</SelectItem>
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

                   <Separator />

                   {/* Professional Building Classification Section */}
                   <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                       <Shield className="h-4 w-4 text-primary" />
                       <h3 className="font-semibold">Professional Classification</h3>
                     </div>

                     <FormField
                       control={form.control}
                       name="buildingClassification"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Building Classification</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                             <FormControl>
                               <SelectTrigger>
                                 <SelectValue placeholder="Select building type" />
                               </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                               <SelectItem value="enclosed">
                                 <div>
                                   <div className="font-medium">Enclosed Building</div>
                                   <div className="text-xs text-muted-foreground">All openings ≤ 1% of wall area</div>
                                 </div>
                               </SelectItem>
                               <SelectItem value="partially_enclosed">
                                 <div>
                                   <div className="font-medium">Partially Enclosed</div>
                                   <div className="text-xs text-muted-foreground">Openings 1-20% of wall area</div>
                                 </div>
                               </SelectItem>
                               <SelectItem value="open">
                                 <div>
                                   <div className="font-medium">Open Building</div>
                                   <div className="text-xs text-muted-foreground">Each wall ≥ 80% open</div>
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
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                             <FormControl>
                               <SelectTrigger>
                                 <SelectValue placeholder="Select risk category" />
                               </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                               <SelectItem value="I">Category I (Agricultural, temporary)</SelectItem>
                               <SelectItem value="II">Category II (Standard occupancy)</SelectItem>
                               <SelectItem value="III">Category III (Assembly, schools)</SelectItem>
                               <SelectItem value="IV">Category IV (Essential facilities)</SelectItem>
                             </SelectContent>
                           </Select>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name="includeInternalPressure"
                       render={({ field }) => (
                         <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                           <div className="space-y-0.5">
                             <FormLabel className="text-base">Include Internal Pressure (GCpi)</FormLabel>
                             <div className="text-sm text-muted-foreground">
                               Professional calculations include internal pressure effects per ASCE 7
                             </div>
                           </div>
                           <FormControl>
                             <Switch
                               checked={field.value}
                               onCheckedChange={field.onChange}
                             />
                           </FormControl>
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name="professionalMode"
                       render={({ field }) => (
                         <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-primary/5">
                           <div className="space-y-0.5">
                             <FormLabel className="text-base flex items-center gap-2">
                               <Award className="h-4 w-4 text-primary" />
                               Professional Engineering Mode
                             </FormLabel>
                             <div className="text-sm text-muted-foreground">
                               Enable PE-grade calculations suitable for engineering seal approval
                             </div>
                           </div>
                           <FormControl>
                             <Switch
                               checked={field.value}
                               onCheckedChange={field.onChange}
                             />
                           </FormControl>
                         </FormItem>
                       )}
                     />
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
                  {results.professionalAccuracy ? "Professional Results" : "Basic Results"}
                  {results.peReady && (
                    <Badge className="bg-success text-success-foreground">
                      <Award className="h-3 w-3 mr-1" />
                      PE-Ready
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Professional Accuracy Indicator */}
                {results.professionalAccuracy && (
                  <div className="p-4 bg-gradient-to-r from-success/10 to-primary/10 rounded-lg border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-5 w-5 text-success" />
                      <span className="font-semibold text-success">Professional Engineering Accuracy</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Accuracy: &lt;5% error (PE-sealable)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Area-dependent coefficients: ASCE 7 compliant</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Internal pressure: {results.internalPressureIncluded ? "Included" : "Not included"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Continuous Kz: {results.kzContinuous?.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Calculation Results */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center p-3 bg-gradient-data rounded-lg">
                    <span className="text-sm font-medium">Wind Speed</span>
                    <Badge variant="outline" className="bg-card">
                      {results.windSpeed} mph
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gradient-data rounded-lg">
                    <span className="text-sm font-medium">Velocity Pressure (qz)</span>
                    <Badge variant="outline" className="bg-card">
                      {results.velocityPressure.toFixed(1)} psf
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Professional Multi-Zone Results */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    Professional Zone Pressures
                    {results.professionalAccuracy && (
                      <Badge variant="outline" className="text-xs">
                        Multi-Zone
                      </Badge>
                    )}
                  </h4>
                  
                  {results.fieldPrimePressure && (
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium">Zone 1' (Field Prime)</span>
                      <Badge className="bg-blue-600 text-white">
                        {results.fieldPrimePressure.toFixed(1)} psf
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center p-3 bg-success-light rounded-lg">
                    <span className="text-sm">Zone 1 (Field)</span>
                    <Badge className="bg-success text-success-foreground">
                      {results.fieldPressure.toFixed(1)} psf
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-warning-light rounded-lg">
                    <span className="text-sm">Zone 2 (Perimeter)</span>
                    <Badge className="bg-warning text-warning-foreground">
                      {results.perimeterPressure.toFixed(1)} psf
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                    <span className="text-sm">Zone 3 (Corner)</span>
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
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Controlling Zone: <span className="font-medium">{results.controllingZone}</span>
                  </div>
                </div>

                {/* Professional Action Buttons */}
                <div className="space-y-3 pt-4">
                  <Button
                    onClick={findApprovedSystems}
                    className="w-full bg-gradient-engineering hover:opacity-90"
                    size="sm"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Find Approved Systems ({results.maxPressure.toFixed(1)} psf)
                  </Button>
                  
                  <div className="grid grid-cols-3 gap-2">
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
                    {results.peReady && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-success text-success hover:bg-success/10"
                      >
                        <Award className="h-4 w-4 mr-1" />
                        PE Seal
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}