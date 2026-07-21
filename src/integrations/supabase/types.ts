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
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      assets: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          category: string | null
          created_at: string
          created_by: string | null
          custodian: string | null
          department_slug: string | null
          id: string
          last_maintenance_alert_sent_at: string | null
          location: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          purchase_date: string | null
          purchase_value: number | null
          status: string
          updated_at: string
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          custodian?: string | null
          department_slug?: string | null
          id?: string
          last_maintenance_alert_sent_at?: string | null
          location?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"] | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          custodian?: string | null
          department_slug?: string | null
          id?: string
          last_maintenance_alert_sent_at?: string | null
          location?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
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
      departments: {
        Row: {
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
          title: string
          updated_at: string
        }
        Insert: {
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
          title: string
          updated_at?: string
        }
        Update: {
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
            referencedRelation: "profiles"
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
      generate_upcoming_recurring_events: { Args: never; Returns: undefined }
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
      branch: "twatwa" | "joburg_north" | "joburg_south"
      dept_kind:
        | "functional"
        | "developmental"
        | "seven_mountain"
        | "five_fold"
        | "leadership"
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
      branch: ["twatwa", "joburg_north", "joburg_south"],
      dept_kind: [
        "functional",
        "developmental",
        "seven_mountain",
        "five_fold",
        "leadership",
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
