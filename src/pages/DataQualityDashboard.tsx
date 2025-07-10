import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertCircle, Database, BarChart3, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DataQualityResult {
  table_name: string;
  validation_rule: string;
  total_records: number;
  valid_records: number;
  completion_percentage: number;
}

interface DatabaseStats {
  wind_speeds_count: number;
  roof_systems_count: number;
  state_approvals_count: number;
  calculations_count: number;
  cities_count: number;
  manufacturers_count: number;
  states_with_approvals: number;
}

export default function DataQualityDashboard() {
  const [qualityResults, setQualityResults] = useState<DataQualityResult[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDataQuality();
    loadDatabaseStats();
  }, []);

  const loadDataQuality = async () => {
    try {
      const { data, error } = await supabase.rpc('validate_data_quality');
      
      if (error) throw error;
      
      setQualityResults(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data quality metrics.",
        variant: "destructive",
      });
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const [windSpeeds, roofSystems, stateApprovals, calculations] = await Promise.all([
        supabase.from('wind_speeds').select('*', { count: 'exact', head: true }),
        supabase.from('roof_systems').select('*', { count: 'exact', head: true }),
        supabase.from('state_approvals').select('*', { count: 'exact', head: true }),
        supabase.from('calculations').select('*', { count: 'exact', head: true })
      ]);

      // Get unique cities and manufacturers
      const { data: cities } = await supabase
        .from('wind_speeds')
        .select('city, state')
        .eq('asce_edition', 'ASCE 7-22');

      const { data: manufacturers } = await supabase
        .from('roof_systems')
        .select('manufacturer');

      const { data: statesWithApprovals } = await supabase
        .from('state_approvals')
        .select('state')
        .eq('status', 'active');

      const uniqueCities = new Set(cities?.map(c => `${c.city}, ${c.state}`)).size;
      const uniqueManufacturers = new Set(manufacturers?.map(m => m.manufacturer)).size;
      const uniqueStates = new Set(statesWithApprovals?.map(s => s.state)).size;

      setStats({
        wind_speeds_count: windSpeeds.count || 0,
        roof_systems_count: roofSystems.count || 0,
        state_approvals_count: stateApprovals.count || 0,
        calculations_count: calculations.count || 0,
        cities_count: uniqueCities,
        manufacturers_count: uniqueManufacturers,
        states_with_approvals: uniqueStates
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load database statistics.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getQualityBadge = (percentage: number) => {
    if (percentage >= 95) return <Badge className="bg-success text-success-foreground">Excellent</Badge>;
    if (percentage >= 85) return <Badge className="bg-warning text-warning-foreground">Good</Badge>;
    if (percentage >= 70) return <Badge className="bg-orange-500 text-white">Fair</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground">Poor</Badge>;
  };

  const getQualityIcon = (percentage: number) => {
    if (percentage >= 95) return <CheckCircle className="h-5 w-5 text-success" />;
    if (percentage >= 85) return <AlertCircle className="h-5 w-5 text-warning" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
          <BarChart3 className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Quality Dashboard</h1>
          <p className="text-muted-foreground">Monitor database completeness and data integrity</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="validation">Data Validation</TabsTrigger>
          <TabsTrigger value="statistics">Database Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Cities</p>
                    <p className="text-2xl font-bold">{stats?.cities_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Roof Systems</p>
                    <p className="text-2xl font-bold">{stats?.roof_systems_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">State Approvals</p>
                    <p className="text-2xl font-bold">{stats?.state_approvals_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Calculations</p>
                    <p className="text-2xl font-bold">{stats?.calculations_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Completeness Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Data Completeness Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Wind Speed Coverage</span>
                  <span className="text-sm text-muted-foreground">{stats?.cities_count || 0} cities</span>
                </div>
                <Progress value={Math.min((stats?.cities_count || 0) / 150 * 100, 100)} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Manufacturer Coverage</span>
                  <span className="text-sm text-muted-foreground">{stats?.manufacturers_count || 0} manufacturers</span>
                </div>
                <Progress value={Math.min((stats?.manufacturers_count || 0) / 25 * 100, 100)} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">State Approval Coverage</span>
                  <span className="text-sm text-muted-foreground">{stats?.states_with_approvals || 0} states</span>
                </div>
                <Progress value={Math.min((stats?.states_with_approvals || 0) / 50 * 100, 100)} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Data Validation Results</CardTitle>
                <Button onClick={loadDataQuality} variant="outline" size="sm">
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getQualityIcon(result.completion_percentage)}
                      <div>
                        <p className="font-medium">{result.validation_rule}</p>
                        <p className="text-sm text-muted-foreground">
                          Table: {result.table_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {result.valid_records} / {result.total_records}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.completion_percentage.toFixed(1)}% valid
                        </p>
                      </div>
                      {getQualityBadge(result.completion_percentage)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Wind Speed Records:</span>
                    <span className="font-semibold">{stats?.wind_speeds_count?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Cities:</span>
                    <span className="font-semibold">{stats?.cities_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Roof Systems:</span>
                    <span className="font-semibold">{stats?.roof_systems_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manufacturers:</span>
                    <span className="font-semibold">{stats?.manufacturers_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State Approvals:</span>
                    <span className="font-semibold">{stats?.state_approvals_count?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>States with Approvals:</span>
                    <span className="font-semibold">{stats?.states_with_approvals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Calculations:</span>
                    <span className="font-semibold">{stats?.calculations_count?.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Quality Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {qualityResults.length > 0 ? (
                    <>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold text-success">
                          {(qualityResults.reduce((sum, r) => sum + r.completion_percentage, 0) / qualityResults.length).toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Overall Data Quality Score</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Quality Breakdown:</p>
                        {qualityResults.map((result, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{result.table_name}:</span>
                            <span className="font-medium">{result.completion_percentage.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground">Loading quality metrics...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}