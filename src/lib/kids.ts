import type { Rag } from "@/lib/finance";

export const AGE_GROUPS = [
  { key: "nursery", label: "Nursery (0–2)" },
  { key: "toddlers", label: "Toddlers (3–4)" },
  { key: "beginners", label: "Beginners (5–6)" },
  { key: "primary", label: "Primary (7–9)" },
  { key: "juniors", label: "Juniors (10–12)" },
  { key: "teens", label: "Teens (13+)" },
] as const;

export const CHILD_STATUSES = ["active", "visitor", "graduated", "inactive"] as const;
export const GENDERS = ["male", "female"] as const;

export const CHECKIN_METHODS = [
  { key: "qr", label: "QR code" },
  { key: "pin", label: "Secure PIN" },
  { key: "barcode", label: "Barcode" },
  { key: "manual", label: "Manual (volunteer)" },
] as const;

export const MILESTONE_TYPES = [
  { key: "saved", label: "Gave their life to Christ" },
  { key: "baptised", label: "Baptised" },
  { key: "memory_verse", label: "Memory verse completed" },
  { key: "lesson_completed", label: "Bible lesson completed" },
  { key: "prayer", label: "Prayer participation" },
  { key: "worship", label: "Worship participation" },
  { key: "discipleship_level", label: "Discipleship level reached" },
] as const;

export const INCIDENT_TYPES = [
  { key: "safeguarding", label: "Safeguarding concern" },
  { key: "medical", label: "Medical incident" },
  { key: "accident", label: "Accident / injury" },
  { key: "behaviour", label: "Behaviour" },
  { key: "missing_child", label: "Missing child" },
  { key: "complaint", label: "Parent complaint" },
] as const;

export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const INCIDENT_STATUSES = ["open", "investigating", "escalated", "resolved", "closed"] as const;

export const VOLUNTEER_ROLES = [
  { key: "teacher", label: "Teacher" },
  { key: "assistant", label: "Classroom assistant" },
  { key: "check_in", label: "Check-in desk" },
  { key: "security", label: "Security / safety" },
  { key: "worship", label: "Kids worship" },
  { key: "media", label: "Kids media" },
] as const;

export const CLEARANCE_STATUSES = ["not_started", "submitted", "cleared", "expired", "rejected"] as const;
export const KIDS_VOLUNTEER_STATUSES = ["active", "resting", "training", "inactive"] as const;

export const CERT_TYPES = [
  { key: "safeguarding", label: "Safeguarding training" },
  { key: "child_development", label: "Child development" },
  { key: "biblical_teaching", label: "Biblical teaching" },
  { key: "emergency_response", label: "Emergency response" },
  { key: "first_aid", label: "First aid" },
  { key: "classroom_management", label: "Classroom management" },
  { key: "behaviour_management", label: "Behaviour management" },
  { key: "communication", label: "Communication" },
  { key: "church_doctrine", label: "Church doctrine" },
  { key: "kids_manual", label: "TRoGKC Children's Ministry Manual" },
] as const;

export const CERT_STATUSES = ["not_started", "in_progress", "completed", "expired"] as const;

export const LESSON_STATUSES = ["draft", "scheduled", "taught", "archived"] as const;

export const ENGAGEMENT_TYPES = [
  { key: "parent_meeting", label: "Parent meeting" },
  { key: "family_event", label: "Family event" },
  { key: "home_devotion", label: "Home devotion" },
  { key: "visit", label: "Family visit" },
  { key: "survey", label: "Feedback survey" },
  { key: "call", label: "Call / communication" },
] as const;

export function labelFor<T extends readonly { key: string; label: string }[]>(list: T, key?: string | null) {
  if (!key) return "—";
  return list.find((i) => i.key === key)?.label ?? key.replace(/_/g, " ");
}

export const today = () => new Date().toISOString().slice(0, 10);

export function ageFrom(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function suggestAgeGroup(age: number | null) {
  if (age === null) return "";
  if (age <= 2) return "nursery";
  if (age <= 4) return "toddlers";
  if (age <= 6) return "beginners";
  if (age <= 9) return "primary";
  if (age <= 12) return "juniors";
  return "teens";
}

/** Higher is better. */
export function ragForKids(pct: number): Rag {
  if (pct >= 85) return "green";
  if (pct >= 60) return "amber";
  return "red";
}

/** Lower is better (e.g. missing check-outs, open incidents). */
export function ragForCount(n: number, amberAt = 1, redAt = 3): Rag {
  if (n >= redAt) return "red";
  if (n >= amberAt) return "amber";
  return "green";
}

export function daysUntil(date?: string | null) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export function expiryState(date?: string | null): { rag: Rag; label: string } {
  const d = daysUntil(date);
  if (d === null) return { rag: "red", label: "Not recorded" };
  if (d < 0) return { rag: "red", label: `Expired ${Math.abs(d)}d ago` };
  if (d <= 60) return { rag: "amber", label: `Expires in ${d}d` };
  return { rag: "green", label: `Valid (${d}d)` };
}

/** A volunteer may serve only with valid clearance and safeguarding training. */
export function clearedToServe(v: {
  background_check_status?: string | null;
  background_check_expiry?: string | null;
  safeguarding_expiry?: string | null;
}) {
  const bc = v.background_check_status === "cleared" && (daysUntil(v.background_check_expiry) ?? -1) >= 0;
  const sg = (daysUntil(v.safeguarding_expiry) ?? -1) >= 0;
  return { ok: bc && sg, backgroundOk: bc, safeguardingOk: sg };
}

export function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

/** A stable, printable QR payload for a child badge. */
export function childQrValue(code: string) {
  return `TROGKC-KID:${code}`;
}

export function qrImageUrl(value: string, size = 160) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
}
