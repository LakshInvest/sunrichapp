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
          display_seconds: number
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
          display_seconds?: number
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
          display_seconds?: number
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
      app_settings: {
        Row: {
          about_text: string | null
          about_text_hi: string | null
          about_text_mr: string | null
          all_category_image_url: string | null
          allow_cancel_before: string
          allow_order_notes: boolean
          auto_plan_last_date: string | null
          closed_weekdays: number[]
          company_id: string
          default_gst_rate: number
          delivery_charge_per_pack: number
          delivery_days_ahead: number
          delivery_slots: Json
          feedback_enabled: boolean
          google_routes_enabled: boolean
          google_routes_min_stops: number
          holidays: string[]
          latest_app_version: string
          launch_image_url: string | null
          login_image_url: string | null
          login_tagline: string | null
          login_tagline_hi: string | null
          login_tagline_mr: string | null
          maintenance_message: string | null
          min_app_version: string
          min_order_value: number
          multiple_addresses: boolean
          pickup_hours: string | null
          pickup_hours_hi: string | null
          pickup_hours_mr: string | null
          plan_time: string
          plant_address: string | null
          plant_address_hi: string | null
          plant_address_mr: string | null
          play_store_url: string | null
          prices_include_gst: boolean
          privacy_md: string | null
          privacy_url: string | null
          same_day_cutoff: string
          show_jar_balance: boolean
          support_email: string | null
          support_hours: string | null
          support_phone: string | null
          support_whatsapp: string | null
          terms_md: string | null
          terms_url: string | null
          trip_overdue_hours: number
          trip_overdue_time: string
          updated_at: string
          updated_by: string | null
          verify_new_customer_payment: boolean
          verify_payment_above: number
        }
        Insert: {
          about_text?: string | null
          about_text_hi?: string | null
          about_text_mr?: string | null
          all_category_image_url?: string | null
          allow_cancel_before?: string
          allow_order_notes?: boolean
          auto_plan_last_date?: string | null
          closed_weekdays?: number[]
          company_id: string
          default_gst_rate?: number
          delivery_charge_per_pack?: number
          delivery_days_ahead?: number
          delivery_slots?: Json
          feedback_enabled?: boolean
          google_routes_enabled?: boolean
          google_routes_min_stops?: number
          holidays?: string[]
          latest_app_version?: string
          launch_image_url?: string | null
          login_image_url?: string | null
          login_tagline?: string | null
          login_tagline_hi?: string | null
          login_tagline_mr?: string | null
          maintenance_message?: string | null
          min_app_version?: string
          min_order_value?: number
          multiple_addresses?: boolean
          pickup_hours?: string | null
          pickup_hours_hi?: string | null
          pickup_hours_mr?: string | null
          plan_time?: string
          plant_address?: string | null
          plant_address_hi?: string | null
          plant_address_mr?: string | null
          play_store_url?: string | null
          prices_include_gst?: boolean
          privacy_md?: string | null
          privacy_url?: string | null
          same_day_cutoff?: string
          show_jar_balance?: boolean
          support_email?: string | null
          support_hours?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          terms_md?: string | null
          terms_url?: string | null
          trip_overdue_hours?: number
          trip_overdue_time?: string
          updated_at?: string
          updated_by?: string | null
          verify_new_customer_payment?: boolean
          verify_payment_above?: number
        }
        Update: {
          about_text?: string | null
          about_text_hi?: string | null
          about_text_mr?: string | null
          all_category_image_url?: string | null
          allow_cancel_before?: string
          allow_order_notes?: boolean
          auto_plan_last_date?: string | null
          closed_weekdays?: number[]
          company_id?: string
          default_gst_rate?: number
          delivery_charge_per_pack?: number
          delivery_days_ahead?: number
          delivery_slots?: Json
          feedback_enabled?: boolean
          google_routes_enabled?: boolean
          google_routes_min_stops?: number
          holidays?: string[]
          latest_app_version?: string
          launch_image_url?: string | null
          login_image_url?: string | null
          login_tagline?: string | null
          login_tagline_hi?: string | null
          login_tagline_mr?: string | null
          maintenance_message?: string | null
          min_app_version?: string
          min_order_value?: number
          multiple_addresses?: boolean
          pickup_hours?: string | null
          pickup_hours_hi?: string | null
          pickup_hours_mr?: string | null
          plan_time?: string
          plant_address?: string | null
          plant_address_hi?: string | null
          plant_address_mr?: string | null
          play_store_url?: string | null
          prices_include_gst?: boolean
          privacy_md?: string | null
          privacy_url?: string | null
          same_day_cutoff?: string
          show_jar_balance?: boolean
          support_email?: string | null
          support_hours?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          terms_md?: string | null
          terms_url?: string | null
          trip_overdue_hours?: number
          trip_overdue_time?: string
          updated_at?: string
          updated_by?: string | null
          verify_new_customer_payment?: boolean
          verify_payment_above?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
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
      cash_book_openings: {
        Row: {
          amount: number
          as_of: string
          company_id: string
          created_at: string
          set_by: string | null
        }
        Insert: {
          amount: number
          as_of: string
          company_id: string
          created_at?: string
          set_by?: string | null
        }
        Update: {
          amount?: number
          as_of?: string
          company_id?: string
          created_at?: string
          set_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_book_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_deposits: {
        Row: {
          amount: number
          bank_account_id: string | null
          company_id: string
          created_at: string
          deposit_date: string
          deposited_by: string | null
          firm_id: string | null
          id: string
          note: string | null
          slip_path: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          company_id: string
          created_at?: string
          deposit_date?: string
          deposited_by?: string | null
          firm_id?: string | null
          id?: string
          note?: string | null
          slip_path?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          company_id?: string
          created_at?: string
          deposit_date?: string
          deposited_by?: string | null
          firm_id?: string | null
          id?: string
          note?: string | null
          slip_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_deposits_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "firm_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_deposits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_deposits_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_handovers: {
        Row: {
          amount: number
          company_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          from_user_id: string
          handover_date: string
          id: string
          mismatch_at: string | null
          mismatch_reason: string | null
          note: string | null
          received_amount: number | null
          to_user_id: string
          trip_id: string | null
        }
        Insert: {
          amount: number
          company_id: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_user_id: string
          handover_date?: string
          id?: string
          mismatch_at?: string | null
          mismatch_reason?: string | null
          note?: string | null
          received_amount?: number | null
          to_user_id: string
          trip_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_user_id?: string
          handover_date?: string
          id?: string
          mismatch_at?: string | null
          mismatch_reason?: string | null
          note?: string | null
          received_amount?: number | null
          to_user_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_handovers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_handovers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_handovers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_handovers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ops: {
        Row: {
          created_at: string
          id: string
          result: Json | null
          rpc: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          result?: Json | null
          rpc: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          result?: Json | null
          rpc?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          brand_accent: string
          brand_primary: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          logo_mark_url: string | null
          logo_on_dark_url: string | null
          logo_on_light_url: string | null
          logo_url: string | null
          name: string
          name_hi: string | null
          name_mr: string | null
          updated_at: string
        }
        Insert: {
          brand_accent?: string
          brand_primary?: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_mark_url?: string | null
          logo_on_dark_url?: string | null
          logo_on_light_url?: string | null
          logo_url?: string | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Update: {
          brand_accent?: string
          brand_primary?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          logo_mark_url?: string | null
          logo_on_dark_url?: string | null
          logo_on_light_url?: string | null
          logo_url?: string | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_targets: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          metric: string
          period_month: string
          scope_id: string | null
          scope_type: string
          target: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          metric: string
          period_month: string
          scope_id?: string | null
          scope_type?: string
          target: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metric?: string
          period_month?: string
          scope_id?: string | null
          scope_type?: string
          target?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      container_movements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: number
          note: string | null
          product_id: string
          qty_in: number
          qty_out: number
          ref_id: string | null
          ref_type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: never
          note?: string | null
          product_id: string
          qty_in?: number
          qty_out?: number
          ref_id?: string | null
          ref_type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: never
          note?: string | null
          product_id?: string
          qty_in?: number
          qty_out?: number
          ref_id?: string | null
          ref_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "container_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_movements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_debit_notes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          firm_id: string
          gst_rate: number
          id: string
          invoice_id: string | null
          note_date: string
          note_no: string
          note_type: string
          order_id: string | null
          reason: string
          reject_reason: string | null
          status: string
          stop_id: string | null
          tax_amount: number
          taxable_value: number
          total: number
          trip_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          firm_id: string
          gst_rate?: number
          id?: string
          invoice_id?: string | null
          note_date?: string
          note_no: string
          note_type: string
          order_id?: string | null
          reason: string
          reject_reason?: string | null
          status?: string
          stop_id?: string | null
          tax_amount?: number
          taxable_value: number
          total: number
          trip_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          firm_id?: string
          gst_rate?: number
          id?: string
          invoice_id?: string | null
          note_date?: string
          note_no?: string
          note_type?: string
          order_id?: string | null
          reason?: string
          reject_reason?: string | null
          status?: string
          stop_id?: string | null
          tax_amount?: number
          taxable_value?: number
          total?: number
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_debit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_debit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_debit_notes_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_debit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_debit_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_debit_notes_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "trip_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_debit_notes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_zone_defaults: {
        Row: {
          company_id: string
          credit_days: number
          credit_limit: number
          customer_type_id: string
          id: string
          zone_id: string
        }
        Insert: {
          company_id: string
          credit_days?: number
          credit_limit?: number
          customer_type_id: string
          id?: string
          zone_id: string
        }
        Update: {
          company_id?: string
          credit_days?: number
          credit_limit?: number
          customer_type_id?: string
          id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_zone_defaults_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_zone_defaults_customer_type_id_fkey"
            columns: ["customer_type_id"]
            isOneToOne: false
            referencedRelation: "customer_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_zone_defaults_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          area_id: string | null
          city: string | null
          contact_mobile: string | null
          contact_name: string | null
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          landmark: string | null
          latitude: number | null
          longitude: number | null
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          area_id?: string | null
          city?: string | null
          contact_mobile?: string | null
          contact_name?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          area_id?: string | null
          city?: string | null
          contact_mobile?: string | null
          contact_name?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "geo_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      customer_firm_credit: {
        Row: {
          credit_days: number
          credit_limit: number
          customer_id: string
          firm_id: string
        }
        Insert: {
          credit_days?: number
          credit_limit?: number
          customer_id: string
          firm_id: string
        }
        Update: {
          credit_days?: number
          credit_limit?: number
          customer_id?: string
          firm_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_firm_credit_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_firm_credit_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_opening_balances: {
        Row: {
          amount: number
          amount_paid: number
          as_of: string
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          firm_id: string
          id: string
          note: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number
          as_of: string
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          firm_id: string
          id?: string
          note?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number
          as_of?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          firm_id?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_opening_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_opening_balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_opening_balances_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
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
          auto_approve_max_value: number | null
          auto_approve_orders: boolean
          auto_approve_skip_first_order: boolean
          auto_approve_within_credit: boolean
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          default_credit_days: number
          default_credit_limit: number
          default_delivery_mode: string
          default_price_plan_id: string | null
          delivery_charge_per_pack: number | null
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
          route_via_distributor: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          auto_approve_max_value?: number | null
          auto_approve_orders?: boolean
          auto_approve_skip_first_order?: boolean
          auto_approve_within_credit?: boolean
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          default_credit_days?: number
          default_credit_limit?: number
          default_delivery_mode?: string
          default_price_plan_id?: string | null
          delivery_charge_per_pack?: number | null
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
          route_via_distributor?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          auto_approve_max_value?: number | null
          auto_approve_orders?: boolean
          auto_approve_skip_first_order?: boolean
          auto_approve_within_credit?: boolean
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_credit_days?: number
          default_credit_limit?: number
          default_delivery_mode?: string
          default_price_plan_id?: string | null
          delivery_charge_per_pack?: number | null
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
          route_via_distributor?: boolean
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
          area_id: string | null
          business_name: string | null
          city: string | null
          company_id: string
          contact_name: string
          created_at: string
          created_by: string | null
          credit_block_reason: string | null
          credit_blocked: boolean
          credit_days: number | null
          credit_limit: number | null
          customer_code: string
          customer_type_id: string
          default_delivery_mode: string | null
          email: string | null
          gstin: string | null
          id: string
          is_demo: boolean
          landmark: string | null
          latitude: number | null
          location_accuracy_m: number | null
          longitude: number | null
          mobile: string
          overdue_grace_days: number
          pincode: string | null
          price_plan_id: string | null
          registered_via: string
          rejection_reason: string | null
          route_id: string | null
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
          area_id?: string | null
          business_name?: string | null
          city?: string | null
          company_id: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          credit_block_reason?: string | null
          credit_blocked?: boolean
          credit_days?: number | null
          credit_limit?: number | null
          customer_code?: string
          customer_type_id: string
          default_delivery_mode?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_demo?: boolean
          landmark?: string | null
          latitude?: number | null
          location_accuracy_m?: number | null
          longitude?: number | null
          mobile: string
          overdue_grace_days?: number
          pincode?: string | null
          price_plan_id?: string | null
          registered_via?: string
          rejection_reason?: string | null
          route_id?: string | null
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
          area_id?: string | null
          business_name?: string | null
          city?: string | null
          company_id?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          credit_block_reason?: string | null
          credit_blocked?: boolean
          credit_days?: number | null
          credit_limit?: number | null
          customer_code?: string
          customer_type_id?: string
          default_delivery_mode?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_demo?: boolean
          landmark?: string | null
          latitude?: number | null
          location_accuracy_m?: number | null
          longitude?: number | null
          mobile?: string
          overdue_grace_days?: number
          pincode?: string | null
          price_plan_id?: string | null
          registered_via?: string
          rejection_reason?: string | null
          route_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "geo_areas"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "customers_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "geo_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_role_defaults: {
        Row: {
          dashboard: Json
          role_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          dashboard: Json
          role_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          dashboard?: Json
          role_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_role_defaults_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: true
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_lines: {
        Row: {
          damaged_qty: number
          delivered_qty: number
          empties_returned: number
          order_line_id: string
          refused_qty: number
          short_qty: number
          stop_id: string
        }
        Insert: {
          damaged_qty?: number
          delivered_qty?: number
          empties_returned?: number
          order_line_id: string
          refused_qty?: number
          short_qty?: number
          stop_id: string
        }
        Update: {
          damaged_qty?: number
          delivered_qty?: number
          empties_returned?: number
          order_line_id?: string
          refused_qty?: number
          short_qty?: number
          stop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_lines_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "trip_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_settings: {
        Row: {
          allow_cash: boolean
          allow_cheque: boolean
          allow_extra_load: boolean
          allow_partial_delivery: boolean
          allow_pickup_only: boolean
          allow_spot_sale: boolean
          allow_upi: boolean
          arrived_button_enabled: boolean
          ask_office_no_reply: string
          ask_office_wait_minutes: number
          auto_credit_block_enabled: boolean
          collect_old_dues: boolean
          company_id: string
          default_language: string
          distributor_reply_minutes: number
          expense_bill_photo_required: boolean
          expense_limit_per_trip: number
          expense_types: string[]
          expenses_enabled: boolean
          failed_reasons: string[]
          gate_pass_print: boolean
          location_at_each_stop: boolean
          location_interval_minutes: number
          location_tracking_enabled: boolean
          photo_days_challan: number
          photo_days_cheque: number
          photo_days_delivery: number
          photo_days_odometer: number
          photo_days_problem: number
          photo_days_selfie: number
          photo_days_upi: number
          photo_days_visitor: number
          photo_delete_after_download: boolean
          proof_otp_enabled: boolean
          proof_otp_required: boolean
          proof_photo_enabled: boolean
          proof_photo_required: boolean
          proof_signature_enabled: boolean
          proof_signature_required: boolean
          require_end_odometer: boolean
          require_end_odometer_photo: boolean
          require_start_odometer: boolean
          require_start_odometer_photo: boolean
          require_start_selfie: boolean
          show_jar_balance: boolean
          show_outstanding: boolean
          sos_enabled: boolean
          updated_at: string
          updated_by: string | null
          vehicle_check_enabled: boolean
          vehicle_check_every_days: number
          vehicle_check_frequency: string
          vehicle_check_items: string[]
          visitor_alert_hours: number
          visitor_photo: string
          walkin_customer_type_id: string | null
        }
        Insert: {
          allow_cash?: boolean
          allow_cheque?: boolean
          allow_extra_load?: boolean
          allow_partial_delivery?: boolean
          allow_pickup_only?: boolean
          allow_spot_sale?: boolean
          allow_upi?: boolean
          arrived_button_enabled?: boolean
          ask_office_no_reply?: string
          ask_office_wait_minutes?: number
          auto_credit_block_enabled?: boolean
          collect_old_dues?: boolean
          company_id: string
          default_language?: string
          distributor_reply_minutes?: number
          expense_bill_photo_required?: boolean
          expense_limit_per_trip?: number
          expense_types?: string[]
          expenses_enabled?: boolean
          failed_reasons?: string[]
          gate_pass_print?: boolean
          location_at_each_stop?: boolean
          location_interval_minutes?: number
          location_tracking_enabled?: boolean
          photo_days_challan?: number
          photo_days_cheque?: number
          photo_days_delivery?: number
          photo_days_odometer?: number
          photo_days_problem?: number
          photo_days_selfie?: number
          photo_days_upi?: number
          photo_days_visitor?: number
          photo_delete_after_download?: boolean
          proof_otp_enabled?: boolean
          proof_otp_required?: boolean
          proof_photo_enabled?: boolean
          proof_photo_required?: boolean
          proof_signature_enabled?: boolean
          proof_signature_required?: boolean
          require_end_odometer?: boolean
          require_end_odometer_photo?: boolean
          require_start_odometer?: boolean
          require_start_odometer_photo?: boolean
          require_start_selfie?: boolean
          show_jar_balance?: boolean
          show_outstanding?: boolean
          sos_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          vehicle_check_enabled?: boolean
          vehicle_check_every_days?: number
          vehicle_check_frequency?: string
          vehicle_check_items?: string[]
          visitor_alert_hours?: number
          visitor_photo?: string
          walkin_customer_type_id?: string | null
        }
        Update: {
          allow_cash?: boolean
          allow_cheque?: boolean
          allow_extra_load?: boolean
          allow_partial_delivery?: boolean
          allow_pickup_only?: boolean
          allow_spot_sale?: boolean
          allow_upi?: boolean
          arrived_button_enabled?: boolean
          ask_office_no_reply?: string
          ask_office_wait_minutes?: number
          auto_credit_block_enabled?: boolean
          collect_old_dues?: boolean
          company_id?: string
          default_language?: string
          distributor_reply_minutes?: number
          expense_bill_photo_required?: boolean
          expense_limit_per_trip?: number
          expense_types?: string[]
          expenses_enabled?: boolean
          failed_reasons?: string[]
          gate_pass_print?: boolean
          location_at_each_stop?: boolean
          location_interval_minutes?: number
          location_tracking_enabled?: boolean
          photo_days_challan?: number
          photo_days_cheque?: number
          photo_days_delivery?: number
          photo_days_odometer?: number
          photo_days_problem?: number
          photo_days_selfie?: number
          photo_days_upi?: number
          photo_days_visitor?: number
          photo_delete_after_download?: boolean
          proof_otp_enabled?: boolean
          proof_otp_required?: boolean
          proof_photo_enabled?: boolean
          proof_photo_required?: boolean
          proof_signature_enabled?: boolean
          proof_signature_required?: boolean
          require_end_odometer?: boolean
          require_end_odometer_photo?: boolean
          require_start_odometer?: boolean
          require_start_odometer_photo?: boolean
          require_start_selfie?: boolean
          show_jar_balance?: boolean
          show_outstanding?: boolean
          sos_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          vehicle_check_enabled?: boolean
          vehicle_check_every_days?: number
          vehicle_check_frequency?: string
          vehicle_check_items?: string[]
          visitor_alert_hours?: number
          visitor_photo?: string
          walkin_customer_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_settings_walkin_customer_type_id_fkey"
            columns: ["walkin_customer_type_id"]
            isOneToOne: false
            referencedRelation: "customer_types"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_schedules: {
        Row: {
          active_days: number[]
          company_id: string
          fixed_times: string[]
          id: string
          interval_hours: number
          is_active: boolean
          mode: string
          updated_at: string
          window_end: string
          window_start: string
          zone_id: string | null
        }
        Insert: {
          active_days?: number[]
          company_id: string
          fixed_times?: string[]
          id?: string
          interval_hours?: number
          is_active?: boolean
          mode?: string
          updated_at?: string
          window_end?: string
          window_start?: string
          zone_id?: string | null
        }
        Update: {
          active_days?: number[]
          company_id?: string
          fixed_times?: string[]
          id?: string
          interval_hours?: number
          is_active?: boolean
          mode?: string
          updated_at?: string
          window_end?: string
          window_start?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_schedules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
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
      driver_profiles: {
        Row: {
          alt_phone: string | null
          default_vehicle_id: string | null
          licence_expiry: string | null
          licence_no: string | null
          licence_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_phone?: string | null
          default_vehicle_id?: string | null
          licence_expiry?: string | null
          licence_no?: string | null
          licence_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_phone?: string | null
          default_vehicle_id?: string | null
          licence_expiry?: string | null
          licence_no?: string | null
          licence_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
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
          invoice_design: Json
          invoice_terms: string | null
          is_active: boolean
          latitude: number | null
          legal_name: string
          logo_url: string | null
          longitude: number | null
          pan: string | null
          phone: string | null
          pincode: string | null
          print_copies: string[]
          print_footer_note: string | null
          print_paper: string
          print_show_bank: boolean
          print_show_hsn_summary: boolean
          print_show_logo: boolean
          print_show_signature: boolean
          print_show_upi_qr: boolean
          short_name: string | null
          signatory_name: string | null
          signature_url: string | null
          state: string | null
          state_code: string | null
          updated_at: string
          upi_id: string | null
          upi_payee_name: string | null
          upi_qr_path: string | null
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
          invoice_design?: Json
          invoice_terms?: string | null
          is_active?: boolean
          latitude?: number | null
          legal_name: string
          logo_url?: string | null
          longitude?: number | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          print_copies?: string[]
          print_footer_note?: string | null
          print_paper?: string
          print_show_bank?: boolean
          print_show_hsn_summary?: boolean
          print_show_logo?: boolean
          print_show_signature?: boolean
          print_show_upi_qr?: boolean
          short_name?: string | null
          signatory_name?: string | null
          signature_url?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
          upi_qr_path?: string | null
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
          invoice_design?: Json
          invoice_terms?: string | null
          is_active?: boolean
          latitude?: number | null
          legal_name?: string
          logo_url?: string | null
          longitude?: number | null
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          print_copies?: string[]
          print_footer_note?: string | null
          print_paper?: string
          print_show_bank?: boolean
          print_show_hsn_summary?: boolean
          print_show_logo?: boolean
          print_show_signature?: boolean
          print_show_upi_qr?: boolean
          short_name?: string | null
          signatory_name?: string | null
          signature_url?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
          upi_qr_path?: string | null
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
      gate_entries: {
        Row: {
          challan_photo_path: string | null
          company_id: string
          courier_name: string | null
          created_at: string
          entry_type: string
          from_place: string | null
          handed_at: string | null
          handed_by: string | null
          handed_to: string | null
          id: string
          in_at: string
          in_by: string
          meet_user_id: string | null
          mobile: string
          name: string
          out_at: string | null
          out_by: string | null
          parcel_count: number | null
          people_count: number
          person_type: string
          photo_path: string | null
          purpose: string | null
          staff_user_id: string | null
          updated_at: string
          vehicle_no: string | null
        }
        Insert: {
          challan_photo_path?: string | null
          company_id?: string
          courier_name?: string | null
          created_at?: string
          entry_type?: string
          from_place?: string | null
          handed_at?: string | null
          handed_by?: string | null
          handed_to?: string | null
          id?: string
          in_at?: string
          in_by?: string
          meet_user_id?: string | null
          mobile: string
          name: string
          out_at?: string | null
          out_by?: string | null
          parcel_count?: number | null
          people_count?: number
          person_type?: string
          photo_path?: string | null
          purpose?: string | null
          staff_user_id?: string | null
          updated_at?: string
          vehicle_no?: string | null
        }
        Update: {
          challan_photo_path?: string | null
          company_id?: string
          courier_name?: string | null
          created_at?: string
          entry_type?: string
          from_place?: string | null
          handed_at?: string | null
          handed_by?: string | null
          handed_to?: string | null
          id?: string
          in_at?: string
          in_by?: string
          meet_user_id?: string | null
          mobile?: string
          name?: string
          out_at?: string | null
          out_by?: string | null
          parcel_count?: number | null
          people_count?: number
          person_type?: string
          photo_path?: string | null
          purpose?: string | null
          staff_user_id?: string | null
          updated_at?: string
          vehicle_no?: string | null
        }
        Relationships: []
      }
      gate_passes: {
        Row: {
          id: string
          issued_at: string
          issued_by: string | null
          pass_no: string
          qr_token: string
          trip_id: string
        }
        Insert: {
          id?: string
          issued_at?: string
          issued_by?: string | null
          pass_no: string
          qr_token?: string
          trip_id: string
        }
        Update: {
          id?: string
          issued_at?: string
          issued_by?: string | null
          pass_no?: string
          qr_token?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_passes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_problems: {
        Row: {
          company_id: string
          created_at: string
          id: string
          note: string | null
          photo_path: string | null
          problem_type: string
          raised_at: string
          raised_by: string
          resolve_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          id?: string
          note?: string | null
          photo_path?: string | null
          problem_type: string
          raised_at?: string
          raised_by?: string
          resolve_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          note?: string | null
          photo_path?: string | null
          problem_type?: string
          raised_at?: string
          raised_by?: string
          resolve_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      geo_areas: {
        Row: {
          backup_distributor_id: string | null
          boundary: Json | null
          centre_lat: number | null
          centre_lng: number | null
          code: string
          company_id: string
          created_at: string
          default_vehicle_id: string | null
          id: string
          is_active: boolean
          map_colour: string | null
          name: string
          name_hi: string | null
          name_mr: string | null
          pincodes: string[]
          primary_distributor_id: string | null
          salesman_user_id: string | null
          unit_id: string | null
          updated_at: string
          zone_id: string
        }
        Insert: {
          backup_distributor_id?: string | null
          boundary?: Json | null
          centre_lat?: number | null
          centre_lng?: number | null
          code: string
          company_id: string
          created_at?: string
          default_vehicle_id?: string | null
          id?: string
          is_active?: boolean
          map_colour?: string | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          pincodes?: string[]
          primary_distributor_id?: string | null
          salesman_user_id?: string | null
          unit_id?: string | null
          updated_at?: string
          zone_id: string
        }
        Update: {
          backup_distributor_id?: string | null
          boundary?: Json | null
          centre_lat?: number | null
          centre_lng?: number | null
          code?: string
          company_id?: string
          created_at?: string
          default_vehicle_id?: string | null
          id?: string
          is_active?: boolean
          map_colour?: string | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          pincodes?: string[]
          primary_distributor_id?: string | null
          salesman_user_id?: string | null
          unit_id?: string | null
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_areas_backup_distributor_id_fkey"
            columns: ["backup_distributor_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_areas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_areas_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_areas_primary_distributor_id_fkey"
            columns: ["primary_distributor_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_areas_salesman_user_id_fkey"
            columns: ["salesman_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_areas_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_areas_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_cities: {
        Row: {
          boundary: Json | null
          centre_lat: number | null
          centre_lng: number | null
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          map_colour: string | null
          name: string
          name_hi: string | null
          name_mr: string | null
          state_id: string
          updated_at: string
        }
        Insert: {
          boundary?: Json | null
          centre_lat?: number | null
          centre_lng?: number | null
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          map_colour?: string | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          state_id: string
          updated_at?: string
        }
        Update: {
          boundary?: Json | null
          centre_lat?: number | null
          centre_lng?: number | null
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          map_colour?: string | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          state_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_cities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "geo_states"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_route_areas: {
        Row: {
          area_id: string
          route_id: string
          sort_order: number
        }
        Insert: {
          area_id: string
          route_id: string
          sort_order?: number
        }
        Update: {
          area_id?: string
          route_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "geo_route_areas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "geo_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_route_areas_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "geo_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_routes: {
        Row: {
          code: string
          company_id: string
          created_at: string
          default_days: number[]
          default_vehicle_id: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          default_days?: number[]
          default_vehicle_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          default_days?: number[]
          default_vehicle_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_routes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_routes_default_vehicle_id_fkey"
            columns: ["default_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_routes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_shape_library: {
        Row: {
          aliases: string[]
          boundary: Json
          centre_lat: number | null
          centre_lng: number | null
          id: number
          kind: string
          name: string
          state_name: string | null
        }
        Insert: {
          aliases?: string[]
          boundary: Json
          centre_lat?: number | null
          centre_lng?: number | null
          id?: never
          kind: string
          name: string
          state_name?: string | null
        }
        Update: {
          aliases?: string[]
          boundary?: Json
          centre_lat?: number | null
          centre_lng?: number | null
          id?: never
          kind?: string
          name?: string
          state_name?: string | null
        }
        Relationships: []
      }
      geo_states: {
        Row: {
          boundary: Json | null
          centre_lat: number | null
          centre_lng: number | null
          code: string
          company_id: string
          created_at: string
          gst_state_code: string | null
          id: string
          is_active: boolean
          map_colour: string | null
          name: string
          name_hi: string | null
          name_mr: string | null
          updated_at: string
        }
        Insert: {
          boundary?: Json | null
          centre_lat?: number | null
          centre_lng?: number | null
          code: string
          company_id: string
          created_at?: string
          gst_state_code?: string | null
          id?: string
          is_active?: boolean
          map_colour?: string | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Update: {
          boundary?: Json | null
          centre_lat?: number | null
          centre_lng?: number | null
          code?: string
          company_id?: string
          created_at?: string
          gst_state_code?: string | null
          id?: string
          is_active?: boolean
          map_colour?: string | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_zones: {
        Row: {
          boundary: Json | null
          centre_lat: number | null
          centre_lng: number | null
          city_id: string
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          manager_user_id: string | null
          map_colour: string | null
          name: string
          name_hi: string | null
          name_mr: string | null
          updated_at: string
        }
        Insert: {
          boundary?: Json | null
          centre_lat?: number | null
          centre_lng?: number | null
          city_id: string
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_user_id?: string | null
          map_colour?: string | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Update: {
          boundary?: Json | null
          centre_lat?: number | null
          centre_lng?: number | null
          city_id?: string
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_user_id?: string | null
          map_colour?: string | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_zones_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "geo_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_zones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_zones_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      go_live_signoffs: {
        Row: {
          check_key: string
          company_id: string
          note: string | null
          signed_at: string
          signed_by: string | null
        }
        Insert: {
          check_key: string
          company_id: string
          note?: string | null
          signed_at?: string
          signed_by?: string | null
        }
        Update: {
          check_key?: string
          company_id?: string
          note?: string | null
          signed_at?: string
          signed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "go_live_signoffs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_shifts: {
        Row: {
          company_id: string
          created_at: string
          ended_at: string | null
          guard_user_id: string
          handed_over_by: string | null
          id: string
          selfie_path: string | null
          started_at: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          ended_at?: string | null
          guard_user_id: string
          handed_over_by?: string | null
          id?: string
          selfie_path?: string | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          ended_at?: string | null
          guard_user_id?: string
          handed_over_by?: string | null
          id?: string
          selfie_path?: string | null
          started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          cgst: number
          description: string
          gst_rate: number
          hsn_code: string | null
          id: string
          igst: number
          invoice_id: string
          line_total: number
          order_line_id: string | null
          product_id: string
          qty: number
          sgst: number
          sort_order: number
          taxable_value: number
          unit_price: number
        }
        Insert: {
          cgst?: number
          description: string
          gst_rate: number
          hsn_code?: string | null
          id?: string
          igst?: number
          invoice_id: string
          line_total: number
          order_line_id?: string | null
          product_id: string
          qty: number
          sgst?: number
          sort_order?: number
          taxable_value: number
          unit_price: number
        }
        Update: {
          cgst?: number
          description?: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          igst?: number
          invoice_id?: string
          line_total?: number
          order_line_id?: string | null
          product_id?: string
          qty?: number
          sgst?: number
          sort_order?: number
          taxable_value?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          ack_date: string | null
          ack_no: string | null
          amount_paid: number
          billing_address: string | null
          business_name: string | null
          cgst: number
          company_id: string
          created_at: string
          created_by: string | null
          customer_gstin: string | null
          customer_id: string
          customer_name: string | null
          deposit_total: number
          due_date: string | null
          eway_bill_no: string | null
          firm_id: string
          grand_total: number
          id: string
          igst: number
          invoice_date: string
          invoice_no: string
          irn: string | null
          is_interstate: boolean
          order_id: string
          payment_status: string
          place_of_supply: string | null
          round_off: number
          sgst: number
          status: string
          taxable_value: number
          trip_id: string | null
        }
        Insert: {
          ack_date?: string | null
          ack_no?: string | null
          amount_paid?: number
          billing_address?: string | null
          business_name?: string | null
          cgst?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_gstin?: string | null
          customer_id: string
          customer_name?: string | null
          deposit_total?: number
          due_date?: string | null
          eway_bill_no?: string | null
          firm_id: string
          grand_total?: number
          id?: string
          igst?: number
          invoice_date?: string
          invoice_no: string
          irn?: string | null
          is_interstate?: boolean
          order_id: string
          payment_status?: string
          place_of_supply?: string | null
          round_off?: number
          sgst?: number
          status?: string
          taxable_value?: number
          trip_id?: string | null
        }
        Update: {
          ack_date?: string | null
          ack_no?: string | null
          amount_paid?: number
          billing_address?: string | null
          business_name?: string | null
          cgst?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_gstin?: string | null
          customer_id?: string
          customer_name?: string | null
          deposit_total?: number
          due_date?: string | null
          eway_bill_no?: string | null
          firm_id?: string
          grand_total?: number
          id?: string
          igst?: number
          invoice_date?: string
          invoice_no?: string
          irn?: string | null
          is_interstate?: boolean
          order_id?: string
          payment_status?: string
          place_of_supply?: string | null
          round_off?: number
          sgst?: number
          status?: string
          taxable_value?: number
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      material_passes: {
        Row: {
          approved_by_name: string | null
          company_id: string
          created_at: string
          direction: string
          id: string
          is_returnable: boolean
          issued_at: string
          issued_by: string | null
          items: string
          party: string | null
          pass_no: string
          qr_token: string
          quantity: string | null
          reason: string | null
          scanned_at: string | null
          scanned_by: string | null
          updated_at: string
          valid_till: string | null
          vehicle_no: string | null
        }
        Insert: {
          approved_by_name?: string | null
          company_id?: string
          created_at?: string
          direction?: string
          id?: string
          is_returnable?: boolean
          issued_at?: string
          issued_by?: string | null
          items: string
          party?: string | null
          pass_no: string
          qr_token?: string
          quantity?: string | null
          reason?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          updated_at?: string
          valid_till?: string | null
          vehicle_no?: string | null
        }
        Update: {
          approved_by_name?: string | null
          company_id?: string
          created_at?: string
          direction?: string
          id?: string
          is_returnable?: boolean
          issued_at?: string
          issued_by?: string | null
          items?: string
          party?: string | null
          pass_no?: string
          qr_token?: string
          quantity?: string | null
          reason?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          updated_at?: string
          valid_till?: string | null
          vehicle_no?: string | null
        }
        Relationships: []
      }
      order_feedback: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          order_id: string
          rating: number
          tags: string[]
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          order_id: string
          rating: number
          tags?: string[]
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          order_id?: string
          rating?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "order_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          delivery_charge_per_pack: number
          deposit_per_unit: number
          deposit_total: number
          gst_rate: number
          hsn_code: string | null
          id: string
          line_total: number
          mrp: number | null
          new_containers: number
          order_id: string
          pack_label: string | null
          product_code: string
          product_id: string
          product_name: string
          qty: number
          sort_order: number
          tax_amount: number
          taxable_value: number
          unit_price: number
        }
        Insert: {
          delivery_charge_per_pack?: number
          deposit_per_unit?: number
          deposit_total?: number
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          line_total: number
          mrp?: number | null
          new_containers?: number
          order_id: string
          pack_label?: string | null
          product_code: string
          product_id: string
          product_name: string
          qty: number
          sort_order?: number
          tax_amount: number
          taxable_value: number
          unit_price: number
        }
        Update: {
          delivery_charge_per_pack?: number
          deposit_per_unit?: number
          deposit_total?: number
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          line_total?: number
          mrp?: number | null
          new_containers?: number
          order_id?: string
          pack_label?: string | null
          product_code?: string
          product_id?: string
          product_name?: string
          qty?: number
          sort_order?: number
          tax_amount?: number
          taxable_value?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number
          approved_at: string | null
          approved_by: string | null
          area_id: string | null
          business_name: string | null
          cancel_reason: string | null
          cancelled_by: string | null
          company_id: string
          created_at: string
          credit_limit_snapshot: number | null
          customer_id: string
          customer_mobile: string | null
          customer_name: string | null
          customer_type_code: string | null
          delivery_address_id: string | null
          delivery_address_line1: string | null
          delivery_address_line2: string | null
          delivery_address_text: string | null
          delivery_charge: number
          delivery_city: string | null
          delivery_date: string | null
          delivery_landmark: string | null
          delivery_lat: number | null
          delivery_latitude: number | null
          delivery_lng: number | null
          delivery_longitude: number | null
          delivery_mode: string | null
          delivery_otp: string | null
          delivery_pincode: string | null
          delivery_slot: string | null
          deposit_total: number
          distributor_assigned_at: string | null
          distributor_note: string | null
          distributor_responded_at: string | null
          distributor_status: string | null
          due_date: string | null
          firm_id: string
          fulfiller_customer_id: string | null
          grand_total: number
          hold_reason: string | null
          id: string
          is_express: boolean
          items_total: number
          notes: string | null
          order_group_id: string
          order_no: string
          order_type: string
          outstanding_snapshot: number | null
          payment_method: string | null
          payment_mode: string
          payment_status: string
          pickup_vehicle_no: string | null
          placed_by: string | null
          price_plan_id: string | null
          redeliver_at: string | null
          redeliver_reason: string | null
          release_batch_at: string | null
          released_at: string | null
          round_off: number
          route_id: string | null
          source: string
          status: Database["public"]["Enums"]["order_status"]
          tax_total: number
          taxable_value: number
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          area_id?: string | null
          business_name?: string | null
          cancel_reason?: string | null
          cancelled_by?: string | null
          company_id: string
          created_at?: string
          credit_limit_snapshot?: number | null
          customer_id: string
          customer_mobile?: string | null
          customer_name?: string | null
          customer_type_code?: string | null
          delivery_address_id?: string | null
          delivery_address_line1?: string | null
          delivery_address_line2?: string | null
          delivery_address_text?: string | null
          delivery_charge?: number
          delivery_city?: string | null
          delivery_date?: string | null
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_latitude?: number | null
          delivery_lng?: number | null
          delivery_longitude?: number | null
          delivery_mode?: string | null
          delivery_otp?: string | null
          delivery_pincode?: string | null
          delivery_slot?: string | null
          deposit_total?: number
          distributor_assigned_at?: string | null
          distributor_note?: string | null
          distributor_responded_at?: string | null
          distributor_status?: string | null
          due_date?: string | null
          firm_id: string
          fulfiller_customer_id?: string | null
          grand_total?: number
          hold_reason?: string | null
          id?: string
          is_express?: boolean
          items_total?: number
          notes?: string | null
          order_group_id: string
          order_no: string
          order_type?: string
          outstanding_snapshot?: number | null
          payment_method?: string | null
          payment_mode?: string
          payment_status?: string
          pickup_vehicle_no?: string | null
          placed_by?: string | null
          price_plan_id?: string | null
          redeliver_at?: string | null
          redeliver_reason?: string | null
          release_batch_at?: string | null
          released_at?: string | null
          round_off?: number
          route_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          tax_total?: number
          taxable_value?: number
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          area_id?: string | null
          business_name?: string | null
          cancel_reason?: string | null
          cancelled_by?: string | null
          company_id?: string
          created_at?: string
          credit_limit_snapshot?: number | null
          customer_id?: string
          customer_mobile?: string | null
          customer_name?: string | null
          customer_type_code?: string | null
          delivery_address_id?: string | null
          delivery_address_line1?: string | null
          delivery_address_line2?: string | null
          delivery_address_text?: string | null
          delivery_charge?: number
          delivery_city?: string | null
          delivery_date?: string | null
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_latitude?: number | null
          delivery_lng?: number | null
          delivery_longitude?: number | null
          delivery_mode?: string | null
          delivery_otp?: string | null
          delivery_pincode?: string | null
          delivery_slot?: string | null
          deposit_total?: number
          distributor_assigned_at?: string | null
          distributor_note?: string | null
          distributor_responded_at?: string | null
          distributor_status?: string | null
          due_date?: string | null
          firm_id?: string
          fulfiller_customer_id?: string | null
          grand_total?: number
          hold_reason?: string | null
          id?: string
          is_express?: boolean
          items_total?: number
          notes?: string | null
          order_group_id?: string
          order_no?: string
          order_type?: string
          outstanding_snapshot?: number | null
          payment_method?: string | null
          payment_mode?: string
          payment_status?: string
          pickup_vehicle_no?: string | null
          placed_by?: string | null
          price_plan_id?: string | null
          redeliver_at?: string | null
          redeliver_reason?: string | null
          release_batch_at?: string | null
          released_at?: string | null
          round_off?: number
          route_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          tax_total?: number
          taxable_value?: number
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "geo_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_fulfiller_customer_id_fkey"
            columns: ["fulfiller_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_price_plan_id_fkey"
            columns: ["price_plan_id"]
            isOneToOne: false
            referencedRelation: "price_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "geo_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
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
          locked_until: string | null
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
          locked_until?: string | null
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
          locked_until?: string | null
          max_attempts?: number
          purpose?: Database["public"]["Enums"]["otp_purpose"]
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          amount: number
          balance_after: number | null
          cash_paid_to: string | null
          cash_paid_to_name: string | null
          cheque_bank: string | null
          cheque_date: string | null
          cheque_no: string | null
          collected_by: string | null
          company_id: string
          created_at: string
          customer_id: string
          firm_id: string | null
          id: string
          method: string
          order_id: string | null
          paid_on: string
          receipt_id: string | null
          reference: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_path: string | null
          source: string
          status: string
          submitted_by: string | null
          upi_response: Json | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          cash_paid_to?: string | null
          cash_paid_to_name?: string | null
          cheque_bank?: string | null
          cheque_date?: string | null
          cheque_no?: string | null
          collected_by?: string | null
          company_id: string
          created_at?: string
          customer_id: string
          firm_id?: string | null
          id?: string
          method: string
          order_id?: string | null
          paid_on?: string
          receipt_id?: string | null
          reference?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          upi_response?: Json | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          cash_paid_to?: string | null
          cash_paid_to_name?: string | null
          cheque_bank?: string | null
          cheque_date?: string | null
          cheque_no?: string | null
          collected_by?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string
          firm_id?: string | null
          id?: string
          method?: string
          order_id?: string | null
          paid_on?: string
          receipt_id?: string | null
          reference?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          upi_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_backups: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          photo_count: number
          zip_path: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          photo_count?: number
          zip_path?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          photo_count?: number
          zip_path?: string | null
        }
        Relationships: []
      }
      photo_cleanup_runs: {
        Row: {
          deleted: number
          due: number
          errors: Json
          expired: number
          id: string
          kept_not_downloaded: number
          kind: string
          notices: number
          ran_at: string
        }
        Insert: {
          deleted?: number
          due?: number
          errors?: Json
          expired?: number
          id?: string
          kept_not_downloaded?: number
          kind?: string
          notices?: number
          ran_at?: string
        }
        Update: {
          deleted?: number
          due?: number
          errors?: Json
          expired?: number
          id?: string
          kept_not_downloaded?: number
          kind?: string
          notices?: number
          ran_at?: string
        }
        Relationships: []
      }
      photo_files: {
        Row: {
          amount: number | null
          backup_id: string | null
          bucket: string
          company_id: string
          created_at: string
          customer_id: string | null
          delete_due_at: string | null
          downloaded_at: string | null
          downloaded_by: string | null
          expires_on: string | null
          file_deleted_at: string | null
          id: string
          notice_sent_at: string | null
          order_id: string | null
          path: string
          photo_type: string
          source_id: string | null
          source_table: string
          taken_at: string
          taken_by: string | null
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          backup_id?: string | null
          bucket?: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          delete_due_at?: string | null
          downloaded_at?: string | null
          downloaded_by?: string | null
          expires_on?: string | null
          file_deleted_at?: string | null
          id?: string
          notice_sent_at?: string | null
          order_id?: string | null
          path: string
          photo_type: string
          source_id?: string | null
          source_table: string
          taken_at?: string
          taken_by?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          backup_id?: string | null
          bucket?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          delete_due_at?: string | null
          downloaded_at?: string | null
          downloaded_by?: string | null
          expires_on?: string | null
          file_deleted_at?: string | null
          id?: string
          notice_sent_at?: string | null
          order_id?: string | null
          path?: string
          photo_type?: string
          source_id?: string | null
          source_table?: string
          taken_at?: string
          taken_by?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_files_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "photo_backups"
            referencedColumns: ["id"]
          },
        ]
      }
      price_plan_items: {
        Row: {
          city_id: string | null
          created_at: string
          created_by: string | null
          id: string
          price: number
          price_plan_id: string
          product_id: string
          valid_from: string
          valid_to: string | null
          zone_id: string | null
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          price: number
          price_plan_id: string
          product_id: string
          valid_from?: string
          valid_to?: string | null
          zone_id?: string | null
        }
        Update: {
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          price?: number
          price_plan_id?: string
          product_id?: string
          valid_from?: string
          valid_to?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_plan_items_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "geo_cities"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "price_plan_items_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "geo_zones"
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
          default_deposit: number | null
          default_gst_rate: number | null
          default_hsn: string | null
          icon_key: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_returnable: boolean
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
          default_deposit?: number | null
          default_gst_rate?: number | null
          default_hsn?: string | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_returnable?: boolean
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
          default_deposit?: number | null
          default_gst_rate?: number | null
          default_hsn?: string | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_returnable?: boolean
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
          alt: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
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
          always_direct: boolean
          brand_id: string
          bulk_threshold_qty: number | null
          category_id: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          delivery_info: string | null
          delivery_info_hi: string | null
          delivery_info_mr: string | null
          deposit_amount: number
          description: string | null
          description_hi: string | null
          description_mr: string | null
          factory_only: boolean
          faqs: Json
          firm_id: string
          gst_rate: number
          highlights: Json
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
          reorder_level: number | null
          sell_unit: Database["public"]["Enums"]["sell_unit"]
          sell_unit_id: string | null
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
          always_direct?: boolean
          brand_id: string
          bulk_threshold_qty?: number | null
          category_id?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          delivery_info?: string | null
          delivery_info_hi?: string | null
          delivery_info_mr?: string | null
          deposit_amount?: number
          description?: string | null
          description_hi?: string | null
          description_mr?: string | null
          factory_only?: boolean
          faqs?: Json
          firm_id: string
          gst_rate?: number
          highlights?: Json
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
          reorder_level?: number | null
          sell_unit?: Database["public"]["Enums"]["sell_unit"]
          sell_unit_id?: string | null
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
          always_direct?: boolean
          brand_id?: string
          bulk_threshold_qty?: number | null
          category_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_info?: string | null
          delivery_info_hi?: string | null
          delivery_info_mr?: string | null
          deposit_amount?: number
          description?: string | null
          description_hi?: string | null
          description_mr?: string | null
          factory_only?: boolean
          faqs?: Json
          firm_id?: string
          gst_rate?: number
          highlights?: Json
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
          reorder_level?: number | null
          sell_unit?: Database["public"]["Enums"]["sell_unit"]
          sell_unit_id?: string | null
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
          {
            foreignKeyName: "products_sell_unit_id_fkey"
            columns: ["sell_unit_id"]
            isOneToOne: false
            referencedRelation: "sell_units"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          app: string
          device_id: string
          id: string
          language: string | null
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app?: string
          device_id: string
          id?: string
          language?: string | null
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app?: string
          device_id?: string
          id?: string
          language?: string | null
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receipt_allocation_history: {
        Row: {
          action: string
          amount: number
          changed_at: string
          changed_by: string | null
          id: string
          invoice_id: string | null
          opening_id: string | null
          receipt_id: string
        }
        Insert: {
          action: string
          amount: number
          changed_at?: string
          changed_by?: string | null
          id?: string
          invoice_id?: string | null
          opening_id?: string | null
          receipt_id: string
        }
        Update: {
          action?: string
          amount?: number
          changed_at?: string
          changed_by?: string | null
          id?: string
          invoice_id?: string | null
          opening_id?: string | null
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocation_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocation_history_opening_id_fkey"
            columns: ["opening_id"]
            isOneToOne: false
            referencedRelation: "customer_opening_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocation_history_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_allocation_log: {
        Row: {
          after: Json
          before: Json
          changed_at: string
          changed_by: string | null
          id: number
          reason: string
          receipt_id: string
        }
        Insert: {
          after: Json
          before: Json
          changed_at?: string
          changed_by?: string | null
          id?: never
          reason: string
          receipt_id: string
        }
        Update: {
          after?: Json
          before?: Json
          changed_at?: string
          changed_by?: string | null
          id?: never
          reason?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocation_log_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          opening_id: string | null
          receipt_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          opening_id?: string | null
          receipt_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          opening_id?: string | null
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_opening_id_fkey"
            columns: ["opening_id"]
            isOneToOne: false
            referencedRelation: "customer_opening_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          bank_account_id: string | null
          bank_charges: number | null
          bounce_charge_note_id: string | null
          bounce_reason: string | null
          bounced_on: string | null
          cancel_reason: string | null
          cheque_bank: string | null
          cheque_date: string | null
          cheque_no: string | null
          cheque_photo_url: string | null
          cheque_status: string | null
          cleared_on: string | null
          collected_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          deposit_bank_account_id: string | null
          deposit_slip_path: string | null
          deposited_on: string | null
          firm_id: string
          id: string
          mode: string
          notes: string | null
          proof_name: string | null
          proof_path: string | null
          receipt_date: string
          receipt_no: string
          reference: string | null
          source: string
          status: string
          trip_collection_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bank_charges?: number | null
          bounce_charge_note_id?: string | null
          bounce_reason?: string | null
          bounced_on?: string | null
          cancel_reason?: string | null
          cheque_bank?: string | null
          cheque_date?: string | null
          cheque_no?: string | null
          cheque_photo_url?: string | null
          cheque_status?: string | null
          cleared_on?: string | null
          collected_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          deposit_bank_account_id?: string | null
          deposit_slip_path?: string | null
          deposited_on?: string | null
          firm_id: string
          id?: string
          mode: string
          notes?: string | null
          proof_name?: string | null
          proof_path?: string | null
          receipt_date?: string
          receipt_no: string
          reference?: string | null
          source?: string
          status?: string
          trip_collection_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bank_charges?: number | null
          bounce_charge_note_id?: string | null
          bounce_reason?: string | null
          bounced_on?: string | null
          cancel_reason?: string | null
          cheque_bank?: string | null
          cheque_date?: string | null
          cheque_no?: string | null
          cheque_photo_url?: string | null
          cheque_status?: string | null
          cleared_on?: string | null
          collected_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deposit_bank_account_id?: string | null
          deposit_slip_path?: string | null
          deposited_on?: string | null
          firm_id?: string
          id?: string
          mode?: string
          notes?: string | null
          proof_name?: string | null
          proof_path?: string | null
          receipt_date?: string
          receipt_no?: string
          reference?: string | null
          source?: string
          status?: string
          trip_collection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "firm_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_bounce_charge_note_id_fkey"
            columns: ["bounce_charge_note_id"]
            isOneToOne: false
            referencedRelation: "credit_debit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_deposit_bank_account_id_fkey"
            columns: ["deposit_bank_account_id"]
            isOneToOne: false
            referencedRelation: "firm_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_trip_collection_id_fkey"
            columns: ["trip_collection_id"]
            isOneToOne: false
            referencedRelation: "trip_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: string
          module: string
          role_id: string
        }
        Insert: {
          action: string
          module: string
          role_id: string
        }
        Update: {
          action?: string
          module?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          approval_limit: number | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          name_hi: string | null
          name_mr: string | null
          updated_at: string
        }
        Insert: {
          approval_limit?: number | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Update: {
          approval_limit?: number | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sell_units: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_hi: string | null
          name_mr: string | null
          sort_order: number
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_hi?: string | null
          name_mr?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sell_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          ref_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          ref_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          ref_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: number
          movement_type: string
          note: string | null
          product_id: string
          qty: number
          ref_id: string | null
          ref_type: string | null
          unit_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: never
          movement_type: string
          note?: string | null
          product_id: string
          qty: number
          ref_id?: string | null
          ref_type?: string | null
          unit_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: never
          movement_type?: string
          note?: string | null
          product_id?: string
          qty?: number
          ref_id?: string | null
          ref_type?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_credit_limits: {
        Row: {
          approved_by: string | null
          created_at: string
          customer_id: string
          extra_amount: number
          firm_id: string | null
          id: string
          reason: string
          valid_till: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          customer_id: string
          extra_amount: number
          firm_id?: string | null
          id?: string
          reason: string
          valid_till: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          customer_id?: string
          extra_amount?: number
          firm_id?: string | null
          id?: string
          reason?: string
          valid_till?: string
        }
        Relationships: [
          {
            foreignKeyName: "temp_credit_limits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_credit_limits_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_alerts: {
        Row: {
          alert_type: string
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          raised_at: string
          raised_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          stop_id: string | null
          trip_id: string
        }
        Insert: {
          alert_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          raised_at?: string
          raised_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          stop_id?: string | null
          trip_id: string
        }
        Update: {
          alert_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          raised_at?: string
          raised_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          stop_id?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_alerts_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "trip_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_collections: {
        Row: {
          against_old_dues: boolean
          amount: number
          collected_at: string
          collected_by: string | null
          confirmed: boolean
          customer_id: string
          id: string
          mode: string
          order_id: string | null
          photo_url: string | null
          reference: string | null
          stop_id: string | null
          trip_id: string
        }
        Insert: {
          against_old_dues?: boolean
          amount: number
          collected_at?: string
          collected_by?: string | null
          confirmed?: boolean
          customer_id: string
          id?: string
          mode: string
          order_id?: string | null
          photo_url?: string | null
          reference?: string | null
          stop_id?: string | null
          trip_id: string
        }
        Update: {
          against_old_dues?: boolean
          amount?: number
          collected_at?: string
          collected_by?: string | null
          confirmed?: boolean
          customer_id?: string
          id?: string
          mode?: string
          order_id?: string | null
          photo_url?: string | null
          reference?: string | null
          stop_id?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_collections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_collections_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_collections_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "trip_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_collections_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_expenses: {
        Row: {
          amount: number
          approved: boolean | null
          bill_photo_url: string | null
          created_at: string
          created_by: string | null
          expense_type: string
          id: string
          note: string | null
          paid_from_cash: boolean
          trip_id: string
        }
        Insert: {
          amount: number
          approved?: boolean | null
          bill_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          expense_type: string
          id?: string
          note?: string | null
          paid_from_cash?: boolean
          trip_id: string
        }
        Update: {
          amount?: number
          approved?: boolean | null
          bill_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          expense_type?: string
          id?: string
          note?: string | null
          paid_from_cash?: boolean
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_extra_load: {
        Row: {
          product_id: string
          qty: number
          trip_id: string
        }
        Insert: {
          product_id: string
          qty: number
          trip_id: string
        }
        Update: {
          product_id?: string
          qty?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_extra_load_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_extra_load_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_loading: {
        Row: {
          crates_count: number | null
          loaded_at: string | null
          loaded_qty: number | null
          loader_user_id: string | null
          photo_url: string | null
          planned_qty: number
          product_id: string
          trip_id: string
        }
        Insert: {
          crates_count?: number | null
          loaded_at?: string | null
          loaded_qty?: number | null
          loader_user_id?: string | null
          photo_url?: string | null
          planned_qty?: number
          product_id: string
          trip_id: string
        }
        Update: {
          crates_count?: number | null
          loaded_at?: string | null
          loaded_qty?: number | null
          loader_user_id?: string | null
          photo_url?: string | null
          planned_qty?: number
          product_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_loading_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_loading_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_locations: {
        Row: {
          accuracy_m: number | null
          battery_pct: number | null
          id: number
          kind: string
          latitude: number
          longitude: number
          recorded_at: string
          speed_kmh: number | null
          trip_id: string
          user_id: string
        }
        Insert: {
          accuracy_m?: number | null
          battery_pct?: number | null
          id?: never
          kind?: string
          latitude: number
          longitude: number
          recorded_at?: string
          speed_kmh?: number | null
          trip_id: string
          user_id: string
        }
        Update: {
          accuracy_m?: number | null
          battery_pct?: number | null
          id?: never
          kind?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed_kmh?: number | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_pickups: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          latitude: number | null
          longitude: number | null
          photo_url: string | null
          product_id: string
          qty: number
          trip_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          product_id: string
          qty: number
          trip_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          product_id?: string
          qty?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_pickups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_pickups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_pickups_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_returns: {
        Row: {
          actual_qty: number
          expected_qty: number
          id: string
          kind: string
          note: string | null
          product_id: string | null
          received_at: string
          received_by: string | null
          trip_id: string
        }
        Insert: {
          actual_qty?: number
          expected_qty?: number
          id?: string
          kind: string
          note?: string | null
          product_id?: string | null
          received_at?: string
          received_by?: string | null
          trip_id: string
        }
        Update: {
          actual_qty?: number
          expected_qty?: number
          id?: string
          kind?: string
          note?: string | null
          product_id?: string | null
          received_at?: string
          received_by?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_returns_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_stops: {
        Row: {
          arrived_at: string | null
          delivered_at: string | null
          do_later_at: string | null
          fail_reason: string | null
          id: string
          is_spot_sale: boolean
          latitude: number | null
          longitude: number | null
          order_id: string
          otp_verified: boolean
          photo_url: string | null
          seq: number
          signature_url: string | null
          signed_copy_received: boolean
          status: string
          trip_id: string
        }
        Insert: {
          arrived_at?: string | null
          delivered_at?: string | null
          do_later_at?: string | null
          fail_reason?: string | null
          id?: string
          is_spot_sale?: boolean
          latitude?: number | null
          longitude?: number | null
          order_id: string
          otp_verified?: boolean
          photo_url?: string | null
          seq?: number
          signature_url?: string | null
          signed_copy_received?: boolean
          status?: string
          trip_id: string
        }
        Update: {
          arrived_at?: string | null
          delivered_at?: string | null
          do_later_at?: string | null
          fail_reason?: string | null
          id?: string
          is_spot_sale?: boolean
          latitude?: number | null
          longitude?: number | null
          order_id?: string
          otp_verified?: boolean
          photo_url?: string | null
          seq?: number
          signature_url?: string | null
          signed_copy_received?: boolean
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_stops_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_stops_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_vehicle_checks: {
        Row: {
          all_ok: boolean
          checked_at: string
          checked_by: string | null
          id: string
          items: Json
          photo_url: string | null
          trip_id: string
        }
        Insert: {
          all_ok: boolean
          checked_at?: string
          checked_by?: string | null
          id?: string
          items: Json
          photo_url?: string | null
          trip_id: string
        }
        Update: {
          all_ok?: boolean
          checked_at?: string
          checked_by?: string | null
          id?: string
          items?: Json
          photo_url?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_vehicle_checks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cancel_reason: string | null
          cash_expected: number
          cash_received: number | null
          company_id: string
          created_at: string
          customer_vehicle_no: string | null
          driver_started_at: string | null
          driver_user_id: string | null
          end_odometer: number | null
          end_odometer_photo_url: string | null
          ended_at: string | null
          est_km: number | null
          est_minutes: number | null
          fuel_amount: number | null
          fuel_litres: number | null
          gate_in_at: string | null
          gate_in_by: string | null
          gate_in_manual: boolean
          gate_out_at: string | null
          gate_out_by: string | null
          helper_user_ids: string[]
          hired_driver_mobile: string | null
          hired_driver_name: string | null
          id: string
          loaded_at: string | null
          loaded_by: string | null
          planned_by: string | null
          returns_received_at: string | null
          route_id: string | null
          route_method: string | null
          route_optimised_at: string | null
          settle_note: string | null
          settled_at: string | null
          settled_by: string | null
          start_odometer: number | null
          start_odometer_photo_url: string | null
          start_selfie_url: string | null
          status: Database["public"]["Enums"]["trip_status"]
          trip_date: string
          trip_no: string
          trip_type: string
          unit_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          cancel_reason?: string | null
          cash_expected?: number
          cash_received?: number | null
          company_id: string
          created_at?: string
          customer_vehicle_no?: string | null
          driver_started_at?: string | null
          driver_user_id?: string | null
          end_odometer?: number | null
          end_odometer_photo_url?: string | null
          ended_at?: string | null
          est_km?: number | null
          est_minutes?: number | null
          fuel_amount?: number | null
          fuel_litres?: number | null
          gate_in_at?: string | null
          gate_in_by?: string | null
          gate_in_manual?: boolean
          gate_out_at?: string | null
          gate_out_by?: string | null
          helper_user_ids?: string[]
          hired_driver_mobile?: string | null
          hired_driver_name?: string | null
          id?: string
          loaded_at?: string | null
          loaded_by?: string | null
          planned_by?: string | null
          returns_received_at?: string | null
          route_id?: string | null
          route_method?: string | null
          route_optimised_at?: string | null
          settle_note?: string | null
          settled_at?: string | null
          settled_by?: string | null
          start_odometer?: number | null
          start_odometer_photo_url?: string | null
          start_selfie_url?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          trip_date?: string
          trip_no: string
          trip_type?: string
          unit_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          cancel_reason?: string | null
          cash_expected?: number
          cash_received?: number | null
          company_id?: string
          created_at?: string
          customer_vehicle_no?: string | null
          driver_started_at?: string | null
          driver_user_id?: string | null
          end_odometer?: number | null
          end_odometer_photo_url?: string | null
          ended_at?: string | null
          est_km?: number | null
          est_minutes?: number | null
          fuel_amount?: number | null
          fuel_litres?: number | null
          gate_in_at?: string | null
          gate_in_by?: string | null
          gate_in_manual?: boolean
          gate_out_at?: string | null
          gate_out_by?: string | null
          helper_user_ids?: string[]
          hired_driver_mobile?: string | null
          hired_driver_name?: string | null
          id?: string
          loaded_at?: string | null
          loaded_by?: string | null
          planned_by?: string | null
          returns_received_at?: string | null
          route_id?: string | null
          route_method?: string | null
          route_optimised_at?: string | null
          settle_note?: string | null
          settled_at?: string | null
          settled_by?: string | null
          start_odometer?: number | null
          start_odometer_photo_url?: string | null
          start_selfie_url?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          trip_date?: string
          trip_no?: string
          trip_type?: string
          unit_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "geo_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
          display_name: string | null
          firm_id: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          name_hi: string | null
          name_mr: string | null
          phone: string | null
          pickup_hours: string | null
          pickup_hours_hi: string | null
          pickup_hours_mr: string | null
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
          display_name?: string | null
          firm_id: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          name_hi?: string | null
          name_mr?: string | null
          phone?: string | null
          pickup_hours?: string | null
          pickup_hours_hi?: string | null
          pickup_hours_mr?: string | null
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
          display_name?: string | null
          firm_id?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_hi?: string | null
          name_mr?: string | null
          phone?: string | null
          pickup_hours?: string | null
          pickup_hours_hi?: string | null
          pickup_hours_mr?: string | null
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
      user_preferences: {
        Row: {
          dashboard: Json | null
          sidebar: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          dashboard?: Json | null
          sidebar?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          dashboard?: Json | null
          sidebar?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          is_demo: boolean
          is_super_admin: boolean
          last_login_at: string | null
          login_without_otp: boolean
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
          is_demo?: boolean
          is_super_admin?: boolean
          last_login_at?: string | null
          login_without_otp?: boolean
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
          is_demo?: boolean
          is_super_admin?: boolean
          last_login_at?: string | null
          login_without_otp?: boolean
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
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_scopes: {
        Row: {
          scope_id: string
          scope_type: string
          user_id: string
        }
        Insert: {
          scope_id: string
          scope_type: string
          user_id: string
        }
        Update: {
          scope_id?: string
          scope_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_scopes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      vehicles: {
        Row: {
          capacity_boxes: number | null
          capacity_jars: number | null
          capacity_kg: number | null
          capacity_units: number
          company_id: string
          created_at: string
          created_by: string | null
          fitness_expiry: string | null
          hired_driver_mobile: string | null
          hired_driver_name: string | null
          id: string
          insurance_expiry: string | null
          insurance_url: string | null
          is_active: boolean
          ownership: string
          permit_expiry: string | null
          puc_expiry: string | null
          puc_url: string | null
          rc_expiry: string | null
          rc_url: string | null
          reg_no: string
          transporter_name: string | null
          transporter_phone: string | null
          unit_id: string | null
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          capacity_boxes?: number | null
          capacity_jars?: number | null
          capacity_kg?: number | null
          capacity_units?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          fitness_expiry?: string | null
          hired_driver_mobile?: string | null
          hired_driver_name?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_url?: string | null
          is_active?: boolean
          ownership?: string
          permit_expiry?: string | null
          puc_expiry?: string | null
          puc_url?: string | null
          rc_expiry?: string | null
          rc_url?: string | null
          reg_no: string
          transporter_name?: string | null
          transporter_phone?: string | null
          unit_id?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          capacity_boxes?: number | null
          capacity_jars?: number | null
          capacity_kg?: number | null
          capacity_units?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          fitness_expiry?: string | null
          hired_driver_mobile?: string | null
          hired_driver_name?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_url?: string | null
          is_active?: boolean
          ownership?: string
          permit_expiry?: string | null
          puc_expiry?: string | null
          puc_url?: string | null
          rc_expiry?: string | null
          rc_url?: string | null
          reg_no?: string
          transporter_name?: string | null
          transporter_phone?: string | null
          unit_id?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      container_balances: {
        Row: {
          balance: number | null
          company_id: string | null
          customer_id: string | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "container_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_movements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_on_hand: {
        Row: {
          company_id: string | null
          product_id: string | null
          qty: number | null
          unit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _advance: {
        Args: { p_customer_id: string; p_firm_id: string }
        Returns: number
      }
      _allocate: {
        Args: { p_allocations: Json; p_receipt_id: string }
        Returns: number
      }
      _apply_advance: {
        Args: { p_customer_id: string; p_firm_id: string }
        Returns: number
      }
      _area_for_point: {
        Args: { p_company: string; p_lat: number; p_lng: number }
        Returns: string
      }
      _auto_plan: { Args: { p_company: string; p_date: string }; Returns: Json }
      _check_allocations: {
        Args: { p_allocations: Json; p_receipt_id: string }
        Returns: undefined
      }
      _cheque_row: {
        Args: { p_receipt_id: string }
        Returns: {
          amount: number
          bank_account_id: string | null
          bank_charges: number | null
          bounce_charge_note_id: string | null
          bounce_reason: string | null
          bounced_on: string | null
          cancel_reason: string | null
          cheque_bank: string | null
          cheque_date: string | null
          cheque_no: string | null
          cheque_photo_url: string | null
          cheque_status: string | null
          cleared_on: string | null
          collected_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          deposit_bank_account_id: string | null
          deposit_slip_path: string | null
          deposited_on: string | null
          firm_id: string
          id: string
          mode: string
          notes: string | null
          proof_name: string | null
          proof_path: string | null
          receipt_date: string
          receipt_no: string
          reference: string | null
          source: string
          status: string
          trip_collection_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "receipts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _create_orders: {
        Args: {
          p_customer_id: string
          p_delivery: Json
          p_lines: Json
          p_notes: string
          p_office: boolean
          p_source: string
        }
        Returns: Json
      }
      _create_receipt: {
        Args: {
          p_amount: number
          p_bank_account_id: string
          p_cheque_bank: string
          p_cheque_date: string
          p_cheque_no: string
          p_cheque_photo_url: string
          p_customer_id: string
          p_date: string
          p_firm_id: string
          p_mode: string
          p_notes: string
          p_reference: string
          p_source: string
          p_trip_collection_id: string
        }
        Returns: string
      }
      _doc_no: {
        Args: {
          p_fallback: string
          p_firm_id: string
          p_type: Database["public"]["Enums"]["doc_series_type"]
        }
        Returns: string
      }
      _fifo_allocate: { Args: { p_receipt_id: string }; Returns: number }
      _generate_invoice: {
        Args: { p_order_id: string; p_trip_id: string }
        Returns: string
      }
      _geo_rings: { Args: { b: Json }; Returns: Json[] }
      _hav_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      _is_my_trip: { Args: { p_trip_id: string }; Returns: boolean }
      _is_new_customer: {
        Args: { p_customer_id: string; p_except_order?: string }
        Returns: boolean
      }
      _is_trip_order: { Args: { p_order_id: string }; Returns: boolean }
      _next_order_no: { Args: { p_firm_id: string }; Returns: string }
      _open_bills: {
        Args: { p_customer_id: string; p_firm_id: string }
        Returns: {
          balance: number
          bill_date: string
          kind: string
          ref_id: string
        }[]
      }
      _optimise_trip: {
        Args: { p_method?: string; p_trip_id: string }
        Returns: undefined
      }
      _photo_days: {
        Args: { p_company: string; p_type: string }
        Returns: number
      }
      _photo_register: {
        Args: {
          p_amount: number
          p_base: string
          p_by: string
          p_company: string
          p_customer: string
          p_order: string
          p_path: string
          p_src: string
          p_src_id: string
          p_trip: string
          p_type: string
        }
        Returns: undefined
      }
      _pickup_for_customer: {
        Args: { p_cid: string; p_company: string }
        Returns: Json
      }
      _plan_candidates: {
        Args: { p_company: string; p_date: string }
        Returns: {
          area_id: string
          boxes: number
          company_id: string
          jars: number
          order_id: string
          reason: string
          route_id: string
          route_sort: number
          unit_id: string
          units: number
          vehicle_id: string
        }[]
      }
      _plan_candidates_load: {
        Args: { p_order_id: string }
        Returns: {
          boxes: number
          jars: number
          units: number
        }[]
      }
      _point_in_boundary: {
        Args: { p_boundary: Json; p_lat: number; p_lng: number }
        Returns: boolean
      }
      _price_lines:
        | {
            Args: { p_customer_id: string; p_lines: Json; p_office: boolean }
            Returns: Json
          }
        | {
            Args: {
              p_customer_id: string
              p_lines: Json
              p_mode: string
              p_office: boolean
            }
            Returns: Json
          }
      _receipt_alloc_snapshot: { Args: { p_receipt_id: string }; Returns: Json }
      _refresh_invoice_paid: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      _refresh_opening_paid: {
        Args: { p_opening_id: string }
        Returns: undefined
      }
      _set_order_status: {
        Args: {
          p_note: string
          p_order_id: string
          p_to: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      _stop_credit_note: { Args: { p_stop_id: string }; Returns: undefined }
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
      add_trip_expense: {
        Args: {
          p_amount: number
          p_bill_photo_url: string
          p_note?: string
          p_paid_from_cash?: boolean
          p_trip_id: string
          p_type: string
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
      ageing_report: {
        Args: { p_as_of?: string; p_firm_id?: string }
        Returns: {
          advance: number
          customer_code: string
          customer_id: string
          customer_name: string
          customer_type: string
          d0_30: number
          d31_60: number
          d61_90: number
          d90_plus: number
          not_due: number
          total_due: number
          zone_name: string
        }[]
      }
      allocate_receipt: {
        Args: { p_allocations?: Json; p_receipt_id: string }
        Returns: number
      }
      answer_ask_office: {
        Args: { p_alert_id: string; p_approve: boolean; p_note?: string }
        Returns: undefined
      }
      apply_customer_advances: {
        Args: { p_customer_id: string; p_firm_id: string }
        Returns: number
      }
      approve_customer: { Args: { p_customer_id: string }; Returns: undefined }
      approve_order: {
        Args: { p_note?: string; p_order_id: string }
        Returns: undefined
      }
      ask_office: {
        Args: {
          p_amount: number
          p_mode: string
          p_reason: string
          p_stop_id: string
          p_trip_id: string
        }
        Returns: string
      }
      ask_office_status: { Args: { p_alert_id: string }; Returns: Json }
      attach_upi_response: {
        Args: { p_proof_id: string; p_response: Json }
        Returns: undefined
      }
      auto_block_overdue_customers: { Args: never; Returns: number }
      auto_plan_trips: { Args: { p_date: string }; Returns: Json }
      bulk_approve_orders: { Args: { p_order_ids: string[] }; Returns: Json }
      bulk_update_plan_prices: {
        Args: {
          p_category_id?: string
          p_from: string
          p_percent: number
          p_plan_id: string
        }
        Returns: number
      }
      cancel_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: undefined
      }
      cancel_receipt: {
        Args: { p_reason: string; p_receipt_id: string }
        Returns: undefined
      }
      cancel_trip: {
        Args: { p_reason: string; p_trip_id: string }
        Returns: undefined
      }
      cash_deposit: {
        Args: {
          p_amount: number
          p_bank_account_id: string
          p_date?: string
          p_note?: string
          p_slip_path?: string
        }
        Returns: string
      }
      cashier_list: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      cc_assign_trip: {
        Args: {
          p_driver_user_id: string
          p_hired_driver_mobile?: string
          p_hired_driver_name?: string
          p_trip_id: string
          p_vehicle_id: string
        }
        Returns: Json
      }
      cc_cash_mismatch: {
        Args: { p_id: string; p_reason: string; p_received: number }
        Returns: undefined
      }
      cc_create_material_pass: {
        Args: {
          p_approved_by: string
          p_items: string
          p_party: string
          p_quantity: string
          p_reason: string
          p_valid_till: string
          p_vehicle_no: string
        }
        Returns: Json
      }
      cc_move_stops: {
        Args: { p_stop_ids: string[]; p_to_trip_id: string }
        Returns: number
      }
      cc_reject_credit_note: {
        Args: { p_note_id: string; p_reason: string }
        Returns: undefined
      }
      cc_resolve_gate_problem: {
        Args: { p_id: string; p_note: string }
        Returns: undefined
      }
      cc_set_stop_order: {
        Args: {
          p_est_km: number
          p_est_minutes: number
          p_method: string
          p_stop_ids: string[]
          p_trip_id: string
        }
        Returns: undefined
      }
      cc_unplanned_orders: {
        Args: { p_date: string }
        Returns: {
          area_id: string
          customer_name: string
          delivery_address: string
          order_id: string
          order_no: string
          reason: string
        }[]
      }
      cc_unzoned_addresses: {
        Args: never
        Returns: {
          address: string
          address_id: string
          customer_id: string
          customer_name: string
          label: string
          latitude: number
          longitude: number
          pincode: string
          updated_at: string
        }[]
      }
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
      check_pin_login: {
        Args: {
          p_device_id: string
          p_mobile: string
          p_pin: string
          p_user_type?: string
        }
        Returns: {
          out_email: string
          out_result: string
          out_user_id: string
        }[]
      }
      cheque_bounce: {
        Args: {
          p_charges?: number
          p_date?: string
          p_reason: string
          p_receipt_id: string
        }
        Returns: string
      }
      cheque_cleared: {
        Args: { p_date?: string; p_receipt_id: string }
        Returns: undefined
      }
      cheque_deposit: {
        Args: {
          p_bank_account_id: string
          p_date?: string
          p_receipt_id: string
          p_slip_path?: string
        }
        Returns: undefined
      }
      close_query: { Args: { p_query_id: string }; Returns: undefined }
      confirm_cash_handover: { Args: { p_id: string }; Returns: undefined }
      create_credit_debit_note: {
        Args: {
          p_gst_rate: number
          p_invoice_id: string
          p_reason: string
          p_taxable: number
          p_type: string
        }
        Returns: string
      }
      credit_status: {
        Args: { p_customer_id: string; p_firm_id?: string }
        Returns: {
          out_available: number
          out_block_reason: string
          out_blocked: boolean
          out_days: number
          out_limit: number
          out_oldest_overdue_days: number
          out_outstanding: number
          out_overdue: number
        }[]
      }
      current_session_id: { Args: never; Returns: string }
      customer_advance: {
        Args: { p_customer_id: string; p_firm_id?: string }
        Returns: number
      }
      customer_location: {
        Args: { p_customer_id: string }
        Returns: Record<string, unknown>
      }
      customer_open_bills: {
        Args: { p_customer_id: string; p_firm_id?: string }
        Returns: {
          balance: number
          bill_date: string
          days_overdue: number
          due_date: string
          kind: string
          paid: number
          ref_id: string
          ref_no: string
          total: number
        }[]
      }
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
      customer_statement: {
        Args: {
          p_customer_id: string
          p_firm_id?: string
          p_from: string
          p_to: string
        }
        Returns: {
          balance: number
          credit: number
          debit: number
          description: string
          entry_date: string
          entry_type: string
          ref_no: string
        }[]
      }
      decide_credit_note: {
        Args: { p_approve: boolean; p_note_id: string }
        Returns: string
      }
      default_delivery_mode: {
        Args: { p_customer_id: string }
        Returns: string
      }
      delete_my_address: { Args: { p_id: string }; Returns: undefined }
      deliver_stop: {
        Args: {
          p_fail_reason?: string
          p_lines: Json
          p_proof: Json
          p_stop_id: string
        }
        Returns: string
      }
      delivery_charge_per_pack: {
        Args: { p_customer_id: string }
        Returns: number
      }
      distributor_mark_delivered: {
        Args: { p_delivered: boolean; p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      distributor_respond: {
        Args: { p_accept: boolean; p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      driver_create_walkin_customer: {
        Args: {
          p_business_name?: string
          p_latitude?: number
          p_longitude?: number
          p_mobile: string
          p_name: string
          p_trip_id: string
        }
        Returns: Json
      }
      driver_find_customers: {
        Args: { p_q: string; p_trip_id: string }
        Returns: {
          address: string
          business_name: string
          contact_name: string
          customer_code: string
          id: string
          mobile: string
        }[]
      }
      driver_handover_stop: {
        Args: { p_note?: string; p_stop_id: string; p_to_trip_id: string }
        Returns: Json
      }
      driver_other_trips: {
        Args: { p_trip_id: string }
        Returns: {
          driver_name: string
          status: string
          trip_id: string
          trip_no: string
          vehicle_no: string
        }[]
      }
      edit_order: {
        Args: {
          p_changes?: Json
          p_lines: Json
          p_note?: string
          p_order_id: string
        }
        Returns: Json
      }
      end_trip: {
        Args: {
          p_odometer: number
          p_odometer_photo_url: string
          p_trip_id: string
        }
        Returns: undefined
      }
      express_order: {
        Args: { p_note?: string; p_order_id: string }
        Returns: undefined
      }
      finalize_loading: { Args: { p_trip_id: string }; Returns: Json }
      flag_load_mismatch: {
        Args: { p_note: string; p_trip_id: string }
        Returns: string
      }
      force_logout: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: number
      }
      free_stock: {
        Args: {
          p_company_id: string
          p_exclude_order?: string
          p_product_id: string
        }
        Returns: number
      }
      gate_change_guard: {
        Args: { p_mobile: string; p_pin: string; p_selfie: string }
        Returns: Json
      }
      gate_entry_in: { Args: { p: Json }; Returns: string }
      gate_entry_out: { Args: { p_entry_id: string }; Returns: undefined }
      gate_find_person: { Args: { p_mobile: string }; Returns: Json }
      gate_in: {
        Args: {
          p_fuel_amount?: number
          p_fuel_litres?: number
          p_manual?: boolean
          p_odometer?: number
          p_trip_id: string
        }
        Returns: undefined
      }
      gate_material_scan: { Args: { p_token: string }; Returns: undefined }
      gate_out: {
        Args: { p_odometer?: number; p_qr_token: string }
        Returns: string
      }
      gate_parcel_handover: {
        Args: { p_entry_id: string; p_received_by: string }
        Returns: undefined
      }
      gate_pickup_handover: {
        Args: { p_order_no: string; p_otp: string }
        Returns: string
      }
      gate_register: {
        Args: { p_from: string; p_kind?: string; p_to: string }
        Returns: {
          at: string
          by_name: string
          detail: string
          kind: string
          title: string
        }[]
      }
      gate_report_problem: {
        Args: { p_note: string; p_photo?: string; p_type: string }
        Returns: string
      }
      gate_scan_lookup: { Args: { p_token: string }; Returns: Json }
      gate_staff_list: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      gate_vehicles_out: {
        Args: never
        Returns: {
          driver: string
          ended: boolean
          gate_out_at: string
          reg_no: string
          trip_id: string
          trip_no: string
        }[]
      }
      geo_find_shape: {
        Args: { p_kind: string; p_name: string; p_state?: string }
        Returns: {
          aliases: string[]
          boundary: Json
          centre_lat: number | null
          centre_lng: number | null
          id: number
          kind: string
          name: string
          state_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "geo_shape_library"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_home: { Args: never; Returns: Json }
      has_perm: {
        Args: { p_action: string; p_module: string }
        Returns: boolean
      }
      is_demo_mobile: { Args: { p_mobile: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      job_auto_block_overdue: { Args: never; Returns: number }
      job_auto_plan_trips: { Args: never; Returns: number }
      job_missed_stops_check: { Args: never; Returns: number }
      job_release_dispatch_batches: { Args: never; Returns: number }
      job_reroute_stale_orders: { Args: never; Returns: number }
      log_location: {
        Args: {
          p_accuracy?: number
          p_battery?: number
          p_latitude: number
          p_longitude: number
          p_speed?: number
          p_trip_id: string
        }
        Returns: undefined
      }
      map_customers_by_pincode: { Args: never; Returns: number }
      mark_arrived: {
        Args: { p_latitude?: number; p_longitude?: number; p_stop_id: string }
        Returns: undefined
      }
      mark_photos_downloaded: {
        Args: { p_ids: string[]; p_zip_path: string }
        Returns: string
      }
      missed_stops_check: { Args: never; Returns: number }
      my_approval_limit: { Args: never; Returns: number }
      my_cash_to_confirm: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          from_name: string
          id: string
          note: string
          trip_no: string
        }[]
      }
      my_catalogue: {
        Args: never
        Returns: {
          brand_name: string
          bulk_threshold_qty: number
          can_order: boolean
          category_code: string
          category_id: string
          code: string
          default_delivery_mode: string
          delivered_price: number
          delivery_charge_per_pack: number
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
          pickup_price: number
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
      my_dashboard: { Args: never; Returns: Json }
      my_delivery_settings: {
        Args: never
        Returns: {
          allow_cash: boolean
          allow_cheque: boolean
          allow_extra_load: boolean
          allow_partial_delivery: boolean
          allow_pickup_only: boolean
          allow_spot_sale: boolean
          allow_upi: boolean
          arrived_button_enabled: boolean
          ask_office_no_reply: string
          ask_office_wait_minutes: number
          auto_credit_block_enabled: boolean
          collect_old_dues: boolean
          company_id: string
          default_language: string
          distributor_reply_minutes: number
          expense_bill_photo_required: boolean
          expense_limit_per_trip: number
          expense_types: string[]
          expenses_enabled: boolean
          failed_reasons: string[]
          gate_pass_print: boolean
          location_at_each_stop: boolean
          location_interval_minutes: number
          location_tracking_enabled: boolean
          photo_days_challan: number
          photo_days_cheque: number
          photo_days_delivery: number
          photo_days_odometer: number
          photo_days_problem: number
          photo_days_selfie: number
          photo_days_upi: number
          photo_days_visitor: number
          photo_delete_after_download: boolean
          proof_otp_enabled: boolean
          proof_otp_required: boolean
          proof_photo_enabled: boolean
          proof_photo_required: boolean
          proof_signature_enabled: boolean
          proof_signature_required: boolean
          require_end_odometer: boolean
          require_end_odometer_photo: boolean
          require_start_odometer: boolean
          require_start_odometer_photo: boolean
          require_start_selfie: boolean
          show_jar_balance: boolean
          show_outstanding: boolean
          sos_enabled: boolean
          updated_at: string
          updated_by: string | null
          vehicle_check_enabled: boolean
          vehicle_check_every_days: number
          vehicle_check_frequency: string
          vehicle_check_items: string[]
          visitor_alert_hours: number
          visitor_photo: string
          walkin_customer_type_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "delivery_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_devices: {
        Args: never
        Returns: {
          device_id: string
          device_label: string
          last_used_at: string
          trusted_at: string
        }[]
      }
      my_khata_statement: {
        Args: { p_from: string; p_to: string }
        Returns: {
          balance: number
          credit: number
          debit: number
          description: string
          entry_date: string
          entry_type: string
          invoice_id: string
          order_id: string
          ref_no: string
        }[]
      }
      my_khata_summary: { Args: never; Returns: Json }
      my_order_truck: {
        Args: { p_order_id: string }
        Returns: {
          latitude: number
          longitude: number
          recorded_at: string
        }[]
      }
      my_permissions: {
        Args: never
        Returns: {
          action: string
          module: string
        }[]
      }
      my_product: { Args: { p_id: string }; Returns: Json }
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
      next_release_time: {
        Args: { p_company: string; p_from?: string; p_zone: string }
        Returns: string
      }
      order_payment_hold: { Args: { p_order_id: string }; Returns: boolean }
      order_stock_shortage: {
        Args: { p_order_id: string }
        Returns: {
          free: number
          needed: number
          product_id: string
          product_name: string
        }[]
      }
      payment_reference_used: {
        Args: { p_exclude_proof?: string; p_reference: string }
        Returns: {
          amount: number
          customer_name: string
          kind: string
          on_date: string
          ref_no: string
          status: string
        }[]
      }
      pending_ask_office: {
        Args: never
        Returns: {
          alert_id: string
          customer: string
          deadline: string
          driver: string
          order_no: string
          raised_at: string
          request: Json
          stop_id: string
          trip_id: string
          trip_no: string
        }[]
      }
      photo_backup_index: {
        Args: { p_ids: string[] }
        Returns: {
          amount: number
          customer_name: string
          file_name: string
          folder: string
          id: string
          order_no: string
          path: string
          photo_type: string
          taken_by_name: string
          taken_on: string
          trip_no: string
        }[]
      }
      photo_cleanup_done: {
        Args: { p_errors?: Json; p_ids: string[] }
        Returns: number
      }
      photo_cleanup_due: {
        Args: { p_limit?: number }
        Returns: {
          bucket: string
          id: string
          path: string
        }[]
      }
      photo_cleanup_plan: { Args: never; Returns: string }
      photos_expiring: {
        Args: { p_days?: number }
        Returns: {
          amount: number
          customer_name: string
          downloaded_at: string
          expires_on: string
          id: string
          order_no: string
          path: string
          photo_type: string
          taken_at: string
          taken_by_name: string
          trip_no: string
        }[]
      }
      place_my_order: {
        Args: { p_delivery?: Json; p_lines: Json; p_notes?: string }
        Returns: Json
      }
      place_order_for_customer: {
        Args: {
          p_customer_id: string
          p_delivery?: Json
          p_lines: Json
          p_notes?: string
          p_source?: string
        }
        Returns: Json
      }
      plan_price: {
        Args: {
          p_city_id?: string
          p_on?: string
          p_plan_id: string
          p_product_id: string
          p_zone_id?: string
        }
        Returns: number
      }
      plan_trip: {
        Args: {
          p_allow_short?: boolean
          p_customer_vehicle_no?: string
          p_driver_user_id: string
          p_helper_ids?: string[]
          p_hired_driver_mobile?: string
          p_hired_driver_name?: string
          p_order_ids: string[]
          p_route_id?: string
          p_trip_date: string
          p_trip_type?: string
          p_unit_id: string
          p_vehicle_id: string
        }
        Returns: string
      }
      price_plan_for_customer: {
        Args: { p_customer_id: string }
        Returns: string
      }
      price_preview: {
        Args: { p_customer_id: string; p_on?: string }
        Returns: {
          code: string
          delivered_price: number
          delivery_charge_per_pack: number
          mrp: number
          name: string
          plan_name: string
          price: number
          price_source: string
          product_id: string
        }[]
      }
      public_app_info: { Args: never; Returns: Json }
      quote_my_order: {
        Args: { p_lines: Json; p_mode?: string }
        Returns: Json
      }
      raise_trip_alert: {
        Args: {
          p_latitude?: number
          p_longitude?: number
          p_note: string
          p_trip_id: string
          p_type: string
        }
        Returns: string
      }
      rate_my_order: {
        Args: {
          p_comment?: string
          p_order_id: string
          p_rating: number
          p_tags?: string[]
        }
        Returns: undefined
      }
      reallocate_receipt:
        | {
            Args: { p_allocations: Json; p_receipt_id: string }
            Returns: number
          }
        | {
            Args: {
              p_allocations: Json
              p_reason: string
              p_receipt_id: string
            }
            Returns: Json
          }
      receive_returns: {
        Args: { p_lines: Json; p_note?: string; p_trip_id: string }
        Returns: undefined
      }
      record_cash_handover: {
        Args: {
          p_amount: number
          p_note?: string
          p_to_user_id: string
          p_trip_id?: string
        }
        Returns: string
      }
      record_collection:
        | {
            Args: {
              p_amount: number
              p_collected_by?: string
              p_customer_id: string
              p_firm_id?: string
              p_method: string
              p_paid_on?: string
              p_reference?: string
              p_source?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_mode: string
              p_photo_url?: string
              p_reference?: string
              p_stop_id: string
            }
            Returns: string
          }
      record_due_collection: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_mode: string
          p_photo_url?: string
          p_reference?: string
          p_stop_id?: string
          p_trip_id: string
        }
        Returns: string
      }
      record_loading: {
        Args: {
          p_crates?: number
          p_loaded_qty: number
          p_photo_url?: string
          p_product_id: string
          p_trip_id: string
        }
        Returns: undefined
      }
      record_login: {
        Args: { p_login_method?: string; p_user_agent?: string }
        Returns: undefined
      }
      record_logout: { Args: never; Returns: undefined }
      record_pickup: {
        Args: {
          p_customer_id: string
          p_latitude?: number
          p_longitude?: number
          p_photo_url?: string
          p_product_id: string
          p_qty: number
          p_trip_id: string
        }
        Returns: string
      }
      record_receipt: {
        Args: {
          p_allocations?: Json
          p_amount: number
          p_bank_account_id?: string
          p_cheque_bank?: string
          p_cheque_date?: string
          p_cheque_no?: string
          p_cheque_photo_url?: string
          p_customer_id: string
          p_date?: string
          p_firm_id: string
          p_mode: string
          p_notes?: string
          p_reference?: string
        }
        Returns: Json
      }
      record_stock: {
        Args: {
          p_note?: string
          p_product_id: string
          p_qty: number
          p_type: string
          p_unit_id: string
        }
        Returns: number
      }
      reject_customer: {
        Args: { p_customer_id: string; p_reason: string }
        Returns: undefined
      }
      reject_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: undefined
      }
      remove_order_from_trip: {
        Args: { p_order_id: string; p_reason?: string; p_trip_id: string }
        Returns: undefined
      }
      reoptimise_trip: { Args: { p_trip_id: string }; Returns: Json }
      reply_query: {
        Args: {
          p_attachment_name?: string
          p_attachment_path?: string
          p_message?: string
          p_query_id: string
        }
        Returns: undefined
      }
      reroute_order: {
        Args: { p_distributor_id?: string; p_note?: string; p_order_id: string }
        Returns: undefined
      }
      reroute_stale_distributor_orders: {
        Args: { p_minutes?: number }
        Returns: number
      }
      reset_my_dashboard: { Args: never; Returns: undefined }
      resolve_trip_alert: {
        Args: { p_alert_id: string; p_resolution: string }
        Returns: undefined
      }
      review_payment_proof: {
        Args: {
          p_id: string
          p_reason?: string
          p_receipt_id?: string
          p_verified: boolean
        }
        Returns: undefined
      }
      review_trip_expense: {
        Args: { p_approve: boolean; p_expense_id: string }
        Returns: undefined
      }
      revoke_my_device: { Args: { p_device_id: string }; Returns: undefined }
      revoke_user_devices: { Args: { p_user_id: string }; Returns: number }
      run_op: {
        Args: { p_args: Json; p_op_id: string; p_rpc: string }
        Returns: Json
      }
      save_my_address: {
        Args: {
          p_address_line1: string
          p_address_line2?: string
          p_city?: string
          p_contact_mobile?: string
          p_contact_name?: string
          p_id: string
          p_is_default?: boolean
          p_label: string
          p_landmark?: string
          p_latitude?: number
          p_longitude?: number
          p_pincode?: string
          p_state?: string
        }
        Returns: string
      }
      save_my_preferences: {
        Args: { p_dashboard?: Json; p_sidebar?: Json }
        Returns: undefined
      }
      save_my_push_token: {
        Args: {
          p_app?: string
          p_device_id: string
          p_language?: string
          p_platform?: string
          p_token: string
        }
        Returns: undefined
      }
      save_trip_order: {
        Args: {
          p_est_km: number
          p_est_minutes: number
          p_method?: string
          p_stop_ids: string[]
          p_trip_id: string
        }
        Returns: undefined
      }
      scope_ok: { Args: { p_id: string; p_type: string }; Returns: boolean }
      set_cash_opening: {
        Args: { p_amount: number; p_as_of: string }
        Returns: undefined
      }
      set_cheque_status: {
        Args: { p_note?: string; p_receipt_id: string; p_status: string }
        Returns: undefined
      }
      set_extra_load: {
        Args: { p_product_id: string; p_qty: number; p_trip_id: string }
        Returns: undefined
      }
      set_my_order_address: {
        Args: { p_address_id: string; p_order_ids: string[] }
        Returns: undefined
      }
      set_my_pin: {
        Args: { p_device_id: string; p_device_label?: string; p_pin: string }
        Returns: undefined
      }
      set_opening_balance: {
        Args: {
          p_amount: number
          p_as_of: string
          p_customer_id: string
          p_firm_id: string
          p_note?: string
        }
        Returns: undefined
      }
      set_opening_jars: {
        Args: { p_customer_id: string; p_product_id: string; p_qty: number }
        Returns: undefined
      }
      set_order_delivery_mode: {
        Args: { p_mode: string; p_order_id: string; p_vehicle_no?: string }
        Returns: undefined
      }
      set_order_payment_method: {
        Args: { p_method: string; p_order_ids: string[] }
        Returns: undefined
      }
      set_order_status: {
        Args: {
          p_note?: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      set_receipt_details: {
        Args: {
          p_collected_by?: string
          p_proof_name?: string
          p_proof_path?: string
          p_receipt_id: string
        }
        Returns: undefined
      }
      set_stop_later: {
        Args: { p_later: boolean; p_stop_id: string }
        Returns: undefined
      }
      set_user_active: {
        Args: { p_active: boolean; p_user_id: string }
        Returns: undefined
      }
      settle_trip: {
        Args: { p_cash_received: number; p_note?: string; p_trip_id: string }
        Returns: Json
      }
      spot_sale: {
        Args: {
          p_customer_id: string
          p_latitude?: number
          p_lines: Json
          p_longitude?: number
          p_paid_now: boolean
          p_trip_id: string
        }
        Returns: Json
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
      start_trip: {
        Args: {
          p_check_photo_url?: string
          p_odometer: number
          p_odometer_photo_url: string
          p_selfie_url: string
          p_trip_id: string
          p_vehicle_check?: Json
        }
        Returns: undefined
      }
      stock_available: {
        Args: { p_product_id: string; p_unit_id: string }
        Returns: number
      }
      stock_book: {
        Args: { p_from: string; p_to: string; p_unit_id: string }
        Returns: {
          adjust: number
          available: number
          closing: number
          dispatched: number
          opening: number
          product_id: string
          product_name: string
          production: number
          reorder_level: number
          reserved: number
          returns: number
          status: string
        }[]
      }
      stock_reserved: {
        Args: { p_product_id: string; p_unit_id: string }
        Returns: number
      }
      stop_contact_phone: { Args: { p_stop_id: string }; Returns: string }
      stop_customer_summary: {
        Args: { p_customer_id: string; p_trip_id: string }
        Returns: Json
      }
      stop_take_udhaar: {
        Args: { p_amount: number; p_stop_id: string }
        Returns: boolean
      }
      stop_udhaar_check: {
        Args: { p_stop_id: string }
        Returns: {
          allowed: boolean
          available: number
          blocked: boolean
          days: number
          overdue: number
        }[]
      }
      submit_my_payment: {
        Args: {
          p_amount: number
          p_cash_paid_to?: string
          p_cash_paid_to_name?: string
          p_cheque_bank?: string
          p_cheque_date?: string
          p_cheque_no?: string
          p_method: string
          p_paid_on?: string
          p_reference?: string
          p_screenshot_path?: string
        }
        Returns: string
      }
      submit_payment_proof: {
        Args: {
          p_amount: number
          p_method: string
          p_order_id?: string
          p_paid_on?: string
          p_reference?: string
          p_screenshot_path?: string
        }
        Returns: string
      }
      submit_registration: { Args: never; Returns: undefined }
      tally_export: {
        Args: { p_firm_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      toggle_favourite: { Args: { p_product_id: string }; Returns: boolean }
      transfer_stock: {
        Args: {
          p_from_unit: string
          p_note?: string
          p_product_id: string
          p_qty: number
          p_to_unit: string
        }
        Returns: undefined
      }
      trip_return_expected: {
        Args: { p_trip_id: string }
        Returns: {
          expected_qty: number
          kind: string
          product_id: string
        }[]
      }
      update_my_profile: {
        Args: { p_full_name: string; p_language?: string; p_photo_url?: string }
        Returns: undefined
      }
      verify_payment_proof: {
        Args: { p_allocations?: Json; p_firm_id?: string; p_id: string }
        Returns: Json
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
        | "trip"
      order_status:
        | "placed"
        | "credit_hold"
        | "approved"
        | "processing"
        | "dispatched"
        | "delivered"
        | "closed"
        | "cancelled"
        | "rejected"
      otp_channel: "whatsapp" | "email"
      otp_purpose: "app_login" | "staff_2fa"
      query_status: "open" | "answered" | "closed"
      sell_unit: "piece" | "pack" | "case" | "crate" | "jar" | "can"
      trip_status:
        | "planned"
        | "loading"
        | "loaded"
        | "in_progress"
        | "returned"
        | "settled"
        | "cancelled"
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
        "trip",
      ],
      order_status: [
        "placed",
        "credit_hold",
        "approved",
        "processing",
        "dispatched",
        "delivered",
        "closed",
        "cancelled",
        "rejected",
      ],
      otp_channel: ["whatsapp", "email"],
      otp_purpose: ["app_login", "staff_2fa"],
      query_status: ["open", "answered", "closed"],
      sell_unit: ["piece", "pack", "case", "crate", "jar", "can"],
      trip_status: [
        "planned",
        "loading",
        "loaded",
        "in_progress",
        "returned",
        "settled",
        "cancelled",
      ],
      unit_type: ["plant", "depot", "copacker", "jar_unit", "office"],
      user_type: ["staff", "customer"],
    },
  },
} as const
