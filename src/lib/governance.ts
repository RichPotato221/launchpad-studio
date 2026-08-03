import type { Rag } from "@/lib/finance";

export const DECISION_CATEGORIES = [
  { key: "leadership", label: "Leadership decision" },
  { key: "council", label: "Council resolution" },
  { key: "board", label: "Board decision" },
  { key: "committee", label: "Committee decision" },
  { key: "directive", label: "Executive directive" },
] as const;

export const DECISION_STATUSES = ["open", "in_progress", "implemented", "overdue", "cancelled"] as const;

export const RISK_CATEGORIES = [
  "Governance",
  "Financial",
  "Operational",
  "Spiritual / doctrinal",
  "People & leadership",
  "Compliance & legal",
  "Reputational",
  "Safety & facilities",
  "Technology & data",
] as const;

export const RISK_STATUSES = ["open", "mitigating", "monitoring", "closed"] as const;
export const ESCALATION_LEVELS = ["department", "branch", "executive", "council"] as const;

export const APPROVAL_TYPES = [
  "Governance report",
  "Policy",
  "Meeting agenda",
  "Committee report",
  "Strategic plan",
  "Purchase request (delegated)",
  "Budget",
  "Governance document",
  "Department change",
] as const;

/** 1–25 risk rating → RAG band. */
export function ragForRisk(rating: number): Rag {
  if (rating >= 15) return "red";
  if (rating >= 8) return "amber";
  return "green";
}

/** KPI achievement percentage → RAG band. */
export function ragForPct(pct: number | null | undefined): Rag {
  const v = Number(pct ?? 0);
  if (v >= 90) return "green";
  if (v >= 70) return "amber";
  return "red";
}

export const RAG_DOT: Record<Rag, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export const RAG_LABEL: Record<Rag, string> = {
  green: "On track",
  amber: "Attention required",
  red: "Critical",
};

export type DepartmentOversightRow = {
  department_slug: string;
  department_name: string;
  kind: string;
  kpi_avg_pct: number | null;
  kpi_count: number;
  open_tasks: number;
  overdue_tasks: number;
  reports_90d: number;
  open_risks: number;
  critical_risks: number;
  open_compliance: number;
  open_decisions: number;
  members: number;
  last_activity: string | null;
};

/**
 * Department health, 0–100. Blends KPI achievement, task discipline,
 * reporting compliance, risk exposure and outstanding compliance items.
 */
export function departmentHealth(r: DepartmentOversightRow): number {
  const kpi = r.kpi_count > 0 ? Math.min(100, Number(r.kpi_avg_pct ?? 0)) : 60;
  const taskBase = r.open_tasks > 0 ? (1 - r.overdue_tasks / r.open_tasks) * 100 : 85;
  const reporting = Math.min(100, r.reports_90d * 34);
  const riskPenalty = Math.min(40, r.critical_risks * 15 + r.open_risks * 3);
  const compliancePenalty = Math.min(25, r.open_compliance * 6);
  const score = kpi * 0.35 + taskBase * 0.25 + reporting * 0.2 + (100 - riskPenalty) * 0.1 + (100 - compliancePenalty) * 0.1;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function ragForHealth(score: number): Rag {
  if (score >= 80) return "green";
  if (score >= 60) return "amber";
  return "red";
}
