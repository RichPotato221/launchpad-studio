import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/** Everything a department may budget for. Finance can extend this list over time. */
export const BUDGET_CATEGORIES = [
  "Equipment",
  "Technology",
  "Furniture",
  "Transport",
  "Events",
  "Conferences",
  "Outreach",
  "Marketing",
  "Media",
  "Ministry Materials",
  "Office Supplies",
  "Training",
  "Staff / Workers",
  "Maintenance",
  "Building / Facilities",
  "Communication",
  "Software / Subscriptions",
  "Travel",
  "Hospitality",
  "Missions",
  "Community Development",
  "Emergency",
  "Capital Projects",
  "Other",
] as const;

export const BUDGET_PERIODS = [
  { key: "short_term", label: "Short term (1–6 months)" },
  { key: "medium_term", label: "Medium term (6–12 months)" },
  { key: "long_term", label: "Long term (1–3 years)" },
  { key: "annual", label: "Annual" },
  { key: "project", label: "Project based" },
  { key: "event", label: "Event based" },
] as const;

export const BUDGET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type BudgetPosition = {
  budget_id: string;
  reference_number: string | null;
  name: string;
  department_slug: string | null;
  branch: string | null;
  budget_type: string;
  period_label: string;
  category: string | null;
  fiscal_year: number;
  period_start: string | null;
  period_end: string | null;
  status: string;
  allocated: number;
  spent: number;
  committed: number;
  pending: number;
  available: number;
  utilisation_pct: number;
};

export type ChurchPosition = {
  total_cash: number;
  reserved: number;
  allocated: number;
  committed: number;
  spent: number;
  pending: number;
  unallocated: number;
  available: number;
};

/** Live budget figures, calculated in the database from real transactions. */
export function useBudgetPositions(departmentSlug?: string) {
  return useQuery({
    queryKey: ["budget-positions", departmentSlug ?? "all"],
    queryFn: async (): Promise<BudgetPosition[]> => {
      const { data, error } = await sb.rpc("get_budget_positions");
      if (error) throw error;
      const rows = (data ?? []) as BudgetPosition[];
      return departmentSlug ? rows.filter((r) => r.department_slug === departmentSlug) : rows;
    },
  });
}

export function useChurchPosition() {
  return useQuery({
    queryKey: ["church-finance-position"],
    queryFn: async (): Promise<ChurchPosition | null> => {
      const { data, error } = await sb.rpc("get_church_finance_position");
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as ChurchPosition | null;
    },
  });
}

export function sumPositions(rows: BudgetPosition[]) {
  const t = rows.reduce(
    (acc, r) => ({
      allocated: acc.allocated + Number(r.allocated ?? 0),
      spent: acc.spent + Number(r.spent ?? 0),
      committed: acc.committed + Number(r.committed ?? 0),
      pending: acc.pending + Number(r.pending ?? 0),
      available: acc.available + Number(r.available ?? 0),
    }),
    { allocated: 0, spent: 0, committed: 0, pending: 0, available: 0 },
  );
  return {
    ...t,
    utilisation: t.allocated > 0 ? ((t.spent + t.committed) / t.allocated) * 100 : 0,
  };
}

/** Utilisation banding used consistently everywhere money is shown. */
export function utilisationBand(pct: number) {
  if (pct > 100) return { label: "Overspent", className: "bg-red-100 text-red-800 border-red-200" };
  if (pct >= 90) return { label: "Critical", className: "bg-red-100 text-red-800 border-red-200" };
  if (pct >= 75) return { label: "Attention", className: "bg-orange-100 text-orange-900 border-orange-200" };
  if (pct >= 50) return { label: "Monitor", className: "bg-amber-100 text-amber-900 border-amber-200" };
  return { label: "Healthy", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
}

export const BUDGET_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  partially_approved: "Partially approved",
  rejected: "Rejected",
  active: "Active",
  exhausted: "Exhausted",
  expired: "Expired",
  archived: "Archived",
  locked: "Locked",
};

/** Days a record has been waiting — used for approval tardiness. */
export function waitingDays(since?: string | null) {
  if (!since) return 0;
  return Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000);
}
