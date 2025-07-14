import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Shield, CheckCircle, XCircle, MapPin, FileText, ExternalLink, Download, Printer, Settings, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import FasteningPatternDisplay from "@/components/FasteningPatternDisplay";
import InstallationSpecifications from "@/components/InstallationSpecifications";
import FasteningCalculator from "@/components/FasteningCalculator";

interface SearchForm {
  maxWindPressure: number;
  deckType: string;
  membraneType?: string;
  state: string;
  requiresApproval?: string[];
  // Advanced search criteria
  manufacturer?: string;
  minSafetyFactor?: number;
  verificationStatus?: string;
  approvalExpiration?: string;
  sortBy?: string;
  showExpiredApprovals?: boolean;
}

interface RoofSystem {
  id: string;
  manufacturer: string;
  system_name: string;
  membrane_type: string;
  max_wind_pressure: number;
  deck_types: string[];
  fastener_pattern: string;
  safety_factor: number;
  description: string;
  approvals: StateApproval[];
  // Professional features
  verified_by_engineer?: boolean;
  verification_date?: string;
  verification_notes?: string;
  created_at?: string;
  updated_at?: string;
  // Quality indicators
  qualityScore?: number;
  expiredApprovalsCount?: number;
  needsVerificationReview?: boolean;
}

interface StateApproval {
  id: string;
  approval_number: string;
  state: string;
  approval_agency: string;
  approval_date: string;
  expiration_date: string;
  status: string;
  document_url: string;
}

const stateApprovalAgencies = [
  "Texas TDLR",
  "California OSHPD", 
  "Florida Building Code",
  "Miami-Dade NOA",
  "New York State",
  "ICC-ES",
  "FM Approvals",
  "UL Listings"
];

const membraneTypes = [
  "TPO",
  "EPDM", 
  "PVC",
  "Modified Bitumen",
  "Built-Up Roof",
  "Metal"
];

const deckTypes = [
  "Concrete",
  "Steel",
  "Wood",
  "Gypsum", 
  "Lightweight Concrete"
];

