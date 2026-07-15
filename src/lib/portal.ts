import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Department = Database["public"]["Tables"]["departments"]["Row"];
export type Kpi = Database["public"]["Tables"]["kpis"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type KpiCategory = Database["public"]["Enums"]["kpi_category"];

export const KPI_CATEGORIES: { key: KpiCategory; label: string }[] = [
  { key: "spiritual_impact", label: "Spiritual Impact" },
  { key: "people_development", label: "People Development" },
  { key: "operational_excellence", label: "Operational Excellence" },
  { key: "stewardship", label: "Stewardship" },
  { key: "kingdom_influence", label: "Kingdom Influence" },
];

export const ROLE_LABELS: Record<AppRole, string> = {
  senior_apostle: "Senior Pastor",
  chairperson: "Chairperson",
  secretary: "Church Secretary",
  lead_pastor: "Lead Pastor",
  associate_pastor: "Associate Pastor",
  department_chair: "Department Chair",
  team_member: "Team Member",
};

export async function fetchDepartments() {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function fetchDepartment(slug: string) {
  const { data, error } = await supabase.from("departments").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchDepartmentKpis(slug: string) {
  const { data, error } = await supabase
    .from("kpis")
    .select("*")
    .eq("department_slug", slug)
    .order("period_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchAllKpis() {
  const { data, error } = await supabase.from("kpis").select("*").order("period_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMyRoles() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];
  const { data, error } = await supabase.from("user_roles").select("*").eq("user_id", user.user.id);
  if (error) throw error;
  return data;
}

export async function fetchSetting(key: string) {
  const { data, error } = await supabase.from("settings").select("*").eq("key", key).maybeSingle();
  if (error) throw error;
  return data;
}

export const MANUALS = [
  { key: "constitution", title: "Apostolic Constitution", href: "/manuals/1_Apostolic_Constitution.docx" },
  { key: "governance", title: "Governance Manual", href: "/manuals/2_Governance_Manual.docx" },
  { key: "operations", title: "Ministry Operations Manual", href: "/manuals/3_Ministry_Operations_Manual.docx" },
  { key: "finance", title: "Finance Manual", href: "/manuals/4_Finance_Manual.docx" },
  { key: "kpi", title: "KPI Manual", href: "/manuals/5_KPI_Manual.docx" },
];
