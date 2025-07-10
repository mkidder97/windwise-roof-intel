import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  GitCompare,
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Shield,
  Eye,
  CheckCheck,
  X,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ChangeDetection {
  id: string;
  monitoring_id: string;
  change_type: string;
  change_data: any;
  previous_data: any;
  detection_confidence: number;
  page_url: string;
  change_summary: string;
  review_status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  auto_approved: boolean;
  created_at: string;
  manufacturer_monitoring?: {
    manufacturer_name: string;
    website_url: string;
  };
}

export default function ReviewChanges() {
  const [changes, setChanges] = useState<ChangeDetection[]>([]);
  const [filteredChanges, setFilteredChanges] = useState<ChangeDetection[]>([]);
  const [selectedChange, setSelectedChange] = useState<ChangeDetection | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [isReviewing, setIsReviewing] = useState(false);
  
  const { isEngineer, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isEngineer) {
      loadChanges();
    }
  }, [isEngineer]);

  useEffect(() => {
    filterChangesByStatus();
  }, [changes, filterStatus]);

  if (!isEngineer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="shadow-card max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Engineer Access Required</h3>
            <p className="text-muted-foreground">
              Change review is restricted to professional engineers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loadChanges = async () => {
    try {
      const { data, error } = await supabase
        .from('change_detection_log')
        .select(`
          *,
          manufacturer_monitoring (
            manufacturer_name,
            website_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setChanges(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load change detections.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterChangesByStatus = () => {
    let filtered = changes;
    
    if (filterStatus !== 'all') {
      filtered = changes.filter(change => change.review_status === filterStatus);
    }
    
    setFilteredChanges(filtered);
  };

  const handleReview = async (changeId: string, status: 'approved' | 'rejected') => {
    if (!reviewNotes.trim()) {
      toast({
        title: "Review Notes Required",
        description: "Please provide notes for your review decision.",
        variant: "destructive",
      });
      return;
    }

    setIsReviewing(true);

    try {
      const { error } = await supabase
        .from('change_detection_log')
        .update({
          review_status: status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', changeId);

      if (error) throw error;

      // If approved, integrate changes with system management
      if (status === 'approved') {
        await integrateApprovedChange(selectedChange);
      }

      toast({
        title: `Change ${status}`,
        description: `The detected change has been ${status}.`,
      });

      setSelectedChange(null);
      setReviewNotes('');
      loadChanges();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save review.",
        variant: "destructive",
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const integrateApprovedChange = async (change: ChangeDetection | null) => {
    if (!change) return;

    try {
      // This would implement the logic to update roof_systems table
      // based on the approved changes
      console.log('Integrating approved change:', change);
      
      // Example integration logic:
      if (change.change_type === 'spec_change') {
        // Update roof system specifications
      } else if (change.change_type === 'new_product') {
        // Add new roof system to database
      }
    } catch (error) {
      console.error('Error integrating change:', error);
    }
  };

  const bulkApprove = async (changeIds: string[]) => {
    try {
      const { error } = await supabase
        .from('change_detection_log')
        .update({
          review_status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: 'Bulk approved - minor changes'
        })
        .in('id', changeIds);

      if (error) throw error;

      toast({
        title: "Bulk Approval Complete",
        description: `${changeIds.length} changes have been approved.`,
      });

      loadChanges();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to bulk approve changes.",
        variant: "destructive",
      });
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'new_product': return 'bg-primary text-primary-foreground';
      case 'spec_change': return 'bg-warning text-warning-foreground';
      case 'approval_update': return 'bg-success text-success-foreground';
      case 'page_structure_change': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'approved': return 'bg-success text-success-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      case 'auto_approved': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatChangeData = (changeData: any, changeType: string) => {
    if (changeType === 'spec_change') {
      return `${changeData.field}: ${changeData.old_value} → ${changeData.new_value}`;
    } else if (changeType === 'new_product') {
      return `New: ${changeData.product_name} (${changeData.wind_rating})`;
    }
    return JSON.stringify(changeData, null, 2);
  };

  const pendingChanges = filteredChanges.filter(c => c.review_status === 'pending');
  const minorChanges = pendingChanges.filter(c => 
    c.change_type === 'minor_update' && c.detection_confidence > 0.9
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
          <GitCompare className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Review Changes</h1>
          <p className="text-muted-foreground">Review and approve detected manufacturer changes</p>
        </div>
      </div>

      {/* Stats and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-4">
          <Badge 
            variant={filterStatus === 'pending' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterStatus('pending')}
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending ({changes.filter(c => c.review_status === 'pending').length})
          </Badge>
          <Badge 
            variant={filterStatus === 'approved' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterStatus('approved')}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved ({changes.filter(c => c.review_status === 'approved').length})
          </Badge>
          <Badge 
            variant={filterStatus === 'rejected' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterStatus('rejected')}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Rejected ({changes.filter(c => c.review_status === 'rejected').length})
          </Badge>
          <Badge 
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterStatus('all')}
          >
            All ({changes.length})
          </Badge>
        </div>

        {minorChanges.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => bulkApprove(minorChanges.map(c => c.id))}
            className="flex items-center gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Bulk Approve Minor ({minorChanges.length})
          </Button>
        )}
      </div>

      {/* Changes Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Change Type</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChanges.map((change) => (
                <TableRow key={change.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {change.manufacturer_monitoring?.manufacturer_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {change.page_url}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getChangeTypeColor(change.change_type)}>
                      {change.change_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium text-sm">{change.change_summary}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatChangeData(change.change_data, change.change_type)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={change.detection_confidence > 0.9 ? 'bg-success/10' : 'bg-warning/10'}
                    >
                      {Math.round(change.detection_confidence * 100)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(change.review_status)}>
                      {change.review_status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(change.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedChange(change)}
                        disabled={change.review_status !== 'pending'}
                      >
                        <Eye className="h-4 w-4" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(change.page_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredChanges.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Changes Found</h3>
              <p className="text-muted-foreground">
                No changes match the current filter criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedChange} onOpenChange={() => setSelectedChange(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Change Detection</DialogTitle>
          </DialogHeader>
          
          {selectedChange && (
            <div className="space-y-6">
              {/* Change Details */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Change Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Manufacturer</Label>
                      <div className="font-medium">
                        {selectedChange.manufacturer_monitoring?.manufacturer_name}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Change Type</Label>
                      <div>
                        <Badge className={getChangeTypeColor(selectedChange.change_type)}>
                          {selectedChange.change_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Detection Confidence</Label>
                      <div className="font-medium">
                        {Math.round(selectedChange.detection_confidence * 100)}%
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Page URL</Label>
                      <div className="text-sm break-all">{selectedChange.page_url}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Change Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">{selectedChange.change_summary}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Side-by-side Comparison */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Previous Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {selectedChange.previous_data 
                        ? JSON.stringify(selectedChange.previous_data, null, 2)
                        : 'No previous data (new item)'
                      }
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-success">Detected Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(selectedChange.change_data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              {/* Review Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Engineer Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="review-notes">Review Notes (Required)</Label>
                    <Textarea
                      id="review-notes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Explain your decision to approve or reject this change..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedChange(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReview(selectedChange.id, 'rejected')}
                      disabled={isReviewing || !reviewNotes.trim()}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleReview(selectedChange.id, 'approved')}
                      disabled={isReviewing || !reviewNotes.trim()}
                      className="bg-success hover:bg-success/90"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}