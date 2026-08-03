import type { Rag } from "@/lib/finance";

export const CASE_TYPES = [
  { key: "hospital_visit", label: "Hospital visit" },
  { key: "bereavement", label: "Bereavement" },
  { key: "counselling", label: "Counselling referral" },
  { key: "home_visit", label: "Home visit" },
  { key: "marriage_support", label: "Marriage support" },
  { key: "family_care", label: "Family care" },
  { key: "restoration", label: "Restoration" },
  { key: "follow_up", label: "Member follow-up" },
] as const;

export const CASE_STATUSES = ["open", "in_progress", "awaiting_follow_up", "referred", "closed"] as const;
export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const NOTE_TYPES = ["visit", "call", "counselling", "prayer", "referral", "closure"] as const;

export const URGENCIES = ["normal", "urgent", "critical"] as const;
export const PRAYER_STATUSES = ["open", "praying", "answered", "closed"] as const;

export const SESSION_TYPES = [
  { key: "monthly_coaching", label: "Monthly coaching" },
  { key: "quarterly_review", label: "Quarterly review" },
  { key: "one_on_one", label: "One-on-one" },
  { key: "assessment", label: "Leadership assessment" },
] as const;

export const SESSION_STATUSES = ["scheduled", "completed", "missed", "cancelled"] as const;

export const PLAN_HORIZONS = ["annual", "quarterly", "monthly", "weekly"] as const;
export const PLAN_STATUSES = ["draft", "submitted", "approved", "in_progress", "complete", "cancelled"] as const;

export const READINESS_BANDS = [
  { key: "ready_now", label: "Ready now" },
  { key: "one_to_two_years", label: "Ready in 1–2 years" },
  { key: "long_term", label: "Long-term potential" },
] as const;

export const PROMOTION_READINESS = ["developing", "emerging", "ready", "overdue"] as const;
export const SUCCESSION_STATUSES = ["not_ready", "in_pipeline", "successor_identified", "ready"] as const;
export const TRAINING_STATUSES = ["not_started", "in_progress", "completed", "certified"] as const;
export const RISK_LEVELS = ["low", "medium", "high"] as const;
export const VOLUNTEER_STATUSES = ["active", "resting", "transferred", "inactive"] as const;

export const CARE_OPEN = ["open", "in_progress", "awaiting_follow_up", "referred"];

export function labelOf<T extends readonly { key: string; label: string }[]>(list: T, key: string) {
  return list.find((i) => i.key === key)?.label ?? key.replace(/_/g, " ");
}

/** Simple 0–100 → RAG band used by ministry health scores. */
export function ragForScore(score: number): Rag {
  if (score >= 80) return "green";
  if (score >= 60) return "amber";
  return "red";
}

/** Burnout risk from missed services and hours served. */
export function burnoutRisk(missed: number, hours: number): (typeof RISK_LEVELS)[number] {
  if (missed >= 4 || hours >= 120) return "high";
  if (missed >= 2 || hours >= 60) return "medium";
  return "low";
}

export const RISK_CLASS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-900 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

export const today = () => new Date().toISOString().slice(0, 10);
