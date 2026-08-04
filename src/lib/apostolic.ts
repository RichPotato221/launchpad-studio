import type { Rag } from "@/lib/finance";

export const FIVEFOLD_OFFICES = ["apostle", "prophet", "evangelist", "pastor", "teacher"] as const;
export type FivefoldOffice = (typeof FIVEFOLD_OFFICES)[number];

export const SUCCESSION_READINESS = ["ready_now", "1_2_years", "developing", "not_ready"] as const;

export const APPOINTMENT_KINDS = [
  "appointment",
  "promotion",
  "ordination",
  "transfer",
  "sabbatical",
  "resignation",
  "retirement",
  "succession",
] as const;

export const APPROVAL_CATEGORIES = [
  "Church development project",
  "Budget",
  "Capital purchase",
  "Governance policy",
  "Constitutional amendment",
  "New branch",
  "Ministry launch",
  "Leadership appointment",
  "International partnership",
  "Strategic initiative",
] as const;

export const PROJECT_CATEGORIES = [
  "building",
  "land",
  "infrastructure",
  "sound_system",
  "interior",
  "outreach",
  "school_of_ministry",
  "missions",
] as const;

export const PROJECT_STATUSES = ["planning", "approved", "in_progress", "on_hold", "completed", "cancelled"] as const;

export const EXEC_RISK_CATEGORIES = [
  "Vision drift",
  "Doctrinal",
  "Governance",
  "Financial",
  "Leadership burnout",
  "Ministry decline",
  "Project delay",
  "Legal",
  "Security",
  "Reputational",
] as const;

export const COMMUNICATION_KINDS = [
  "circular",
  "leadership_announcement",
  "vision_letter",
  "prayer_alert",
  "emergency",
  "department_directive",
  "branch_communication",
  "broadcast",
] as const;

export const COMMUNICATION_CHANNELS = ["in_app", "email", "sms", "whatsapp", "push"] as const;

/** Blend of ministry, governance, finance and leadership signals → 0-100. */
export function kingdomImpactScore(parts: {
  ministry: number;
  governance: number;
  finance: number;
  leadership: number;
  vision: number;
}) {
  return Math.round(
    parts.ministry * 0.25 + parts.governance * 0.2 + parts.finance * 0.2 + parts.leadership * 0.2 + parts.vision * 0.15,
  );
}

export function scoreRag(v: number): Rag {
  if (v >= 80) return "green";
  if (v >= 60) return "amber";
  return "red";
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

export function labelise(s?: string | null) {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
