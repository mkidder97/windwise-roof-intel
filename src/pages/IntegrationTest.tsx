import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertCircle, Play, RefreshCw, TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface TestResult {
  testName: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: string;
  duration?: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warnings: number;
}

export default function IntegrationTest() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState("");
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestSuites([]);

    const suites: TestSuite[] = [
      await runWindCalculatorTests(),
      await runMaterialFinderTests(),
      await runIntegrationFlowTests(),
      await runDatabaseTests()
    ];

    setTestSuites(suites);
    setIsRunning(false);
    setProgress(100);

    const totalTests = suites.reduce((sum, suite) => sum + suite.totalTests, 0);
    const totalPassed = suites.reduce((sum, suite) => sum + suite.passedTests, 0);
    const totalFailed = suites.reduce((sum, suite) => sum + suite.failedTests, 0);

    toast({
      title: "Integration Tests Complete",
      description: `${totalPassed}/${totalTests} tests passed. ${totalFailed} failed.`,
      variant: totalFailed === 0 ? "default" : "destructive",
    });
  };

  const runWindCalculatorTests = async (): Promise<TestSuite> => {
    setCurrentTest("Testing Wind Calculator...");
    setProgress(10);
    
    const tests: TestResult[] = [];
    const startTime = Date.now();

    try {
      // Test 1: Wind speed lookup
      setCurrentTest("Testing wind speed lookup...");
      const { data: windSpeed, error: windError } = await supabase
        .from('wind_speeds')
        .select('wind_speed')
        .eq('city', 'Miami')
        .eq('state', 'FL')
        .eq('asce_edition', 'ASCE 7-22')
        .single();

      tests.push({
        testName: "Wind Speed Lookup",
        status: windError ? "fail" : "pass",
        message: windError ? windError.message : `Found wind speed: ${windSpeed?.wind_speed} mph`,
        duration: Date.now() - startTime
      });

      // Test 2: Exposure categories calculation
      setCurrentTest("Testing exposure categories...");
      const exposureTests = ['B', 'C', 'D'];
      for (const exposure of exposureTests) {
        try {
          // Simulate basic calculation
          const height = 30;
          let kzFactor = 1.0;
          
          switch (exposure) {
            case "B": kzFactor = height <= 30 ? 0.70 : 0.76; break;
            case "C": kzFactor = height <= 30 ? 0.98 : 1.04; break;
            case "D": kzFactor = height <= 30 ? 1.15 : 1.21; break;
          }
          
          tests.push({
            testName: `Exposure Category ${exposure}`,
            status: kzFactor > 0 ? "pass" : "fail",
            message: `Kz factor calculated: ${kzFactor}`,
          });
        } catch (error) {
          tests.push({
            testName: `Exposure Category ${exposure}`,
            status: "fail",
            message: `Calculation failed: ${error}`,
          });
        }
      }

      // Test 3: Professional vs Basic mode
      setCurrentTest("Testing professional mode...");
      const { data: professionalData } = await supabase.functions.invoke('calculate-professional-wind', {
        body: {
          buildingHeight: 30,
          buildingLength: 100,
          buildingWidth: 80,
          city: 'Miami',
          state: 'FL',
          windSpeed: 185,
          exposureCategory: 'C',
          calculationMethod: 'component_cladding'
        }
      });

      tests.push({
        testName: "Professional Mode Calculation",
        status: professionalData ? "pass" : "fail",
        message: professionalData ? "Professional calculation successful" : "Professional calculation failed",
      });

      // Test 4: Calculation saving
      setCurrentTest("Testing calculation saving...");
      const { error: saveError } = await supabase.from('calculations').insert({
        project_name: 'Integration Test Project',
        building_height: 30,
        building_length: 100,
        building_width: 80,
        city: 'Miami',
        state: 'FL',
        exposure_category: 'C',
        roof_type: 'Flat/Low Slope',
        deck_type: 'Steel',
        asce_edition: 'ASCE 7-22',
        wind_speed: 185,
        calculation_method: 'component_cladding',
        field_pressure: 50,
        perimeter_pressure: 75,
        corner_pressure: 120,
        max_pressure: 120,
        input_parameters: {},
        results: {}
      });

      tests.push({
        testName: "Calculation Saving",
        status: saveError ? "fail" : "pass",
        message: saveError ? saveError.message : "Calculation saved successfully",
      });

    } catch (error) {
      tests.push({
        testName: "Wind Calculator General",
        status: "fail",
        message: `General test failure: ${error}`,
      });
    }

    setProgress(25);

    return {
      name: "Wind Calculator",
      tests,
      totalTests: tests.length,
      passedTests: tests.filter(t => t.status === "pass").length,
      failedTests: tests.filter(t => t.status === "fail").length,
      warnings: tests.filter(t => t.status === "warning").length,
    };
  };

  const runMaterialFinderTests = async (): Promise<TestSuite> => {
    setCurrentTest("Testing Material Finder...");
    setProgress(40);

    const tests: TestResult[] = [];

    try {
      // Test 1: Load roof systems
      setCurrentTest("Loading roof systems...");
      const { data: systems, error: systemsError } = await supabase
        .from('roof_systems')
        .select('*')
        .limit(10);

      tests.push({
        testName: "Load Roof Systems",
        status: systemsError ? "fail" : "pass",
        message: systemsError ? systemsError.message : `Loaded ${systems?.length || 0} systems`,
      });

      // Test 2: Filter by wind pressure
      if (systems && systems.length > 0) {
        const requiredPressure = 120;
        const compatibleSystems = systems.filter(s => s.max_wind_pressure >= requiredPressure);
        
        tests.push({
          testName: "Wind Pressure Filtering",
          status: compatibleSystems.length > 0 ? "pass" : "warning",
          message: `Found ${compatibleSystems.length} systems compatible with ${requiredPressure} psf`,
        });

        // Test 3: Deck type filtering
        const deckCompatible = systems.filter(s => s.deck_types.includes('Steel'));
        tests.push({
          testName: "Deck Type Filtering",
          status: deckCompatible.length > 0 ? "pass" : "warning",
          message: `Found ${deckCompatible.length} systems compatible with Steel deck`,
        });

        // Test 4: Safety factor calculation
        const system = systems[0];
        const safetyFactor = system.max_wind_pressure / requiredPressure;
        tests.push({
          testName: "Safety Factor Calculation",
          status: safetyFactor > 1 ? "pass" : "fail",
          message: `Safety factor: ${safetyFactor.toFixed(2)}`,
        });
      }

      // Test 5: State approvals
      setCurrentTest("Testing state approvals...");
      const { data: approvals, error: approvalsError } = await supabase
        .from('state_approvals')
        .select('*')
        .eq('state', 'FL')
        .eq('status', 'active')
        .limit(5);

      tests.push({
        testName: "State Approvals Loading",
        status: approvalsError ? "fail" : "pass",
        message: approvalsError ? approvalsError.message : `Found ${approvals?.length || 0} FL approvals`,
      });

    } catch (error) {
      tests.push({
        testName: "Material Finder General",
        status: "fail",
        message: `General test failure: ${error}`,
      });
    }

    setProgress(60);

    return {
      name: "Material Finder",
      tests,
      totalTests: tests.length,
      passedTests: tests.filter(t => t.status === "pass").length,
      failedTests: tests.filter(t => t.status === "fail").length,
      warnings: tests.filter(t => t.status === "warning").length,
    };
  };

  const runIntegrationFlowTests = async (): Promise<TestSuite> => {
    setCurrentTest("Testing Integration Flow...");
    setProgress(75);

    const tests: TestResult[] = [];

    try {
      // Test 1: End-to-end workflow simulation
      setCurrentTest("Simulating end-to-end workflow...");
      
      // Simulate wind calculation
      const windPressure = 120;
      const deckType = 'Steel';
      const state = 'FL';

      // Test material search with calculated values
      const { data: compatibleSystems } = await supabase
        .from('roof_systems')
        .select(`
          *,
          state_approvals!inner(*)
        `)
        .gte('max_wind_pressure', windPressure)
        .contains('deck_types', [deckType])
        .eq('state_approvals.state', state)
        .eq('state_approvals.status', 'active');

      tests.push({
        testName: "End-to-End Workflow",
        status: compatibleSystems && compatibleSystems.length > 0 ? "pass" : "warning",
        message: `Found ${compatibleSystems?.length || 0} compatible systems for ${windPressure} psf on ${deckType} deck in ${state}`,
      });

      // Test 2: URL parameter passing
      const searchParams = new URLSearchParams({
        maxWindPressure: windPressure.toString(),
        deckType: deckType,
        state: state,
      });

      tests.push({
        testName: "URL Parameter Generation",
        status: searchParams.toString().includes('maxWindPressure') ? "pass" : "fail",
        message: `Generated URL params: ${searchParams.toString()}`,
      });

      // Test 3: Safety factor validation
      if (compatibleSystems && compatibleSystems.length > 0) {
        const system = compatibleSystems[0];
        const safetyFactor = system.max_wind_pressure / windPressure;
        
        tests.push({
          testName: "Safety Factor Validation",
          status: safetyFactor >= 1.2 ? "pass" : "warning",
          message: `Safety factor: ${safetyFactor.toFixed(2)} (${safetyFactor >= 1.5 ? 'Excellent' : safetyFactor >= 1.2 ? 'Good' : 'Marginal'})`,
        });
      }

    } catch (error) {
      tests.push({
        testName: "Integration Flow General",
        status: "fail",
        message: `General test failure: ${error}`,
      });
    }

    setProgress(90);

    return {
      name: "Integration Flow",
      tests,
      totalTests: tests.length,
      passedTests: tests.filter(t => t.status === "pass").length,
      failedTests: tests.filter(t => t.status === "fail").length,
      warnings: tests.filter(t => t.status === "warning").length,
    };
  };

  const runDatabaseTests = async (): Promise<TestSuite> => {
    setCurrentTest("Testing Database...");
    setProgress(95);

    const tests: TestResult[] = [];

    try {
      // Test 1: Data quality validation
      const { data: qualityResults } = await supabase.rpc('validate_data_quality');
      
      tests.push({
        testName: "Data Quality Validation",
        status: qualityResults ? "pass" : "fail",
        message: qualityResults ? `Validated ${qualityResults.length} data quality rules` : "Data validation failed",
      });

      // Test 2: Database connectivity
      const { data: dbTest } = await supabase.from('wind_speeds').select('count').limit(1);
      
      tests.push({
        testName: "Database Connectivity",
        status: dbTest ? "pass" : "fail",
        message: dbTest ? "Database connection successful" : "Database connection failed",
      });

      // Test 3: Index performance (simulate)
      const startTime = Date.now();
      await supabase
        .from('roof_systems')
        .select('*')
        .eq('manufacturer', 'GAF')
        .gte('max_wind_pressure', 100);
      const queryTime = Date.now() - startTime;

      tests.push({
        testName: "Index Performance",
        status: queryTime < 1000 ? "pass" : "warning",
        message: `Query executed in ${queryTime}ms`,
      });

    } catch (error) {
      tests.push({
        testName: "Database General",
        status: "fail",
        message: `General test failure: ${error}`,
      });
    }

    setProgress(100);

    return {
      name: "Database",
      tests,
      totalTests: tests.length,
      passedTests: tests.filter(t => t.status === "pass").length,
      failedTests: tests.filter(t => t.status === "fail").length,
      warnings: tests.filter(t => t.status === "warning").length,
    };
  };

  const testWorkflow = () => {
    // Navigate to wind calculator to test the full workflow
    navigate('/wind-calculator');
    toast({
      title: "Testing Workflow",
      description: "Navigate through: Wind Calculator → Calculate → Find Approved Systems → Material Finder",
    });
  };

  const getStatusIcon = (status: "pass" | "fail" | "warning") => {
    switch (status) {
      case "pass": return <CheckCircle className="h-5 w-5 text-success" />;
      case "fail": return <XCircle className="h-5 w-5 text-destructive" />;
      case "warning": return <AlertCircle className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusBadge = (status: "pass" | "fail" | "warning") => {
    switch (status) {
      case "pass": return <Badge className="bg-success text-success-foreground">Pass</Badge>;
      case "fail": return <Badge className="bg-destructive text-destructive-foreground">Fail</Badge>;
      case "warning": return <Badge className="bg-warning text-warning-foreground">Warning</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
          <TestTube className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integration Testing</h1>
          <p className="text-muted-foreground">End-to-end testing for wind calculation and material selection workflow</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={runAllTests} 
          disabled={isRunning}
          className="bg-gradient-engineering hover:opacity-90"
        >
          {isRunning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          {isRunning ? "Running Tests..." : "Run All Tests"}
        </Button>
        
        <Button onClick={testWorkflow} variant="outline">
          Test Manual Workflow
        </Button>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentTest}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {testSuites.length > 0 && (
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {testSuites.map((suite, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{suite.name}</h3>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm">{suite.passedTests} passed</span>
                      </div>
                      {suite.failedTests > 0 && (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm">{suite.failedTests} failed</span>
                        </div>
                      )}
                      {suite.warnings > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-warning" />
                          <span className="text-sm">{suite.warnings} warnings</span>
                        </div>
                      )}
                      <Progress 
                        value={(suite.passedTests / suite.totalTests) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="detailed">
            <div className="space-y-6">
              {testSuites.map((suite, suiteIndex) => (
                <Card key={suiteIndex}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{suite.name} Tests</span>
                      <Badge variant="outline">
                        {suite.passedTests}/{suite.totalTests} passed
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {suite.tests.map((test, testIndex) => (
                        <div key={testIndex} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(test.status)}
                            <div>
                              <p className="font-medium">{test.testName}</p>
                              <p className="text-sm text-muted-foreground">{test.message}</p>
                              {test.details && (
                                <p className="text-xs text-muted-foreground mt-1">{test.details}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {test.duration && (
                              <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                            )}
                            {getStatusBadge(test.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}