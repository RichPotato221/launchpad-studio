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
      kpis: {
        Row: {
          actual: number | null
          baseline: number | null
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
      [_ in never]: never
    }
    Functions: {
      approve_member: {
        Args: { _approve: boolean; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
