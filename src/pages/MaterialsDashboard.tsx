import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, CalendarDays } from 'lucide-react';
import { 
  BarChart3, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  FileText,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalSystems: number;
  totalApprovals: number;
  systemsWithApprovals: number;
  systemsNeedingReview: number;
  expiringApprovals: number;
  recentActivity: any[];
  qualityMetrics: {
    completeDescriptions: number;
    verifiedSystems: number;
    dataQualityScore: number;
  };
}


export default function MaterialsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { isEngineer } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isEngineer) {
      loadDashboardData();
    }
  }, [isEngineer]);

  if (!isEngineer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="shadow-card max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Engineer Access Required</h3>
            <p className="text-muted-foreground">
              This dashboard is restricted to professional engineers and approved personnel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loadDashboardData = async () => {
    try {
      // Get roof systems
      const { data: systems, error: systemsError } = await supabase
        .from('roof_systems')
        .select('*');

      if (systemsError) throw systemsError;

      // Get state approvals
      const { data: approvals, error: approvalsError } = await supabase
        .from('state_approvals')
        .select('*');

      if (approvalsError) throw approvalsError;

      // Calculate metrics
      const totalSystems = systems?.length || 0;
      const totalApprovals = approvals?.length || 0;
      
      const systemsWithApprovals = new Set(approvals?.map(a => a.system_id)).size;
      
      const now = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(now.getDate() + 90);
      
      const expiringApprovals = approvals?.filter(a => {
        if (!a.expiration_date) return false;
        const expDate = new Date(a.expiration_date);
        return expDate <= ninetyDaysFromNow;
      }).length || 0;

      const completeDescriptions = systems?.filter(s => s.description && s.description.length > 20).length || 0;
      const dataQualityScore = Math.round((completeDescriptions / totalSystems) * 100);

      // Manufacturer breakdown - simplified
      const manufacturerMap = new Map<string, { systems: number; approvals: number }>();
      
      systems?.forEach(system => {
        const current = manufacturerMap.get(system.manufacturer) || { systems: 0, approvals: 0 };
        current.systems++;
        manufacturerMap.set(system.manufacturer, current);
      });

      approvals?.forEach(approval => {
        const system = systems?.find(s => s.id === approval.system_id);
        if (system) {
          const current = manufacturerMap.get(system.manufacturer) || { systems: 0, approvals: 0 };
          current.approvals++;
          manufacturerMap.set(system.manufacturer, current);
        }
      });

      setStats({
        totalSystems,
        totalApprovals,
        systemsWithApprovals,
        systemsNeedingReview: totalSystems - systemsWithApprovals,
        expiringApprovals,
        recentActivity: [],
        qualityMetrics: {
          completeDescriptions,
          verifiedSystems: systemsWithApprovals,
          dataQualityScore,
        },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quality Control Dashboard</h1>
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Systems with Approvals', value: stats.systemsWithApprovals },
    { name: 'Systems Needing Review', value: stats.systemsNeedingReview },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
          <BarChart3 className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quality Control Dashboard</h1>
          <p className="text-muted-foreground">Monitor data quality and system coverage</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Systems</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalSystems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Approvals</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalApprovals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-foreground">{stats.expiringApprovals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-data/10">
                <TrendingUp className="h-5 w-5 text-data" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Quality</p>
                <p className="text-2xl font-bold text-foreground">{stats.qualityMetrics.dataQualityScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simplified Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manufacturer Summary */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Manufacturer Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.totalSystems}</div>
                <div className="text-sm text-muted-foreground">Total Systems Tracked</div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-r from-success/10 to-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-success">{stats.totalApprovals}</div>
                <div className="text-sm text-muted-foreground">Total State Approvals</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Coverage Summary */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Approval Coverage Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-success/10 rounded-lg">
                <span className="font-medium">Systems with Approvals</span>
                <Badge className="bg-success text-success-foreground">
                  {stats.systemsWithApprovals}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-warning/10 rounded-lg">
                <span className="font-medium">Systems Needing Review</span>
                <Badge className="bg-warning text-warning-foreground">
                  {stats.systemsNeedingReview}
                </Badge>
              </div>
              
              <div className="text-center pt-4">
                <div className="text-2xl font-bold text-primary">
                  {Math.round((stats.systemsWithApprovals / stats.totalSystems) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Coverage Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Metrics */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Data Quality Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Complete Descriptions</span>
                <span className="text-sm text-muted-foreground">
                  {stats.qualityMetrics.completeDescriptions}/{stats.totalSystems}
                </span>
              </div>
              <Progress 
                value={(stats.qualityMetrics.completeDescriptions / stats.totalSystems) * 100} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Verified Systems</span>
                <span className="text-sm text-muted-foreground">
                  {stats.qualityMetrics.verifiedSystems}/{stats.totalSystems}
                </span>
              </div>
              <Progress 
                value={(stats.qualityMetrics.verifiedSystems / stats.totalSystems) * 100} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Quality Score</span>
                <span className="text-sm text-muted-foreground">
                  {stats.qualityMetrics.dataQualityScore}%
                </span>
              </div>
              <Progress 
                value={stats.qualityMetrics.dataQualityScore} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Expiring Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.expiringApprovals > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm">
                    {stats.expiringApprovals} approvals expire within 90 days
                  </span>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Review Expiring Approvals
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No approvals expiring soon</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Systems needing review</span>
              <Badge variant="outline">{stats.systemsNeedingReview}</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Incomplete descriptions</span>
              <Badge variant="outline">
                {stats.totalSystems - stats.qualityMetrics.completeDescriptions}
              </Badge>
            </div>

            <Button variant="outline" size="sm" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Generate Quality Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}