export default function MaterialFinder() {
  const [systems, setSystems] = useState<RoofSystem[]>([]);
  const [filteredSystems, setFilteredSystems] = useState<RoofSystem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [bookmarkedSystems, setBookmarkedSystems] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const form = useForm<SearchForm>({
    defaultValues: {
      maxWindPressure: 80,
      deckType: "",
      membraneType: "",
      state: "",
      requiresApproval: [],
      manufacturer: "",
      minSafetyFactor: 1.0,
      verificationStatus: "",
      approvalExpiration: "",
      sortBy: "safety_factor",
      showExpiredApprovals: false,
    },
  });

  useEffect(() => {
    loadRoofSystems();
    loadQualityMetrics();
    loadSavedSearches();
    
    // Pre-fill form with URL parameters if available
    const maxWindPressure = searchParams.get('maxWindPressure');
    const deckType = searchParams.get('deckType');
    const state = searchParams.get('state');
    
    if (maxWindPressure || deckType || state) {
      const updates: Partial<SearchForm> = {};
      
      if (maxWindPressure) {
        updates.maxWindPressure = parseFloat(maxWindPressure);
      }
      if (deckType) {
        updates.deckType = deckType;
      }
      if (state) {
        updates.state = state;
      }
      
      // Update form values
      Object.entries(updates).forEach(([key, value]) => {
        form.setValue(key as keyof SearchForm, value as any);
      });
      
      // Automatically trigger search if we have required parameters
      if (maxWindPressure && deckType && state) {
        setTimeout(() => {
          form.handleSubmit(searchSystems)();
        }, 100);
      }
      
      toast({
        title: "Parameters Loaded",
        description: "Search criteria pre-filled from calculation results",
      });
    }
  }, [searchParams]);

  const loadRoofSystems = async () => {
    console.log('🏗️ Loading roof systems...');
    
    try {
      // Test database connectivity first
      const { data: healthCheck, error: healthError } = await supabase
        .from('system_health')
        .select('*');
      
      console.log('📊 Database health check:', { healthCheck, healthError });
      
      if (healthError) {
        console.error('❌ Database connectivity failed:', healthError);
        throw new Error(`Database connectivity issue: ${healthError.message}`);
      }

      // Load roof systems with detailed logging
      console.log('🔍 Querying roof_systems table...');
      const { data: systemsData, error: systemsError } = await supabase
        .from('roof_systems')
        .select('*');

      console.log('🏗️ Roof systems query result:', { 
        systemsCount: systemsData?.length, 
        systemsError,
        sampleSystem: systemsData?.[0] 
      });

      if (systemsError) {
        console.error('❌ Roof systems error:', systemsError);
        throw systemsError;
      }

      if (!systemsData || systemsData.length === 0) {
        console.warn('⚠️ No roof systems found in database');
        setSystems([]);
        toast({
          title: "No Data",
          description: "No roofing systems found in database",
          variant: "destructive",
        });
        return;
      }

      console.log(`✅ Found ${systemsData.length} roof systems`);

      // Load state approvals with progress tracking
      console.log('🏛️ Loading state approvals for each system...');
      const systemsWithApprovals = await Promise.all(
        systemsData.map(async (system, index) => {
          console.log(`📋 Loading approvals for system ${index + 1}/${systemsData.length}: ${system.system_name}`);
          
          const { data: approvals, error: approvalsError } = await supabase
            .from('state_approvals')
            .select('*')
            .eq('system_id', system.id);

          if (approvalsError) {
            console.error(`❌ Error loading approvals for system ${system.id}:`, approvalsError);
          }

          // Calculate quality indicators
          const expiredApprovalsCount = approvals?.filter(a => 
            new Date(a.expiration_date) < new Date()
          ).length || 0;

          const needsVerificationReview = 
            !system.verified_by_engineer || 
            (system.verification_date && 
             new Date(system.verification_date) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));

          const qualityScore = Math.min(100, 
            100 - (expiredApprovalsCount * 10) - (needsVerificationReview ? 20 : 0)
          );

          console.log(`📊 System ${system.system_name}: ${approvals?.length || 0} approvals, quality score: ${qualityScore}`);

          return {
            ...system,
            approvals: approvals || [],
            expiredApprovalsCount,
            needsVerificationReview,
            qualityScore
          };
        })
      );

      console.log(`✅ Loaded ${systemsWithApprovals.length} systems with approvals`);
      setSystems(systemsWithApprovals);

      toast({
        title: "Systems Loaded",
        description: `Successfully loaded ${systemsWithApprovals.length} roofing systems.`,
      });

    } catch (error) {
      console.error('💥 Error loading roof systems:', error);
      toast({
        title: "Database Error",
        description: `Failed to load roof systems: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const loadQualityMetrics = async () => {
    try {
      // Calculate overall data quality metrics
      const totalSystems = systems.length;
      const verifiedSystems = systems.filter(s => s.verified_by_engineer).length;
      const systemsWithExpiredApprovals = systems.filter(s => 
        s.expiredApprovalsCount && s.expiredApprovalsCount > 0
      ).length;
      
      setQualityMetrics({
        totalSystems,
        verifiedSystems,
        verificationRate: totalSystems > 0 ? (verifiedSystems / totalSystems) * 100 : 0,
        systemsWithExpiredApprovals,
        avgQualityScore: systems.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / totalSystems || 0
      });
    } catch (error) {
      console.error('Error loading quality metrics:', error);
    }
  };

  const loadSavedSearches = async () => {
    try {
      // Load saved search configurations from localStorage for now
      const saved = localStorage.getItem('materialFinderSavedSearches');
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  const searchSystems = async (data: SearchForm) => {
    setIsSearching(true);
    
    try {
      // Filter systems based on criteria
      const filtered = systems.filter(system => {
        // Check wind pressure compatibility
        const pressureCompatible = system.max_wind_pressure >= data.maxWindPressure;
        
        // Check deck type compatibility
        const deckCompatible = system.deck_types.includes(data.deckType);
        
        // Check membrane type if specified
        const membraneCompatible = !data.membraneType || system.membrane_type === data.membraneType;
        
        // Check state approvals if specified
        const stateCompatible = !data.state || system.approvals.some(approval => 
          approval.state === data.state && approval.status === 'active'
        );

        return pressureCompatible && deckCompatible && membraneCompatible && stateCompatible;
      });

      // Sort by safety factor (highest first)
      const sorted = filtered.sort((a, b) => {
        const safetyA = a.max_wind_pressure / data.maxWindPressure;
        const safetyB = b.max_wind_pressure / data.maxWindPressure;
        return safetyB - safetyA;
      });

      setFilteredSystems(sorted);
      setSelectedState(data.state);
      
      toast({
        title: "Search Complete",
        description: `Found ${sorted.length} compatible systems`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to search systems.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getSafetyFactor = (systemPressure: number, requiredPressure: number) => {
    return systemPressure / requiredPressure;
  };

  const getApprovalStatus = (system: RoofSystem, state: string) => {
    const approval = system.approvals.find(a => a.state === state && a.status === 'active');
    return approval;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const requiredPressure = form.getValues().maxWindPressure;
    
    // Header
    doc.setFontSize(18);
    doc.text('Roofing System Compatibility Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Required Wind Pressure: ${requiredPressure} psf`, 20, 40);
    doc.text(`Deck Type: ${form.getValues().deckType}`, 20, 50);
    doc.text(`State: ${selectedState || 'Not specified'}`, 20, 60);
    
    // Systems
    let yPosition = 80;
    doc.setFontSize(14);
    doc.text(`Compatible Systems (${filteredSystems.length} found):`, 20, yPosition);
    
    filteredSystems.forEach((system, index) => {
      yPosition += 20;
      
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      const safetyFactor = getSafetyFactor(system.max_wind_pressure, requiredPressure);
      const approval = getApprovalStatus(system, selectedState);
      
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${system.system_name} - ${system.manufacturer}`, 20, yPosition);
      doc.text(`   Max Pressure: ${system.max_wind_pressure} psf | Safety Factor: ${safetyFactor.toFixed(2)}`, 25, yPosition + 10);
      doc.text(`   Membrane: ${system.membrane_type} | Decks: ${system.deck_types.join(', ')}`, 25, yPosition + 20);
      
      if (approval) {
        doc.text(`   ${selectedState} Approved: ${approval.approval_number}`, 25, yPosition + 30);
        yPosition += 30;
      } else {
        yPosition += 20;
      }
    });
    
    doc.save(`roofing-systems-${Date.now()}.pdf`);
    
    toast({
      title: "Export Complete",
      description: "PDF specification sheet has been downloaded",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
          <Search className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Material Compatibility Finder</h1>
          <p className="text-muted-foreground">Find approved roofing systems for your wind pressure requirements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Search Form */}
        <div className="lg:col-span-1">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Search Criteria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(searchSystems)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="maxWindPressure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Wind Pressure (psf)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value))} 
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                    name="membraneType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membrane Type (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Any membrane type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {membraneTypes.map((type) => (
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
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Jurisdiction</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter state (e.g., TX, FL, CA)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-engineering hover:opacity-90" 
                    disabled={isSearching}
                  >
                    {isSearching ? "Searching..." : "Search Systems"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {filteredSystems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">
                    Compatible Systems ({filteredSystems.length})
                  </h2>
                  <Badge variant="outline" className="bg-success-light text-success">
                    {filteredSystems.length} matches found
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={exportToPDF}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={() => window.print()}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {filteredSystems.map((system) => {
                  const requiredPressure = form.getValues().maxWindPressure;
                  const safetyFactor = getSafetyFactor(system.max_wind_pressure, requiredPressure);
                  const stateApproval = getApprovalStatus(system, selectedState);
                  
                  return (
                    <Card key={system.id} className="shadow-card">
                      <CardContent className="p-6">
                        <Tabs defaultValue="overview" className="w-full">
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="fastening">Fastening</TabsTrigger>
                            <TabsTrigger value="installation">Installation</TabsTrigger>
                            <TabsTrigger value="calculator">Calculator</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="overview" className="space-y-4 mt-6">
                          {/* System Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">
                                {system.system_name}
                              </h3>
                              <p className="text-muted-foreground">{system.manufacturer}</p>
                            </div>
                            <div className="text-right">
                              <Badge 
                                className={
                                  safetyFactor >= 1.5 
                                    ? "bg-success text-success-foreground"
                                    : safetyFactor >= 1.2
                                    ? "bg-warning text-warning-foreground" 
                                    : "bg-destructive text-destructive-foreground"
                                }
                              >
                                Safety Factor: {safetyFactor.toFixed(2)}
                              </Badge>
                            </div>
                          </div>

                          {/* System Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Max Pressure</p>
                              <p className="font-semibold text-data-pressure">
                                {system.max_wind_pressure} psf
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Membrane</p>
                              <p className="font-semibold">{system.membrane_type}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Deck Types</p>
                              <p className="font-semibold">{system.deck_types.join(", ")}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Fastener Pattern</p>
                              <p className="font-semibold">{system.fastener_pattern}</p>
                            </div>
                          </div>

                          {/* State Approval Status */}
                          {selectedState && (
                            <div className="border-t pt-4">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <h4 className="font-semibold">
                                  {selectedState} Approval Status
                                </h4>
                              </div>
                              
                              {stateApproval ? (
                                <div className="flex items-center gap-4 p-3 bg-success-light rounded-lg">
                                  <CheckCircle className="h-5 w-5 text-success" />
                                  <div className="flex-1">
                                    <p className="font-medium text-success">Approved</p>
                                    <p className="text-sm text-muted-foreground">
                                      {stateApproval.approval_agency} - {stateApproval.approval_number}
                                    </p>
                                  </div>
                                  {stateApproval.document_url && (
                                    <Button size="sm" variant="outline">
                                      <FileText className="h-4 w-4 mr-1" />
                                      View Document
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-4 p-3 bg-destructive/10 rounded-lg">
                                  <XCircle className="h-5 w-5 text-destructive" />
                                  <div>
                                    <p className="font-medium text-destructive">
                                      No {selectedState} approval found
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Check with manufacturer for current approval status
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* All Approvals */}
                          {system.approvals.length > 0 && (
                            <div className="border-t pt-4">
                              <h4 className="font-semibold mb-2">All Current Approvals</h4>
                              <div className="flex flex-wrap gap-2">
                                {system.approvals.map((approval) => (
                                  <Badge 
                                    key={approval.id}
                                    variant="outline"
                                    className="bg-primary-light"
                                  >
                                    {approval.state} - {approval.approval_agency}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                            {/* Description */}
                            {system.description && (
                              <div className="border-t pt-4">
                                <p className="text-sm text-muted-foreground">
                                  {system.description}
                                </p>
                              </div>
                            )}

                            {/* Wind Pressure Integration */}
                            <div className="border-t pt-4">
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                Wind Load Analysis
                              </h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                                  <p className="text-sm font-medium text-blue-700">Required Pressure</p>
                                  <p className="text-lg font-bold text-blue-900">{requiredPressure} psf</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                                  <p className="text-sm font-medium text-green-700">System Capacity</p>
                                  <p className="text-lg font-bold text-green-900">{system.max_wind_pressure} psf</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                                  <p className="text-sm font-medium text-purple-700">Safety Margin</p>
                                  <p className="text-lg font-bold text-purple-900">
                                    {((system.max_wind_pressure - requiredPressure) / requiredPressure * 100).toFixed(0)}%
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                <p className="text-sm text-muted-foreground">
                                  <strong>Critical Zones:</strong> Corner zones experience up to 3x field pressures 
                                  ({(requiredPressure * 3).toFixed(0)} psf max). Perimeter zones experience up to 2x 
                                  field pressures ({(requiredPressure * 2).toFixed(0)} psf max).
                                </p>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="fastening" className="mt-6">
                            <FasteningPatternDisplay
                              pattern={system.fastener_pattern}
                              deckType={form.getValues().deckType}
                              windPressure={requiredPressure}
                              safetyFactor={safetyFactor}
                            />
                          </TabsContent>

                          <TabsContent value="installation" className="mt-6">
                            <InstallationSpecifications
                              systemName={system.system_name}
                              deckType={form.getValues().deckType}
                              membraneType={system.membrane_type}
                              manufacturer={system.manufacturer}
                            />
                          </TabsContent>

                          <TabsContent value="calculator" className="mt-6">
                            <FasteningCalculator
                              fasteningPattern={{
                                field_spacing_x: 12,
                                field_spacing_y: 12,
                                perimeter_spacing: 6,
                                corner_spacing: 4
                              }}
                              deckType={form.getValues().deckType}
                              windPressure={requiredPressure}
                            />
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {filteredSystems.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Systems Found</h3>
                <p className="text-muted-foreground">
                  Use the search form to find compatible roofing systems based on your wind pressure requirements.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}