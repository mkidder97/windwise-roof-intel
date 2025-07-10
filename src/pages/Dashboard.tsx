import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Calculator, 
  Search, 
  Wind, 
  Building, 
  MapPin, 
  Calendar,
  TrendingUp,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import DatabaseTest from '@/components/DatabaseTest';

interface DashboardStats {
  totalCalculations: number;
  avgWindSpeed: number;
  mostCommonDeck: string;
  mostCommonExposure: string;
  recentCalculations: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCalculations: 0,
    avgWindSpeed: 0,
    mostCommonDeck: "",
    mostCommonExposure: "",
    recentCalculations: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get total calculations
      const { data: calculations, error: calcError } = await supabase
        .from('calculations')
        .select('*')
        .order('created_at', { ascending: false });

      if (calcError) throw calcError;

      // Calculate statistics
      const totalCalculations = calculations?.length || 0;
      const avgWindSpeed = calculations?.length > 0 
        ? calculations.reduce((sum, calc) => sum + calc.wind_speed, 0) / calculations.length 
        : 0;

      // Find most common deck type
      const deckCounts = calculations?.reduce((acc, calc) => {
        acc[calc.deck_type] = (acc[calc.deck_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const mostCommonDeck = Object.keys(deckCounts).reduce((a, b) => 
        deckCounts[a] > deckCounts[b] ? a : b, ""
      );

      // Find most common exposure
      const exposureCounts = calculations?.reduce((acc, calc) => {
        acc[calc.exposure_category] = (acc[calc.exposure_category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const mostCommonExposure = Object.keys(exposureCounts).reduce((a, b) => 
        exposureCounts[a] > exposureCounts[b] ? a : b, ""
      );

      // Get recent calculations (last 5)
      const recentCalculations = calculations?.slice(0, 5) || [];

      setStats({
        totalCalculations,
        avgWindSpeed,
        mostCommonDeck,
        mostCommonExposure,
        recentCalculations
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
          <h1 className="text-3xl font-bold text-foreground">Engineering Dashboard</h1>
          <p className="text-muted-foreground">Overview of your wind pressure calculations and material searches</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-engineering">
                <Calculator className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Wind Pressure Calculator</h3>
                <p className="text-muted-foreground text-sm">Calculate ASCE 7 wind pressures</p>
              </div>
              <Link to="/">
                <Button className="bg-gradient-engineering hover:opacity-90">
                  Calculate
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-success">
                <Search className="h-6 w-6 text-success-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Material Finder</h3>
                <p className="text-muted-foreground text-sm">Find compatible roofing systems</p>
              </div>
              <Link to="/materials">
                <Button variant="outline">
                  Search
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Test */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DatabaseTest />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-light">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Calculations</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalCalculations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-data-wind/10">
                <Wind className="h-5 w-5 text-data-wind" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Wind Speed</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.avgWindSpeed.toFixed(0)} mph
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success-light">
                <Building className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Common Deck</p>
                <p className="text-lg font-bold text-foreground">
                  {stats.mostCommonDeck || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning-light">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Common Exposure</p>
                <p className="text-lg font-bold text-foreground">
                  Category {stats.mostCommonExposure || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calculations */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Recent Calculations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentCalculations.length > 0 ? (
            <div className="space-y-4">
              {stats.recentCalculations.map((calc, index) => (
                <div key={calc.id}>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-data">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                        <Calculator className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{calc.project_name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {calc.city}, {calc.state}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {calc.building_height}ft
                          </span>
                          <span className="flex items-center gap-1">
                            <Wind className="h-3 w-3" />
                            {calc.wind_speed} mph
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-primary text-primary-foreground">
                        {calc.max_pressure?.toFixed(1) || "N/A"} psf
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(calc.created_at)}
                      </p>
                    </div>
                  </div>
                  {index < stats.recentCalculations.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No calculations yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first wind pressure calculation
              </p>
              <Link to="/">
                <Button className="bg-gradient-engineering hover:opacity-90">
                  Create Calculation
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}