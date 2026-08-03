import type { Rag } from "@/lib/finance";

/** Shared vocabulary and scoring for the Technical Operations Centre (TOC). */

export const TECH_SERVICE_TYPES = [
  { key: "sunday_service", label: "Sunday service" },
  { key: "midweek", label: "Midweek service" },
  { key: "prayer", label: "Prayer meeting" },
  { key: "conference", label: "Conference" },
  { key: "concert", label: "Concert" },
  { key: "wedding", label: "Wedding" },
  { key: "funeral", label: "Funeral" },
  { key: "outreach", label: "Outreach / outdoor" },
  { key: "recording", label: "Recording session" },
  { key: "other", label: "Other" },
] as const;

export const PRODUCTION_STATUSES = ["planning", "in_review", "ready", "completed", "cancelled"] as const;

export const ASSET_CATEGORIES = [
  { key: "audio", label: "Audio" },
  { key: "microphones", label: "Microphones" },
  { key: "mixing", label: "Mixing desks" },
  { key: "speakers", label: "Speakers & amps" },
  { key: "instruments_di", label: "Instruments & DI" },
  { key: "video", label: "Video & cameras" },
  { key: "lighting", label: "Lighting" },
  { key: "projection", label: "Projection & screens" },
  { key: "streaming", label: "Streaming & encoders" },
  { key: "computers", label: "Computers & software" },
  { key: "cables", label: "Cables & stands" },
  { key: "power", label: "Power & backup" },
  { key: "storage", label: "Storage & recording" },
] as const;

export const ASSET_CONDITIONS = ["excellent", "good", "fair", "poor", "faulty"] as const;
export const ASSET_STATUSES = ["in_service", "standby", "maintenance", "repair", "loaned", "retired"] as const;

export const MAINTENANCE_TYPES = ["cleaning", "inspection", "calibration", "firmware", "servicing", "replacement"] as const;
export const MAINTENANCE_FREQUENCIES = ["weekly", "monthly", "quarterly", "biannual", "annual", "once_off"] as const;

export const FAULT_TYPES = ["equipment", "audio", "video", "lighting", "streaming", "power", "network", "software", "other"] as const;
export const FAULT_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export const FAULT_STATUSES = ["open", "in_progress", "awaiting_parts", "resolved", "closed"] as const;

export const TECH_ROLES = [
  { key: "technical_director", label: "Technical director" },
  { key: "sound_engineer", label: "Sound engineer" },
  { key: "monitor_engineer", label: "Monitor engineer" },
  { key: "livestream_operator", label: "Livestream operator" },
  { key: "camera_operator", label: "Camera operator" },
  { key: "lighting_operator", label: "Lighting operator" },
  { key: "presentation_operator", label: "Presentation / ProPresenter" },
  { key: "stage_manager", label: "Stage manager" },
  { key: "it_support", label: "IT & network support" },
  { key: "trainee", label: "Trainee" },
] as const;

export const STREAM_PLATFORMS = ["youtube", "facebook", "website", "instagram", "zoom", "multi"] as const;
export const STREAM_STATUSES = ["scheduled", "live", "completed", "failed", "cancelled"] as const;
export const STREAM_HEALTH = ["excellent", "good", "unstable", "poor", "failed"] as const;

export const TECH_RISK_CATEGORIES = [
  "equipment_failure",
  "power_failure",
  "internet_failure",
  "skills_gap",
  "health_safety",
  "cyber_security",
  "budget",
  "compliance",
] as const;

export const TECH_INVENTORY_CATEGORIES = ["cables", "batteries", "adapters", "consumables", "spares", "tools", "media"] as const;

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

export function daysUntil(date?: string | null) {
  if (!date) return null;
  const diff = new Date(`${date}T00:00:00`).getTime() - new Date(today()).getTime();
  return Math.round(diff / 86_400_000);
}

/** Higher percentage = healthier. */
export function ragForScore(value: number, amberAt = 75, redAt = 50): Rag {
  if (value < redAt) return "red";
  if (value < amberAt) return "amber";
  return "green";
}

/** Higher count = worse. */
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

export const READINESS_FLAGS = [
  { key: "audio_ready", label: "Audio checked" },
  { key: "visual_ready", label: "Visuals & slides" },
  { key: "cameras_ready", label: "Cameras set" },
  { key: "lighting_ready", label: "Lighting set" },
  { key: "livestream_ready", label: "Livestream tested" },
  { key: "presentation_ready", label: "Presentation ready" },
  { key: "internet_ok", label: "Internet verified" },
  { key: "power_ok", label: "Power & backup" },
] as const;

/** Technical readiness across the production checklist. */
export function productionReadiness(p: any) {
  const done = READINESS_FLAGS.filter((f) => !!p?.[f.key]).length;
  return { done, total: READINESS_FLAGS.length, pct: pct(done, READINESS_FLAGS.length) };
}

/** Stream health score from bitrate, uptime and feed flags. */
export function streamHealthScore(s: any) {
  let score = 100;
  const bitrate = Number(s?.bitrate_kbps ?? 0);
  if (bitrate && bitrate < 2500) score -= 25;
  else if (bitrate && bitrate < 4000) score -= 10;
  const uptime = Number(s?.uptime_pct ?? 100);
  score -= Math.max(0, 100 - uptime);
  if (s?.audio_feed_ok === false) score -= 30;
  if (s?.status === "failed") score -= 40;
  return Math.max(0, Math.min(100, Math.round(score)));
}
