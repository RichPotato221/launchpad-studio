import type { Rag } from "@/lib/finance";

/** Shared vocabulary and scoring for the Strategy Management Office (SMO). */

export const PLAN_TYPES = [
  { key: "annual", label: "Annual plan" },
  { key: "three_year", label: "3-year plan" },
  { key: "five_year", label: "5-year plan" },
  { key: "ten_year", label: "10-year vision" },
  { key: "campaign", label: "Campaign" },
] as const;

export const PLAN_STATUSES = ["draft", "in_review", "approved", "active", "completed", "archived"] as const;

export const PERSPECTIVES = [
  { key: "kingdom_impact", label: "Kingdom impact" },
  { key: "people_discipleship", label: "People & discipleship" },
  { key: "internal_processes", label: "Internal processes" },
  { key: "stewardship_finance", label: "Stewardship & finance" },
  { key: "growth_capacity", label: "Growth & capacity" },
] as const;

export const OBJECTIVE_STATUSES = ["on_track", "at_risk", "off_track", "completed", "on_hold"] as const;
export const PERIODS = ["quarterly", "annual", "multi_year"] as const;

export const PROJECT_TYPES = [
  { key: "kingdom_expansion", label: "Kingdom expansion" },
  { key: "church_plant", label: "Church plant / branch" },
  { key: "infrastructure", label: "Infrastructure & build" },
  { key: "systems", label: "Systems & technology" },
  { key: "community", label: "Community & social impact" },
  { key: "capacity", label: "Leadership capacity" },
  { key: "media", label: "Media & communications" },
  { key: "fundraising", label: "Fundraising" },
] as const;

export const PROJECT_STAGES = ["proposed", "appraisal", "approved", "planning", "execution", "monitoring", "closure", "closed"] as const;
export const PROJECT_STATUSES = ["on_track", "at_risk", "delayed", "completed", "cancelled"] as const;
export const APPROVAL_STATUSES = ["pending", "chair_approved", "senior_pastor_approved", "rejected"] as const;

export const DECISION_TYPES = ["strategic", "operational", "financial", "governance", "ministry"] as const;
export const DECISION_IMPLEMENTATION = ["pending", "in_progress", "implemented", "stalled"] as const;

export const STRATEGY_RISK_CATEGORIES = [
  "vision",
  "financial",
  "leadership",
  "operational",
  "reputational",
  "compliance",
  "growth",
  "succession",
] as const;

export const IDEA_TYPES = ["ministry", "outreach", "systems", "media", "youth", "community", "revenue", "other"] as const;
export const IDEA_STAGES = ["submitted", "screening", "feasibility", "piloting", "adopted", "declined"] as const;

export const REQUEST_TYPES = ["strategic", "resource", "budget", "policy", "project", "advisory"] as const;
export const REQUEST_ROUTES = ["chairperson", "senior_pastor", "board", "finance"] as const;

export const KPI_GROUPS = [
  { key: "vision", label: "Vision completion" },
  { key: "growth", label: "Growth" },
  { key: "discipleship", label: "Discipleship" },
  { key: "stewardship", label: "Stewardship" },
  { key: "impact", label: "Community impact" },
  { key: "capacity", label: "Capacity & systems" },
] as const;

export function labelFor(list: readonly { key: string; label: string }[], key?: string | null) {
  return list.find((i) => i.key === key)?.label ?? titleish(key);
}

export function titleish(s?: string | null) {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function ragForScore(value: number, amberAt = 75, redAt = 50): Rag {
  if (value < redAt) return "red";
  if (value < amberAt) return "amber";
  return "green";
}

export function ragForCount(count: number, amberAt = 1, redAt = 4): Rag {
  if (count >= redAt) return "red";
  if (count >= amberAt) return "amber";
  return "green";
}

export function riskScore(likelihood: number, impact: number) {
  return (likelihood ?? 0) * (impact ?? 0);
}

export function ragForRisk(score: number): Rag {
  if (score >= 15) return "red";
  if (score >= 8) return "amber";
  return "green";
}

export function ragForStatus(status?: string | null): Rag {
  if (status === "off_track" || status === "delayed" || status === "cancelled") return "red";
  if (status === "at_risk" || status === "on_hold") return "amber";
  return "green";
}

/** KPI achievement against target. */
export function achievement(actual: number, target: number) {
  if (!target) return 0;
  return Math.round((Number(actual ?? 0) / Number(target)) * 100);
}

/** Vision completion = weighted average of objective progress in a plan. */
export function visionCompletion(objectives: any[]) {
  if (!objectives.length) return 0;
  const total = objectives.reduce((s, o) => s + Number(o.progress_pct ?? 0), 0);
  return Math.round(total / objectives.length);
}

/** Simple schedule variance: elapsed time vs progress. */
export function scheduleVariance(project: any) {
  const start = project?.start_date ? new Date(project.start_date).getTime() : null;
  const end = project?.end_date ? new Date(project.end_date).getTime() : null;
  if (!start || !end || end <= start) return null;
  const now = Date.now();
  const elapsed = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  return Math.round(Number(project.progress_pct ?? 0) - elapsed);
}

/** Alignment: share of projects linked to a strategic objective. */
export function alignmentScore(projects: any[]) {
  if (!projects.length) return 0;
  return pct(projects.filter((p) => !!p.objective_id).length, projects.length);
}
