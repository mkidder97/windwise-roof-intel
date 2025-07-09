export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      daily_stats: {
        Row: {
          avg_processing_time_seconds: number | null
          completed_projects: number | null
          created_at: string | null
          date: string | null
          id: string
          total_projects: number | null
        }
        Insert: {
          avg_processing_time_seconds?: number | null
          completed_projects?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          total_projects?: number | null
        }
        Update: {
          avg_processing_time_seconds?: number | null
          completed_projects?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          total_projects?: number | null
        }
        Relationships: []
      }
      project_status_log: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          message: string | null
          project_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string | null
          project_id?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string | null
          project_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_status_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          clarification_notes: string | null
          client_name: string | null
          client_requirements: string
          code_requirements: string
          completed_at: string | null
          coping_condition: string | null
          created_at: string | null
          deck_type: string
          design_wind_speed: number | null
          document_file_size: number | null
          document_page_count: number | null
          document_url: string | null
          drain_type: string | null
          edge_metal_conditions: string | null
          excluded_scopes: string[] | null
          id: string
          insulation_thickness: number | null
          insulation_type: string | null
          penetration_types: string[] | null
          processing_status: string | null
          project_id: string
          project_type: string
          property_manager_email: string
          property_manager_name: string
          property_manager_phone: string | null
          qa_status: string | null
          requires_engineering: boolean | null
          requires_manual_review: boolean | null
          roof_type: string
          safety_notes: string | null
          sheet_metal_type: string | null
          submitted_at: string | null
          template_selected: string | null
          updated_at: string | null
          walkpad_requirement: string | null
          warranty_details: string | null
          wind_pressure: number | null
          wind_zone: string | null
          wood_nailers_present: string | null
        }
        Insert: {
          clarification_notes?: string | null
          client_name?: string | null
          client_requirements: string
          code_requirements: string
          completed_at?: string | null
          coping_condition?: string | null
          created_at?: string | null
          deck_type: string
          design_wind_speed?: number | null
          document_file_size?: number | null
          document_page_count?: number | null
          document_url?: string | null
          drain_type?: string | null
          edge_metal_conditions?: string | null
          excluded_scopes?: string[] | null
          id?: string
          insulation_thickness?: number | null
          insulation_type?: string | null
          penetration_types?: string[] | null
          processing_status?: string | null
          project_id: string
          project_type: string
          property_manager_email: string
          property_manager_name: string
          property_manager_phone?: string | null
          qa_status?: string | null
          requires_engineering?: boolean | null
          requires_manual_review?: boolean | null
          roof_type: string
          safety_notes?: string | null
          sheet_metal_type?: string | null
          submitted_at?: string | null
          template_selected?: string | null
          updated_at?: string | null
          walkpad_requirement?: string | null
          warranty_details?: string | null
          wind_pressure?: number | null
          wind_zone?: string | null
          wood_nailers_present?: string | null
        }
        Update: {
          clarification_notes?: string | null
          client_name?: string | null
          client_requirements?: string
          code_requirements?: string
          completed_at?: string | null
          coping_condition?: string | null
          created_at?: string | null
          deck_type?: string
          design_wind_speed?: number | null
          document_file_size?: number | null
          document_page_count?: number | null
          document_url?: string | null
          drain_type?: string | null
          edge_metal_conditions?: string | null
          excluded_scopes?: string[] | null
          id?: string
          insulation_thickness?: number | null
          insulation_type?: string | null
          penetration_types?: string[] | null
          processing_status?: string | null
          project_id?: string
          project_type?: string
          property_manager_email?: string
          property_manager_name?: string
          property_manager_phone?: string | null
          qa_status?: string | null
          requires_engineering?: boolean | null
          requires_manual_review?: boolean | null
          roof_type?: string
          safety_notes?: string | null
          sheet_metal_type?: string | null
          submitted_at?: string | null
          template_selected?: string | null
          updated_at?: string | null
          walkpad_requirement?: string | null
          warranty_details?: string | null
          wind_pressure?: number | null
          wind_zone?: string | null
          wood_nailers_present?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
