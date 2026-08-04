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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_items: {
        Row: {
          agenda_id: string
          description: string | null
          document_id: string | null
          estimated_minutes: number | null
          from_template_item_id: string | null
          id: string
          order_index: number
          owner_id: string | null
          title: string
        }
        Insert: {
          agenda_id: string
          description?: string | null
          document_id?: string | null
          estimated_minutes?: number | null
          from_template_item_id?: string | null
          id?: string
          order_index: number
          owner_id?: string | null
          title: string
        }
        Update: {
          agenda_id?: string
          description?: string | null
          document_id?: string | null
          estimated_minutes?: number | null
          from_template_item_id?: string | null
          id?: string
          order_index?: number
          owner_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_templates: {
        Row: {
          created_at: string
          created_by: string | null
          department_slug: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_templates_department_slug_fkey"
            columns: ["department_slug"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["slug"]
          },
        ]
      }
      agendas: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          meeting_id: string
          published_at: string | null
          status: string
          title: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id: string
          published_at?: string | null
          status?: string
          title: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id?: string
          published_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendas_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_query_log: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          query_text: string
          response_text: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          query_text: string
          response_text?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          query_text?: string
          response_text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_query_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_query_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_query_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_comments: {
        Row: {
          announcement_id: string
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          announcement_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          announcement_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_likes: {
        Row: {
          announcement_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_likes_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_media: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          media_type: string
          media_url: string
          sort_order: number
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
          sort_order?: number
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "announcement_media_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_shares: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_shares_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_views: {
        Row: {
          announcement_id: string
          first_viewed_at: string
          id: string
          user_id: string
          view_date: string
        }
        Insert: {
          announcement_id: string
          first_viewed_at?: string
          id?: string
          user_id: string
          view_date?: string
        }
        Update: {
          announcement_id?: string
          first_viewed_at?: string
          id?: string
          user_id?: string
          view_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          author_department_slug: string | null
          author_id: string
          body: string
          created_at: string
          id: string
          priority: boolean
          target_branch: Database["public"]["Enums"]["post_branch_target"]
          title: string | null
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_department_slug?: string | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          priority?: boolean
          target_branch?: Database["public"]["Enums"]["post_branch_target"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_department_slug?: string | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          priority?: boolean
          target_branch?: Database["public"]["Enums"]["post_branch_target"]
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_user_connections: {
        Row: {
          connected_at: string
          connected_email: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          connected_email?: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          connected_email?: string | null
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      approvals: {
        Row: {
          approver_id: string
          comments: string | null
          decided_at: string | null
          entity_id: string
          entity_type: string
          id: string
          status: Database["public"]["Enums"]["approval_status"]
          step_order: number
        }
        Insert: {
          approver_id: string
          comments?: string | null
          decided_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          step_order?: number
        }
        Update: {
          approver_id?: string
          comments?: string | null
          decided_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          status?: Database["public"]["Enums"]["approval_status"]
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_logs: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          description: string | null
          id: string
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_stock_movements: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          movement_type: string
          performed_by: string | null
          quantity_after: number
          quantity_change: number
          reason: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          movement_type: string
          performed_by?: string | null
          quantity_after: number
          quantity_change: number
          reason?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          movement_type?: string
          performed_by?: string | null
          quantity_after?: number
          quantity_change?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_stock_movements_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_stock_movements_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_suppliers: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          lead_time_days: number | null
          notes: string | null
          quoted_price: number | null
          supplier_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          quoted_price?: number | null
          supplier_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          quoted_price?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_suppliers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_suppliers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_code: string | null
          barcode: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string
          created_by: string | null
          current_value: number | null
          custodian: string | null
          department_slug: string | null
          depreciation_rate: number | null
          description: string | null
          document_urls: Json
          facility_id: string | null
          id: string
          insurance_status: string | null
          is_bookable: boolean
          last_maintenance_alert_sent_at: string | null
          lifecycle_status: string | null
          location: string | null
          model: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          photo_urls: Json
          primary_supplier_id: string | null
          purchase_date: string | null
          purchase_value: number | null
          qr_token: string
          quantity_on_hand: number
          reorder_level: number | null
          room_number: string | null
          serial_number: string | null
          status: string
          unit_of_measure: string | null
          updated_at: string
          warranty_expiry: string | null
        }
        Insert: {
          asset_code?: string | null
          barcode?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          custodian?: string | null
          department_slug?: string | null
          depreciation_rate?: number | null
          description?: string | null
          document_urls?: Json
          facility_id?: string | null
          id?: string
          insurance_status?: string | null
          is_bookable?: boolean
          last_maintenance_alert_sent_at?: string | null
          lifecycle_status?: string | null
          location?: string | null
          model?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          photo_urls?: Json
          primary_supplier_id?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          qr_token?: string
          quantity_on_hand?: number
          reorder_level?: number | null
          room_number?: string | null
          serial_number?: string | null
          status?: string
          unit_of_measure?: string | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Update: {
          asset_code?: string | null
          barcode?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          custodian?: string | null
          department_slug?: string | null
          depreciation_rate?: number | null
          description?: string | null
          document_urls?: Json
          facility_id?: string | null
          id?: string
          insurance_status?: string | null
          is_bookable?: boolean
          last_maintenance_alert_sent_at?: string | null
          lifecycle_status?: string | null
          location?: string | null
          model?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          photo_urls?: Json
          primary_supplier_id?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          qr_token?: string
          quantity_on_hand?: number
          reorder_level?: number | null
          room_number?: string | null
          serial_number?: string | null
          status?: string
          unit_of_measure?: string | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_primary_supplier_id_fkey"
            columns: ["primary_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          contact: string | null
          created_at: string
          department_slug: string | null
          event_id: string | null
          full_name: string | null
          id: string
          is_new_member: boolean
          notes: string | null
          present: boolean
          recorded_by: string
          service_date: string
          updated_at: string
          user_id: string | null
          visitor: boolean
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          contact?: string | null
          created_at?: string
          department_slug?: string | null
          event_id?: string | null
          full_name?: string | null
          id?: string
          is_new_member?: boolean
          notes?: string | null
          present?: boolean
          recorded_by: string
          service_date: string
          updated_at?: string
          user_id?: string | null
          visitor?: boolean
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          contact?: string | null
          created_at?: string
          department_slug?: string | null
          event_id?: string | null
          full_name?: string | null
          id?: string
          is_new_member?: boolean
          notes?: string | null
          present?: boolean
          recorded_by?: string
          service_date?: string
          updated_at?: string
          user_id?: string | null
          visitor?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      bank_statements: {
        Row: {
          account_name: string
          branch: Database["public"]["Enums"]["branch"] | null
          closing_balance: number
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          imported_by: string
          opening_balance: number
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          account_name: string
          branch?: Database["public"]["Enums"]["branch"] | null
          closing_balance?: number
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          imported_by: string
          opening_balance?: number
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          branch?: Database["public"]["Enums"]["branch"] | null
          closing_balance?: number
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          imported_by?: string
          opening_balance?: number
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          direction: string
          id: string
          match_status: string
          matched_at: string | null
          matched_by: string | null
          matched_entry_id: string | null
          reference: string | null
          statement_id: string
          txn_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          direction?: string
          id?: string
          match_status?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_entry_id?: string | null
          reference?: string | null
          statement_id: string
          txn_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          direction?: string
          id?: string
          match_status?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_entry_id?: string | null
          reference?: string | null
          statement_id?: string
          txn_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_matched_entry_id_fkey"
            columns: ["matched_entry_id"]
            isOneToOne: false
            referencedRelation: "finance_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_reports: {
        Row: {
          branch: Database["public"]["Enums"]["branch"]
          data: Json
          department_slug: string | null
          id: string
          period_end: string
          period_start: string
          report_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          branch: Database["public"]["Enums"]["branch"]
          data?: Json
          department_slug?: string | null
          id?: string
          period_end: string
          period_start: string
          report_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"]
          data?: Json
          department_slug?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_reports_department_slug_fkey"
            columns: ["department_slug"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "branch_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          budget_id: string
          category: string
          created_at: string
          id: string
          line_type: string
          notes: string | null
          planned_amount: number
          updated_at: string
        }
        Insert: {
          budget_id: string
          category: string
          created_at?: string
          id?: string
          line_type?: string
          notes?: string | null
          planned_amount?: number
          updated_at?: string
        }
        Update: {
          budget_id?: string
          category?: string
          created_at?: string
          id?: string
          line_type?: string
          notes?: string | null
          planned_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_revisions: {
        Row: {
          budget_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_amount: number | null
          new_status: string | null
          previous_amount: number | null
          previous_status: string | null
          reason: string | null
          version: number
        }
        Insert: {
          budget_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_amount?: number | null
          new_status?: string | null
          previous_amount?: number | null
          previous_status?: string | null
          reason?: string | null
          version: number
        }
        Update: {
          budget_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_amount?: number | null
          new_status?: string | null
          previous_amount?: number | null
          previous_status?: string | null
          reason?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_revisions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          budget_type: string
          created_at: string
          created_by: string | null
          department_slug: string | null
          fiscal_year: number
          id: string
          locked_at: string | null
          name: string
          notes: string | null
          status: string
          total_amount: number
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_type?: string
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          fiscal_year: number
          id?: string
          locked_at?: string | null
          name: string
          notes?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_type?: string
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          fiscal_year?: number
          id?: string
          locked_at?: string | null
          name?: string
          notes?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      calendar_sync_log: {
        Row: {
          attempts: number
          connector_id: string
          created_at: string
          error_message: string | null
          event_id: string | null
          id: string
          next_retry_at: string | null
          operation: string
          provider_response: Json | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          connector_id: string
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          next_retry_at?: string | null
          operation: string
          provider_response?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          connector_id?: string
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          next_retry_at?: string | null
          operation?: string
          provider_response?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_map: {
        Row: {
          connector_id: string
          created_at: string
          event_id: string
          external_calendar_id: string | null
          external_event_etag: string | null
          external_event_id: string
          id: string
          last_synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connector_id: string
          created_at?: string
          event_id: string
          external_calendar_id?: string | null
          external_event_etag?: string | null
          external_event_id: string
          id?: string
          last_synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connector_id?: string
          created_at?: string
          event_id?: string
          external_calendar_id?: string | null
          external_event_etag?: string | null
          external_event_id?: string
          id?: string
          last_synced_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_map_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      child_checkins: {
        Row: {
          allergies: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          checked_in_at: string
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          child_name: string
          classroom: string | null
          department_slug: string
          guardian_contact: string
          guardian_name: string
          id: string
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          checked_in_at?: string
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          child_name: string
          classroom?: string | null
          department_slug: string
          guardian_contact: string
          guardian_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          checked_in_at?: string
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          child_name?: string
          classroom?: string | null
          department_slug?: string
          guardian_contact?: string
          guardian_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      child_guardians: {
        Row: {
          can_pickup: boolean
          child_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_emergency: boolean
          is_primary: boolean
          phone: string | null
          profile_id: string | null
          relationship: string | null
        }
        Insert: {
          can_pickup?: boolean
          child_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_emergency?: boolean
          is_primary?: boolean
          phone?: string | null
          profile_id?: string | null
          relationship?: string | null
        }
        Update: {
          can_pickup?: boolean
          child_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_emergency?: boolean
          is_primary?: boolean
          phone?: string | null
          profile_id?: string | null
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_guardians_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          address: string | null
          age_group: string | null
          allergies: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          child_code: string
          classroom_id: string | null
          consent_media: boolean
          consent_medical: boolean
          consent_signed_at: string | null
          consent_signed_by: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          medical_conditions: string | null
          medication: string | null
          nickname: string | null
          notes: string | null
          photo_url: string | null
          pin: string | null
          special_needs: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          age_group?: string | null
          allergies?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          child_code?: string
          classroom_id?: string | null
          consent_media?: boolean
          consent_medical?: boolean
          consent_signed_at?: string | null
          consent_signed_by?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          medical_conditions?: string | null
          medication?: string | null
          nickname?: string | null
          notes?: string | null
          photo_url?: string | null
          pin?: string | null
          special_needs?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          age_group?: string | null
          allergies?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          child_code?: string
          classroom_id?: string | null
          consent_media?: boolean
          consent_medical?: boolean
          consent_signed_at?: string | null
          consent_signed_by?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          medical_conditions?: string | null
          medication?: string | null
          nickname?: string | null
          notes?: string | null
          photo_url?: string | null
          pin?: string | null
          special_needs?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_classroom_fk"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "kids_classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          action_plan: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          coach_id: string | null
          created_at: string
          created_by: string | null
          department_slug: string | null
          follow_up_date: string | null
          growth_plan: string | null
          id: string
          leader_id: string
          notes: string | null
          rating: number | null
          session_date: string
          session_type: string
          status: string
          topics: string | null
          updated_at: string
        }
        Insert: {
          action_plan?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          follow_up_date?: string | null
          growth_plan?: string | null
          id?: string
          leader_id: string
          notes?: string | null
          rating?: number | null
          session_date?: string
          session_type?: string
          status?: string
          topics?: string | null
          updated_at?: string
        }
        Update: {
          action_plan?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          coach_id?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          follow_up_date?: string | null
          growth_plan?: string | null
          id?: string
          leader_id?: string
          notes?: string | null
          rating?: number | null
          session_date?: string
          session_type?: string
          status?: string
          topics?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cockpit_post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cockpit_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cockpit_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cockpit_posts: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          author_id: string
          body: string
          created_at: string
          id: string
          target_branch: Database["public"]["Enums"]["post_branch_target"]
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          target_branch?: Database["public"]["Enums"]["post_branch_target"]
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          target_branch?: Database["public"]["Enums"]["post_branch_target"]
          updated_at?: string
        }
        Relationships: []
      }
      compliance_alerts: {
        Row: {
          alert_type: string
          compliance_item_id: string
          id: string
          recipient_id: string | null
          sent_at: string
        }
        Insert: {
          alert_type: string
          compliance_item_id: string
          id?: string
          recipient_id?: string | null
          sent_at?: string
        }
        Update: {
          alert_type?: string
          compliance_item_id?: string
          id?: string
          recipient_id?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_alerts_compliance_item_id_fkey"
            columns: ["compliance_item_id"]
            isOneToOne: false
            referencedRelation: "compliance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alerts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alerts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alerts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          created_at: string
          created_by: string | null
          department_slug: string | null
          due_date: string | null
          id: string
          owner_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          risk_score: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category: string
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          risk_score?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          risk_score?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_department_slug_fkey"
            columns: ["department_slug"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "compliance_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      correspondence: {
        Row: {
          assigned_to: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          category: string | null
          corr_type: string
          created_at: string
          created_by: string | null
          department_slug: string | null
          direction: string
          due_date: string | null
          id: string
          priority: string
          recipient: string | null
          reference_number: string
          responded_at: string | null
          sender: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string | null
          corr_type: string
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          direction: string
          due_date?: string | null
          id?: string
          priority?: string
          recipient?: string | null
          reference_number: string
          responded_at?: string | null
          sender?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string | null
          corr_type?: string
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          direction?: string
          due_date?: string | null
          id?: string
          priority?: string
          recipient?: string | null
          reference_number?: string
          responded_at?: string | null
          sender?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_department_slug_fkey"
            columns: ["department_slug"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["slug"]
          },
        ]
      }
      correspondence_attachments: {
        Row: {
          correspondence_id: string
          document_id: string
          id: string
        }
        Insert: {
          correspondence_id: string
          document_id: string
          id?: string
        }
        Update: {
          correspondence_id?: string
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_attachments_correspondence_id_fkey"
            columns: ["correspondence_id"]
            isOneToOne: false
            referencedRelation: "correspondence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      correspondence_responses: {
        Row: {
          correspondence_id: string
          document_id: string | null
          id: string
          responded_at: string
          responded_by: string | null
          response_text: string | null
        }
        Insert: {
          correspondence_id: string
          document_id?: string | null
          id?: string
          responded_at?: string
          responded_by?: string | null
          response_text?: string | null
        }
        Update: {
          correspondence_id?: string
          document_id?: string | null
          id?: string
          responded_at?: string
          responded_by?: string | null
          response_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_responses_correspondence_id_fkey"
            columns: ["correspondence_id"]
            isOneToOne: false
            referencedRelation: "correspondence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_responses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_responses_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_responses_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_responses_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string | null
          department_slug: string
          description: string | null
          id: string
          title: string
          total_lessons: number
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          department_slug: string
          description?: string | null
          id?: string
          title: string
          total_lessons?: number
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          department_slug?: string
          description?: string | null
          id?: string
          title?: string
          total_lessons?: number
          updated_at?: string
        }
        Relationships: []
      }
      department_chat_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          department_slug: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          department_slug: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          department_slug?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_chat_messages_department_slug_fkey"
            columns: ["department_slug"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["slug"]
          },
        ]
      }
      department_resources: {
        Row: {
          created_at: string
          department_slug: string
          description: string | null
          file_url: string
          id: string
          storage_path: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          department_slug: string
          description?: string | null
          file_url: string
          id?: string
          storage_path?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          department_slug?: string
          description?: string | null
          file_url?: string
          id?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          archived: boolean
          chair_name: string | null
          created_at: string
          functions: string[] | null
          kind: Database["public"]["Enums"]["dept_kind"]
          mission: string | null
          name: string
          overseer_name: string | null
          parent_slug: string | null
          purpose: string | null
          scripture: string | null
          slug: string
          sort_order: number
          updated_at: string
          vision: string | null
        }
        Insert: {
          archived?: boolean
          chair_name?: string | null
          created_at?: string
          functions?: string[] | null
          kind: Database["public"]["Enums"]["dept_kind"]
          mission?: string | null
          name: string
          overseer_name?: string | null
          parent_slug?: string | null
          purpose?: string | null
          scripture?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          vision?: string | null
        }
        Update: {
          archived?: boolean
          chair_name?: string | null
          created_at?: string
          functions?: string[] | null
          kind?: Database["public"]["Enums"]["dept_kind"]
          mission?: string | null
          name?: string
          overseer_name?: string | null
          parent_slug?: string | null
          purpose?: string | null
          scripture?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_slug_fkey"
            columns: ["parent_slug"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["slug"]
          },
        ]
      }
      digital_signatures: {
        Row: {
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          signature_data: string
          signed_at: string
          signer_id: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          signature_data: string
          signed_at?: string
          signer_id: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          signature_data?: string
          signed_at?: string
          signer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      document_permissions: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          document_id: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          document_id: string
          id?: string
          permission: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          document_id?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_read_confirmations: {
        Row: {
          confirmed_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_read_confirmations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_read_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_read_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_read_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          document_id: string
          file_name: string | null
          file_url: string
          id: string
          notes: string | null
          storage_path: string | null
          uploaded_at: string
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          document_id: string
          file_name?: string | null
          file_url: string
          id?: string
          notes?: string | null
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          document_id?: string
          file_name?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approval_date: string | null
          created_at: string
          department_slug: string | null
          description: string | null
          doc_category: string | null
          doc_number: string | null
          effective_date: string | null
          expiry_date: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          policy_type: string | null
          review_date: string | null
          status: string
          storage_path: string
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string
          version: string
        }
        Insert: {
          approval_date?: string | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          doc_category?: string | null
          doc_number?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          policy_type?: string | null
          review_date?: string | null
          status?: string
          storage_path: string
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by: string
          version?: string
        }
        Update: {
          approval_date?: string | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          doc_category?: string | null
          doc_number?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          policy_type?: string | null
          review_date?: string | null
          status?: string
          storage_path?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          version?: string
        }
        Relationships: []
      }
      editorial_posts: {
        Row: {
          approved_by: string | null
          asset_url: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string | null
          department_slug: string
          id: string
          platform: string
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          asset_url?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          department_slug: string
          id?: string
          platform: string
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          asset_url?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          department_slug?: string
          id?: string
          platform?: string
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          certificate_url: string | null
          course_id: string
          enrolled_at: string
          id: string
          lessons_completed: number
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          lessons_completed?: number
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          lessons_completed?: number
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_id: string
          external_event_id: string | null
          id: string
          provider: string | null
          reminder_minutes_before: number | null
          rsvp_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          external_event_id?: string | null
          id?: string
          provider?: string | null
          reminder_minutes_before?: number | null
          rsvp_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          external_event_id?: string | null
          id?: string
          provider?: string | null
          reminder_minutes_before?: number | null
          rsvp_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rosters: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          full_name: string | null
          id: string
          notes: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          full_name?: string | null
          id?: string
          notes?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rosters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string
          department_slug: string | null
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string
          id: string
          is_recurring: boolean
          location: string | null
          parent_event_id: string | null
          recurrence_end_date: string | null
          recurrence_interval: number
          recurrence_pattern: string | null
          start_time: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by: string
          department_slug?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_recurring?: boolean
          location?: string | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number
          recurrence_pattern?: string | null
          start_time?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string
          department_slug?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_recurring?: boolean
          location?: string | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number
          recurrence_pattern?: string | null
          start_time?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_claims: {
        Row: {
          amount: number
          approved_by_chair: string | null
          approved_by_senior: string | null
          archived_at: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          claim_type: string | null
          claimant_id: string
          created_at: string
          department_slug: string
          description: string
          id: string
          ministry: string | null
          paid_at: string | null
          receipt_url: string | null
          reference_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by_chair?: string | null
          approved_by_senior?: string | null
          archived_at?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          claim_type?: string | null
          claimant_id: string
          created_at?: string
          department_slug: string
          description: string
          id?: string
          ministry?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by_chair?: string | null
          approved_by_senior?: string | null
          archived_at?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          claim_type?: string | null
          claimant_id?: string
          created_at?: string
          department_slug?: string
          description?: string
          id?: string
          ministry?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          category: string | null
          created_at: string
          created_by: string
          department_slug: string
          entry_date: string
          file_name: string | null
          file_url: string | null
          id: string
          kind: string
          member_id: string | null
          ministry: string | null
          notes: string | null
          posting_date: string | null
          reference_number: string | null
          status: string
          title: string
          transaction_no: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string | null
          created_at?: string
          created_by: string
          department_slug?: string
          entry_date?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          kind: string
          member_id?: string | null
          ministry?: string | null
          notes?: string | null
          posting_date?: string | null
          reference_number?: string | null
          status?: string
          title: string
          transaction_no?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string | null
          created_at?: string
          created_by?: string
          department_slug?: string
          entry_date?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          kind?: string
          member_id?: string | null
          ministry?: string | null
          notes?: string | null
          posting_date?: string | null
          reference_number?: string | null
          status?: string
          title?: string
          transaction_no?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_approvals: {
        Row: {
          amount: number | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_comment: string | null
          department_slug: string | null
          detail: string | null
          document_url: string | null
          id: string
          item_type: string
          reference: string | null
          signature_name: string | null
          status: string
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          department_slug?: string | null
          detail?: string | null
          document_url?: string | null
          id?: string
          item_type: string
          reference?: string | null
          signature_name?: string | null
          status?: string
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          department_slug?: string | null
          detail?: string | null
          document_url?: string | null
          id?: string
          item_type?: string
          reference?: string | null
          signature_name?: string | null
          status?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_decisions: {
        Row: {
          ai_summary: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          completion_date: string | null
          created_at: string
          created_by: string | null
          decision_date: string
          decision_number: string | null
          department_slug: string | null
          detail: string | null
          document_url: string | null
          due_date: string | null
          evidence: string | null
          id: string
          implementation_pct: number
          meeting_id: string | null
          owner_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          decision_date?: string
          decision_number?: string | null
          department_slug?: string | null
          detail?: string | null
          document_url?: string | null
          due_date?: string | null
          evidence?: string | null
          id?: string
          implementation_pct?: number
          meeting_id?: string | null
          owner_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          decision_date?: string
          decision_number?: string | null
          department_slug?: string | null
          detail?: string | null
          document_url?: string | null
          due_date?: string | null
          evidence?: string | null
          id?: string
          implementation_pct?: number
          meeting_id?: string | null
          owner_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_decisions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_decisions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_decisions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_documents: {
        Row: {
          created_at: string
          file_url: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      governance_risks: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          department_slug: string | null
          description: string
          escalation_level: string
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner_id: string | null
          rating: number | null
          review_date: string | null
          risk_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          description: string
          escalation_level?: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_id?: string | null
          rating?: number | null
          review_date?: string | null
          risk_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          description?: string
          escalation_level?: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_id?: string | null
          rating?: number | null
          review_date?: string | null
          risk_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hos_courses: {
        Row: {
          created_at: string
          description: string | null
          document_url: string | null
          duration_hours: number | null
          id: string
          required: boolean
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          duration_hours?: number | null
          id?: string
          required?: boolean
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          duration_hours?: number | null
          id?: string
          required?: boolean
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      hos_events: {
        Row: {
          actual_spend: number
          branch: Database["public"]["Enums"]["branch"] | null
          budget_amount: number
          catering_notes: string | null
          checklist: Json
          created_at: string
          created_by: string | null
          ends_at: string | null
          equipment_needed: string | null
          event_type: string
          expected_attendance: number
          id: string
          readiness_pct: number
          risk_notes: string | null
          seating_notes: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          venue: string | null
          vip_guests: string | null
          volunteers_assigned: string | null
        }
        Insert: {
          actual_spend?: number
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_amount?: number
          catering_notes?: string | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          equipment_needed?: string | null
          event_type?: string
          expected_attendance?: number
          id?: string
          readiness_pct?: number
          risk_notes?: string | null
          seating_notes?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          venue?: string | null
          vip_guests?: string | null
          volunteers_assigned?: string | null
        }
        Update: {
          actual_spend?: number
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_amount?: number
          catering_notes?: string | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          equipment_needed?: string | null
          event_type?: string
          expected_attendance?: number
          id?: string
          readiness_pct?: number
          risk_notes?: string | null
          seating_notes?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          venue?: string | null
          vip_guests?: string | null
          volunteers_assigned?: string | null
        }
        Relationships: []
      }
      hos_guests: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string | null
          dietary_requirements: string | null
          email: string | null
          family_name: string | null
          feedback: string | null
          first_visit_date: string | null
          follow_up_owner_id: string | null
          follow_up_status: string
          full_name: string
          id: string
          interests: string | null
          invited_by: string | null
          notes: string | null
          phone: string | null
          satisfaction_score: number | null
          special_needs: string | null
          updated_at: string
          vip: boolean
          visits: number
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          dietary_requirements?: string | null
          email?: string | null
          family_name?: string | null
          feedback?: string | null
          first_visit_date?: string | null
          follow_up_owner_id?: string | null
          follow_up_status?: string
          full_name: string
          id?: string
          interests?: string | null
          invited_by?: string | null
          notes?: string | null
          phone?: string | null
          satisfaction_score?: number | null
          special_needs?: string | null
          updated_at?: string
          vip?: boolean
          visits?: number
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          dietary_requirements?: string | null
          email?: string | null
          family_name?: string | null
          feedback?: string | null
          first_visit_date?: string | null
          follow_up_owner_id?: string | null
          follow_up_status?: string
          full_name?: string
          id?: string
          interests?: string | null
          invited_by?: string | null
          notes?: string | null
          phone?: string | null
          satisfaction_score?: number | null
          special_needs?: string | null
          updated_at?: string
          vip?: boolean
          visits?: number
        }
        Relationships: []
      }
      hos_inventory: {
        Row: {
          assigned_to: string | null
          category: string
          condition: string | null
          created_at: string
          expiry_date: string | null
          id: string
          item_code: string | null
          max_stock: number | null
          min_stock: number
          name: string
          purchase_date: string | null
          quantity: number
          storage_location: string | null
          supplier: string | null
          unit: string | null
          unit_value: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_code?: string | null
          max_stock?: number | null
          min_stock?: number
          name: string
          purchase_date?: string | null
          quantity?: number
          storage_location?: string | null
          supplier?: string | null
          unit?: string | null
          unit_value?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_code?: string | null
          max_stock?: number | null
          min_stock?: number
          name?: string
          purchase_date?: string | null
          quantity?: number
          storage_location?: string | null
          supplier?: string | null
          unit?: string | null
          unit_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      hos_inventory_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          moved_by: string | null
          movement_type: string
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          moved_by?: string | null
          movement_type?: string
          quantity?: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          moved_by?: string | null
          movement_type?: string
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hos_inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "hos_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      hos_menus: {
        Row: {
          cleaning_checklist: Json
          created_at: string
          created_by: string | null
          dietary_options: string | null
          estimated_servings: number
          food_cost: number
          hygiene_checked: boolean
          id: string
          kitchen_team: string | null
          menu_items: string | null
          name: string
          notes: string | null
          service_date: string
          serving_time: string | null
          updated_at: string
          waste_note: string | null
        }
        Insert: {
          cleaning_checklist?: Json
          created_at?: string
          created_by?: string | null
          dietary_options?: string | null
          estimated_servings?: number
          food_cost?: number
          hygiene_checked?: boolean
          id?: string
          kitchen_team?: string | null
          menu_items?: string | null
          name: string
          notes?: string | null
          service_date?: string
          serving_time?: string | null
          updated_at?: string
          waste_note?: string | null
        }
        Update: {
          cleaning_checklist?: Json
          created_at?: string
          created_by?: string | null
          dietary_options?: string | null
          estimated_servings?: number
          food_cost?: number
          hygiene_checked?: boolean
          id?: string
          kitchen_team?: string | null
          menu_items?: string | null
          name?: string
          notes?: string | null
          service_date?: string
          serving_time?: string | null
          updated_at?: string
          waste_note?: string | null
        }
        Relationships: []
      }
      hos_risks: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner_name: string | null
          review_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hos_tasks: {
        Row: {
          assigned_to: string | null
          assignee_name: string | null
          checklist: Json
          comments: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          evidence_url: string | null
          id: string
          priority: string
          progress_pct: number
          recurring: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assignee_name?: string | null
          checklist?: Json
          comments?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          evidence_url?: string | null
          id?: string
          priority?: string
          progress_pct?: number
          recurring?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assignee_name?: string | null
          checklist?: Json
          comments?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          evidence_url?: string | null
          id?: string
          priority?: string
          progress_pct?: number
          recurring?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hos_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hos_events"
            referencedColumns: ["id"]
          },
        ]
      }
      hos_training_records: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          member_name: string | null
          progress_pct: number
          score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          member_name?: string | null
          progress_pct?: number
          score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          member_name?: string | null
          progress_pct?: number
          score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hos_training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "hos_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      hos_volunteers: {
        Row: {
          active: boolean
          attendance_pct: number
          availability: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          current_assignment: string | null
          email: string | null
          emergency_contact: string | null
          food_handling_certificate: boolean
          full_name: string
          id: string
          medical_notes: string | null
          performance_note: string | null
          phone: string | null
          recognition_points: number
          reliability_score: number
          role: string
          serving_since: string | null
          skills: string | null
          training_completed: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          attendance_pct?: number
          availability?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          current_assignment?: string | null
          email?: string | null
          emergency_contact?: string | null
          food_handling_certificate?: boolean
          full_name: string
          id?: string
          medical_notes?: string | null
          performance_note?: string | null
          phone?: string | null
          recognition_points?: number
          reliability_score?: number
          role?: string
          serving_since?: string | null
          skills?: string | null
          training_completed?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          attendance_pct?: number
          availability?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          current_assignment?: string | null
          email?: string | null
          emergency_contact?: string | null
          food_handling_certificate?: boolean
          full_name?: string
          id?: string
          medical_notes?: string | null
          performance_note?: string | null
          phone?: string | null
          recognition_points?: number
          reliability_score?: number
          role?: string
          serving_since?: string | null
          skills?: string | null
          training_completed?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hospitality_checkups: {
        Row: {
          attendance_id: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          checked: boolean
          checked_at: string | null
          checked_by: string | null
          contact: string | null
          created_at: string
          feedback: string | null
          id: string
          member_name: string
          window_end: string
          window_start: string
        }
        Insert: {
          attendance_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          contact?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          member_name: string
          window_end: string
          window_start: string
        }
        Update: {
          attendance_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          contact?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          member_name?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitality_checkups_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
        ]
      }
      int_chain_slots: {
        Row: {
          chain_id: string
          covered: boolean
          created_at: string
          id: string
          intercessor_id: string | null
          intercessor_name: string | null
          missed: boolean
          notes: string | null
          slot_end: string
          slot_start: string
        }
        Insert: {
          chain_id: string
          covered?: boolean
          created_at?: string
          id?: string
          intercessor_id?: string | null
          intercessor_name?: string | null
          missed?: boolean
          notes?: string | null
          slot_end: string
          slot_start: string
        }
        Update: {
          chain_id?: string
          covered?: boolean
          created_at?: string
          id?: string
          intercessor_id?: string | null
          intercessor_name?: string | null
          missed?: boolean
          notes?: string | null
          slot_end?: string
          slot_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "int_chain_slots_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "int_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      int_chains: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          focus: string | null
          id: string
          leader_id: string | null
          name: string
          notes: string | null
          slot_minutes: number
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          focus?: string | null
          id?: string
          leader_id?: string | null
          name: string
          notes?: string | null
          slot_minutes?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          focus?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          notes?: string | null
          slot_minutes?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      int_courses: {
        Row: {
          created_at: string
          description: string | null
          document_url: string | null
          duration_hours: number | null
          id: string
          required: boolean
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          duration_hours?: number | null
          id?: string
          required?: boolean
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          duration_hours?: number | null
          id?: string
          required?: boolean
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      int_fast_participants: {
        Row: {
          created_at: string
          days_completed: number
          fast_id: string
          id: string
          participant_name: string | null
          reflections: string | null
          spiritual_goal: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          days_completed?: number
          fast_id: string
          id?: string
          participant_name?: string | null
          reflections?: string | null
          spiritual_goal?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          days_completed?: number
          fast_id?: string
          id?: string
          participant_name?: string | null
          reflections?: string | null
          spiritual_goal?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "int_fast_participants_fast_id_fkey"
            columns: ["fast_id"]
            isOneToOne: false
            referencedRelation: "int_fasts"
            referencedColumns: ["id"]
          },
        ]
      }
      int_fasts: {
        Row: {
          created_at: string
          created_by: string | null
          daily_scriptures: string | null
          end_date: string
          fast_type: string
          id: string
          name: string
          prayer_points: string | null
          purpose: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_scriptures?: string | null
          end_date: string
          fast_type?: string
          id?: string
          name: string
          prayer_points?: string | null
          purpose?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_scriptures?: string | null
          end_date?: string
          fast_type?: string
          id?: string
          name?: string
          prayer_points?: string | null
          purpose?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      int_journal: {
        Row: {
          attachment_url: string | null
          body: string | null
          created_at: string
          entry_date: string
          entry_type: string
          id: string
          mood: string | null
          scriptures: string | null
          shared_with_leadership: boolean
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          mood?: string | null
          scriptures?: string | null
          shared_with_leadership?: boolean
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          mood?: string | null
          scriptures?: string | null
          shared_with_leadership?: boolean
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      int_meetings: {
        Row: {
          action_items: string | null
          attendance_count: number
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string | null
          declarations: string | null
          ends_at: string | null
          expected_count: number
          host: string | null
          id: string
          leader_id: string | null
          meeting_type: string
          minutes: string | null
          prayer_focus: string | null
          prayer_hours: number
          recording_url: string | null
          recurrence: string | null
          scriptures: string | null
          starts_at: string
          status: string
          testimonies: string | null
          title: string
          topics: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          action_items?: string | null
          attendance_count?: number
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          declarations?: string | null
          ends_at?: string | null
          expected_count?: number
          host?: string | null
          id?: string
          leader_id?: string | null
          meeting_type?: string
          minutes?: string | null
          prayer_focus?: string | null
          prayer_hours?: number
          recording_url?: string | null
          recurrence?: string | null
          scriptures?: string | null
          starts_at: string
          status?: string
          testimonies?: string | null
          title: string
          topics?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          action_items?: string | null
          attendance_count?: number
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          declarations?: string | null
          ends_at?: string | null
          expected_count?: number
          host?: string | null
          id?: string
          leader_id?: string | null
          meeting_type?: string
          minutes?: string | null
          prayer_focus?: string | null
          prayer_hours?: number
          recording_url?: string | null
          recurrence?: string | null
          scriptures?: string | null
          starts_at?: string
          status?: string
          testimonies?: string | null
          title?: string
          topics?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      int_requests: {
        Row: {
          answer_note: string | null
          answered_at: string | null
          archived: boolean
          assigned_department: string | null
          assigned_to: string | null
          attachment_url: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          confidential: boolean
          created_at: string
          description: string | null
          email: string | null
          escalated: boolean
          follow_up_date: string | null
          follow_up_required: boolean
          id: string
          is_anonymous: boolean
          leadership_only: boolean
          phone: string | null
          prayer_duration_days: number | null
          prayer_no: string | null
          priority: string
          requester_id: string | null
          requester_name: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          answer_note?: string | null
          answered_at?: string | null
          archived?: boolean
          assigned_department?: string | null
          assigned_to?: string | null
          attachment_url?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          confidential?: boolean
          created_at?: string
          description?: string | null
          email?: string | null
          escalated?: boolean
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          is_anonymous?: boolean
          leadership_only?: boolean
          phone?: string | null
          prayer_duration_days?: number | null
          prayer_no?: string | null
          priority?: string
          requester_id?: string | null
          requester_name?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          answer_note?: string | null
          answered_at?: string | null
          archived?: boolean
          assigned_department?: string | null
          assigned_to?: string | null
          attachment_url?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          confidential?: boolean
          created_at?: string
          description?: string | null
          email?: string | null
          escalated?: boolean
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          is_anonymous?: boolean
          leadership_only?: boolean
          phone?: string | null
          prayer_duration_days?: number | null
          prayer_no?: string | null
          priority?: string
          requester_id?: string | null
          requester_name?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      int_risks: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner_id: string | null
          owner_name: string | null
          review_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_id?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_id?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      int_team_members: {
        Row: {
          active: boolean
          attendance_pct: number
          availability: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          certificates: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          performance_note: string | null
          phone: string | null
          prayer_watch: string | null
          role: string
          safeguarding_cleared: boolean
          skills: string | null
          spiritual_gifts: string | null
          training_status: string | null
          updated_at: string
          user_id: string | null
          years_serving: number | null
        }
        Insert: {
          active?: boolean
          attendance_pct?: number
          availability?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          certificates?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          performance_note?: string | null
          phone?: string | null
          prayer_watch?: string | null
          role?: string
          safeguarding_cleared?: boolean
          skills?: string | null
          spiritual_gifts?: string | null
          training_status?: string | null
          updated_at?: string
          user_id?: string | null
          years_serving?: number | null
        }
        Update: {
          active?: boolean
          attendance_pct?: number
          availability?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          certificates?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          performance_note?: string | null
          phone?: string | null
          prayer_watch?: string | null
          role?: string
          safeguarding_cleared?: boolean
          skills?: string | null
          spiritual_gifts?: string | null
          training_status?: string | null
          updated_at?: string
          user_id?: string | null
          years_serving?: number | null
        }
        Relationships: []
      }
      int_training_records: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          member_name: string | null
          progress_pct: number
          score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          member_name?: string | null
          progress_pct?: number
          score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          member_name?: string | null
          progress_pct?: number
          score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "int_training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "int_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_accounts: {
        Row: {
          access_token: string
          calendar_id: string | null
          connected_at: string
          drive_folder_id: string | null
          id: string
          provider: string
          refresh_token: string
          scopes: string[]
          token_expires_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          connected_at?: string
          drive_folder_id?: string | null
          id?: string
          provider: string
          refresh_token: string
          scopes?: string[]
          token_expires_at: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          connected_at?: string
          drive_folder_id?: string | null
          id?: string
          provider?: string
          refresh_token?: string
          scopes?: string[]
          token_expires_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kids_certifications: {
        Row: {
          cert_type: string
          certificate_url: string | null
          created_at: string
          expires_on: string | null
          hours: number
          id: string
          issued_on: string | null
          notes: string | null
          status: string
          volunteer_id: string
        }
        Insert: {
          cert_type: string
          certificate_url?: string | null
          created_at?: string
          expires_on?: string | null
          hours?: number
          id?: string
          issued_on?: string | null
          notes?: string | null
          status?: string
          volunteer_id: string
        }
        Update: {
          cert_type?: string
          certificate_url?: string | null
          created_at?: string
          expires_on?: string | null
          hours?: number
          id?: string
          issued_on?: string | null
          notes?: string | null
          status?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_certifications_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "kids_volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_checkins: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          checked_in_at: string
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          child_id: string
          classroom_id: string | null
          created_at: string
          id: string
          is_first_time: boolean
          late_arrival: boolean
          method: string
          notes: string | null
          released_to: string | null
          service_date: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          checked_in_at?: string
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          child_id: string
          classroom_id?: string | null
          created_at?: string
          id?: string
          is_first_time?: boolean
          late_arrival?: boolean
          method?: string
          notes?: string | null
          released_to?: string | null
          service_date?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          checked_in_at?: string
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          child_id?: string
          classroom_id?: string | null
          created_at?: string
          id?: string
          is_first_time?: boolean
          late_arrival?: boolean
          method?: string
          notes?: string | null
          released_to?: string | null
          service_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_checkins_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_checkins_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "kids_classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_classrooms: {
        Row: {
          active: boolean
          age_max: number | null
          age_min: number | null
          assistant_id: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          capacity: number
          created_at: string
          id: string
          name: string
          notes: string | null
          room: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          age_max?: number | null
          age_min?: number | null
          assistant_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          capacity?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          room?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          age_max?: number | null
          age_min?: number | null
          assistant_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          room?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kids_family_engagement: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          child_id: string | null
          created_at: string
          engaged_on: string
          engagement_type: string
          family_name: string | null
          feedback: string | null
          id: string
          participation_score: number | null
          recorded_by: string | null
          summary: string | null
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          child_id?: string | null
          created_at?: string
          engaged_on?: string
          engagement_type?: string
          family_name?: string | null
          feedback?: string | null
          id?: string
          participation_score?: number | null
          recorded_by?: string | null
          summary?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          child_id?: string | null
          created_at?: string
          engaged_on?: string
          engagement_type?: string
          family_name?: string | null
          feedback?: string | null
          id?: string
          participation_score?: number | null
          recorded_by?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kids_family_engagement_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_incidents: {
        Row: {
          action_taken: string | null
          assigned_to: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          child_id: string | null
          classroom_id: string | null
          created_at: string
          description: string
          id: string
          incident_type: string
          occurred_at: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          child_id?: string | null
          classroom_id?: string | null
          created_at?: string
          description: string
          id?: string
          incident_type?: string
          occurred_at?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          child_id?: string | null
          classroom_id?: string | null
          created_at?: string
          description?: string
          id?: string
          incident_type?: string
          occurred_at?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_incidents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_incidents_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "kids_classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_lesson_delivery: {
        Row: {
          attendance_count: number
          classroom_id: string | null
          created_at: string
          delivered_on: string
          id: string
          lesson_id: string
          memory_verses_completed: number
          notes: string | null
          parent_summary_sent: boolean
          taught_by: string | null
        }
        Insert: {
          attendance_count?: number
          classroom_id?: string | null
          created_at?: string
          delivered_on?: string
          id?: string
          lesson_id: string
          memory_verses_completed?: number
          notes?: string | null
          parent_summary_sent?: boolean
          taught_by?: string | null
        }
        Update: {
          attendance_count?: number
          classroom_id?: string | null
          created_at?: string
          delivered_on?: string
          id?: string
          lesson_id?: string
          memory_verses_completed?: number
          notes?: string | null
          parent_summary_sent?: boolean
          taught_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kids_lesson_delivery_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "kids_classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_lesson_delivery_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "kids_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_lessons: {
        Row: {
          activities: string | null
          age_group: string | null
          assessment: string | null
          crafts: string | null
          created_at: string
          created_by: string | null
          discussion_questions: string | null
          games: string | null
          homework: string | null
          id: string
          memory_verse: string | null
          objectives: string | null
          resources_url: string | null
          scheduled_date: string | null
          scripture: string | null
          songs: string | null
          status: string
          teaching_notes: string | null
          theme: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          activities?: string | null
          age_group?: string | null
          assessment?: string | null
          crafts?: string | null
          created_at?: string
          created_by?: string | null
          discussion_questions?: string | null
          games?: string | null
          homework?: string | null
          id?: string
          memory_verse?: string | null
          objectives?: string | null
          resources_url?: string | null
          scheduled_date?: string | null
          scripture?: string | null
          songs?: string | null
          status?: string
          teaching_notes?: string | null
          theme?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          activities?: string | null
          age_group?: string | null
          assessment?: string | null
          crafts?: string | null
          created_at?: string
          created_by?: string | null
          discussion_questions?: string | null
          games?: string | null
          homework?: string | null
          id?: string
          memory_verse?: string | null
          objectives?: string | null
          resources_url?: string | null
          scheduled_date?: string | null
          scripture?: string | null
          songs?: string | null
          status?: string
          teaching_notes?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      kids_milestones: {
        Row: {
          achieved_on: string
          child_id: string
          created_at: string
          detail: string | null
          id: string
          milestone_type: string
          recorded_by: string | null
        }
        Insert: {
          achieved_on?: string
          child_id: string
          created_at?: string
          detail?: string | null
          id?: string
          milestone_type: string
          recorded_by?: string | null
        }
        Update: {
          achieved_on?: string
          child_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          milestone_type?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kids_milestones_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_volunteers: {
        Row: {
          availability: string | null
          background_check_expiry: string | null
          background_check_status: string
          branch: Database["public"]["Enums"]["branch"] | null
          classroom_id: string | null
          created_at: string
          emergency_contact: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          role_title: string | null
          safeguarding_expiry: string | null
          services_attended: number
          services_missed: number
          skills: string | null
          status: string
          total_hours: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability?: string | null
          background_check_expiry?: string | null
          background_check_status?: string
          branch?: Database["public"]["Enums"]["branch"] | null
          classroom_id?: string | null
          created_at?: string
          emergency_contact?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          role_title?: string | null
          safeguarding_expiry?: string | null
          services_attended?: number
          services_missed?: number
          skills?: string | null
          status?: string
          total_hours?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability?: string | null
          background_check_expiry?: string | null
          background_check_status?: string
          branch?: Database["public"]["Enums"]["branch"] | null
          classroom_id?: string | null
          created_at?: string
          emergency_contact?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          role_title?: string | null
          safeguarding_expiry?: string | null
          services_attended?: number
          services_missed?: number
          skills?: string | null
          status?: string
          total_hours?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kids_volunteers_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "kids_classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      kingdom_projects: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          department_slug: string
          description: string | null
          id: string
          owner_id: string | null
          stage: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          department_slug: string
          description?: string | null
          id?: string
          owner_id?: string | null
          stage?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          department_slug?: string
          description?: string | null
          id?: string
          owner_id?: string | null
          stage?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpis: {
        Row: {
          actual: number | null
          baseline: number | null
          branch: Database["public"]["Enums"]["branch"] | null
          category: Database["public"]["Enums"]["kpi_category"]
          department_slug: string
          entered_at: string
          entered_by: string | null
          id: string
          kpi_name: string
          last_alert_sent_at: string | null
          notes: string | null
          period_date: string
          period_type: Database["public"]["Enums"]["kpi_period"]
          target: number | null
          updated_at: string
        }
        Insert: {
          actual?: number | null
          baseline?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category: Database["public"]["Enums"]["kpi_category"]
          department_slug: string
          entered_at?: string
          entered_by?: string | null
          id?: string
          kpi_name: string
          last_alert_sent_at?: string | null
          notes?: string | null
          period_date: string
          period_type: Database["public"]["Enums"]["kpi_period"]
          target?: number | null
          updated_at?: string
        }
        Update: {
          actual?: number | null
          baseline?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: Database["public"]["Enums"]["kpi_category"]
          department_slug?: string
          entered_at?: string
          entered_by?: string | null
          id?: string
          kpi_name?: string
          last_alert_sent_at?: string | null
          notes?: string | null
          period_date?: string
          period_type?: Database["public"]["Enums"]["kpi_period"]
          target?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_department_slug_fkey"
            columns: ["department_slug"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["slug"]
          },
        ]
      }
      leader_profiles: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          burnout_risk: string
          calling_assessment: string | null
          certificates: number
          competency_notes: string | null
          courses_completed: number
          created_at: string
          department_slug: string | null
          id: string
          last_coached_on: string | null
          leadership_journey: string | null
          leadership_role: string | null
          mentor_id: string | null
          mentorship_plan: string | null
          promotion_readiness: string
          readiness_score: number
          spiritual_gifts: string | null
          succession_status: string
          training_history: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          burnout_risk?: string
          calling_assessment?: string | null
          certificates?: number
          competency_notes?: string | null
          courses_completed?: number
          created_at?: string
          department_slug?: string | null
          id?: string
          last_coached_on?: string | null
          leadership_journey?: string | null
          leadership_role?: string | null
          mentor_id?: string | null
          mentorship_plan?: string | null
          promotion_readiness?: string
          readiness_score?: number
          spiritual_gifts?: string | null
          succession_status?: string
          training_history?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          burnout_risk?: string
          calling_assessment?: string | null
          certificates?: number
          competency_notes?: string | null
          courses_completed?: number
          created_at?: string
          department_slug?: string | null
          id?: string
          last_coached_on?: string | null
          leadership_journey?: string | null
          leadership_role?: string | null
          mentor_id?: string | null
          mentorship_plan?: string | null
          promotion_readiness?: string
          readiness_score?: number
          spiritual_gifts?: string | null
          succession_status?: string
          training_history?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leader_profiles_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_profiles_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_profiles_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      med_analytics: {
        Row: {
          captured_on: string
          created_at: string
          created_by: string | null
          engagement_rate: number
          followers: number
          id: string
          impressions: number
          period_label: string
          platform: string
          reach: number
          updated_at: string
          views: number
          watch_minutes: number
          website_visits: number
        }
        Insert: {
          captured_on?: string
          created_at?: string
          created_by?: string | null
          engagement_rate?: number
          followers?: number
          id?: string
          impressions?: number
          period_label: string
          platform?: string
          reach?: number
          updated_at?: string
          views?: number
          watch_minutes?: number
          website_visits?: number
        }
        Update: {
          captured_on?: string
          created_at?: string
          created_by?: string | null
          engagement_rate?: number
          followers?: number
          id?: string
          impressions?: number
          period_label?: string
          platform?: string
          reach?: number
          updated_at?: string
          views?: number
          watch_minutes?: number
          website_visits?: number
        }
        Relationships: []
      }
      med_assets: {
        Row: {
          asset_type: string
          brand_approved: boolean
          captured_on: string | null
          category: string
          created_at: string
          created_by: string | null
          credited_to: string | null
          event_name: string | null
          file_url: string | null
          id: string
          license_expires_on: string | null
          ministry: string | null
          speaker: string | null
          tags: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          version_note: string | null
        }
        Insert: {
          asset_type?: string
          brand_approved?: boolean
          captured_on?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          credited_to?: string | null
          event_name?: string | null
          file_url?: string | null
          id?: string
          license_expires_on?: string | null
          ministry?: string | null
          speaker?: string | null
          tags?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          version_note?: string | null
        }
        Update: {
          asset_type?: string
          brand_approved?: boolean
          captured_on?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          credited_to?: string | null
          event_name?: string | null
          file_url?: string | null
          id?: string
          license_expires_on?: string | null
          ministry?: string | null
          speaker?: string | null
          tags?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          version_note?: string | null
        }
        Relationships: []
      }
      med_courses: {
        Row: {
          created_at: string
          description: string | null
          document_url: string | null
          duration_hours: number | null
          id: string
          required: boolean
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          duration_hours?: number | null
          id?: string
          required?: boolean
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          duration_hours?: number | null
          id?: string
          required?: boolean
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      med_livestreams: {
        Row: {
          checklist: Json
          created_at: string
          created_by: string | null
          id: string
          peak_viewers: number
          platform: string
          recording_url: string | null
          starts_at: string | null
          status: string
          stream_quality: string | null
          stream_type: string
          technical_issues: string | null
          title: string
          updated_at: string
          viewers: number
          watch_minutes: number
        }
        Insert: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          peak_viewers?: number
          platform?: string
          recording_url?: string | null
          starts_at?: string | null
          status?: string
          stream_quality?: string | null
          stream_type?: string
          technical_issues?: string | null
          title: string
          updated_at?: string
          viewers?: number
          watch_minutes?: number
        }
        Update: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          peak_viewers?: number
          platform?: string
          recording_url?: string | null
          starts_at?: string | null
          status?: string
          stream_quality?: string | null
          stream_type?: string
          technical_issues?: string | null
          title?: string
          updated_at?: string
          viewers?: number
          watch_minutes?: number
        }
        Relationships: []
      }
      med_posts: {
        Row: {
          asset_url: string | null
          campaign: string | null
          caption: string | null
          clicks: number
          comments_count: number
          created_at: string
          created_by: string | null
          engagements: number
          hashtags: string | null
          id: string
          impressions: number
          platform: string
          reach: number
          scheduled_at: string | null
          shares: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          asset_url?: string | null
          campaign?: string | null
          caption?: string | null
          clicks?: number
          comments_count?: number
          created_at?: string
          created_by?: string | null
          engagements?: number
          hashtags?: string | null
          id?: string
          impressions?: number
          platform?: string
          reach?: number
          scheduled_at?: string | null
          shares?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          asset_url?: string | null
          campaign?: string | null
          caption?: string | null
          clicks?: number
          comments_count?: number
          created_at?: string
          created_by?: string | null
          engagements?: number
          hashtags?: string | null
          id?: string
          impressions?: number
          platform?: string
          reach?: number
          scheduled_at?: string | null
          shares?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      med_projects: {
        Row: {
          archived: boolean
          assigned_team: string | null
          checklist: Json
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          ministry: string | null
          name: string
          priority: string
          progress_pct: number
          project_type: string
          publish_date: string | null
          publish_url: string | null
          request_id: string | null
          shoot_date: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          assigned_team?: string | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          ministry?: string | null
          name: string
          priority?: string
          progress_pct?: number
          project_type?: string
          publish_date?: string | null
          publish_url?: string | null
          request_id?: string | null
          shoot_date?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          assigned_team?: string | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          ministry?: string | null
          name?: string
          priority?: string
          progress_pct?: number
          project_type?: string
          publish_date?: string | null
          publish_url?: string | null
          request_id?: string | null
          shoot_date?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "med_projects_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "med_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      med_requests: {
        Row: {
          approval_history: Json
          approval_stage: string
          assigned_to: string | null
          attachment_url: string | null
          audience: string | null
          created_at: string
          department_slug: string | null
          description: string | null
          id: string
          needed_by: string | null
          priority: string
          published_at: string | null
          request_type: string
          requester_id: string | null
          requester_name: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approval_history?: Json
          approval_stage?: string
          assigned_to?: string | null
          attachment_url?: string | null
          audience?: string | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          id?: string
          needed_by?: string | null
          priority?: string
          published_at?: string | null
          request_type?: string
          requester_id?: string | null
          requester_name?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approval_history?: Json
          approval_stage?: string
          assigned_to?: string | null
          attachment_url?: string | null
          audience?: string | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          id?: string
          needed_by?: string | null
          priority?: string
          published_at?: string | null
          request_type?: string
          requester_id?: string | null
          requester_name?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      med_risks: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner_name: string | null
          review_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      med_training_records: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          expires_on: string | null
          id: string
          member_name: string | null
          progress_pct: number
          score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          expires_on?: string | null
          id?: string
          member_name?: string | null
          progress_pct?: number
          score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          expires_on?: string | null
          id?: string
          member_name?: string | null
          progress_pct?: number
          score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "med_training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "med_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      med_volunteers: {
        Row: {
          active: boolean
          attendance_pct: number
          availability: string
          created_at: string
          created_by: string | null
          equipment_experience: string | null
          full_name: string
          growth_notes: string | null
          id: string
          leadership_potential: string | null
          mentor_name: string | null
          ministry_experience: string | null
          performance_score: number
          projects_completed: number
          role: string
          skills: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          attendance_pct?: number
          availability?: string
          created_at?: string
          created_by?: string | null
          equipment_experience?: string | null
          full_name: string
          growth_notes?: string | null
          id?: string
          leadership_potential?: string | null
          mentor_name?: string | null
          ministry_experience?: string | null
          performance_score?: number
          projects_completed?: number
          role?: string
          skills?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          attendance_pct?: number
          availability?: string
          created_at?: string
          created_by?: string | null
          equipment_experience?: string | null
          full_name?: string
          growth_notes?: string | null
          id?: string
          leadership_potential?: string | null
          mentor_name?: string | null
          ministry_experience?: string | null
          performance_score?: number
          projects_completed?: number
          role?: string
          skills?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      meeting_apologies: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_apologies_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_apologies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_apologies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_apologies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_documents: {
        Row: {
          document_id: string
          document_role: string
          id: string
          meeting_id: string
        }
        Insert: {
          document_id: string
          document_role: string
          id?: string
          meeting_id: string
        }
        Update: {
          document_id?: string
          document_role?: string
          id?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_documents_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_visitors: {
        Row: {
          contact: string | null
          id: string
          meeting_id: string
          name: string
          organization: string | null
        }
        Insert: {
          contact?: string | null
          id?: string
          meeting_id: string
          name: string
          organization?: string | null
        }
        Update: {
          contact?: string | null
          id?: string
          meeting_id?: string
          name?: string
          organization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_visitors_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_vote_records: {
        Row: {
          id: string
          user_id: string
          vote_choice: string
          vote_id: string
        }
        Insert: {
          id?: string
          user_id: string
          vote_choice: string
          vote_id: string
        }
        Update: {
          id?: string
          user_id?: string
          vote_choice?: string
          vote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_vote_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_vote_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_vote_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_vote_records_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "meeting_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_votes: {
        Row: {
          abstentions: number | null
          agenda_item_id: string | null
          created_at: string
          id: string
          meeting_id: string
          motion_text: string
          recorded_by: string | null
          result: string | null
          vote_type: string
          votes_against: number | null
          votes_for: number | null
        }
        Insert: {
          abstentions?: number | null
          agenda_item_id?: string | null
          created_at?: string
          id?: string
          meeting_id: string
          motion_text: string
          recorded_by?: string | null
          result?: string | null
          vote_type: string
          votes_against?: number | null
          votes_for?: number | null
        }
        Update: {
          abstentions?: number | null
          agenda_item_id?: string | null
          created_at?: string
          id?: string
          meeting_id?: string
          motion_text?: string
          recorded_by?: string | null
          result?: string | null
          vote_type?: string
          votes_against?: number | null
          votes_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_votes_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_votes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_votes_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_votes_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_votes_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          chairperson_id: string | null
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          secretary_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          chairperson_id?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          secretary_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          chairperson_id?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          secretary_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_chairperson_id_fkey"
            columns: ["chairperson_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_chairperson_id_fkey"
            columns: ["chairperson_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_chairperson_id_fkey"
            columns: ["chairperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_lifecycle: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          profile_id: string
          stage: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_id: string
          stage: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          stage?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_lifecycle_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_lifecycle_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_lifecycle_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          budget_amount: number
          created_at: string
          created_by: string | null
          department_slug: string | null
          dependencies: string | null
          end_date: string | null
          expected_outcomes: string | null
          horizon: string
          id: string
          milestones: string | null
          objectives: string | null
          owner_id: string | null
          period_label: string | null
          progress_pct: number
          risk_assessment: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_amount?: number
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          dependencies?: string | null
          end_date?: string | null
          expected_outcomes?: string | null
          horizon?: string
          id?: string
          milestones?: string | null
          objectives?: string | null
          owner_id?: string | null
          period_label?: string | null
          progress_pct?: number
          risk_assessment?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_amount?: number
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          dependencies?: string | null
          end_date?: string | null
          expected_outcomes?: string | null
          horizon?: string
          id?: string
          milestones?: string | null
          objectives?: string | null
          owner_id?: string | null
          period_label?: string | null
          progress_pct?: number
          risk_assessment?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_plans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_plans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_plans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      minute_decisions: {
        Row: {
          agenda_item_id: string | null
          decision_text: string
          id: string
          minute_id: string
          recording_timestamp_seconds: number | null
        }
        Insert: {
          agenda_item_id?: string | null
          decision_text: string
          id?: string
          minute_id: string
          recording_timestamp_seconds?: number | null
        }
        Update: {
          agenda_item_id?: string | null
          decision_text?: string
          id?: string
          minute_id?: string
          recording_timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "minute_decisions_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minute_decisions_minute_id_fkey"
            columns: ["minute_id"]
            isOneToOne: false
            referencedRelation: "minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      minute_speakers: {
        Row: {
          id: string
          minute_id: string
          speaker_label: string
          user_id: string | null
        }
        Insert: {
          id?: string
          minute_id: string
          speaker_label: string
          user_id?: string | null
        }
        Update: {
          id?: string
          minute_id?: string
          speaker_label?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "minute_speakers_minute_id_fkey"
            columns: ["minute_id"]
            isOneToOne: false
            referencedRelation: "minutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minute_speakers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minute_speakers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minute_speakers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      minute_versions: {
        Row: {
          change_summary: string | null
          content: Json
          edited_at: string
          edited_by: string | null
          id: string
          minute_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: Json
          edited_at?: string
          edited_by?: string | null
          id?: string
          minute_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content?: Json
          edited_at?: string
          edited_by?: string | null
          id?: string
          minute_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "minute_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minute_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minute_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minute_versions_minute_id_fkey"
            columns: ["minute_id"]
            isOneToOne: false
            referencedRelation: "minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      minutes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: Json
          created_at: string
          created_by: string | null
          id: string
          meeting_id: string
          recording_url: string | null
          status: string
          transcription_status: string | null
          transcription_text: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id: string
          recording_url?: string | null
          status?: string
          transcription_status?: string | null
          transcription_text?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id?: string
          recording_url?: string | null
          status?: string
          transcription_status?: string | null
          transcription_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "minutes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notify_queue: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          recipient_scope: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          recipient_scope?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          recipient_scope?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string
          provider: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider: string
          state?: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      pastoral_case_notes: {
        Row: {
          author_id: string | null
          case_id: string
          confidential: boolean
          created_at: string
          id: string
          note: string
          note_type: string
          visit_date: string
        }
        Insert: {
          author_id?: string | null
          case_id: string
          confidential?: boolean
          created_at?: string
          id?: string
          note: string
          note_type?: string
          visit_date?: string
        }
        Update: {
          author_id?: string | null
          case_id?: string
          confidential?: boolean
          created_at?: string
          id?: string
          note?: string
          note_type?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_case_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_case_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_case_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "pastoral_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      pastoral_cases: {
        Row: {
          assigned_to: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          care_plan: string | null
          case_number: string | null
          case_type: string
          closed_at: string | null
          closed_by: string | null
          confidential: boolean
          contact: string | null
          created_at: string
          created_by: string | null
          department_slug: string | null
          follow_up_date: string | null
          id: string
          location: string | null
          member_id: string | null
          opened_on: string
          outcome: string | null
          priority: string
          referral_to: string | null
          scheduled_for: string | null
          status: string
          subject_name: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          care_plan?: string | null
          case_number?: string | null
          case_type?: string
          closed_at?: string | null
          closed_by?: string | null
          confidential?: boolean
          contact?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          follow_up_date?: string | null
          id?: string
          location?: string | null
          member_id?: string | null
          opened_on?: string
          outcome?: string | null
          priority?: string
          referral_to?: string | null
          scheduled_for?: string | null
          status?: string
          subject_name: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          care_plan?: string | null
          case_number?: string | null
          case_type?: string
          closed_at?: string | null
          closed_by?: string | null
          confidential?: boolean
          contact?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          follow_up_date?: string | null
          id?: string
          location?: string | null
          member_id?: string | null
          opened_on?: string
          outcome?: string | null
          priority?: string
          referral_to?: string | null
          scheduled_for?: string | null
          status?: string
          subject_name?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_cases_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_lines: {
        Row: {
          allowances: number
          created_at: string
          deductions: number
          department_slug: string | null
          gross_amount: number
          id: string
          member_id: string | null
          net_amount: number | null
          notes: string | null
          payment_status: string
          person_name: string
          role_title: string | null
          run_id: string
          updated_at: string
        }
        Insert: {
          allowances?: number
          created_at?: string
          deductions?: number
          department_slug?: string | null
          gross_amount?: number
          id?: string
          member_id?: string | null
          net_amount?: number | null
          notes?: string | null
          payment_status?: string
          person_name: string
          role_title?: string | null
          run_id: string
          updated_at?: string
        }
        Update: {
          allowances?: number
          created_at?: string
          deductions?: number
          department_slug?: string | null
          gross_amount?: number
          id?: string
          member_id?: string | null
          net_amount?: number | null
          notes?: string | null
          payment_status?: string
          person_name?: string
          role_title?: string | null
          run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_lines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_label: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_label: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_label?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          answered_note: string | null
          assigned_to: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          confidential: boolean
          created_at: string
          department_slug: string | null
          id: string
          request: string
          requester_id: string | null
          requester_name: string | null
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          answered_note?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          confidential?: boolean
          created_at?: string
          department_slug?: string | null
          id?: string
          request: string
          requester_id?: string | null
          requester_name?: string | null
          status?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          answered_note?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          confidential?: boolean
          created_at?: string
          department_slug?: string | null
          id?: string
          request?: string
          requester_id?: string | null
          requester_name?: string | null
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          bio: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          primary_department: string | null
          requested_department_slug: string | null
          requested_role: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bio?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          primary_department?: string | null
          requested_department_slug?: string | null
          requested_role?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bio?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          primary_department?: string | null
          requested_department_slug?: string | null
          requested_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_request_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          request_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          request_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          request_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          amount_actual: number | null
          amount_estimated: number
          approved_by_chair: string | null
          approved_by_senior: string | null
          archived_at: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          budget_id: string | null
          category: string | null
          chair_approved_at: string | null
          chair_comment: string | null
          created_at: string
          created_by: string | null
          department_slug: string
          description: string | null
          id: string
          needed_by: string | null
          ordered_at: string | null
          po_number: string | null
          pr_number: string | null
          priority: string
          quote_name: string | null
          quote_url: string | null
          received_at: string | null
          rejection_reason: string | null
          requester_id: string
          senior_approved_at: string | null
          senior_comment: string | null
          status: string
          supplier_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount_actual?: number | null
          amount_estimated?: number
          approved_by_chair?: string | null
          approved_by_senior?: string | null
          archived_at?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_id?: string | null
          category?: string | null
          chair_approved_at?: string | null
          chair_comment?: string | null
          created_at?: string
          created_by?: string | null
          department_slug: string
          description?: string | null
          id?: string
          needed_by?: string | null
          ordered_at?: string | null
          po_number?: string | null
          pr_number?: string | null
          priority?: string
          quote_name?: string | null
          quote_url?: string | null
          received_at?: string | null
          rejection_reason?: string | null
          requester_id?: string
          senior_approved_at?: string | null
          senior_comment?: string | null
          status?: string
          supplier_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount_actual?: number | null
          amount_estimated?: number
          approved_by_chair?: string | null
          approved_by_senior?: string | null
          archived_at?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_id?: string | null
          category?: string | null
          chair_approved_at?: string | null
          chair_comment?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string
          description?: string | null
          id?: string
          needed_by?: string | null
          ordered_at?: string | null
          po_number?: string | null
          pr_number?: string | null
          priority?: string
          quote_name?: string | null
          quote_url?: string | null
          received_at?: string | null
          rejection_reason?: string | null
          requester_id?: string
          senior_approved_at?: string | null
          senior_comment?: string | null
          status?: string
          supplier_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      report_entries: {
        Row: {
          body: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string
          department_slug: string
          file_name: string | null
          file_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by: string
          department_slug: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string
          department_slug?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_entries_department_slug_fkey"
            columns: ["department_slug"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["slug"]
          },
        ]
      }
      res_asset_checkouts: {
        Row: {
          asset_id: string
          checked_in_at: string | null
          checked_out_at: string
          checked_out_to: string | null
          condition_in: string | null
          condition_out: string | null
          created_at: string
          department_slug: string | null
          due_back_at: string | null
          holder_name: string | null
          id: string
          notes: string | null
          purpose: string | null
          quantity: number
          recorded_by: string | null
          request_id: string | null
        }
        Insert: {
          asset_id: string
          checked_in_at?: string | null
          checked_out_at?: string
          checked_out_to?: string | null
          condition_in?: string | null
          condition_out?: string | null
          created_at?: string
          department_slug?: string | null
          due_back_at?: string | null
          holder_name?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          quantity?: number
          recorded_by?: string | null
          request_id?: string | null
        }
        Update: {
          asset_id?: string
          checked_in_at?: string | null
          checked_out_at?: string
          checked_out_to?: string | null
          condition_in?: string | null
          condition_out?: string | null
          created_at?: string
          department_slug?: string | null
          due_back_at?: string | null
          holder_name?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          quantity?: number
          recorded_by?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "res_asset_checkouts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_asset_checkouts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_asset_checkouts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "res_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      res_bookings: {
        Row: {
          asset_id: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          department_slug: string | null
          ends_at: string
          event_id: string | null
          facility_id: string | null
          id: string
          notes: string | null
          purpose: string | null
          requested_by: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          waitlisted: boolean
        }
        Insert: {
          asset_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          department_slug?: string | null
          ends_at: string
          event_id?: string | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          requested_by?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          waitlisted?: boolean
        }
        Update: {
          asset_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          department_slug?: string | null
          ends_at?: string
          event_id?: string | null
          facility_id?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          requested_by?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          waitlisted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "res_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_bookings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "res_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      res_facilities: {
        Row: {
          access_notes: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          building: string | null
          capacity: number | null
          cleaning_schedule: string | null
          created_at: string
          created_by: string | null
          description: string | null
          facility_type: string
          floor: string | null
          floor_plan_url: string | null
          id: string
          last_safety_inspection: string | null
          maintenance_schedule: string | null
          name: string
          next_safety_inspection: string | null
          photo_urls: Json
          pos_x: number | null
          pos_y: number | null
          room_number: string | null
          safety_status: string
          status: string
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          building?: string | null
          capacity?: number | null
          cleaning_schedule?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_type?: string
          floor?: string | null
          floor_plan_url?: string | null
          id?: string
          last_safety_inspection?: string | null
          maintenance_schedule?: string | null
          name: string
          next_safety_inspection?: string | null
          photo_urls?: Json
          pos_x?: number | null
          pos_y?: number | null
          room_number?: string | null
          safety_status?: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          building?: string | null
          capacity?: number | null
          cleaning_schedule?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_type?: string
          floor?: string | null
          floor_plan_url?: string | null
          id?: string
          last_safety_inspection?: string | null
          maintenance_schedule?: string | null
          name?: string
          next_safety_inspection?: string | null
          photo_urls?: Json
          pos_x?: number | null
          pos_y?: number | null
          room_number?: string | null
          safety_status?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      res_inventory_items: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          last_counted_on: string | null
          maximum_stock: number | null
          minimum_stock: number
          name: string
          notes: string | null
          quantity_on_hand: number
          storage_location: string | null
          supplier_id: string | null
          unit: string
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          last_counted_on?: string | null
          maximum_stock?: number | null
          minimum_stock?: number
          name: string
          notes?: string | null
          quantity_on_hand?: number
          storage_location?: string | null
          supplier_id?: string | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          last_counted_on?: string | null
          maximum_stock?: number | null
          minimum_stock?: number
          name?: string
          notes?: string | null
          quantity_on_hand?: number
          storage_location?: string | null
          supplier_id?: string | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      res_inventory_movements: {
        Row: {
          created_at: string
          department_slug: string | null
          id: string
          item_id: string
          movement_type: string
          performed_by: string | null
          quantity_after: number | null
          quantity_change: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          department_slug?: string | null
          id?: string
          item_id: string
          movement_type?: string
          performed_by?: string | null
          quantity_after?: number | null
          quantity_change: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          department_slug?: string | null
          id?: string
          item_id?: string
          movement_type?: string
          performed_by?: string | null
          quantity_after?: number | null
          quantity_change?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "res_inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "res_inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      res_maintenance_schedules: {
        Row: {
          active: boolean
          asset_id: string | null
          created_at: string
          created_by: string | null
          facility_id: string | null
          frequency: string
          id: string
          instructions: string | null
          last_done_on: string | null
          next_due_on: string | null
          responsible: string | null
          title: string
          trigger_type: string
          updated_at: string
          usage_hours_interval: number | null
        }
        Insert: {
          active?: boolean
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          facility_id?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          last_done_on?: string | null
          next_due_on?: string | null
          responsible?: string | null
          title: string
          trigger_type?: string
          updated_at?: string
          usage_hours_interval?: number | null
        }
        Update: {
          active?: boolean
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          facility_id?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          last_done_on?: string | null
          next_due_on?: string | null
          responsible?: string | null
          title?: string
          trigger_type?: string
          updated_at?: string
          usage_hours_interval?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "res_maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_maintenance_schedules_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "res_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      res_maintenance_tickets: {
        Row: {
          actual_cost: number | null
          after_photo_urls: Json
          asset_id: string | null
          assigned_to: string | null
          before_photo_urls: Json
          branch: Database["public"]["Enums"]["branch"] | null
          completed_at: string | null
          created_at: string
          department_slug: string | null
          description: string | null
          downtime_hours: number | null
          due_date: string | null
          estimated_cost: number | null
          facility_id: string | null
          fault_type: string
          id: string
          labour_hours: number | null
          maintenance_kind: string
          parts_used: string | null
          priority: string
          reported_by: string | null
          root_cause: string | null
          status: string
          technician: string | null
          ticket_number: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          after_photo_urls?: Json
          asset_id?: string | null
          assigned_to?: string | null
          before_photo_urls?: Json
          branch?: Database["public"]["Enums"]["branch"] | null
          completed_at?: string | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          downtime_hours?: number | null
          due_date?: string | null
          estimated_cost?: number | null
          facility_id?: string | null
          fault_type?: string
          id?: string
          labour_hours?: number | null
          maintenance_kind?: string
          parts_used?: string | null
          priority?: string
          reported_by?: string | null
          root_cause?: string | null
          status?: string
          technician?: string | null
          ticket_number?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          after_photo_urls?: Json
          asset_id?: string | null
          assigned_to?: string | null
          before_photo_urls?: Json
          branch?: Database["public"]["Enums"]["branch"] | null
          completed_at?: string | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          downtime_hours?: number | null
          due_date?: string | null
          estimated_cost?: number | null
          facility_id?: string | null
          fault_type?: string
          id?: string
          labour_hours?: number | null
          maintenance_kind?: string
          parts_used?: string | null
          priority?: string
          reported_by?: string | null
          root_cause?: string | null
          status?: string
          technician?: string | null
          ticket_number?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_maintenance_tickets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_maintenance_tickets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_maintenance_tickets_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "res_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      res_project_milestones: {
        Row: {
          completed_on: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          project_id: string
          status: string
          title: string
          weight: number
        }
        Insert: {
          completed_on?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          project_id: string
          status?: string
          title: string
          weight?: number
        }
        Update: {
          completed_on?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          status?: string
          title?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "res_project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "res_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      res_projects: {
        Row: {
          actual_end_date: string | null
          approvals: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          budget: number | null
          completion_pct: number
          contractor: string | null
          created_at: string
          department_slug: string | null
          description: string | null
          document_urls: Json
          facility_id: string | null
          id: string
          name: string
          owner_id: string | null
          photo_urls: Json
          project_type: string
          resource_usage: string | null
          risks: string | null
          spent: number | null
          start_date: string | null
          status: string
          target_end_date: string | null
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          approvals?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget?: number | null
          completion_pct?: number
          contractor?: string | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          document_urls?: Json
          facility_id?: string | null
          id?: string
          name: string
          owner_id?: string | null
          photo_urls?: Json
          project_type?: string
          resource_usage?: string | null
          risks?: string | null
          spent?: number | null
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          approvals?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget?: number | null
          completion_pct?: number
          contractor?: string | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          document_urls?: Json
          facility_id?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          photo_urls?: Json
          project_type?: string
          resource_usage?: string | null
          risks?: string | null
          spent?: number | null
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_projects_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "res_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      res_request_items: {
        Row: {
          asset_id: string | null
          created_at: string
          fulfilled_quantity: number
          id: string
          item_name: string
          notes: string | null
          quantity: number
          request_id: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          fulfilled_quantity?: number
          id?: string
          item_name: string
          notes?: string | null
          quantity?: number
          request_id: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          fulfilled_quantity?: number
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_request_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_request_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "res_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      res_requests: {
        Row: {
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          budget_impact: number | null
          chair_approved_at: string | null
          chair_approved_by: string | null
          created_at: string
          department_slug: string
          event_name: string | null
          id: string
          inspected_at: string | null
          inspection_notes: string | null
          issued_at: string | null
          notes: string | null
          priority: string
          procurement_request_id: string | null
          purpose: string | null
          request_number: string | null
          requested_by: string | null
          responsible_officer: string | null
          return_date: string | null
          returned_at: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_impact?: number | null
          chair_approved_at?: string | null
          chair_approved_by?: string | null
          created_at?: string
          department_slug: string
          event_name?: string | null
          id?: string
          inspected_at?: string | null
          inspection_notes?: string | null
          issued_at?: string | null
          notes?: string | null
          priority?: string
          procurement_request_id?: string | null
          purpose?: string | null
          request_number?: string | null
          requested_by?: string | null
          responsible_officer?: string | null
          return_date?: string | null
          returned_at?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_impact?: number | null
          chair_approved_at?: string | null
          chair_approved_by?: string | null
          created_at?: string
          department_slug?: string
          event_name?: string | null
          id?: string
          inspected_at?: string | null
          inspection_notes?: string | null
          issued_at?: string | null
          notes?: string | null
          priority?: string
          procurement_request_id?: string | null
          purpose?: string | null
          request_number?: string | null
          requested_by?: string | null
          responsible_officer?: string | null
          return_date?: string | null
          returned_at?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_requests_procurement_request_id_fkey"
            columns: ["procurement_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      res_risks: {
        Row: {
          asset_id: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          facility_id: string | null
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner_id: string | null
          owner_name: string | null
          review_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_id?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_id?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "res_risks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_risks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "res_risks_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "res_facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      res_training_records: {
        Row: {
          certificate_url: string | null
          competency_level: string
          completed_on: string | null
          course: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          person_name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          certificate_url?: string | null
          competency_level?: string
          completed_on?: string | null
          course: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          person_name: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          certificate_url?: string | null
          competency_level?: string
          completed_on?: string | null
          course?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          person_name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      resolutions: {
        Row: {
          agenda_item_id: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          department_slug: string | null
          due_date: string | null
          id: string
          meeting_id: string
          minute_id: string | null
          owner_id: string | null
          priority: string
          resolution_number: string | null
          resolution_text: string
          status: string
          updated_at: string
        }
        Insert: {
          agenda_item_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          due_date?: string | null
          id?: string
          meeting_id: string
          minute_id?: string | null
          owner_id?: string | null
          priority?: string
          resolution_number?: string | null
          resolution_text: string
          status?: string
          updated_at?: string
        }
        Update: {
          agenda_item_id?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string
          minute_id?: string | null
          owner_id?: string | null
          priority?: string
          resolution_number?: string | null
          resolution_text?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolutions_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_minute_id_fkey"
            columns: ["minute_id"]
            isOneToOne: false
            referencedRelation: "minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_songs: {
        Row: {
          order_index: number
          setlist_id: string
          song_id: string
        }
        Insert: {
          order_index: number
          setlist_id: string
          song_id: string
        }
        Update: {
          order_index?: number
          setlist_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlist_songs_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      setlists: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string | null
          department_slug: string
          id: string
          notes: string | null
          service_date: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          department_slug: string
          id?: string
          notes?: string | null
          service_date: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          department_slug?: string
          id?: string
          notes?: string | null
          service_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      smo_courses: {
        Row: {
          category: string
          certification: boolean
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          title: string
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          category?: string
          certification?: boolean
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          title: string
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          category?: string
          certification?: boolean
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          title?: string
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: []
      }
      smo_decisions: {
        Row: {
          action_items: string | null
          affected_departments: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          decision_date: string
          decision_type: string
          id: string
          impact: string | null
          implementation_status: string
          notes: string | null
          owner: string | null
          title: string
          updated_at: string
          vote_outcome: string | null
        }
        Insert: {
          action_items?: string | null
          affected_departments?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          decision_date?: string
          decision_type?: string
          id?: string
          impact?: string | null
          implementation_status?: string
          notes?: string | null
          owner?: string | null
          title: string
          updated_at?: string
          vote_outcome?: string | null
        }
        Update: {
          action_items?: string | null
          affected_departments?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          decision_date?: string
          decision_type?: string
          id?: string
          impact?: string | null
          implementation_status?: string
          notes?: string | null
          owner?: string | null
          title?: string
          updated_at?: string
          vote_outcome?: string | null
        }
        Relationships: []
      }
      smo_ideas: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          department_slug: string | null
          description: string | null
          id: string
          idea_type: string
          review_notes: string | null
          stage: string
          submitted_by: string | null
          submitter_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          id?: string
          idea_type?: string
          review_notes?: string | null
          stage?: string
          submitted_by?: string | null
          submitter_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          department_slug?: string | null
          description?: string | null
          id?: string
          idea_type?: string
          review_notes?: string | null
          stage?: string
          submitted_by?: string | null
          submitter_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      smo_kpis: {
        Row: {
          actual: number
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          department_slug: string | null
          forecast: number | null
          id: string
          kpi_group: string
          name: string
          objective_id: string | null
          period: string
          period_label: string | null
          target: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          actual?: number
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          department_slug?: string | null
          forecast?: number | null
          id?: string
          kpi_group?: string
          name: string
          objective_id?: string | null
          period?: string
          period_label?: string | null
          target?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          actual?: number
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          department_slug?: string | null
          forecast?: number | null
          id?: string
          kpi_group?: string
          name?: string
          objective_id?: string | null
          period?: string
          period_label?: string | null
          target?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smo_kpis_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "smo_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      smo_milestones: {
        Row: {
          completed_on: string | null
          created_at: string
          deliverable: string | null
          due_date: string | null
          id: string
          owner: string | null
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_on?: string | null
          created_at?: string
          deliverable?: string | null
          due_date?: string | null
          id?: string
          owner?: string | null
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_on?: string | null
          created_at?: string
          deliverable?: string | null
          due_date?: string | null
          id?: string
          owner?: string | null
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smo_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "smo_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      smo_objectives: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          budget: number | null
          created_at: string
          department_slug: string | null
          dependencies: string | null
          description: string | null
          due_date: string | null
          id: string
          key_results: Json
          owner: string | null
          period: string
          perspective: string
          plan_id: string | null
          progress_pct: number
          risks: string | null
          start_date: string | null
          status: string
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          budget?: number | null
          created_at?: string
          department_slug?: string | null
          dependencies?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          key_results?: Json
          owner?: string | null
          period?: string
          perspective?: string
          plan_id?: string | null
          progress_pct?: number
          risks?: string | null
          start_date?: string | null
          status?: string
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          budget?: number | null
          created_at?: string
          department_slug?: string | null
          dependencies?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          key_results?: Json
          owner?: string | null
          period?: string
          perspective?: string
          plan_id?: string | null
          progress_pct?: number
          risks?: string | null
          start_date?: string | null
          status?: string
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smo_objectives_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "smo_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      smo_plans: {
        Row: {
          created_at: string
          created_by: string | null
          horizon_end: string | null
          horizon_start: string | null
          id: string
          mission_statement: string | null
          owner: string | null
          plan_type: string
          progress_pct: number
          status: string
          themes: Json
          title: string
          updated_at: string
          vision_statement: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          horizon_end?: string | null
          horizon_start?: string | null
          id?: string
          mission_statement?: string | null
          owner?: string | null
          plan_type?: string
          progress_pct?: number
          status?: string
          themes?: Json
          title: string
          updated_at?: string
          vision_statement?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          horizon_end?: string | null
          horizon_start?: string | null
          id?: string
          mission_statement?: string | null
          owner?: string | null
          plan_type?: string
          progress_pct?: number
          status?: string
          themes?: Json
          title?: string
          updated_at?: string
          vision_statement?: string | null
        }
        Relationships: []
      }
      smo_projects: {
        Row: {
          approval_status: string
          branch: Database["public"]["Enums"]["branch"] | null
          budget_approved: number | null
          budget_requested: number | null
          business_case: string | null
          created_at: string
          created_by: string | null
          department_slug: string | null
          document_url: string | null
          end_date: string | null
          funding_source: string | null
          id: string
          manager: string | null
          name: string
          objective_id: string | null
          objectives: string | null
          photo_url: string | null
          progress_pct: number
          project_type: string
          risks: string | null
          scope: string | null
          spent: number
          sponsor: string | null
          stage: string
          stakeholders: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_approved?: number | null
          budget_requested?: number | null
          business_case?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          document_url?: string | null
          end_date?: string | null
          funding_source?: string | null
          id?: string
          manager?: string | null
          name: string
          objective_id?: string | null
          objectives?: string | null
          photo_url?: string | null
          progress_pct?: number
          project_type?: string
          risks?: string | null
          scope?: string | null
          spent?: number
          sponsor?: string | null
          stage?: string
          stakeholders?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          branch?: Database["public"]["Enums"]["branch"] | null
          budget_approved?: number | null
          budget_requested?: number | null
          business_case?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          document_url?: string | null
          end_date?: string | null
          funding_source?: string | null
          id?: string
          manager?: string | null
          name?: string
          objective_id?: string | null
          objectives?: string | null
          photo_url?: string | null
          progress_pct?: number
          project_type?: string
          risks?: string | null
          scope?: string | null
          spent?: number
          sponsor?: string | null
          stage?: string
          stakeholders?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smo_projects_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "smo_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      smo_requests: {
        Row: {
          amount: number | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          decision_notes: string | null
          department_slug: string | null
          description: string | null
          id: string
          request_type: string
          requested_by: string | null
          requester_name: string | null
          route_to: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          decision_notes?: string | null
          department_slug?: string | null
          description?: string | null
          id?: string
          request_type?: string
          requested_by?: string | null
          requester_name?: string | null
          route_to?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          decision_notes?: string | null
          department_slug?: string | null
          description?: string | null
          id?: string
          request_type?: string
          requested_by?: string | null
          requester_name?: string | null
          route_to?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      smo_risks: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          escalation_level: string
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner: string | null
          review_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_level?: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          review_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_level?: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          review_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      smo_training_records: {
        Row: {
          certificate_url: string | null
          completed_on: string | null
          course_id: string | null
          created_at: string
          department_slug: string | null
          expires_on: string | null
          id: string
          learner_name: string
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          completed_on?: string | null
          course_id?: string | null
          created_at?: string
          department_slug?: string | null
          expires_on?: string | null
          id?: string
          learner_name: string
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          completed_on?: string | null
          course_id?: string | null
          created_at?: string
          department_slug?: string | null
          expires_on?: string | null
          id?: string
          learner_name?: string
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smo_training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "smo_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          arrangement: string | null
          artist: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          ccli_number: string | null
          chord_chart_url: string | null
          composer: string | null
          created_at: string
          created_by: string | null
          department_slug: string
          duration_seconds: number | null
          id: string
          is_favourite: boolean
          language: string | null
          last_used_on: string | null
          licence_notes: string | null
          lyrics: string | null
          mp3_url: string | null
          multitrack_url: string | null
          notes: string | null
          practice_url: string | null
          scripture_theme: string | null
          sheet_music_url: string | null
          song_key: string | null
          tags: string[] | null
          tempo: number | null
          themes: string[] | null
          time_signature: string | null
          times_used: number
          title: string
          updated_at: string
          version: number
          youtube_url: string | null
        }
        Insert: {
          arrangement?: string | null
          artist?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          ccli_number?: string | null
          chord_chart_url?: string | null
          composer?: string | null
          created_at?: string
          created_by?: string | null
          department_slug: string
          duration_seconds?: number | null
          id?: string
          is_favourite?: boolean
          language?: string | null
          last_used_on?: string | null
          licence_notes?: string | null
          lyrics?: string | null
          mp3_url?: string | null
          multitrack_url?: string | null
          notes?: string | null
          practice_url?: string | null
          scripture_theme?: string | null
          sheet_music_url?: string | null
          song_key?: string | null
          tags?: string[] | null
          tempo?: number | null
          themes?: string[] | null
          time_signature?: string | null
          times_used?: number
          title: string
          updated_at?: string
          version?: number
          youtube_url?: string | null
        }
        Update: {
          arrangement?: string | null
          artist?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          ccli_number?: string | null
          chord_chart_url?: string | null
          composer?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string
          duration_seconds?: number | null
          id?: string
          is_favourite?: boolean
          language?: string | null
          last_used_on?: string | null
          licence_notes?: string | null
          lyrics?: string | null
          mp3_url?: string | null
          multitrack_url?: string | null
          notes?: string | null
          practice_url?: string | null
          scripture_theme?: string | null
          sheet_music_url?: string | null
          song_key?: string | null
          tags?: string[] | null
          tempo?: number | null
          themes?: string[] | null
          time_signature?: string | null
          times_used?: number
          title?: string
          updated_at?: string
          version?: number
          youtube_url?: string | null
        }
        Relationships: []
      }
      souls_won: {
        Row: {
          assigned_to: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          contact: string | null
          created_at: string
          date_won: string
          department_slug: string
          follow_up_status: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          won_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          contact?: string | null
          created_at?: string
          date_won?: string
          department_slug: string
          follow_up_status?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          won_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          contact?: string | null
          created_at?: string
          date_won?: string
          department_slug?: string
          follow_up_status?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          won_by?: string | null
        }
        Relationships: []
      }
      succession_candidates: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          candidate_id: string | null
          candidate_name: string | null
          competency_assessment: string | null
          created_at: string
          created_by: string | null
          delegated_responsibilities: string | null
          department_slug: string | null
          id: string
          incumbent_id: string | null
          mentorship_progress: number
          position_title: string
          readiness_band: string
          readiness_score: number
          recommendation: string | null
          status: string
          target_date: string | null
          training_status: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          candidate_id?: string | null
          candidate_name?: string | null
          competency_assessment?: string | null
          created_at?: string
          created_by?: string | null
          delegated_responsibilities?: string | null
          department_slug?: string | null
          id?: string
          incumbent_id?: string | null
          mentorship_progress?: number
          position_title: string
          readiness_band?: string
          readiness_score?: number
          recommendation?: string | null
          status?: string
          target_date?: string | null
          training_status?: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          candidate_id?: string | null
          candidate_name?: string | null
          competency_assessment?: string | null
          created_at?: string
          created_by?: string | null
          delegated_responsibilities?: string | null
          department_slug?: string | null
          id?: string
          incumbent_id?: string | null
          mentorship_progress?: number
          position_title?: string
          readiness_band?: string
          readiness_score?: number
          recommendation?: string | null
          status?: string
          target_date?: string | null
          training_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "succession_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_incumbent_id_fkey"
            columns: ["incumbent_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_incumbent_id_fkey"
            columns: ["incumbent_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "succession_candidates_incumbent_id_fkey"
            columns: ["incumbent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sunday_rsvps: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          decline_reason: string | null
          id: string
          response: string
          service_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          response: string
          service_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          response?: string
          service_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          last_error: string | null
          next_retry_at: string | null
          provider: string
          resource_id: string | null
          status: string
          sync_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          provider: string
          resource_id?: string | null
          status?: string
          sync_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          provider?: string
          resource_id?: string | null
          status?: string
          sync_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by_chair: string | null
          approved_by_senior: string | null
          assigned_to: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string
          department_slug: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean
          last_alert_sent_at: string | null
          parent_task_id: string | null
          priority: string
          recurrence_end_date: string | null
          recurrence_interval: number
          recurrence_pattern: string | null
          requires_approval: boolean
          resolution_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by_chair?: string | null
          approved_by_senior?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by: string
          department_slug?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          last_alert_sent_at?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_interval?: number
          recurrence_pattern?: string | null
          requires_approval?: boolean
          resolution_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by_chair?: string | null
          approved_by_senior?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string
          department_slug?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          last_alert_sent_at?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_interval?: number
          recurrence_pattern?: string | null
          requires_approval?: boolean
          resolution_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_assets: {
        Row: {
          asset_number: string | null
          assigned_to: string | null
          barcode: string | null
          battery_level: number | null
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          condition: string
          created_at: string
          id: string
          insurance_ref: string | null
          location: string | null
          make: string | null
          manual_url: string | null
          model: string | null
          name: string
          notes: string | null
          photo_url: string | null
          purchase_cost: number | null
          purchase_date: string | null
          qr_payload: string | null
          replacement_date: string | null
          serial_number: string | null
          status: string
          subcategory: string | null
          supplier: string | null
          updated_at: string
          warranty_expiry: string | null
        }
        Insert: {
          asset_number?: string | null
          assigned_to?: string | null
          barcode?: string | null
          battery_level?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          condition?: string
          created_at?: string
          id?: string
          insurance_ref?: string | null
          location?: string | null
          make?: string | null
          manual_url?: string | null
          model?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          qr_payload?: string | null
          replacement_date?: string | null
          serial_number?: string | null
          status?: string
          subcategory?: string | null
          supplier?: string | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Update: {
          asset_number?: string | null
          assigned_to?: string | null
          barcode?: string | null
          battery_level?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          condition?: string
          created_at?: string
          id?: string
          insurance_ref?: string | null
          location?: string | null
          make?: string | null
          manual_url?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          qr_payload?: string | null
          replacement_date?: string | null
          serial_number?: string | null
          status?: string
          subcategory?: string | null
          supplier?: string | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Relationships: []
      }
      tech_courses: {
        Row: {
          category: string
          certification: boolean
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          title: string
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          category?: string
          certification?: boolean
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          title: string
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          category?: string
          certification?: boolean
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          title?: string
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: []
      }
      tech_faults: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          description: string | null
          fault_type: string
          id: string
          priority: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          description?: string | null
          fault_type?: string
          id?: string
          priority?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          description?: string | null
          fault_type?: string
          id?: string
          priority?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_faults_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "tech_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_inventory: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          created_at: string
          id: string
          item: string
          location: string | null
          missing_count: number
          notes: string | null
          quantity: number
          reorder_level: number
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          created_at?: string
          id?: string
          item: string
          location?: string | null
          missing_count?: number
          notes?: string | null
          quantity?: number
          reorder_level?: number
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          created_at?: string
          id?: string
          item?: string
          location?: string | null
          missing_count?: number
          notes?: string | null
          quantity?: number
          reorder_level?: number
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tech_maintenance: {
        Row: {
          asset_id: string | null
          completed_by: string | null
          completed_on: string | null
          cost: number | null
          created_at: string
          due_date: string
          frequency: string
          id: string
          maintenance_type: string
          notes: string | null
          status: string
          task: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          completed_by?: string | null
          completed_on?: string | null
          cost?: number | null
          created_at?: string
          due_date: string
          frequency?: string
          id?: string
          maintenance_type?: string
          notes?: string | null
          status?: string
          task: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          completed_by?: string | null
          completed_on?: string | null
          cost?: number | null
          created_at?: string
          due_date?: string
          frequency?: string
          id?: string
          maintenance_type?: string
          notes?: string | null
          status?: string
          task?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "tech_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_productions: {
        Row: {
          audio_plan: string | null
          audio_ready: boolean
          branch: Database["public"]["Enums"]["branch"] | null
          camera_plan: string | null
          cameras_ready: boolean
          created_at: string
          created_by: string | null
          id: string
          internet_ok: boolean
          lighting_plan: string | null
          lighting_ready: boolean
          livestream_plan: string | null
          livestream_ready: boolean
          power_ok: boolean
          preacher: string | null
          presentation_plan: string | null
          presentation_ready: boolean
          service_date: string
          service_flow: Json
          service_type: string
          start_time: string | null
          status: string
          technical_notes: string | null
          theme: string | null
          title: string
          updated_at: string
          venue: string | null
          visual_ready: boolean
          worship_leader: string | null
        }
        Insert: {
          audio_plan?: string | null
          audio_ready?: boolean
          branch?: Database["public"]["Enums"]["branch"] | null
          camera_plan?: string | null
          cameras_ready?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          internet_ok?: boolean
          lighting_plan?: string | null
          lighting_ready?: boolean
          livestream_plan?: string | null
          livestream_ready?: boolean
          power_ok?: boolean
          preacher?: string | null
          presentation_plan?: string | null
          presentation_ready?: boolean
          service_date: string
          service_flow?: Json
          service_type?: string
          start_time?: string | null
          status?: string
          technical_notes?: string | null
          theme?: string | null
          title: string
          updated_at?: string
          venue?: string | null
          visual_ready?: boolean
          worship_leader?: string | null
        }
        Update: {
          audio_plan?: string | null
          audio_ready?: boolean
          branch?: Database["public"]["Enums"]["branch"] | null
          camera_plan?: string | null
          cameras_ready?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          internet_ok?: boolean
          lighting_plan?: string | null
          lighting_ready?: boolean
          livestream_plan?: string | null
          livestream_ready?: boolean
          power_ok?: boolean
          preacher?: string | null
          presentation_plan?: string | null
          presentation_ready?: boolean
          service_date?: string
          service_flow?: Json
          service_type?: string
          start_time?: string | null
          status?: string
          technical_notes?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
          visual_ready?: boolean
          worship_leader?: string | null
        }
        Relationships: []
      }
      tech_risks: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          escalation_level: string
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner: string | null
          review_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_level?: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          review_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_level?: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          review_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tech_streams: {
        Row: {
          audio_feed_ok: boolean
          bitrate_kbps: number | null
          camera_status: string | null
          created_at: string
          encoder: string | null
          health: string
          id: string
          incident_notes: string | null
          internet_mbps: number | null
          peak_viewers: number | null
          platform: string
          production_id: string | null
          recording_url: string | null
          resolution: string | null
          status: string
          stream_date: string
          total_views: number | null
          updated_at: string
          uptime_pct: number | null
        }
        Insert: {
          audio_feed_ok?: boolean
          bitrate_kbps?: number | null
          camera_status?: string | null
          created_at?: string
          encoder?: string | null
          health?: string
          id?: string
          incident_notes?: string | null
          internet_mbps?: number | null
          peak_viewers?: number | null
          platform?: string
          production_id?: string | null
          recording_url?: string | null
          resolution?: string | null
          status?: string
          stream_date: string
          total_views?: number | null
          updated_at?: string
          uptime_pct?: number | null
        }
        Update: {
          audio_feed_ok?: boolean
          bitrate_kbps?: number | null
          camera_status?: string | null
          created_at?: string
          encoder?: string | null
          health?: string
          id?: string
          incident_notes?: string | null
          internet_mbps?: number | null
          peak_viewers?: number | null
          platform?: string
          production_id?: string | null
          recording_url?: string | null
          resolution?: string | null
          status?: string
          stream_date?: string
          total_views?: number | null
          updated_at?: string
          uptime_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_streams_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "tech_productions"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_team_members: {
        Row: {
          attendance_pct: number | null
          availability: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          certifications: string | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          notes: string | null
          performance_score: number | null
          phone: string | null
          role_title: string
          skills: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attendance_pct?: number | null
          availability?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          certifications?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          notes?: string | null
          performance_score?: number | null
          phone?: string | null
          role_title?: string
          skills?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attendance_pct?: number | null
          availability?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          certifications?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          performance_score?: number | null
          phone?: string | null
          role_title?: string
          skills?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tech_training_records: {
        Row: {
          certificate_url: string | null
          completed_on: string | null
          course_id: string | null
          created_at: string
          expires_on: string | null
          id: string
          member_id: string | null
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          completed_on?: string | null
          course_id?: string | null
          created_at?: string
          expires_on?: string | null
          id?: string
          member_id?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          completed_on?: string | null
          course_id?: string | null
          created_at?: string
          expires_on?: string | null
          id?: string
          member_id?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "tech_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_training_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "tech_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          department_slug: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department_slug?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department_slug?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ush_attendance: {
        Row: {
          adults: number
          avg_entry_minutes: number | null
          branch: Database["public"]["Enums"]["branch"] | null
          children: number
          created_at: string
          created_by: string | null
          first_timers: number
          id: string
          notes: string | null
          peak_arrival_time: string | null
          returning_visitors: number
          service_date: string
          service_id: string | null
          updated_at: string
          vip_guests: number
          volunteers_present: number
        }
        Insert: {
          adults?: number
          avg_entry_minutes?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          children?: number
          created_at?: string
          created_by?: string | null
          first_timers?: number
          id?: string
          notes?: string | null
          peak_arrival_time?: string | null
          returning_visitors?: number
          service_date?: string
          service_id?: string | null
          updated_at?: string
          vip_guests?: number
          volunteers_present?: number
        }
        Update: {
          adults?: number
          avg_entry_minutes?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          children?: number
          created_at?: string
          created_by?: string | null
          first_timers?: number
          id?: string
          notes?: string | null
          peak_arrival_time?: string | null
          returning_visitors?: number
          service_date?: string
          service_id?: string | null
          updated_at?: string
          vip_guests?: number
          volunteers_present?: number
        }
        Relationships: [
          {
            foreignKeyName: "ush_attendance_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "ush_services"
            referencedColumns: ["id"]
          },
        ]
      }
      ush_care: {
        Row: {
          assigned_volunteer: string | null
          assistance_provided: string | null
          assistance_requested: string | null
          care_group: string
          created_at: string
          created_by: string | null
          followup_notes: string | null
          followup_required: boolean
          id: string
          member_name: string
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_volunteer?: string | null
          assistance_provided?: string | null
          assistance_requested?: string | null
          care_group?: string
          created_at?: string
          created_by?: string | null
          followup_notes?: string | null
          followup_required?: boolean
          id?: string
          member_name: string
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_volunteer?: string | null
          assistance_provided?: string | null
          assistance_requested?: string | null
          care_group?: string
          created_at?: string
          created_by?: string | null
          followup_notes?: string | null
          followup_required?: boolean
          id?: string
          member_name?: string
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ush_care_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "ush_services"
            referencedColumns: ["id"]
          },
        ]
      }
      ush_comms: {
        Row: {
          audience: string
          channels: Json
          comm_type: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          priority: string
          send_at: string | null
          sent: boolean
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          channels?: Json
          comm_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          priority?: string
          send_at?: string | null
          sent?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          channels?: Json
          comm_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          priority?: string
          send_at?: string | null
          sent?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ush_courses: {
        Row: {
          created_at: string
          description: string | null
          document_url: string | null
          duration_hours: number | null
          id: string
          required: boolean
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          duration_hours?: number | null
          id?: string
          required?: boolean
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          duration_hours?: number | null
          id?: string
          required?: boolean
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      ush_incidents: {
        Row: {
          actions_taken: string | null
          created_at: string
          created_by: string | null
          description: string | null
          escalated_to: string | null
          followup_status: string
          id: string
          incident_type: string
          location: string | null
          occurred_at: string
          photo_url: string | null
          resolution: string | null
          response_minutes: number | null
          responsible_leader: string | null
          service_id: string | null
          severity: string
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          actions_taken?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalated_to?: string | null
          followup_status?: string
          id?: string
          incident_type?: string
          location?: string | null
          occurred_at?: string
          photo_url?: string | null
          resolution?: string | null
          response_minutes?: number | null
          responsible_leader?: string | null
          service_id?: string | null
          severity?: string
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          actions_taken?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalated_to?: string | null
          followup_status?: string
          id?: string
          incident_type?: string
          location?: string | null
          occurred_at?: string
          photo_url?: string | null
          resolution?: string | null
          response_minutes?: number | null
          responsible_leader?: string | null
          service_id?: string | null
          severity?: string
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ush_incidents_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "ush_services"
            referencedColumns: ["id"]
          },
        ]
      }
      ush_risks: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner_name: string | null
          review_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner_name?: string | null
          review_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ush_roster: {
        Row: {
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          duty: string
          id: string
          is_backup: boolean
          leave_reason: string | null
          notes: string | null
          reminder_sent: boolean
          section: string | null
          service_id: string | null
          status: string
          swap_with: string | null
          updated_at: string
          volunteer_id: string | null
          volunteer_name: string | null
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          created_by?: string | null
          duty?: string
          id?: string
          is_backup?: boolean
          leave_reason?: string | null
          notes?: string | null
          reminder_sent?: boolean
          section?: string | null
          service_id?: string | null
          status?: string
          swap_with?: string | null
          updated_at?: string
          volunteer_id?: string | null
          volunteer_name?: string | null
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          created_by?: string | null
          duty?: string
          id?: string
          is_backup?: boolean
          leave_reason?: string | null
          notes?: string | null
          reminder_sent?: boolean
          section?: string | null
          service_id?: string | null
          status?: string
          swap_with?: string | null
          updated_at?: string
          volunteer_id?: string | null
          volunteer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ush_roster_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "ush_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ush_roster_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "ush_volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      ush_seating: {
        Row: {
          capacity: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          occupied: number
          reserved: number
          section: string
          service_id: string | null
          updated_at: string
          usher_name: string | null
          zone_type: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          occupied?: number
          reserved?: number
          section: string
          service_id?: string | null
          updated_at?: string
          usher_name?: string | null
          zone_type?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          occupied?: number
          reserved?: number
          section?: string
          service_id?: string | null
          updated_at?: string
          usher_name?: string | null
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ush_seating_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "ush_services"
            referencedColumns: ["id"]
          },
        ]
      }
      ush_services: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          checklist: Json
          created_at: string
          created_by: string | null
          ends_at: string | null
          expected_attendance: number
          id: string
          notes: string | null
          seating_capacity: number
          service_date: string
          service_lead: string | null
          service_type: string
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          expected_attendance?: number
          id?: string
          notes?: string | null
          seating_capacity?: number
          service_date?: string
          service_lead?: string | null
          service_type?: string
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          expected_attendance?: number
          id?: string
          notes?: string | null
          seating_capacity?: number
          service_date?: string
          service_lead?: string | null
          service_type?: string
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      ush_training_records: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          expires_on: string | null
          id: string
          member_name: string | null
          progress_pct: number
          score: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          expires_on?: string | null
          id?: string
          member_name?: string | null
          progress_pct?: number
          score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          expires_on?: string | null
          id?: string
          member_name?: string | null
          progress_pct?: number
          score?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ush_training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ush_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ush_visitors: {
        Row: {
          assigned_pathway: string | null
          badge_code: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          children: number
          created_at: string
          created_by: string | null
          email: string | null
          family_members: number
          followup_owner: string | null
          followup_status: string
          full_name: string
          id: string
          interests: string | null
          invited_by: string | null
          notes: string | null
          phone: string | null
          prayer_request: string | null
          satisfaction: number | null
          service_id: string | null
          updated_at: string
          visitor_type: string
          welcome_email_sent: boolean
          welcome_sms_sent: boolean
        }
        Insert: {
          assigned_pathway?: string | null
          badge_code?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          children?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          family_members?: number
          followup_owner?: string | null
          followup_status?: string
          full_name: string
          id?: string
          interests?: string | null
          invited_by?: string | null
          notes?: string | null
          phone?: string | null
          prayer_request?: string | null
          satisfaction?: number | null
          service_id?: string | null
          updated_at?: string
          visitor_type?: string
          welcome_email_sent?: boolean
          welcome_sms_sent?: boolean
        }
        Update: {
          assigned_pathway?: string | null
          badge_code?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          children?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          family_members?: number
          followup_owner?: string | null
          followup_status?: string
          full_name?: string
          id?: string
          interests?: string | null
          invited_by?: string | null
          notes?: string | null
          phone?: string | null
          prayer_request?: string | null
          satisfaction?: number | null
          service_id?: string | null
          updated_at?: string
          visitor_type?: string
          welcome_email_sent?: boolean
          welcome_sms_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ush_visitors_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "ush_services"
            referencedColumns: ["id"]
          },
        ]
      }
      ush_volunteers: {
        Row: {
          active: boolean
          availability: string
          branch: Database["public"]["Enums"]["branch"] | null
          certifications: Json
          created_at: string
          created_by: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string
          id: string
          mentor_name: string | null
          ministry_experience: string | null
          notes: string | null
          performance_rating: number
          phone: string | null
          photo_url: string | null
          role: string
          section: string | null
          services_served: number
          team: string
          training_status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          availability?: string
          branch?: Database["public"]["Enums"]["branch"] | null
          certifications?: Json
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name: string
          id?: string
          mentor_name?: string | null
          ministry_experience?: string | null
          notes?: string | null
          performance_rating?: number
          phone?: string | null
          photo_url?: string | null
          role?: string
          section?: string | null
          services_served?: number
          team?: string
          training_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          availability?: string
          branch?: Database["public"]["Enums"]["branch"] | null
          certifications?: Json
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string
          id?: string
          mentor_name?: string | null
          ministry_experience?: string | null
          notes?: string | null
          performance_rating?: number
          phone?: string | null
          photo_url?: string | null
          role?: string
          section?: string | null
          services_served?: number
          team?: string
          training_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      volunteer_profiles: {
        Row: {
          availability: string | null
          badges: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          burnout_risk: string
          created_at: string
          created_by: string | null
          department_slug: string | null
          full_name: string
          id: string
          leave_reason: string | null
          leave_until: string | null
          notes: string | null
          on_leave: boolean
          performance_rating: number | null
          recognition: string | null
          role_title: string | null
          services_attended: number
          services_missed: number
          serving_since: string | null
          skills: string | null
          status: string
          total_hours: number
          training_status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability?: string | null
          badges?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          burnout_risk?: string
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          full_name: string
          id?: string
          leave_reason?: string | null
          leave_until?: string | null
          notes?: string | null
          on_leave?: boolean
          performance_rating?: number | null
          recognition?: string | null
          role_title?: string | null
          services_attended?: number
          services_missed?: number
          serving_since?: string | null
          skills?: string | null
          status?: string
          total_hours?: number
          training_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability?: string | null
          badges?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          burnout_risk?: string
          created_at?: string
          created_by?: string | null
          department_slug?: string | null
          full_name?: string
          id?: string
          leave_reason?: string | null
          leave_until?: string | null
          notes?: string | null
          on_leave?: boolean
          performance_rating?: number | null
          recognition?: string | null
          role_title?: string | null
          services_attended?: number
          services_missed?: number
          serving_since?: string | null
          skills?: string | null
          status?: string
          total_hours?: number
          training_status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_service_logs: {
        Row: {
          attended: boolean
          created_at: string
          department_slug: string | null
          hours: number
          id: string
          logged_by: string | null
          notes: string | null
          service_date: string
          volunteer_id: string
        }
        Insert: {
          attended?: boolean
          created_at?: string
          department_slug?: string | null
          hours?: number
          id?: string
          logged_by?: string | null
          notes?: string | null
          service_date?: string
          volunteer_id: string
        }
        Update: {
          attended?: boolean
          created_at?: string
          department_slug?: string | null
          hours?: number
          id?: string
          logged_by?: string | null
          notes?: string | null
          service_date?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_service_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "department_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_service_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_service_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_service_logs_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worship_assignments: {
        Row: {
          created_at: string
          id: string
          member_id: string
          notes: string | null
          response: string
          role_title: string
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          response?: string
          role_title: string
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          response?: string
          role_title?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worship_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "worship_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worship_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "worship_services"
            referencedColumns: ["id"]
          },
        ]
      }
      worship_courses: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          duration_hours: number | null
          facilitator: string | null
          id: string
          renewal_months: number | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          facilitator?: string | null
          id?: string
          renewal_months?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          facilitator?: string | null
          id?: string
          renewal_months?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      worship_equipment: {
        Row: {
          asset_number: string | null
          assigned_to: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          condition: string
          created_at: string
          id: string
          last_service_date: string | null
          location: string | null
          name: string
          next_service_date: string | null
          notes: string | null
          purchase_date: string | null
          replacement_year: number | null
          serial_number: string | null
          status: string
          updated_at: string
          warranty_expiry: string | null
        }
        Insert: {
          asset_number?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          condition?: string
          created_at?: string
          id?: string
          last_service_date?: string | null
          location?: string | null
          name: string
          next_service_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          replacement_year?: number | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          warranty_expiry?: string | null
        }
        Update: {
          asset_number?: string | null
          assigned_to?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          condition?: string
          created_at?: string
          id?: string
          last_service_date?: string | null
          location?: string | null
          name?: string
          next_service_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          replacement_year?: number | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          warranty_expiry?: string | null
        }
        Relationships: []
      }
      worship_equipment_faults: {
        Row: {
          created_at: string
          description: string
          equipment_id: string
          id: string
          reported_by: string | null
          reported_on: string
          resolution: string | null
          resolved_on: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          equipment_id: string
          id?: string
          reported_by?: string | null
          reported_on?: string
          resolution?: string | null
          resolved_on?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          equipment_id?: string
          id?: string
          reported_by?: string | null
          reported_on?: string
          resolution?: string | null
          resolved_on?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worship_equipment_faults_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "worship_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      worship_rehearsal_attendance: {
        Row: {
          created_at: string
          id: string
          member_id: string
          notes: string | null
          on_time: boolean
          prepared: boolean
          present: boolean
          rehearsal_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          on_time?: boolean
          prepared?: boolean
          present?: boolean
          rehearsal_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          on_time?: boolean
          prepared?: boolean
          present?: boolean
          rehearsal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worship_rehearsal_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "worship_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worship_rehearsal_attendance_rehearsal_id_fkey"
            columns: ["rehearsal_id"]
            isOneToOne: false
            referencedRelation: "worship_rehearsals"
            referencedColumns: ["id"]
          },
        ]
      }
      worship_rehearsals: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string | null
          id: string
          objectives: string | null
          practice_notes: string | null
          prayer_session: boolean
          readiness_score: number | null
          recording_url: string | null
          rehearsal_date: string
          service_id: string | null
          start_time: string | null
          status: string
          technical_runthrough: boolean
          updated_at: string
          venue: string | null
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          objectives?: string | null
          practice_notes?: string | null
          prayer_session?: boolean
          readiness_score?: number | null
          recording_url?: string | null
          rehearsal_date: string
          service_id?: string | null
          start_time?: string | null
          status?: string
          technical_runthrough?: boolean
          updated_at?: string
          venue?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          objectives?: string | null
          practice_notes?: string | null
          prayer_session?: boolean
          readiness_score?: number | null
          recording_url?: string | null
          rehearsal_date?: string
          service_id?: string | null
          start_time?: string | null
          status?: string
          technical_runthrough?: boolean
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worship_rehearsals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "worship_services"
            referencedColumns: ["id"]
          },
        ]
      }
      worship_risks: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          escalation_level: string
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner: string | null
          review_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_level?: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          review_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          escalation_level?: string
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          review_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      worship_service_items: {
        Row: {
          created_at: string
          detail: string | null
          duration_min: number
          id: string
          item_type: string
          order_index: number
          responsible: string | null
          service_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          duration_min?: number
          id?: string
          item_type?: string
          order_index?: number
          responsible?: string | null
          service_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          duration_min?: number
          id?: string
          item_type?: string
          order_index?: number
          responsible?: string | null
          service_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worship_service_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "worship_services"
            referencedColumns: ["id"]
          },
        ]
      }
      worship_services: {
        Row: {
          backup_plan: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string | null
          department_slug: string
          id: string
          livestream_ready: boolean
          notes: string | null
          preacher: string | null
          scriptures_loaded: boolean
          sermon_scriptures: string | null
          sermon_title: string | null
          service_date: string
          service_type: string
          set_approved: boolean
          stage_layout_ready: boolean
          start_time: string | null
          status: string
          tech_team_confirmed: boolean
          theme: string | null
          title: string
          updated_at: string
          venue: string | null
          worship_leader: string | null
          worship_leader_id: string | null
        }
        Insert: {
          backup_plan?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          department_slug?: string
          id?: string
          livestream_ready?: boolean
          notes?: string | null
          preacher?: string | null
          scriptures_loaded?: boolean
          sermon_scriptures?: string | null
          sermon_title?: string | null
          service_date: string
          service_type?: string
          set_approved?: boolean
          stage_layout_ready?: boolean
          start_time?: string | null
          status?: string
          tech_team_confirmed?: boolean
          theme?: string | null
          title: string
          updated_at?: string
          venue?: string | null
          worship_leader?: string | null
          worship_leader_id?: string | null
        }
        Update: {
          backup_plan?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string | null
          department_slug?: string
          id?: string
          livestream_ready?: boolean
          notes?: string | null
          preacher?: string | null
          scriptures_loaded?: boolean
          sermon_scriptures?: string | null
          sermon_title?: string | null
          service_date?: string
          service_type?: string
          set_approved?: boolean
          stage_layout_ready?: boolean
          start_time?: string | null
          status?: string
          tech_team_confirmed?: boolean
          theme?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
          worship_leader?: string | null
          worship_leader_id?: string | null
        }
        Relationships: []
      }
      worship_set_songs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          notes: string | null
          order_index: number
          segment: string
          service_id: string
          song_id: string | null
          song_key: string | null
          transition_note: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          order_index?: number
          segment?: string
          service_id: string
          song_id?: string | null
          song_key?: string | null
          transition_note?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          order_index?: number
          segment?: string
          service_id?: string
          song_id?: string | null
          song_key?: string | null
          transition_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worship_set_songs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "worship_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worship_set_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      worship_spiritual_log: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          created_by: string | null
          detail: string | null
          id: string
          member_id: string | null
        }
        Insert: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          member_id?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worship_spiritual_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "worship_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      worship_team_members: {
        Row: {
          availability: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          experience_years: number | null
          full_name: string
          id: string
          instruments: string[] | null
          mentor: string | null
          notes: string | null
          performance_score: number | null
          phone: string | null
          rehearsals_attended: number
          rehearsals_missed: number
          role_title: string
          services_served: number
          skills: string | null
          status: string
          updated_at: string
          user_id: string | null
          vocal_range: string | null
        }
        Insert: {
          availability?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience_years?: number | null
          full_name: string
          id?: string
          instruments?: string[] | null
          mentor?: string | null
          notes?: string | null
          performance_score?: number | null
          phone?: string | null
          rehearsals_attended?: number
          rehearsals_missed?: number
          role_title?: string
          services_served?: number
          skills?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vocal_range?: string | null
        }
        Update: {
          availability?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience_years?: number | null
          full_name?: string
          id?: string
          instruments?: string[] | null
          mentor?: string | null
          notes?: string | null
          performance_score?: number | null
          phone?: string | null
          rehearsals_attended?: number
          rehearsals_missed?: number
          role_title?: string
          services_served?: number
          skills?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vocal_range?: string | null
        }
        Relationships: []
      }
      worship_tech_items: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          detail: string | null
          done: boolean
          id: string
          label: string
          service_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          detail?: string | null
          done?: boolean
          id?: string
          label: string
          service_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          detail?: string | null
          done?: boolean
          id?: string
          label?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worship_tech_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "worship_services"
            referencedColumns: ["id"]
          },
        ]
      }
      worship_training_records: {
        Row: {
          certificate_url: string | null
          completed_on: string | null
          course_id: string
          created_at: string
          id: string
          member_id: string
          notes: string | null
          renewal_due: string | null
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          completed_on?: string | null
          course_id: string
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          renewal_due?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          completed_on?: string | null
          course_id?: string
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          renewal_due?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worship_training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "worship_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worship_training_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "worship_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      assets_low_stock: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          brand: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          custodian: string | null
          department_slug: string | null
          id: string | null
          last_maintenance_alert_sent_at: string | null
          location: string | null
          model: string | null
          name: string | null
          next_maintenance_date: string | null
          notes: string | null
          primary_supplier_id: string | null
          primary_supplier_name: string | null
          purchase_date: string | null
          purchase_value: number | null
          quantity_on_hand: number | null
          reorder_level: number | null
          serial_number: string | null
          status: string | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_primary_supplier_id_fkey"
            columns: ["primary_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      department_directory: {
        Row: {
          department_name: string | null
          full_name: string | null
          id: string | null
          primary_department: string | null
        }
        Relationships: []
      }
      kpi_status: {
        Row: {
          actual: number | null
          baseline: number | null
          branch: Database["public"]["Enums"]["branch"] | null
          category: Database["public"]["Enums"]["kpi_category"] | null
          department_slug: string | null
          entered_at: string | null
          entered_by: string | null
          id: string | null
          kpi_name: string | null
          notes: string | null
          period_date: string | null
          period_type: Database["public"]["Enums"]["kpi_period"] | null
          status: string | null
          target: number | null
          updated_at: string | null
        }
        Insert: {
          actual?: number | null
          baseline?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: Database["public"]["Enums"]["kpi_category"] | null
          department_slug?: string | null
          entered_at?: string | null
          entered_by?: string | null
          id?: string | null
          kpi_name?: string | null
          notes?: string | null
          period_date?: string | null
          period_type?: Database["public"]["Enums"]["kpi_period"] | null
          status?: never
          target?: number | null
          updated_at?: string | null
        }
        Update: {
          actual?: number | null
          baseline?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: Database["public"]["Enums"]["kpi_category"] | null
          department_slug?: string | null
          entered_at?: string | null
          entered_by?: string | null
          id?: string | null
          kpi_name?: string | null
          notes?: string | null
          period_date?: string | null
          period_type?: Database["public"]["Enums"]["kpi_period"] | null
          status?: never
          target?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpis_department_slug_fkey"
            columns: ["department_slug"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["slug"]
          },
        ]
      }
      leadership_attendance: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          full_name: string | null
          present: boolean | null
          role: Database["public"]["Enums"]["app_role"] | null
          service_date: string | null
          user_id: string | null
        }
        Relationships: []
      }
      member_directory: {
        Row: {
          avatar_url: string | null
          branch: Database["public"]["Enums"]["branch"] | null
          department_name: string | null
          full_name: string | null
          id: string | null
          primary_department: string | null
          requested_role: string | null
        }
        Relationships: []
      }
      new_members_by_sunday: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          full_name: string | null
          service_date: string | null
          user_id: string | null
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          full_name?: string | null
          service_date?: string | null
          user_id?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          full_name?: string | null
          service_date?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sunday_rsvp_counts: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          response: string | null
          service_date: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_member: {
        Args: { _approve: boolean; _user_id: string }
        Returns: undefined
      }
      can_access_admin_panel: { Args: { _user_id: string }; Returns: boolean }
      can_manage_meeting: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      can_post_cross_branch: { Args: { _user_id: string }; Returns: boolean }
      can_view_all_kpis: { Args: { _user_id: string }; Returns: boolean }
      can_view_checkup_watch: { Args: { _user_id: string }; Returns: boolean }
      can_view_profile: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
      can_view_rsvp_reasons: { Args: { _user_id: string }; Returns: boolean }
      generate_upcoming_recurring_events: { Args: never; Returns: undefined }
      get_all_uploads: {
        Args: never
        Returns: {
          branch: Database["public"]["Enums"]["branch"]
          created_at: string
          department_slug: string
          file_name: string
          file_url: string
          source: string
          source_id: string
          title: string
          uploader_id: string
        }[]
      }
      get_attendance_trend: {
        Args: { _months?: number }
        Returns: {
          branch: Database["public"]["Enums"]["branch"]
          period: string
          total_present: number
        }[]
      }
      get_branch_activity: {
        Args: { _days?: number }
        Returns: {
          branch: Database["public"]["Enums"]["branch"]
          total_present: number
        }[]
      }
      get_budget_utilisation: {
        Args: { _fiscal_year?: number }
        Returns: {
          actual: number
          branch: Database["public"]["Enums"]["branch"]
          budget_id: string
          budget_type: string
          committed: number
          department_slug: string
          fiscal_year: number
          name: string
          planned: number
          remaining: number
          status: string
          utilisation_pct: number
          variance: number
        }[]
      }
      get_department_oversight: {
        Args: never
        Returns: {
          critical_risks: number
          department_name: string
          department_slug: string
          kind: string
          kpi_avg_pct: number
          kpi_count: number
          last_activity: string
          members: number
          open_compliance: number
          open_decisions: number
          open_risks: number
          open_tasks: number
          overdue_tasks: number
          reports_90d: number
        }[]
      }
      get_department_performance: {
        Args: never
        Returns: {
          avg_pct: number
          branch: Database["public"]["Enums"]["branch"]
          department_slug: string
          kpi_count: number
        }[]
      }
      get_finance_summary: {
        Args: { _months?: number }
        Returns: {
          cash_position: number
          expense_this_month: number
          giving_this_month: number
          giving_today: number
          income_this_month: number
          outstanding_payments: number
          pending_approvals: number
          total_expense: number
          total_income: number
        }[]
      }
      get_financial_trend: {
        Args: { _months?: number }
        Returns: {
          expense: number
          income: number
          period: string
        }[]
      }
      get_kpi_period_comparison: {
        Args: never
        Returns: {
          current_avg_pct: number
          period_label: string
          previous_avg_pct: number
        }[]
      }
      get_member_profile: {
        Args: { _member_id: string }
        Returns: {
          avatar_url: string
          branch: Database["public"]["Enums"]["branch"]
          department_name: string
          email: string
          full_name: string
          id: string
          phone: string
          primary_department: string
          requested_role: string
        }[]
      }
      get_my_calendar_connection_status: {
        Args: never
        Returns: {
          connected: boolean
          connected_at: string
          connected_email: string
          connector_id: string
        }[]
      }
      get_sunday_rsvp_status: {
        Args: { _service_date: string }
        Returns: {
          branch: Database["public"]["Enums"]["branch"]
          full_name: string
          response: string
          user_id: string
        }[]
      }
      get_task_completion: {
        Args: { _days?: number }
        Returns: {
          done_tasks: number
          overdue_tasks: number
          total_tasks: number
        }[]
      }
      get_upcoming_deadlines: {
        Args: { _limit?: number }
        Returns: {
          assigned_to: string
          branch: Database["public"]["Enums"]["branch"]
          department_slug: string
          due_date: string
          id: string
          priority: string
          status: string
          title: string
        }[]
      }
      global_search: {
        Args: { _term: string }
        Returns: {
          id: string
          path: string
          rank: number
          result_type: string
          subtitle: string
          title: string
        }[]
      }
      gov_can_access_branch: {
        Args: {
          p_branch: Database["public"]["Enums"]["branch"]
          p_user: string
        }
        Returns: boolean
      }
      gov_can_access_department: {
        Args: { p_dept: string; p_user: string }
        Returns: boolean
      }
      gov_has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user: string
        }
        Returns: boolean
      }
      gov_is_admin: { Args: { p_user: string }; Returns: boolean }
      gov_user_department_slugs: { Args: { p_user: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved_member: { Args: { _user_id: string }; Returns: boolean }
      is_child_guardian: {
        Args: { _child_id: string; _user_id: string }
        Returns: boolean
      }
      is_dept_branch_member_or_admin: {
        Args: { _branch: Database["public"]["Enums"]["branch"]; _slug: string }
        Returns: boolean
      }
      is_dept_member: { Args: { _slug: string }; Returns: boolean }
      is_dept_member_or_admin: { Args: { _slug: string }; Returns: boolean }
      is_finance_officer: { Args: { _user_id: string }; Returns: boolean }
      is_head_office: { Args: { _user_id: string }; Returns: boolean }
      is_hospitality_team: { Args: { _user_id: string }; Returns: boolean }
      is_intercession_team: { Args: { _user_id: string }; Returns: boolean }
      is_kids_team: { Args: { _user_id: string }; Returns: boolean }
      is_media_team: { Args: { _user_id: string }; Returns: boolean }
      is_pastoral_team: { Args: { _user_id: string }; Returns: boolean }
      is_prayer_leadership: { Args: { _user_id: string }; Returns: boolean }
      is_resource_team: { Args: { _user_id: string }; Returns: boolean }
      is_secretariat: { Args: { _user_id: string }; Returns: boolean }
      is_strategy_team: { Args: { _user_id: string }; Returns: boolean }
      is_tech_team: { Args: { _user_id: string }; Returns: boolean }
      is_ushering_team: { Args: { _user_id: string }; Returns: boolean }
      is_worship_team: { Args: { _user_id: string }; Returns: boolean }
      list_conversations: {
        Args: never
        Returns: {
          last_body: string
          last_created_at: string
          partner_avatar: string
          partner_id: string
          partner_name: string
          unread_count: number
        }[]
      }
      log_audit: {
        Args: {
          _action: string
          _details?: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
      run_asset_maintenance_check: { Args: never; Returns: undefined }
      run_kpi_alert_check: { Args: never; Returns: undefined }
      run_task_overdue_check: { Args: never; Returns: undefined }
      same_branch_or_admin: {
        Args: { _branch: Database["public"]["Enums"]["branch"] }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_dept_slugs: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "senior_apostle"
        | "chairperson"
        | "secretary"
        | "lead_pastor"
        | "associate_pastor"
        | "department_chair"
        | "team_member"
        | "strategic_adviser"
      approval_status: "pending" | "approved" | "rejected"
      branch: "etwatwa" | "joburg_north" | "joburg_south"
      dept_kind:
        | "functional"
        | "developmental"
        | "seven_mountain"
        | "five_fold"
        | "leadership"
        | "governmental"
        | "support_services"
      kpi_category:
        | "spiritual_impact"
        | "people_development"
        | "operational_excellence"
        | "stewardship"
        | "kingdom_influence"
      kpi_period: "weekly" | "monthly" | "quarterly" | "annual"
      post_branch_target: "twatwa" | "joburg_north" | "joburg_south" | "all"
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
    Enums: {
      app_role: [
        "senior_apostle",
        "chairperson",
        "secretary",
        "lead_pastor",
        "associate_pastor",
        "department_chair",
        "team_member",
        "strategic_adviser",
      ],
      approval_status: ["pending", "approved", "rejected"],
      branch: ["etwatwa", "joburg_north", "joburg_south"],
      dept_kind: [
        "functional",
        "developmental",
        "seven_mountain",
        "five_fold",
        "leadership",
        "governmental",
        "support_services",
      ],
      kpi_category: [
        "spiritual_impact",
        "people_development",
        "operational_excellence",
        "stewardship",
        "kingdom_influence",
      ],
      kpi_period: ["weekly", "monthly", "quarterly", "annual"],
      post_branch_target: ["twatwa", "joburg_north", "joburg_south", "all"],
    },
  },
} as const
