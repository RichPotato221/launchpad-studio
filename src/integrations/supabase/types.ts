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
          branch: Database["public"]["Enums"]["branch"] | null
          brand: string | null
          category: string | null
          created_at: string
          created_by: string | null
          custodian: string | null
          department_slug: string | null
          id: string
          last_maintenance_alert_sent_at: string | null
          location: string | null
          model: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          primary_supplier_id: string | null
          purchase_date: string | null
          purchase_value: number | null
          quantity_on_hand: number
          reorder_level: number | null
          serial_number: string | null
          status: string
          unit_of_measure: string | null
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          custodian?: string | null
          department_slug?: string | null
          id?: string
          last_maintenance_alert_sent_at?: string | null
          location?: string | null
          model?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          primary_supplier_id?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          quantity_on_hand?: number
          reorder_level?: number | null
          serial_number?: string | null
          status?: string
          unit_of_measure?: string | null
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          custodian?: string | null
          department_slug?: string | null
          id?: string
          last_maintenance_alert_sent_at?: string | null
          location?: string | null
          model?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          primary_supplier_id?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          quantity_on_hand?: number
          reorder_level?: number | null
          serial_number?: string | null
          status?: string
          unit_of_measure?: string | null
          updated_at?: string
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
          branch: Database["public"]["Enums"]["branch"] | null
          claim_type: string | null
          claimant_id: string
          created_at: string
          department_slug: string
          description: string
          id: string
          receipt_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by_chair?: string | null
          approved_by_senior?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          claim_type?: string | null
          claimant_id: string
          created_at?: string
          department_slug: string
          description: string
          id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by_chair?: string | null
          approved_by_senior?: string | null
          branch?: Database["public"]["Enums"]["branch"] | null
          claim_type?: string | null
          claimant_id?: string
          created_at?: string
          department_slug?: string
          description?: string
          id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number | null
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          created_by: string
          department_slug: string
          entry_date: string
          file_name: string | null
          file_url: string | null
          id: string
          kind: string
          member_id: string | null
          notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by: string
          department_slug?: string
          entry_date?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          kind: string
          member_id?: string | null
          notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          branch?: Database["public"]["Enums"]["branch"] | null
          created_at?: string
          created_by?: string
          department_slug?: string
          entry_date?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          kind?: string
          member_id?: string | null
          notes?: string | null
          title?: string
          updated_at?: string
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
      resolutions: {
        Row: {
          agenda_item_id: string | null
          created_at: string
          created_by: string | null
          id: string
          meeting_id: string
          minute_id: string | null
          resolution_number: string | null
          resolution_text: string
          status: string
        }
        Insert: {
          agenda_item_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id: string
          minute_id?: string | null
          resolution_number?: string | null
          resolution_text: string
          status?: string
        }
        Update: {
          agenda_item_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id?: string
          minute_id?: string | null
          resolution_number?: string | null
          resolution_text?: string
          status?: string
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
      songs: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          ccli_number: string | null
          chord_chart_url: string | null
          created_at: string
          created_by: string | null
          department_slug: string
          id: string
          song_key: string | null
          tempo: number | null
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          ccli_number?: string | null
          chord_chart_url?: string | null
          created_at?: string
          created_by?: string | null
          department_slug: string
          id?: string
          song_key?: string | null
          tempo?: number | null
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          ccli_number?: string | null
          chord_chart_url?: string | null
          created_at?: string
          created_by?: string | null
          department_slug?: string
          id?: string
          song_key?: string | null
          tempo?: number | null
          title?: string
          updated_at?: string
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
      get_department_performance: {
        Args: never
        Returns: {
          avg_pct: number
          branch: Database["public"]["Enums"]["branch"]
          department_slug: string
          kpi_count: number
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
      is_dept_branch_member_or_admin: {
        Args: { _branch: Database["public"]["Enums"]["branch"]; _slug: string }
        Returns: boolean
      }
      is_dept_member: { Args: { _slug: string }; Returns: boolean }
      is_dept_member_or_admin: { Args: { _slug: string }; Returns: boolean }
      is_head_office: { Args: { _user_id: string }; Returns: boolean }
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
