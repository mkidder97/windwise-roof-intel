import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Building, Users, Calendar, Download, 
  Trash2, Share, Edit, Plus, Grid3x3, List 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import BuildingGeometryVisualizer from '@/components/BuildingGeometryVisualizer';

interface GeometryTemplate {
  id: string;
  name: string;
  description?: string;
  geometry_data: any;
  thumbnail_url?: string;
  building_type?: string;
  typical_use_cases?: string[];
  user_id?: string;
  is_shared: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface TemplateLibraryProps {
  onSelectTemplate: (template: GeometryTemplate) => void;
  onCreateNew: () => void;
  className?: string;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onSelectTemplate,
  onCreateNew,
  className = ""
}) => {
  const [templates, setTemplates] = useState<GeometryTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<GeometryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingTypeFilter, setBuildingTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter templates
  useEffect(() => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.building_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (buildingTypeFilter !== 'all') {
      filtered = filtered.filter(template => template.building_type === buildingTypeFilter);
    }

    // Sort by usage count and creation date
    filtered.sort((a, b) => {
      if (b.usage_count !== a.usage_count) {
        return b.usage_count - a.usage_count;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredTemplates(filtered);
  }, [templates, searchTerm, buildingTypeFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('geometry_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error Loading Templates",
        description: "Failed to load geometry templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template: GeometryTemplate) => {
    try {
      // Increment usage count
      await supabase
        .from('geometry_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id);

      onSelectTemplate(template);
      
      toast({
        title: "Template Loaded",
        description: `Loaded geometry template: ${template.name}`,
      });
    } catch (error) {
      console.error('Error updating template usage:', error);
      onSelectTemplate(template); // Still proceed with selection
    }
  };

  const handleDeleteTemplate = async (template: GeometryTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('geometry_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== template.id));
      
      toast({
        title: "Template Deleted",
        description: `Template "${template.name}" has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const getBuildingTypes = () => {
    const types = Array.from(new Set(templates.map(t => t.building_type).filter(Boolean)));
    return types;
  };

  const renderTemplateCard = (template: GeometryTemplate) => (
    <Card 
      key={template.id} 
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => handleSelectTemplate(template)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate">
            {template.name}
          </CardTitle>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {template.is_shared && <Users className="h-3 w-3 text-blue-500" />}
          </div>
        </div>
        {template.building_type && (
          <Badge variant="outline" className="text-xs w-fit">
            {template.building_type}
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Template preview */}
        <div className="mb-3 bg-gray-50 rounded border h-32 overflow-hidden">
          <BuildingGeometryVisualizer
            buildingShape={template.geometry_data.shape_type}
            dimensions={template.geometry_data.dimensions}
            className="h-full"
            interactive={false}
          />
        </div>

        {template.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Used {template.usage_count} times</span>
          <span>{new Date(template.created_at).toLocaleDateString()}</span>
        </div>

        {template.typical_use_cases && template.typical_use_cases.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {template.typical_use_cases.slice(0, 2).map((useCase, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                {useCase}
              </Badge>
            ))}
            {template.typical_use_cases.length > 2 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                +{template.typical_use_cases.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTemplateList = (template: GeometryTemplate) => (
    <Card 
      key={template.id} 
      className="cursor-pointer hover:bg-gray-50 transition-colors p-4"
      onClick={() => handleSelectTemplate(template)}
    >
      <div className="flex items-center gap-4">
        {/* Mini preview */}
        <div className="w-16 h-16 bg-gray-50 rounded border flex-shrink-0">
          <BuildingGeometryVisualizer
            buildingShape={template.geometry_data.shape_type}
            dimensions={template.geometry_data.dimensions}
            className="h-full"
            interactive={false}
          />
        </div>

        {/* Template info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{template.name}</h3>
            {template.building_type && (
              <Badge variant="outline" className="text-xs">
                {template.building_type}
              </Badge>
            )}
            {template.is_shared && <Users className="h-4 w-4 text-blue-500" />}
          </div>
          
          {template.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
              {template.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Used {template.usage_count} times</span>
            <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
            <span>
              {template.geometry_data.total_area?.toLocaleString()} ft²
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTemplate(template);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Building className="h-8 w-8 mx-auto text-gray-400 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Template Library
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-1" />
              New Template
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={buildingTypeFilter} onValueChange={setBuildingTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getBuildingTypes().map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <Building className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <h3 className="font-medium text-gray-900">No templates found</h3>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm || buildingTypeFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first geometry template to get started'
                }
              </p>
            </div>
            {!searchTerm && buildingTypeFilter === 'all' && (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-2'
          }>
            {filteredTemplates.map(template => 
              viewMode === 'grid' 
                ? renderTemplateCard(template)
                : renderTemplateList(template)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TemplateLibrary;