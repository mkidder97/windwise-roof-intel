import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeometryTemplate {
  id?: string;
  name: string;
  description?: string;
  geometry_data: any;
  thumbnail_url?: string;
  building_type?: string;
  typical_use_cases?: string[];
  user_id?: string;
  is_shared?: boolean;
  usage_count?: number;
}

export const useGeometryTemplates = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const saveTemplate = useCallback(async (template: GeometryTemplate) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be logged in to save templates');
      }

      const templateData = {
        ...template,
        user_id: user.id,
        usage_count: 0
      };

      const { data, error } = await supabase
        .from('geometry_templates')
        .insert([templateData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template Saved",
        description: `Template "${template.name}" has been saved successfully`,
      });

      return data;
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : 'Failed to save template',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadTemplates = useCallback(async (userId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('geometry_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (userId) {
        query = query.or(`user_id.eq.${userId},is_shared.eq.true`);
      } else {
        query = query.eq('is_shared', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load templates",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<GeometryTemplate>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('geometry_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template Updated",
        description: "Template has been updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update template",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteTemplate = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('geometry_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete template",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const shareTemplate = useCallback(async (id: string, isShared: boolean = true) => {
    return updateTemplate(id, { is_shared: isShared });
  }, [updateTemplate]);

  const incrementUsage = useCallback(async (id: string) => {
    try {
      // Get current usage count
      const { data: template, error: fetchError } = await supabase
        .from('geometry_templates')
        .select('usage_count')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Increment usage count
      const { error: updateError } = await supabase
        .from('geometry_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', id);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      // Don't show toast for usage increment failures as it's non-critical
    }
  }, []);

  return {
    loading,
    saveTemplate,
    loadTemplates,
    updateTemplate,
    deleteTemplate,
    shareTemplate,
    incrementUsage
  };
};

export default useGeometryTemplates;