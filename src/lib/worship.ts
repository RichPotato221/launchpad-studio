import type { Rag } from "@/lib/finance";

/** Shared vocabulary for the Worship Operations Platform (WOP). */

export const SERVICE_TYPES = [
  { key: "sunday", label: "Sunday service" },
  { key: "prayer", label: "Prayer meeting" },
  { key: "worship_night", label: "Worship night" },
  { key: "conference", label: "Conference" },
  { key: "concert", label: "Concert" },
  { key: "recording", label: "Recording session" },
  { key: "training", label: "Training session" },
  { key: "special", label: "Special service" },
] as const;

export const SERVICE_STATUSES = ["planning", "in_review", "approved", "completed", "cancelled"] as const;

export const FLOW_ITEM_TYPES = [
  { key: "opening_prayer", label: "Opening prayer", minutes: 5 },
  { key: "welcome", label: "Welcome", minutes: 5 },
  { key: "worship_set", label: "Worship set", minutes: 25 },
  { key: "scriptures", label: "Scriptures", minutes: 5 },
  { key: "offering", label: "Offering", minutes: 8 },
  { key: "announcements", label: "Announcements", minutes: 5 },
  { key: "sermon", label: "Sermon", minutes: 40 },
  { key: "ministry_time", label: "Ministry time", minutes: 15 },
  { key: "communion", label: "Communion", minutes: 12 },
  { key: "altar_call", label: "Altar call", minutes: 10 },
  { key: "closing_prayer", label: "Closing prayer", minutes: 5 },
  { key: "benediction", label: "Benediction", minutes: 3 },
  { key: "other", label: "Other", minutes: 5 },
] as const;

export const DEFAULT_SERVICE_FLOW = [
  "opening_prayer",
  "welcome",
  "worship_set",
  "scriptures",
  "offering",
  "announcements",
  "sermon",
  "ministry_time",
  "altar_call",
  "closing_prayer",
  "benediction",
] as const;

export const SET_SEGMENTS = [
  { key: "call_to_worship", label: "Call to worship" },
  { key: "praise", label: "Praise" },
  { key: "worship", label: "Worship" },
  { key: "communion", label: "Communion" },
  { key: "altar", label: "Altar / ministry" },
  { key: "response", label: "Response / send-off" },
] as const;

export const TEAM_ROLES = [
  { key: "worship_leader", label: "Worship leader" },
  { key: "vocalist", label: "Vocalist" },
  { key: "keys", label: "Keyboardist" },
  { key: "guitar", label: "Guitarist" },
  { key: "bass", label: "Bassist" },
  { key: "drums", label: "Drummer" },
  { key: "sound", label: "Sound engineer" },
  { key: "media", label: "Media / slides" },
  { key: "livestream", label: "Livestream operator" },
  { key: "lighting", label: "Lighting" },
] as const;

export const TEAM_STATUSES = ["active", "resting", "training", "inactive"] as const;
export const RESPONSES = ["pending", "confirmed", "declined", "tentative"] as const;

export const EQUIPMENT_CATEGORIES = [
  { key: "keyboard", label: "Keyboards" },
  { key: "guitar", label: "Guitars" },
  { key: "drums", label: "Drums" },
  { key: "microphone", label: "Microphones" },
  { key: "iem", label: "In-ear monitors" },
  { key: "mixer", label: "Mixers" },
  { key: "speaker", label: "Speakers" },
  { key: "cable", label: "Cables" },
  { key: "stand", label: "Stands" },
  { key: "battery", label: "Batteries" },
  { key: "camera", label: "Cameras" },
  { key: "other", label: "Other" },
] as const;

export const EQUIPMENT_CONDITIONS = ["excellent", "good", "fair", "poor", "faulty"] as const;
export const EQUIPMENT_STATUSES = ["in_service", "maintenance", "reserved", "retired"] as const;
export const FAULT_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const FAULT_STATUSES = ["open", "in_progress", "awaiting_parts", "resolved", "closed"] as const;

export const TECH_CATEGORIES = [
  { key: "sound", label: "Sound" },
  { key: "stage", label: "Stage / inputs" },
  { key: "monitors", label: "Monitor mixes" },
  { key: "camera", label: "Cameras" },
  { key: "lighting", label: "Lighting" },
  { key: "slides", label: "Presentation slides" },
  { key: "livestream", label: "Livestream" },
  { key: "media", label: "Media files" },
] as const;

