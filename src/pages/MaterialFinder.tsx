import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Shield, CheckCircle, XCircle, MapPin, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const searchSchema = z.object({
  maxWindPressure: z.number().min(1, "Wind pressure must be greater than 0"),
  deckType: z.string().min(1, "Deck type is required"),
  membraneType: z.string().optional(),
  state: z.string().min(1, "State is required"),
  requiresApproval: z.array(z.string()).optional(),
});

type SearchForm = z.infer<typeof searchSchema>;

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
  const { toast } = useToast();

  const form = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      maxWindPressure: 80,
      deckType: "",
      membraneType: "",
      state: "",
      requiresApproval: [],
    },
  });

  useEffect(() => {
    loadRoofSystems();
  }, []);

  const loadRoofSystems = async () => {
    try {
      const { data: systemsData, error: systemsError } = await supabase
        .from('roof_systems')
        .select('*');

      if (systemsError) throw systemsError;

      // Get approvals for each system
      const systemsWithApprovals = await Promise.all(
        (systemsData || []).map(async (system) => {
          const { data: approvals } = await supabase
            .from('state_approvals')
            .select('*')
            .eq('system_id', system.id);

          return {
            ...system,
            approvals: approvals || []
          };
        })
      );

      setSystems(systemsWithApprovals);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load roof systems.",
        variant: "destructive",
      });
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
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Compatible Systems ({filteredSystems.length})
                </h2>
                <Badge variant="outline" className="bg-success-light text-success">
                  {filteredSystems.length} matches found
                </Badge>
              </div>

              <div className="grid gap-4">
                {filteredSystems.map((system) => {
                  const requiredPressure = form.getValues().maxWindPressure;
                  const safetyFactor = getSafetyFactor(system.max_wind_pressure, requiredPressure);
                  const stateApproval = getApprovalStatus(system, selectedState);
                  
                  return (
                    <Card key={system.id} className="shadow-card">
                      <CardContent className="p-6">
                        <div className="space-y-4">
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
                        </div>
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