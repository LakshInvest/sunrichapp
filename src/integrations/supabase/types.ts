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
      app_banners: {
        Row: {
          company_id: string
          created_at: string
          customer_type_ids: string[] | null
          end_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_type: string
          link_value: string | null
          sort_order: number
          start_at: string | null
          subtitle: string | null
          subtitle_hi: string | null
          subtitle_mr: string | null
          tag: string | null
          tag_hi: string | null
          tag_mr: string | null
          title: string
          title_hi: string | null
          title_mr: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_type_ids?: string[] | null
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_type?: string
          link_value?: string | null
          sort_order?: number
          start_at?: string | null
          subtitle?: string | null
          subtitle_hi?: string | null
          subtitle_mr?: string | null
          tag?: string | null
          tag_hi?: string | null
          tag_mr?: string | null
          title: string
          title_hi?: string | null
          title_mr?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_type_ids?: string[] | null
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_type?: string
          link_value?: string | null
          sort_order?: number
          start_at?: string | null
          subtitle?: string | null
          subtitle_hi?: string | null
          subtitle_mr?: string | null
          tag?: string | null
          tag_hi?: string | null
          tag_mr?: string | null
          title?: string
          title_hi?: string | null
          title_mr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_banners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_hero: {
        Row: {
          background_image_url: string | null
          company_id: string
          delivery_line: string | null
          delivery_line_hi: string | null
          delivery_line_mr: string | null
          greeting: string | null
          greeting_hi: string | null
          greeting_mr: string | null
          product_image_url: string | null
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          company_id: string
          delivery_line?: string | null
          delivery_line_hi?: string | null
          delivery_line_mr?: string | null
          greeting?: string | null
          greeting_hi?: string | null
          greeting_mr?: string | null
          product_image_url?: string | null
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          company_id?: string
          delivery_line?: string | null
          delivery_line_hi?: string | null
          delivery_line_mr?: string | null
          greeting?: string | null
          greeting_hi?: string | null
          greeting_mr?: string | null
          product_image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_hero_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_home_sections: {
        Row: {
          company_id: string
          is_active: boolean
          key: string
          sort_order: number
        }
        Insert: {
          company_id: string
          is_active?: boolean
          key: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          is_active?: boolean
          key?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_home_sections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
          description: string | null
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
          description?: string | null
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
          description?: string | null
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
      customer_documents: {
        Row: {
          created_at: string
          customer_id: string
          doc_number: string | null
          document_type_id: string
          file_name: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          reject_reason: string | null
          status: string
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          doc_number?: string | null
          document_type_id: string
          file_name?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          reject_reason?: string | null
          status?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          doc_number?: string | null
          document_type_id?: string
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          reject_reason?: string | null
          status?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favourites: {
        Row: {
          created_at: string
          customer_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favourites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favourites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_queries: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          context: string
          created_at: string
          customer_id: string
          id: string
          raised_by: string | null
          status: Database["public"]["Enums"]["query_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          context?: string
          created_at?: string
          customer_id: string
          id?: string
          raised_by?: string | null
          status?: Database["public"]["Enums"]["query_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          context?: string
          created_at?: string
          customer_id?: string
          id?: string
          raised_by?: string | null
          status?: Database["public"]["Enums"]["query_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_queries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_queries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_query_messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          body: string | null
          created_at: string
          id: string
          query_id: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string | null
          created_at?: string
          id?: string
          query_id: string
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string | null
          created_at?: string
          id?: string
          query_id?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_query_messages_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "customer_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_type_documents: {
        Row: {
          customer_type_id: string
          document_type_id: string
          one_of_group: string | null
          requirement: Database["public"]["Enums"]["doc_requirement"]
          sort_order: number
        }
        Insert: {
          customer_type_id: string
          document_type_id: string
          one_of_group?: string | null
          requirement?: Database["public"]["Enums"]["doc_requirement"]
          sort_order?: number
        }
        Update: {
          customer_type_id?: string
          document_type_id?: string
          one_of_group?: string | null
          requirement?: Database["public"]["Enums"]["doc_requirement"]
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_type_documents_customer_type_id_fkey"
            columns: ["customer_type_id"]
            isOneToOne: false
            referencedRelation: "customer_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_type_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_types: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          default_price_plan_id: string | null
          description: string | null
          description_hi: string | null
          description_mr: string | null
          icon_key: string | null
          id: string
          is_active: boolean
          name: string
          name_hi: string | null
          name_mr: string | null
          requires_approval: boolean
          requires_gps: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          default_price_plan_id?: string | null
          description?: string | null
          description_hi?: string | null
          description_mr?: string | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_hi?: string | null
          name_mr?: string | null
          requires_approval?: boolean
          requires_gps?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_price_plan_id?: string | null
          description?: string | null
          description_hi?: string | null
          description_mr?: string | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          requires_approval?: boolean
          requires_gps?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_types_default_price_plan_id_fkey"
            columns: ["default_price_plan_id"]
            isOneToOne: false
            referencedRelation: "price_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string
          address_line2: string | null
          approved_at: string | null
          approved_by: string | null
          business_name: string | null
          city: string | null
          company_id: string
          contact_name: string
          created_at: string
          created_by: string | null
          customer_code: string
          customer_type_id: string
          email: string | null
          gstin: string | null
          id: string
          landmark: string | null
          latitude: number | null
          location_accuracy_m: number | null
          longitude: number | null
          mobile: string
          pincode: string | null
          price_plan_id: string | null
          registered_via: string
          rejection_reason: string | null
          state: string | null
          status: Database["public"]["Enums"]["customer_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string | null
          city?: string | null
          company_id: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          customer_code?: string
          customer_type_id: string
          email?: string | null
          gstin?: string | null
          id?: string
          landmark?: string | null
          latitude?: number | null
          location_accuracy_m?: number | null
          longitude?: number | null
          mobile: string
          pincode?: string | null
          price_plan_id?: string | null
          registered_via?: string
          rejection_reason?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string | null
          city?: string | null
          company_id?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          customer_code?: string
          customer_type_id?: string
          email?: string | null
          gstin?: string | null
          id?: string
          landmark?: string | null
          latitude?: number | null
          location_accuracy_m?: number | null
          longitude?: number | null
          mobile?: string
          pincode?: string | null
          price_plan_id?: string | null
          registered_via?: string
          rejection_reason?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_customer_type_id_fkey"
            columns: ["customer_type_id"]
            isOneToOne: false
            referencedRelation: "customer_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_price_plan_id_fkey"
            columns: ["price_plan_id"]
            isOneToOne: false
            referencedRelation: "price_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      document_series: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          doc_type: Database["public"]["Enums"]["doc_series_type"]
          financial_year: string
          firm_id: string
          id: string
          is_active: boolean
          next_number: number
          padding: number
          prefix: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          doc_type: Database["public"]["Enums"]["doc_series_type"]
          financial_year: string
          firm_id: string
          id?: string
          is_active?: boolean
          next_number?: number
          padding?: number
          prefix: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          doc_type?: Database["public"]["Enums"]["doc_series_type"]
          financial_year?: string
          firm_id?: string
          id?: string
          is_active?: boolean
          next_number?: number
          padding?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_series_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_series_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          accepts_image: boolean
          accepts_pdf: boolean
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          has_number: boolean
          id: string
          is_active: boolean
          name: string
          name_hi: string | null
          name_mr: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          accepts_image?: boolean
          accepts_pdf?: boolean
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          has_number?: boolean
          id?: string
          is_active?: boolean
          name: string
          name_hi?: string | null
          name_mr?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accepts_image?: boolean
          accepts_pdf?: boolean
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          has_number?: boolean
          id?: string
          is_active?: boolean
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch: string | null
          company_id: string
          created_at: string
          created_by: string | null
          firm_id: string
          id: string
          ifsc: string
          is_active: boolean
          is_default: boolean
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          firm_id: string
          id?: string
          ifsc: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          firm_id?: string
          id?: string
          ifsc?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_bank_accounts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          cin_number: string | null
          city: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          fssai_number: string | null
          gstin: string | null
          id: string
          invoice_terms: string | null
          is_active: boolean
          latitude: number | null
          legal_name: string
          logo_url: string | null
          longitude: number | null
          pan: string | null
          phone: string | null
          pincode: string | null
          short_name: string | null
          signatory_name: string | null
          signature_url: string | null
          state: string | null
          state_code: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          cin_number?: string | null
          city?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          fssai_number?: string | null
          gstin?: string | null
          id?: string
          invoice_terms?: string | null
          is_active?: boolean
          latitude?: number | null
          legal_name: string
          logo_url?: string | null
          longitude?: number | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          short_name?: string | null
          signatory_name?: string | null
          signature_url?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          cin_number?: string | null
          city?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          fssai_number?: string | null
          gstin?: string | null
          id?: string
          invoice_terms?: string | null
          is_active?: boolean
          latitude?: number | null
          legal_name?: string
          logo_url?: string | null
          longitude?: number | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          short_name?: string | null
          signatory_name?: string | null
          signature_url?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
          website?: string | null
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
      price_plan_items: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          price: number
          price_plan_id: string
          product_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          price: number
          price_plan_id: string
          product_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          price?: number
          price_plan_id?: string
          product_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_plan_items_price_plan_id_fkey"
            columns: ["price_plan_id"]
            isOneToOne: false
            referencedRelation: "price_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_plan_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_plans: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          name_hi: string | null
          name_mr: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          icon_key: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          name_hi: string | null
          name_mr: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          name_hi?: string | null
          name_mr?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string
          bulk_threshold_qty: number | null
          category_id: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          deposit_amount: number
          description: string | null
          description_hi: string | null
          description_mr: string | null
          factory_only: boolean
          firm_id: string
          gst_rate: number
          hsn_code: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_popular: boolean
          is_returnable: boolean
          max_order_qty: number | null
          min_order_qty: number
          mrp: number | null
          name: string
          name_hi: string | null
          name_mr: string | null
          pack_label: string | null
          pack_label_hi: string | null
          pack_label_mr: string | null
          sell_unit: Database["public"]["Enums"]["sell_unit"]
          shelf_life_days: number | null
          show_in_app: boolean
          sort_order: number
          track_batch: boolean
          track_expiry: boolean
          units_per_sell_unit: number
          updated_at: string
          volume_ml: number | null
          weight_kg: number | null
        }
        Insert: {
          brand_id: string
          bulk_threshold_qty?: number | null
          category_id?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deposit_amount?: number
          description?: string | null
          description_hi?: string | null
          description_mr?: string | null
          factory_only?: boolean
          firm_id: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          is_returnable?: boolean
          max_order_qty?: number | null
          min_order_qty?: number
          mrp?: number | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          pack_label?: string | null
          pack_label_hi?: string | null
          pack_label_mr?: string | null
          sell_unit?: Database["public"]["Enums"]["sell_unit"]
          shelf_life_days?: number | null
          show_in_app?: boolean
          sort_order?: number
          track_batch?: boolean
          track_expiry?: boolean
          units_per_sell_unit?: number
          updated_at?: string
          volume_ml?: number | null
          weight_kg?: number | null
        }
        Update: {
          brand_id?: string
          bulk_threshold_qty?: number | null
          category_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deposit_amount?: number
          description?: string | null
          description_hi?: string | null
          description_mr?: string | null
          factory_only?: boolean
          firm_id?: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          is_returnable?: boolean
          max_order_qty?: number | null
          min_order_qty?: number
          mrp?: number | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          pack_label?: string | null
          pack_label_hi?: string | null
          pack_label_mr?: string | null
          sell_unit?: Database["public"]["Enums"]["sell_unit"]
          shelf_life_days?: number | null
          show_in_app?: boolean
          sort_order?: number
          track_batch?: boolean
          track_expiry?: boolean
          units_per_sell_unit?: number
          updated_at?: string
          volume_ml?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string
          company_id: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          daily_capacity: number | null
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
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          daily_capacity?: number | null
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
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          daily_capacity?: number | null
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
      user_devices: {
        Row: {
          device_id: string
          device_label: string | null
          id: string
          last_used_at: string | null
          revoked_at: string | null
          trusted_at: string
          user_id: string
        }
        Insert: {
          device_id: string
          device_label?: string | null
          id?: string
          last_used_at?: string | null
          revoked_at?: string | null
          trusted_at?: string
          user_id: string
        }
        Update: {
          device_id?: string
          device_label?: string | null
          id?: string
          last_used_at?: string | null
          revoked_at?: string | null
          trusted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pins: {
        Row: {
          created_at: string
          failed_attempts: number
          last_used_at: string | null
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          last_used_at?: string | null
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          last_used_at?: string | null
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
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
          customer_id?: string | null
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
          customer_id?: string | null
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
            foreignKeyName: "user_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
          login_method: string | null
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
          login_method?: string | null
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
          login_method?: string | null
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
      add_customer_document: {
        Args: {
          p_doc_number?: string
          p_document_type_code: string
          p_file_name?: string
          p_file_path: string
          p_file_size?: number
          p_mime_type?: string
        }
        Returns: string
      }
      admin_add_customer_document: {
        Args: {
          p_customer_id: string
          p_doc_number?: string
          p_document_type_code: string
          p_file_name?: string
          p_file_path: string
          p_file_size?: number
          p_mime_type?: string
        }
        Returns: string
      }
      admin_create_customer: {
        Args: {
          p_address_line1: string
          p_address_line2?: string
          p_business_name?: string
          p_city?: string
          p_contact_name: string
          p_customer_type_code: string
          p_email?: string
          p_gstin?: string
          p_landmark?: string
          p_latitude?: number
          p_longitude?: number
          p_mobile: string
          p_pincode?: string
          p_state?: string
        }
        Returns: string
      }
      admin_raise_query: {
        Args: {
          p_context?: string
          p_customer_id: string
          p_message: string
          p_subject: string
        }
        Returns: string
      }
      approve_customer: { Args: { p_customer_id: string }; Returns: undefined }
      check_pin: {
        Args: {
          p_device_id: string
          p_mobile: string
          p_pin: string
          p_user_type?: string
        }
        Returns: {
          out_result: string
          out_user_id: string
        }[]
      }
      close_query: { Args: { p_query_id: string }; Returns: undefined }
      current_session_id: { Args: never; Returns: string }
      customer_raise_query: {
        Args: {
          p_attachment_name?: string
          p_attachment_path?: string
          p_context?: string
          p_message: string
          p_subject: string
        }
        Returns: string
      }
      force_logout: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: number
      }
      is_staff: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      my_catalogue: {
        Args: never
        Returns: {
          brand_name: string
          bulk_threshold_qty: number
          can_order: boolean
          category_code: string
          category_id: string
          code: string
          deposit_amount: number
          description: string
          description_hi: string
          description_mr: string
          gst_rate: number
          id: string
          image_url: string
          images: string[]
          is_favourite: boolean
          is_popular: boolean
          is_returnable: boolean
          max_order_qty: number
          min_order_qty: number
          mrp: number
          name: string
          name_hi: string
          name_mr: string
          pack_label: string
          pack_label_hi: string
          pack_label_mr: string
          price: number
          sell_unit: string
          sort_order: number
          units_per_sell_unit: number
          volume_ml: number
        }[]
      }
      my_company_id: { Args: never; Returns: string }
      my_customer_can_edit: { Args: never; Returns: boolean }
      my_customer_id: { Args: never; Returns: string }
      my_session_is_valid: { Args: never; Returns: boolean }
      my_staff_session_verified: { Args: never; Returns: boolean }
      next_document_number: {
        Args: {
          p_date?: string
          p_doc_type: Database["public"]["Enums"]["doc_series_type"]
          p_firm_id: string
        }
        Returns: string
      }
      plan_price: {
        Args: { p_on?: string; p_plan_id: string; p_product_id: string }
        Returns: number
      }
      price_plan_for_customer: {
        Args: { p_customer_id: string }
        Returns: string
      }
      price_preview: {
        Args: { p_customer_id: string; p_on?: string }
        Returns: {
          code: string
          mrp: number
          name: string
          plan_name: string
          price: number
          product_id: string
        }[]
      }
      record_login: {
        Args: { p_login_method?: string; p_user_agent?: string }
        Returns: undefined
      }
      record_logout: { Args: never; Returns: undefined }
      reject_customer: {
        Args: { p_customer_id: string; p_reason: string }
        Returns: undefined
      }
      reply_query: {
        Args: {
          p_attachment_name?: string
          p_attachment_path?: string
          p_message?: string
          p_query_id: string
        }
        Returns: undefined
      }
      revoke_user_devices: { Args: { p_user_id: string }; Returns: number }
      set_my_pin: {
        Args: { p_device_id: string; p_device_label?: string; p_pin: string }
        Returns: undefined
      }
      set_user_active: {
        Args: { p_active: boolean; p_user_id: string }
        Returns: undefined
      }
      start_registration: {
        Args: {
          p_address_line1: string
          p_address_line2?: string
          p_business_name?: string
          p_city?: string
          p_contact_name: string
          p_customer_type_code: string
          p_email?: string
          p_gstin?: string
          p_landmark?: string
          p_latitude?: number
          p_location_accuracy_m?: number
          p_longitude?: number
          p_pincode?: string
          p_state?: string
        }
        Returns: string
      }
      submit_registration: { Args: never; Returns: undefined }
      toggle_favourite: { Args: { p_product_id: string }; Returns: boolean }
      update_my_profile: {
        Args: { p_full_name: string; p_language?: string; p_photo_url?: string }
        Returns: undefined
      }
    }
    Enums: {
      customer_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "rejected"
        | "blocked"
      doc_requirement: "required" | "optional" | "one_of"
      doc_series_type:
        | "tax_invoice"
        | "delivery_challan"
        | "credit_note"
        | "debit_note"
        | "receipt"
        | "gate_pass"
        | "order"
      otp_channel: "whatsapp" | "email"
      otp_purpose: "app_login" | "staff_2fa"
      query_status: "open" | "answered" | "closed"
      sell_unit: "piece" | "pack" | "case" | "crate" | "jar" | "can"
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
      customer_status: [
        "draft",
        "pending_approval",
        "active",
        "rejected",
        "blocked",
      ],
      doc_requirement: ["required", "optional", "one_of"],
      doc_series_type: [
        "tax_invoice",
        "delivery_challan",
        "credit_note",
        "debit_note",
        "receipt",
        "gate_pass",
        "order",
      ],
      otp_channel: ["whatsapp", "email"],
      otp_purpose: ["app_login", "staff_2fa"],
      query_status: ["open", "answered", "closed"],
      sell_unit: ["piece", "pack", "case", "crate", "jar", "can"],
      unit_type: ["plant", "depot", "copacker", "jar_unit", "office"],
      user_type: ["staff", "customer"],
    },
  },
} as const
