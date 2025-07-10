import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { Search, Plus, Edit, Trash2, Upload, Settings, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
  created_at: string;
}

interface SystemForm {
  manufacturer: string;
  system_name: string;
  membrane_type: string;
  max_wind_pressure: number;
  deck_types: string[];
  fastener_pattern: string;
  safety_factor: number;
  description: string;
}

const membraneTypes = ['TPO', 'EPDM', 'PVC', 'Modified Bitumen', 'Built-Up Roof', 'Metal'];
const deckTypes = ['Concrete', 'Steel', 'Wood', 'Gypsum', 'Lightweight Concrete'];
const fastenerPatterns = ['Mechanically Attached', 'Fully Adhered', 'Ballasted', 'Torch Applied'];

export default function MaterialsManage() {
  const [systems, setSystems] = useState<RoofSystem[]>([]);
  const [filteredSystems, setFilteredSystems] = useState<RoofSystem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterMembrane, setFilterMembrane] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<RoofSystem | null>(null);
  
  const { isEngineer } = useAuth();
  const { toast } = useToast();

  const form = useForm<SystemForm>({
    defaultValues: {
      manufacturer: '',
      system_name: '',
      membrane_type: '',
      max_wind_pressure: 100,
      deck_types: [],
      fastener_pattern: '',
      safety_factor: 1.0,
      description: '',
    },
  });

  useEffect(() => {
    loadSystems();
  }, []);

  useEffect(() => {
    filterSystems();
  }, [systems, searchTerm, filterManufacturer, filterMembrane]);

  if (!isEngineer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="shadow-card max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Engineer Access Required</h3>
            <p className="text-muted-foreground">
              This section is restricted to professional engineers and approved personnel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loadSystems = async () => {
    try {
      const { data, error } = await supabase
        .from('roof_systems')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSystems(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load roof systems.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterSystems = () => {
    let filtered = systems;

    if (searchTerm) {
      filtered = filtered.filter(system =>
        system.system_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        system.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterManufacturer) {
      filtered = filtered.filter(system => system.manufacturer === filterManufacturer);
    }

    if (filterMembrane) {
      filtered = filtered.filter(system => system.membrane_type === filterMembrane);
    }

    setFilteredSystems(filtered);
  };

  const handleSubmit = async (data: SystemForm) => {
    try {
      if (editingSystem) {
        const { error } = await supabase
          .from('roof_systems')
          .update(data)
          .eq('id', editingSystem.id);

        if (error) throw error;

        toast({
          title: "System Updated",
          description: "Roof system has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('roof_systems')
          .insert([data]);

        if (error) throw error;

        toast({
          title: "System Added",
          description: "New roof system has been added successfully.",
        });
      }

      setDialogOpen(false);
      setEditingSystem(null);
      form.reset();
      loadSystems();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save roof system.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (system: RoofSystem) => {
    setEditingSystem(system);
    form.reset({
      manufacturer: system.manufacturer,
      system_name: system.system_name,
      membrane_type: system.membrane_type,
      max_wind_pressure: system.max_wind_pressure,
      deck_types: system.deck_types,
      fastener_pattern: system.fastener_pattern,
      safety_factor: system.safety_factor,
      description: system.description,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this system?')) return;

    try {
      const { error } = await supabase
        .from('roof_systems')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "System Deleted",
        description: "Roof system has been deleted successfully.",
      });

      loadSystems();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete roof system.",
        variant: "destructive",
      });
    }
  };

  const manufacturers = [...new Set(systems.map(s => s.manufacturer))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-engineering">
          <Settings className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Management</h1>
          <p className="text-muted-foreground">Manage roofing systems and technical specifications</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search systems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterManufacturer} onValueChange={setFilterManufacturer}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by manufacturer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All manufacturers</SelectItem>
              {manufacturers.map(mfg => (
                <SelectItem key={mfg} value={mfg}>{mfg}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterMembrane} onValueChange={setFilterMembrane}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by membrane" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All membranes</SelectItem>
              {membraneTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-engineering hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Add System
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSystem ? 'Edit Roof System' : 'Add New Roof System'}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="system_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="membrane_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Membrane Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select membrane type" />
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
                      name="fastener_pattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fastener Pattern</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select fastener pattern" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {fastenerPatterns.map((pattern) => (
                                <SelectItem key={pattern} value={pattern}>{pattern}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="max_wind_pressure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Wind Pressure (psf)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="safety_factor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Safety Factor</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setEditingSystem(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-engineering hover:opacity-90">
                      {editingSystem ? 'Update System' : 'Add System'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Systems Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Membrane</TableHead>
                <TableHead>Max Pressure</TableHead>
                <TableHead>Safety Factor</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSystems.map((system) => (
                <TableRow key={system.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{system.system_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {system.deck_types.join(', ')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{system.manufacturer}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{system.membrane_type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {system.max_wind_pressure} psf
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        system.safety_factor >= 1.5 
                          ? "bg-success text-success-foreground"
                          : system.safety_factor >= 1.2
                          ? "bg-warning text-warning-foreground" 
                          : "bg-destructive text-destructive-foreground"
                      }
                    >
                      {system.safety_factor}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(system)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(system.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredSystems.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No systems found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}