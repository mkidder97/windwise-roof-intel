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
      approval_agencies: {
        Row: {
          agency_name: string
          contact_info: Json | null
          created_at: string | null
          id: string
          jurisdiction_level: string
          requirements: string | null
          state: string | null
          website: string | null
        }
        Insert: {
          agency_name: string
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          jurisdiction_level: string
          requirements?: string | null
          state?: string | null
          website?: string | null
        }
        Update: {
          agency_name?: string
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          jurisdiction_level?: string
          requirements?: string | null
          state?: string | null
          website?: string | null
        }
        Relationships: []
      }
      asce_parameters: {
        Row: {
          alpha_coefficient: number | null
          applicable_terrain: string | null
          created_at: string | null
          edition: string
          exposure_category: string
          exposure_description: string | null
          formula_variations: Json | null
          height_range: string
          id: string
          kz_factor: number
          pressure_coefficients: Json
          state: string | null
          zg_gradient_height: number | null
        }
        Insert: {
          alpha_coefficient?: number | null
          applicable_terrain?: string | null
          created_at?: string | null
          edition: string
          exposure_category: string
          exposure_description?: string | null
          formula_variations?: Json | null
          height_range: string
          id?: string
          kz_factor: number
          pressure_coefficients: Json
          state?: string | null
          zg_gradient_height?: number | null
        }
        Update: {
          alpha_coefficient?: number | null
          applicable_terrain?: string | null
          created_at?: string | null
          edition?: string
          exposure_category?: string
          exposure_description?: string | null
          formula_variations?: Json | null
          height_range?: string
          id?: string
          kz_factor?: number
          pressure_coefficients?: Json
          state?: string | null
          zg_gradient_height?: number | null
        }
        Relationships: []
      }
      building_codes: {
        Row: {
          adoption_date: string | null
          asce_edition: string
          code_edition: string
          created_at: string | null
          id: string
          modifications: Json | null
          state: string
          wind_speed_adjustments: Json | null
        }
        Insert: {
          adoption_date?: string | null
          asce_edition: string
          code_edition: string
          created_at?: string | null
          id?: string
          modifications?: Json | null
          state: string
          wind_speed_adjustments?: Json | null
        }
        Update: {
          adoption_date?: string | null
          asce_edition?: string
          code_edition?: string
          created_at?: string | null
          id?: string
          modifications?: Json | null
          state?: string
          wind_speed_adjustments?: Json | null
        }
        Relationships: []
      }
      calculations: {
        Row: {
          area_dependent_coefficients: boolean | null
          asce_edition: string
          building_height: number
          building_length: number | null
          building_width: number | null
          calculation_method: string
          city: string
          corner_pressure: number | null
          created_at: string | null
          deck_type: string
          directionality_factor: number | null
          exposure_category: string
          field_pressure: number | null
          id: string
          input_parameters: Json
          internal_pressure_included: boolean | null
          jurisdiction: string | null
          max_pressure: number | null
          perimeter_pressure: number | null
          professional_mode: boolean | null
          project_name: string
          requires_pe_validation: boolean | null
          results: Json
          roof_type: string
          selected_systems: string[] | null
          state: string
          topographic_factor: number | null
          updated_at: string | null
          user_id: string | null
          wind_speed: number
        }
        Insert: {
          area_dependent_coefficients?: boolean | null
          asce_edition: string
          building_height: number
          building_length?: number | null
          building_width?: number | null
          calculation_method: string
          city: string
          corner_pressure?: number | null
          created_at?: string | null
          deck_type: string
          directionality_factor?: number | null
          exposure_category: string
          field_pressure?: number | null
          id?: string
          input_parameters: Json
          internal_pressure_included?: boolean | null
          jurisdiction?: string | null
          max_pressure?: number | null
          perimeter_pressure?: number | null
          professional_mode?: boolean | null
          project_name: string
          requires_pe_validation?: boolean | null
          results: Json
          roof_type: string
          selected_systems?: string[] | null
          state: string
          topographic_factor?: number | null
          updated_at?: string | null
          user_id?: string | null
          wind_speed: number
        }
        Update: {
          area_dependent_coefficients?: boolean | null
          asce_edition?: string
          building_height?: number
          building_length?: number | null
          building_width?: number | null
          calculation_method?: string
          city?: string
          corner_pressure?: number | null
          created_at?: string | null
          deck_type?: string
          directionality_factor?: number | null
          exposure_category?: string
          field_pressure?: number | null
          id?: string
          input_parameters?: Json
          internal_pressure_included?: boolean | null
          jurisdiction?: string | null
          max_pressure?: number | null
          perimeter_pressure?: number | null
          professional_mode?: boolean | null
          project_name?: string
          requires_pe_validation?: boolean | null
          results?: Json
          roof_type?: string
          selected_systems?: string[] | null
          state?: string
          topographic_factor?: number | null
          updated_at?: string | null
          user_id?: string | null
          wind_speed?: number
        }
        Relationships: []
      }
      change_detection_log: {
        Row: {
          auto_approved: boolean | null
          change_data: Json
          change_summary: string | null
          change_type: string
          created_at: string | null
          detection_confidence: number | null
          id: string
          monitoring_id: string | null
          page_url: string
          previous_data: Json | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          auto_approved?: boolean | null
          change_data: Json
          change_summary?: string | null
          change_type: string
          created_at?: string | null
          detection_confidence?: number | null
          id?: string
          monitoring_id?: string | null
          page_url: string
          previous_data?: Json | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          auto_approved?: boolean | null
          change_data?: Json
          change_summary?: string | null
          change_type?: string
          created_at?: string | null
          detection_confidence?: number | null
          id?: string
          monitoring_id?: string | null
          page_url?: string
          previous_data?: Json | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_detection_log_monitoring_id_fkey"
            columns: ["monitoring_id"]
            isOneToOne: false
            referencedRelation: "manufacturer_monitoring"
            referencedColumns: ["id"]
          },
        ]
      }
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
      engineering_validations: {
        Row: {
          asce_compliance_verified: boolean | null
          calculation_accuracy_verified: boolean | null
          created_at: string
          digital_seal_hash: string | null
          id: string
          local_code_compliance_verified: boolean | null
          pe_license_number: string | null
          pe_name: string | null
          pe_seal_date: string | null
          pe_state: string | null
          project_id: string | null
          seal_document_url: string | null
          updated_at: string
          validation_notes: string | null
          validation_status: string
          wind_calculation_id: string | null
        }
        Insert: {
          asce_compliance_verified?: boolean | null
          calculation_accuracy_verified?: boolean | null
          created_at?: string
          digital_seal_hash?: string | null
          id?: string
          local_code_compliance_verified?: boolean | null
          pe_license_number?: string | null
          pe_name?: string | null
          pe_seal_date?: string | null
          pe_state?: string | null
          project_id?: string | null
          seal_document_url?: string | null
          updated_at?: string
          validation_notes?: string | null
          validation_status?: string
          wind_calculation_id?: string | null
        }
        Update: {
          asce_compliance_verified?: boolean | null
          calculation_accuracy_verified?: boolean | null
          created_at?: string
          digital_seal_hash?: string | null
          id?: string
          local_code_compliance_verified?: boolean | null
          pe_license_number?: string | null
          pe_name?: string | null
          pe_seal_date?: string | null
          pe_state?: string | null
          project_id?: string | null
          seal_document_url?: string | null
          updated_at?: string
          validation_notes?: string | null
          validation_status?: string
          wind_calculation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engineering_validations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_validations_wind_calculation_id_fkey"
            columns: ["wind_calculation_id"]
            isOneToOne: false
            referencedRelation: "wind_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_pressure_coefficients: {
        Row: {
          asce_edition: string
          building_classification: string
          created_at: string
          enclosure_condition: string | null
          gcpi_negative: number
          gcpi_positive: number
          id: string
          notes: string | null
          table_reference: string | null
        }
        Insert: {
          asce_edition?: string
          building_classification: string
          created_at?: string
          enclosure_condition?: string | null
          gcpi_negative: number
          gcpi_positive: number
          id?: string
          notes?: string | null
          table_reference?: string | null
        }
        Update: {
          asce_edition?: string
          building_classification?: string
          created_at?: string
          enclosure_condition?: string | null
          gcpi_negative?: number
          gcpi_positive?: number
          id?: string
          notes?: string | null
          table_reference?: string | null
        }
        Relationships: []
      }
      local_jurisdictions: {
        Row: {
          city: string | null
          contact_info: Json | null
          county: string | null
          created_at: string | null
          id: string
          jurisdiction_name: string
          requirements: Json | null
          state: string
          website: string | null
        }
        Insert: {
          city?: string | null
          contact_info?: Json | null
          county?: string | null
          created_at?: string | null
          id?: string
          jurisdiction_name: string
          requirements?: Json | null
          state: string
          website?: string | null
        }
        Update: {
          city?: string | null
          contact_info?: Json | null
          county?: string | null
          created_at?: string | null
          id?: string
          jurisdiction_name?: string
          requirements?: Json | null
          state?: string
          website?: string | null
        }
        Relationships: []
      }
      manufacturer_monitoring: {
        Row: {
          created_at: string | null
          id: string
          last_change_detected: string | null
          last_checked: string | null
          manufacturer_name: string
          monitoring_config: Json
          notification_settings: Json
          status: string | null
          updated_at: string | null
          website_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_change_detected?: string | null
          last_checked?: string | null
          manufacturer_name: string
          monitoring_config?: Json
          notification_settings?: Json
          status?: string | null
          updated_at?: string | null
          website_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_change_detected?: string | null
          last_checked?: string | null
          manufacturer_name?: string
          monitoring_config?: Json
          notification_settings?: Json
          status?: string | null
          updated_at?: string | null
          website_url?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          change_id: string | null
          error_message: string | null
          id: string
          notification_type: string
          recipient: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          change_id?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          recipient: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          change_id?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_change_id_fkey"
            columns: ["change_id"]
            isOneToOne: false
            referencedRelation: "change_detection_log"
            referencedColumns: ["id"]
          },
        ]
      }
      pressure_coefficients_asce: {
        Row: {
          asce_edition: string
          building_type: string
          created_at: string
          effective_wind_area_max: number
          effective_wind_area_min: number
          gcp_corner: number
          gcp_field: number
          gcp_perimeter: number
          id: string
          notes: string | null
          roof_type: string
          table_reference: string | null
        }
        Insert: {
          asce_edition?: string
          building_type: string
          created_at?: string
          effective_wind_area_max: number
          effective_wind_area_min: number
          gcp_corner: number
          gcp_field: number
          gcp_perimeter: number
          id?: string
          notes?: string | null
          roof_type: string
          table_reference?: string | null
        }
        Update: {
          asce_edition?: string
          building_type?: string
          created_at?: string
          effective_wind_area_max?: number
          effective_wind_area_min?: number
          gcp_corner?: number
          gcp_field?: number
          gcp_perimeter?: number
          id?: string
          notes?: string | null
          roof_type?: string
          table_reference?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
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
          engineering_validation_status: string | null
          excluded_scopes: string[] | null
          id: string
          insulation_thickness: number | null
          insulation_type: string | null
          pe_seal_required: boolean | null
          penetration_types: string[] | null
          processing_status: string | null
          professional_calculation_type: string | null
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
          engineering_validation_status?: string | null
          excluded_scopes?: string[] | null
          id?: string
          insulation_thickness?: number | null
          insulation_type?: string | null
          pe_seal_required?: boolean | null
          penetration_types?: string[] | null
          processing_status?: string | null
          professional_calculation_type?: string | null
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
          engineering_validation_status?: string | null
          excluded_scopes?: string[] | null
          id?: string
          insulation_thickness?: number | null
          insulation_type?: string | null
          pe_seal_required?: boolean | null
          penetration_types?: string[] | null
          processing_status?: string | null
          professional_calculation_type?: string | null
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
      roof_systems: {
        Row: {
          created_at: string | null
          deck_types: string[]
          description: string | null
          fastener_pattern: string | null
          id: string
          manufacturer: string
          max_wind_pressure: number
          membrane_type: string
          safety_factor: number | null
          system_name: string
          updated_at: string | null
          verification_date: string | null
          verification_notes: string | null
          verified_by_engineer: boolean | null
        }
        Insert: {
          created_at?: string | null
          deck_types: string[]
          description?: string | null
          fastener_pattern?: string | null
          id?: string
          manufacturer: string
          max_wind_pressure: number
          membrane_type: string
          safety_factor?: number | null
          system_name: string
          updated_at?: string | null
          verification_date?: string | null
          verification_notes?: string | null
          verified_by_engineer?: boolean | null
        }
        Update: {
          created_at?: string | null
          deck_types?: string[]
          description?: string | null
          fastener_pattern?: string | null
          id?: string
          manufacturer?: string
          max_wind_pressure?: number
          membrane_type?: string
          safety_factor?: number | null
          system_name?: string
          updated_at?: string | null
          verification_date?: string | null
          verification_notes?: string | null
          verified_by_engineer?: boolean | null
        }
        Relationships: []
      }
      state_approvals: {
        Row: {
          approval_agency: string
          approval_date: string | null
          approval_number: string
          created_at: string | null
          document_url: string | null
          expiration_date: string | null
          id: string
          state: string
          status: string | null
          system_id: string | null
        }
        Insert: {
          approval_agency: string
          approval_date?: string | null
          approval_number: string
          created_at?: string | null
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          state: string
          status?: string | null
          system_id?: string | null
        }
        Update: {
          approval_agency?: string
          approval_date?: string | null
          approval_number?: string
          created_at?: string | null
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          state?: string
          status?: string | null
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "state_approvals_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "roof_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_components: {
        Row: {
          approval_numbers: Json | null
          component_name: string
          component_type: string
          created_at: string | null
          id: string
          manufacturer: string | null
          specifications: Json | null
          system_id: string | null
        }
        Insert: {
          approval_numbers?: Json | null
          component_name: string
          component_type: string
          created_at?: string | null
          id?: string
          manufacturer?: string | null
          specifications?: Json | null
          system_id?: string | null
        }
        Update: {
          approval_numbers?: Json | null
          component_name?: string
          component_type?: string
          created_at?: string | null
          id?: string
          manufacturer?: string | null
          specifications?: Json | null
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_components_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "roof_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_tags: Json | null
          metric_unit: string | null
          metric_value: number
          recorded_at: string | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_tags?: Json | null
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_tags?: Json | null
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      wind_calculations: {
        Row: {
          asce_section_reference: string | null
          calculation_id: string | null
          calculation_method_reference: string | null
          calculation_type: string
          created_at: string
          effective_wind_area: number
          gcp_corner_interpolated: number
          gcp_field_interpolated: number
          gcp_perimeter_interpolated: number
          gcpi_negative: number
          gcpi_positive: number
          height_above_ground: number
          id: string
          internal_pressure_classification: string
          kz_continuous: number
          net_pressure_corner: number
          net_pressure_field: number
          net_pressure_field_prime: number
          net_pressure_perimeter: number
          pressure_corner: number
          pressure_field: number
          pressure_field_prime: number
          pressure_perimeter: number
          requires_pe_seal: boolean
          updated_at: string
        }
        Insert: {
          asce_section_reference?: string | null
          calculation_id?: string | null
          calculation_method_reference?: string | null
          calculation_type: string
          created_at?: string
          effective_wind_area: number
          gcp_corner_interpolated: number
          gcp_field_interpolated: number
          gcp_perimeter_interpolated: number
          gcpi_negative: number
          gcpi_positive: number
          height_above_ground: number
          id?: string
          internal_pressure_classification: string
          kz_continuous: number
          net_pressure_corner: number
          net_pressure_field: number
          net_pressure_field_prime: number
          net_pressure_perimeter: number
          pressure_corner: number
          pressure_field: number
          pressure_field_prime: number
          pressure_perimeter: number
          requires_pe_seal?: boolean
          updated_at?: string
        }
        Update: {
          asce_section_reference?: string | null
          calculation_id?: string | null
          calculation_method_reference?: string | null
          calculation_type?: string
          created_at?: string
          effective_wind_area?: number
          gcp_corner_interpolated?: number
          gcp_field_interpolated?: number
          gcp_perimeter_interpolated?: number
          gcpi_negative?: number
          gcpi_positive?: number
          height_above_ground?: number
          id?: string
          internal_pressure_classification?: string
          kz_continuous?: number
          net_pressure_corner?: number
          net_pressure_field?: number
          net_pressure_field_prime?: number
          net_pressure_perimeter?: number
          pressure_corner?: number
          pressure_field?: number
          pressure_field_prime?: number
          pressure_perimeter?: number
          requires_pe_seal?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wind_calculations_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      wind_speeds: {
        Row: {
          asce_edition: string
          city: string
          county: string | null
          created_at: string | null
          id: string
          local_modifications: Json | null
          risk_category: string | null
          state: string
          updated_at: string | null
          wind_speed: number
        }
        Insert: {
          asce_edition?: string
          city: string
          county?: string | null
          created_at?: string | null
          id?: string
          local_modifications?: Json | null
          risk_category?: string | null
          state: string
          updated_at?: string | null
          wind_speed: number
        }
        Update: {
          asce_edition?: string
          city?: string
          county?: string | null
          created_at?: string | null
          id?: string
          local_modifications?: Json | null
          risk_category?: string | null
          state?: string
          updated_at?: string | null
          wind_speed?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_data_quality: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          validation_rule: string
          total_records: number
          valid_records: number
          completion_percentage: number
        }[]
      }
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
