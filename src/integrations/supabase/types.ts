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
      attendance: {
        Row: {
          branch: Database["public"]["Enums"]["branch"] | null
          created_at: string
          department_slug: string | null
          event_id: string | null
          full_name: string | null
          id: string
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
          location: string | null
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
          location?: string | null
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
          location?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "profiles"
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
          priority: string
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
          priority?: string
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
          priority?: string
          requires_approval?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
    }
    Functions: {
      approve_member: {
        Args: { _approve: boolean; _user_id: string }
        Returns: undefined
      }
      can_view_profile: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
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
      is_dept_member_or_admin: { Args: { _slug: string }; Returns: boolean }
      is_head_office: { Args: { _user_id: string }; Returns: boolean }
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
    },
  },
} as const
