import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function DatabaseTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const runDatabaseTest = async () => {
    setTesting(true);
    console.log('🧪 Starting comprehensive database test...');

    try {
      const testResults = {
        connectivity: false,
        windSpeeds: { count: 0, error: null },
        roofSystems: { count: 0, error: null },
        stateApprovals: { count: 0, error: null },
        calculations: { canInsert: false, error: null }
      };

      // Test 1: Basic connectivity
      console.log('📡 Testing basic connectivity...');
      const { data: healthData, error: healthError } = await supabase
        .from('system_health')
        .select('*');
      
      testResults.connectivity = !healthError;
      if (healthError) {
        console.error('❌ Connectivity failed:', healthError);
      } else {
        console.log('✅ Database connected successfully');
      }

      // Test 2: Wind speeds table
      console.log('🌪️ Testing wind_speeds table...');
      const { data: windData, error: windError } = await supabase
        .from('wind_speeds')
        .select('count')
        .limit(1);
      
      testResults.windSpeeds.count = windData?.length || 0;
      testResults.windSpeeds.error = windError?.message;

      // Test 3: Roof systems table  
      console.log('🏗️ Testing roof_systems table...');
      const { data: systemsData, error: systemsError } = await supabase
        .from('roof_systems')
        .select('count')
        .limit(1);
      
      testResults.roofSystems.count = systemsData?.length || 0;
      testResults.roofSystems.error = systemsError?.message;

      // Test 4: State approvals table
      console.log('🏛️ Testing state_approvals table...');
      const { data: approvalsData, error: approvalsError } = await supabase
        .from('state_approvals')
        .select('count')
        .limit(1);
      
      testResults.stateApprovals.count = approvalsData?.length || 0;
      testResults.stateApprovals.error = approvalsError?.message;

      // Test 5: Calculations insert capability
      console.log('💾 Testing calculations insert...');
      const testCalculation = {
        project_name: 'Database Test',
        building_height: 30,
        building_length: 100,
        building_width: 80,
        city: 'Test City',
        state: 'TX',
        exposure_category: 'C',
        roof_type: 'Flat/Low Slope',
        deck_type: 'Steel',
        asce_edition: 'ASCE 7-22',
        calculation_method: 'component_cladding',
        wind_speed: 120,
        max_pressure: 85.5,
        field_pressure: 75.0,
        perimeter_pressure: 80.0,
        corner_pressure: 85.5,
        topographic_factor: 1.0,
        directionality_factor: 0.85,
        input_parameters: { test: true } as any,
        results: { test: true } as any,
        user_id: null
      };

      const { error: insertError } = await supabase
        .from('calculations')
        .insert(testCalculation);
      
      testResults.calculations.canInsert = !insertError;
      testResults.calculations.error = insertError?.message;

      setResults(testResults);
      
      const allPassed = testResults.connectivity && 
                      testResults.windSpeeds.count > 0 &&
                      testResults.roofSystems.count > 0 &&
                      testResults.stateApprovals.count > 0 &&
                      testResults.calculations.canInsert;

      toast({
        title: allPassed ? "All Tests Passed" : "Some Tests Failed", 
        description: allPassed ? "Database is fully functional" : "Check console for details",
        variant: allPassed ? "default" : "destructive"
      });

    } catch (error) {
      console.error('💥 Database test failed:', error);
      toast({
        title: "Test Failed",
        description: `Database test error: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Connectivity Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={runDatabaseTest} disabled={testing} className="w-full">
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            {testing ? 'Testing...' : 'Run Database Test'}
          </Button>

          {results && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Database Connectivity</span>
                {results.connectivity ? 
                  <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge> :
                  <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
                }
              </div>
              
              <div className="flex items-center justify-between">
                <span>Wind Speeds Data</span>
                {results.windSpeeds.count > 0 ? 
                  <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Available</Badge> :
                  <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Missing</Badge>
                }
              </div>

              <div className="flex items-center justify-between">
                <span>Roof Systems Data</span>
                {results.roofSystems.count > 0 ? 
                  <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Available</Badge> :
                  <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Missing</Badge>
                }
              </div>

              <div className="flex items-center justify-between">
                <span>State Approvals Data</span>
                {results.stateApprovals.count > 0 ? 
                  <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Available</Badge> :
                  <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Missing</Badge>
                }
              </div>

              <div className="flex items-center justify-between">
                <span>Calculations Insert</span>
                {results.calculations.canInsert ? 
                  <Badge className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Working</Badge> :
                  <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>
                }
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}