export const DEFAULT_TECH_CHECKLIST: { category: string; label: string }[] = [
  { category: "sound", label: "Microphone allocation confirmed" },
  { category: "sound", label: "Line check completed" },
  { category: "stage", label: "Stage plot and input list published" },
  { category: "monitors", label: "In-ear / wedge monitor mixes set" },
  { category: "camera", label: "Camera positions and framing set" },
  { category: "lighting", label: "Lighting scenes programmed" },
  { category: "slides", label: "Lyrics and sermon slides loaded" },
  { category: "livestream", label: "Livestream checklist completed" },
  { category: "media", label: "Media files and videos loaded" },
];

export const COURSE_CATEGORIES = [
  { key: "biblical_worship", label: "Biblical worship" },
  { key: "theology", label: "Theology of worship" },
  { key: "vocal", label: "Vocal training" },
  { key: "instrument", label: "Instrument masterclass" },
  { key: "stage", label: "Stage presence" },
  { key: "teamwork", label: "Teamwork" },
  { key: "leadership", label: "Servant leadership" },
  { key: "theory", label: "Music theory" },
  { key: "production", label: "Production / Ableton" },
  { key: "sound", label: "Sound awareness" },
  { key: "spiritual", label: "Spiritual formation" },
  { key: "musicianship", label: "General musicianship" },
] as const;

export const TRAINING_STATUSES = ["enrolled", "in_progress", "completed", "expired"] as const;

export const RISK_CATEGORIES = [
  { key: "volunteer", label: "Volunteer burnout" },
  { key: "equipment", label: "Equipment failure" },
  { key: "attendance", label: "Rehearsal absenteeism" },
  { key: "leadership", label: "Leadership gap" },
  { key: "licensing", label: "Song licensing" },
  { key: "technical", label: "Technical failure" },
  { key: "communication", label: "Team communication" },
  { key: "cancellation", label: "Last-minute cancellation" },
  { key: "damage", label: "Instrument damage" },
  { key: "operational", label: "Other operational" },
] as const;

export const RISK_STATUSES = ["open", "mitigating", "monitoring", "closed"] as const;
export const ESCALATION_LEVELS = ["department", "pastoral", "executive", "board"] as const;

export const SPIRITUAL_ACTIVITIES = [
  { key: "prayer", label: "Team prayer" },
  { key: "devotion", label: "Devotion" },
  { key: "bible_study", label: "Bible study" },
  { key: "mentorship", label: "Mentorship session" },
  { key: "fasting", label: "Fasting" },
  { key: "retreat", label: "Retreat" },
] as const;

export function labelFor(list: readonly { key: string; label: string }[], key?: string | null) {
  return list.find((i) => i.key === key)?.label ?? (key ? key.replace(/_/g, " ") : "—");
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/** Higher percentage = healthier. */
export function ragForScore(value: number, amberAt = 75, redAt = 50): Rag {
  if (value < redAt) return "red";
  if (value < amberAt) return "amber";
  return "green";
}

/** Higher count = worse (open faults, overdue reviews …). */
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

export function mmss(seconds?: number | null) {
  const s = Math.max(0, Math.round(Number(seconds ?? 0)));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function daysUntil(date?: string | null) {
  if (!date) return null;
  const diff = new Date(`${date}T00:00:00`).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime();
  return Math.round(diff / 86_400_000);
}

/** Readiness across the checklist flags on a worship service. */
export function serviceReadiness(s: any) {
  const flags = [s?.set_approved, s?.scriptures_loaded, s?.stage_layout_ready, s?.tech_team_confirmed, s?.livestream_ready];
  const done = flags.filter(Boolean).length;
  return { done, total: flags.length, pct: pct(done, flags.length) };
}

/** Simple burnout heuristic: many consecutive assignments in a short window. */
export function burnoutRisk(servicesLast8Weeks: number): Rag {
  if (servicesLast8Weeks >= 7) return "red";
  if (servicesLast8Weeks >= 5) return "amber";
  return "green";
}
