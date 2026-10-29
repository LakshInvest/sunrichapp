export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          company_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: number
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          code: string
          color_hex: string | null
          company_id: string
          created_at: string
          created_by: string | null
          default_firm_id: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          name_hi: string | null
          name_mr: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          color_hex?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          default_firm_id?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          color_hex?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_firm_id?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_default_firm_id_fkey"
            columns: ["default_firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          name_hi: string | null
          name_mr: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      firms: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean
          legal_name: string
          pan: string | null
          phone: string | null
          pincode: string | null
          short_name: string | null
          state: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          legal_name: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          short_name?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          short_name?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_requests: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["otp_channel"]
          code_hash: string
          consumed_at: string | null
          created_at: string
          destination: string
          expires_at: string
          id: string
          ip_address: string | null
          max_attempts: number
          purpose: Database["public"]["Enums"]["otp_purpose"]
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number
          channel: Database["public"]["Enums"]["otp_channel"]
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          destination: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          max_attempts?: number
          purpose: Database["public"]["Enums"]["otp_purpose"]
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["otp_channel"]
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          destination?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          max_attempts?: number
          purpose?: Database["public"]["Enums"]["otp_purpose"]
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      units: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          firm_id: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          name_hi: string | null
          name_mr: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          firm_id: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          firm_id?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          firm_id: string | null
          full_name: string
          id: string
          is_active: boolean
          is_super_admin: boolean
          last_login_at: string | null
          mobile: string | null
          photo_url: string | null
          preferred_language: string
          unit_id: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          firm_id?: string | null
          full_name: string
          id: string
          is_active?: boolean
          is_super_admin?: boolean
          last_login_at?: string | null
          mobile?: string | null
          photo_url?: string | null
          preferred_language?: string
          unit_id?: string | null
          updated_at?: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          firm_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_super_admin?: boolean
          last_login_at?: string | null
          mobile?: string | null
          photo_url?: string | null
          preferred_language?: string
          unit_id?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          ip_address: string | null
          last_seen_at: string
          otp_verified_at: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          session_id: string
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ip_address?: string | null
          last_seen_at?: string
          otp_verified_at?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id: string
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ip_address?: string | null
          last_seen_at?: string
          otp_verified_at?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_id?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_session_id: { Args: never; Returns: string }
      force_logout: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: number
      }
      is_super_admin: { Args: never; Returns: boolean }
      my_company_id: { Args: never; Returns: string }
      my_session_is_valid: { Args: never; Returns: boolean }
      my_staff_session_verified: { Args: never; Returns: boolean }
      record_login: { Args: { p_user_agent?: string }; Returns: undefined }
      record_logout: { Args: never; Returns: undefined }
      set_user_active: {
        Args: { p_active: boolean; p_user_id: string }
        Returns: undefined
      }
      update_my_profile: {
        Args: { p_full_name: string; p_language?: string; p_photo_url?: string }
        Returns: undefined
      }
    }
    Enums: {
      otp_channel: "whatsapp" | "email"
      otp_purpose: "app_login" | "staff_2fa"
      unit_type: "plant" | "depot" | "copacker" | "jar_unit" | "office"
      user_type: "staff" | "customer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      otp_channel: ["whatsapp", "email"],
      otp_purpose: ["app_login", "staff_2fa"],
      unit_type: ["plant", "depot", "copacker", "jar_unit", "office"],
      user_type: ["staff", "customer"],
    },
  },
} as const
