import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { 
  Monitor, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Settings, 
  Shield, 
  Globe,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MonitoringConfig {
  id: string;
  manufacturer_name: string;
  website_url: string;
  monitoring_config: any;
  notification_settings: any;
  last_checked?: string;
  last_change_detected?: string;
  status: string;
}

interface MonitoringForm {
  manufacturer_name: string;
  website_url: string;
  product_pages: string;
  product_name_selector: string;
  wind_rating_selector: string;
  approval_selector: string;
  check_frequency: string;
  notification_enabled: boolean;
  email_enabled: boolean;
  email_recipients: string;
  alert_types: string[];
}

const checkFrequencies = ['daily', 'weekly', 'monthly'];
const alertTypes = ['new_products', 'spec_changes', 'approval_updates', 'page_structure_change'];

export default function MaterialsMonitoring() {
  const [configs, setConfigs] = useState<MonitoringConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const [scrapingResults, setScrapingResults] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MonitoringConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  
  const { isEngineer } = useAuth();
  const { toast } = useToast();

  const form = useForm<MonitoringForm>({
    defaultValues: {
      manufacturer_name: '',
      website_url: '',
      product_pages: '',
      product_name_selector: '.product-title, h1',
      wind_rating_selector: '.wind-rating, .specifications .wind',
      approval_selector: '.approval-number, .certifications',
      check_frequency: 'weekly',
      notification_enabled: true,
      email_enabled: true,
      email_recipients: '',
      alert_types: ['new_products', 'spec_changes'],
    },
  });

  useEffect(() => {
    if (isEngineer) {
      loadConfigs();
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
              This monitoring section is restricted to professional engineers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('manufacturer_monitoring')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConfigs(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load monitoring configurations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: MonitoringForm) => {
    try {
      const configData = {
        manufacturer_name: data.manufacturer_name,
        website_url: data.website_url,
        monitoring_config: {
          product_pages: data.product_pages.split('\n').filter(url => url.trim()),
          spec_selectors: {
            product_name: data.product_name_selector,
            wind_rating: data.wind_rating_selector,
            approval_number: data.approval_selector,
          },
          check_frequency: data.check_frequency,
          notification_enabled: data.notification_enabled,
        },
        notification_settings: {
          email_enabled: data.email_enabled,
          slack_enabled: false,
          email_recipients: data.email_recipients.split(',').map(email => email.trim()).filter(Boolean),
          alert_types: data.alert_types,
        },
      };

      if (editingConfig) {
        const { error } = await supabase
          .from('manufacturer_monitoring')
          .update(configData)
          .eq('id', editingConfig.id);

        if (error) throw error;

        toast({
          title: "Configuration Updated",
          description: "Monitoring configuration has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('manufacturer_monitoring')
          .insert([configData]);

        if (error) throw error;

        toast({
          title: "Configuration Added",
          description: "New monitoring configuration has been added successfully.",
        });
      }

      setDialogOpen(false);
      setEditingConfig(null);
      form.reset();
      loadConfigs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save monitoring configuration.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (config: MonitoringConfig) => {
    setEditingConfig(config);
    form.reset({
      manufacturer_name: config.manufacturer_name,
      website_url: config.website_url,
      product_pages: config.monitoring_config?.product_pages?.join('\n') || '',
      product_name_selector: config.monitoring_config?.spec_selectors?.product_name || '',
      wind_rating_selector: config.monitoring_config?.spec_selectors?.wind_rating || '',
      approval_selector: config.monitoring_config?.spec_selectors?.approval_number || '',
      check_frequency: config.monitoring_config?.check_frequency || 'weekly',
      notification_enabled: config.monitoring_config?.notification_enabled || true,
      email_enabled: config.notification_settings?.email_enabled || true,
      email_recipients: config.notification_settings?.email_recipients?.join(', ') || '',
      alert_types: config.notification_settings?.alert_types || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this monitoring configuration?')) return;

    try {
      const { error } = await supabase
        .from('manufacturer_monitoring')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Configuration Deleted",
        description: "Monitoring configuration has been deleted successfully.",
      });

      loadConfigs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete monitoring configuration.",
        variant: "destructive",
      });
    }
  };

  const testMonitoring = async (id: string) => {
    setTestingId(id);
    
    try {
      const { data, error } = await supabase.functions.invoke('monitor-manufacturer-changes', {
        body: { monitoring_id: id, test_mode: true }
      });

      if (error) throw error;

      toast({
        title: "Test Complete",
        description: data?.message || "Monitoring test completed successfully.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to test monitoring configuration.",
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  };

  const runManufacturerScraping = async (manufacturerId?: string) => {
    try {
      setIsScrapingLoading(true);
      
      const { data, error } = await supabase.functions.invoke('scrape-manufacturer-data', {
        body: { 
          manufacturer_id: manufacturerId,
          test_mode: false 
        }
      });

      if (error) throw error;

      setScrapingResults(data.results || []);
      
      toast({
        title: "Scraping completed",
        description: `Processed ${data.total_processed} manufacturers, found ${data.total_changes} changes.`,
      });
      
      // Refresh monitoring configs to update last_checked times
      loadConfigs();
      
    } catch (error) {
      console.error('Error running manufacturer scraping:', error);
      toast({
        title: "Error", 
        description: "Failed to run manufacturer scraping. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScrapingLoading(false);
    }
  };

  const runTestScraping = async (manufacturerId: string) => {
    try {
      setIsScrapingLoading(true);
      
      const { data, error } = await supabase.functions.invoke('scrape-manufacturer-data', {
        body: { 
          manufacturer_id: manufacturerId,
          test_mode: true 
        }
      });

      if (error) throw error;

      toast({
        title: "Test scraping completed",
        description: `Found ${data.results?.[0]?.changes_detected || 0} changes for this manufacturer.`,
      });
      
      loadConfigs();
      
    } catch (error) {
      console.error('Error running test scraping:', error);
      toast({
        title: "Error",
        description: "Failed to run test scraping. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScrapingLoading(false);
    }
  };

  const getStatusColor = (status: string, lastChecked?: string) => {
    if (status === 'active' && lastChecked) {
      const daysSinceCheck = Math.floor((Date.now() - new Date(lastChecked).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCheck > 7) return 'bg-warning text-warning-foreground';
      return 'bg-success text-success-foreground';
    }
    if (status === 'inactive') return 'bg-muted text-muted-foreground';
    return 'bg-primary text-primary-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
          <Monitor className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manufacturer Monitoring</h1>
          <p className="text-muted-foreground">Monitor manufacturer websites for product and specification changes</p>
        </div>
      </div>

      <Tabs defaultValue="monitoring" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitoring">Monitoring Setup</TabsTrigger>
          <TabsTrigger value="scraping">Web Scraping</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-6">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-primary/10">
                {configs.length} manufacturers monitored
              </Badge>
              <Badge variant="outline" className="bg-success/10">
                {configs.filter(c => c.status === 'active').length} active
              </Badge>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-engineering hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Monitoring
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingConfig ? 'Edit Monitoring Configuration' : 'Add New Monitoring Configuration'}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="manufacturer_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manufacturer Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="GAF, Firestone, etc." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="website_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://www.manufacturer.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Product Pages */}
                    <FormField
                      control={form.control}
                      name="product_pages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Pages to Monitor (one per line)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="https://www.manufacturer.com/products/tpo
https://www.manufacturer.com/products/epdm"
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* CSS Selectors */}
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        CSS Selectors for Data Extraction
                      </h4>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="product_name_selector"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Name Selector</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder=".product-title, h1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="wind_rating_selector"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Wind Rating Selector</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder=".wind-rating, .specifications .wind" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="approval_selector"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Approval Number Selector</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder=".approval-number, .certifications" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="check_frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Check Frequency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {checkFrequencies.map((frequency) => (
                                  <SelectItem key={frequency} value={frequency}>{frequency}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notification_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">Enable Notifications</FormLabel>
                              <p className="text-muted-foreground text-xs">
                                Get notified when changes are detected.
                              </p>
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

                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Email Notification Settings
                      </h4>

                      <FormField
                        control={form.control}
                        name="email_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">Enable Email Notifications</FormLabel>
                              <p className="text-muted-foreground text-xs">
                                Send email notifications for detected changes.
                              </p>
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
                        name="email_recipients"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Recipients (comma-separated)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="engineer1@example.com, engineer2@example.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="alert_types"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alert Types</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {alertTypes.map((type) => (
                                <FormField
                                  key={type}
                                  control={form.control}
                                  name="alert_types"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-1">
                                      <FormControl>
                                        <Input
                                          type="checkbox"
                                          id={type}
                                          checked={field.value.includes(type)}
                                          onChange={() => {
                                            if (field.value?.includes(type)) {
                                              field.onChange(field.value.filter((value: string) => value !== type));
                                            } else {
                                              field.onChange([...(field.value || []), type]);
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel htmlFor={type} className="text-sm font-normal">
                                        {type.split('_').join(' ')}
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-gradient-engineering hover:opacity-90">
                        {editingConfig ? 'Update Configuration' : 'Add Configuration'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Monitoring Configurations Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Active Monitoring Configurations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading configurations...</div>
              ) : configs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No monitoring configurations found. Add one to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Checked</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {config.manufacturer_name}
                        </TableCell>
                        <TableCell>
                          <a 
                            href={config.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {config.website_url}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(config.status, config.last_checked)}>
                            {config.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {config.last_checked ? (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {new Date(config.last_checked).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {config.monitoring_config?.check_frequency || 'weekly'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testMonitoring(config.id)}
                              disabled={testingId === config.id}
                            >
                              {testingId === config.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(config)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scraping" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Automated Web Scraping</h3>
              <p className="text-sm text-muted-foreground">
                Extract product data directly from manufacturer websites
              </p>
            </div>
            <Button 
              onClick={() => runManufacturerScraping()}
              disabled={isScrapingLoading}
            >
              {isScrapingLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Run All Scrapers
            </Button>
          </div>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Scraping Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {configs.map((config) => (
                    <div key={config.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{config.manufacturer_name}</h4>
                          <p className="text-sm text-muted-foreground">{config.website_url}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => runTestScraping(config.id)}
                            disabled={isScrapingLoading}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Test Scrape
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => runManufacturerScraping(config.id)}
                            disabled={isScrapingLoading}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Full Scrape
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Last Scraped:</span>
                          <p className="text-muted-foreground">
                            {config.last_checked 
                              ? new Date(config.last_checked).toLocaleString()
                              : 'Never'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Last Change:</span>
                          <p className="text-muted-foreground">
                            {config.last_change_detected 
                              ? new Date(config.last_change_detected).toLocaleString()
                              : 'None detected'
                            }
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="font-medium text-sm">Monitored Pages:</span>
                        <div className="mt-1 space-y-1">
                          {config.monitoring_config.product_pages?.map((url, index) => (
                            <div key={index} className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {url}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {scrapingResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Latest Scraping Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scrapingResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{result.manufacturer_name}</h4>
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                        </div>
                        
                        {result.success ? (
                          <div className="text-sm">
                            <p className="text-muted-foreground">
                              Changes detected: <span className="font-medium">{result.changes_detected}</span>
                            </p>
                            {result.changes && result.changes.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {result.changes.slice(0, 3).map((change, changeIndex) => (
                                  <div key={changeIndex} className="text-xs bg-muted p-2 rounded">
                                    <span className="font-medium">{change.change_type}:</span> {change.change_summary}
                                  </div>
                                ))}
                                {result.changes.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{result.changes.length - 3} more changes
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-destructive">{result.error}</p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          Scraped: {new Date(result.last_scraped).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configuration settings will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
