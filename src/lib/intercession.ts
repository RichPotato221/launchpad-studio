import type { Rag } from "@/lib/finance";

/** Shared vocabulary and scoring for the Prayer & Intercession Operations Centre. */

export const PRAYER_CATEGORIES = [
  { key: "general", label: "General" },
  { key: "urgent", label: "Urgent" },
  { key: "leadership", label: "Leadership" },
  { key: "community", label: "Community" },
  { key: "hospital", label: "Hospital / healing" },
  { key: "bereavement", label: "Bereavement" },
  { key: "salvation", label: "Salvation" },
  { key: "deliverance", label: "Deliverance" },
  { key: "national", label: "National / government" },
  { key: "family", label: "Family & marriage" },
  { key: "finance", label: "Provision & finance" },
  { key: "employment", label: "Employment & study" },
] as const;

export const PRAYER_PRIORITIES = ["critical", "urgent", "high", "normal", "low"] as const;

export const PRAYER_STATUSES = [
  "submitted",
  "assigned",
  "being_prayed_for",
  "follow_up",
  "answered",
  "closed",
] as const;

export const MEETING_TYPES = [
  { key: "corporate", label: "Corporate prayer" },
  { key: "night_vigil", label: "Night vigil" },
  { key: "prayer_chain", label: "Prayer chain" },
  { key: "leadership", label: "Leadership prayer" },
  { key: "emergency", label: "Emergency prayer" },
  { key: "watch", label: "Weekly prayer watch" },
  { key: "fasting", label: "Fasting programme" },
  { key: "early_morning", label: "Early morning prayer" },
] as const;

export const FAST_TYPES = [
  { key: "corporate", label: "Corporate fast" },
  { key: "leadership", label: "Leadership fast" },
  { key: "department", label: "Department fast" },
  { key: "emergency", label: "Emergency fast" },
] as const;

export const JOURNAL_TYPES = [
  { key: "prayer", label: "Prayer" },
  { key: "scripture", label: "Scripture" },
  { key: "dream", label: "Dream" },
  { key: "vision", label: "Vision" },
  { key: "prophetic", label: "Prophetic impression" },
  { key: "reflection", label: "Reflection" },
  { key: "answered", label: "Answered prayer" },
] as const;

export const INTERCESSOR_ROLES = [
  { key: "leader", label: "Intercession leader" },
  { key: "assistant_leader", label: "Assistant leader" },
  { key: "coordinator", label: "Prayer coordinator" },
  { key: "secretary", label: "Prayer secretary" },
  { key: "intercessor", label: "Intercessor" },
  { key: "volunteer", label: "Volunteer" },
] as const;

export const PRAYER_WATCHES = [
  "First watch (18:00–21:00)",
  "Second watch (21:00–00:00)",
  "Third watch (00:00–03:00)",
  "Fourth watch (03:00–06:00)",
  "Morning watch (06:00–09:00)",
  "Day watch (09:00–18:00)",
] as const;

export const PRAYER_RISK_CATEGORIES = [
  "confidentiality",
  "request_backlog",
  "low_attendance",
  "volunteer_burnout",
  "missed_emergency",
  "leadership_gap",
  "poor_follow_up",
  "safeguarding",
] as const;

export const PRAYER_COURSES = [
  "Biblical Intercession",
  "Prayer Leadership",
  "Confidentiality & Ethics",
  "Spiritual Warfare",
  "Church Governance",
  "Prophetic Ministry",
  "Emergency Prayer Response",
  "Leadership Development",
];

export const OPEN_STATUSES = ["submitted", "assigned", "being_prayed_for", "follow_up"];

export function isOpen(r: any) {
  return OPEN_STATUSES.includes(r?.status);
}

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

export function daysSince(iso?: string | null) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function ragForScore(value: number, amberAt = 75, redAt = 50): Rag {
  if (value < redAt) return "red";
  if (value < amberAt) return "amber";
  return "green";
}

export function ragForCount(count: number, amberAt = 3, redAt = 8): Rag {
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

export const PRIORITY_CLASS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-900 border-amber-200",
  normal: "bg-sky-50 text-sky-800 border-sky-200",
  low: "bg-muted text-muted-foreground border-border",
};

export const PRAYER_STATUS_CLASS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-900 border-amber-200",
  assigned: "bg-sky-100 text-sky-900 border-sky-200",
  being_prayed_for: "bg-indigo-100 text-indigo-900 border-indigo-200",
  follow_up: "bg-amber-50 text-amber-900 border-amber-200",
  answered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-muted text-muted-foreground border-border",
};

/** Escalation rule: open request older than 7 days must be escalated. */
export function needsEscalation(r: any) {
  return isOpen(r) && daysSince(r?.created_at) >= 7;
}

/** Coverage: percentage of chain slots that have an intercessor assigned. */
export function chainCoverage(slots: any[]) {
  const total = slots.length;
  const covered = slots.filter((s) => s.intercessor_id || s.intercessor_name).length;
  return { total, covered, pct: pct(covered, total) };
}

/** Build a downloadable ICS calendar from prayer events. */
export function buildIcs(events: { id: string; title: string; start: string; end?: string | null; location?: string | null; description?: string | null }[]) {
  const stamp = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TRoGKC//Prayer Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@trogkc`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(e.end || e.start)}`,
      `SUMMARY:${(e.title || "Prayer").replace(/\n/g, " ")}`,
      `LOCATION:${(e.location ?? "").replace(/\n/g, " ")}`,
      `DESCRIPTION:${(e.description ?? "").replace(/\n/g, " ")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(e: { title: string; start: string; end?: string | null; location?: string | null; description?: string | null }) {
  const f = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${f(e.start)}/${f(e.end || e.start)}`,
    details: e.description ?? "",
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(e: { title: string; start: string; end?: string | null; location?: string | null; description?: string | null }) {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: new Date(e.start).toISOString(),
    enddt: new Date(e.end || e.start).toISOString(),
    body: e.description ?? "",
    location: e.location ?? "",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
