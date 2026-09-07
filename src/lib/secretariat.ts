import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";

export type Rag = "green" | "amber" | "red";

export const RAG_CLASS: Record<Rag, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-900 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
};

/** Lower count is better (backlogs). */
export function ragForBacklog(count: number, amberAt = 1, redAt = 5): Rag {
  if (count >= redAt) return "red";
  if (count >= amberAt) return "amber";
  return "green";
}

/** Higher percentage is better (scores). */
export function ragForScore(pct: number, amberAt = 80, redAt = 60): Rag {
  if (pct < redAt) return "red";
  if (pct < amberAt) return "amber";
  return "green";
}

export function trendArrow(current: number, previous: number) {
  if (current === previous) return "→";
  return current > previous ? "↑" : "↓";
}

export const MEETING_TYPES = [
  "Leadership Meeting",
  "Branch Meeting",
  "Committee Meeting",
  "Board Meeting",
  "Finance Meeting",
  "Prayer Meeting",
  "Training",
  "Deadline",
  "Compliance Review",
  "Audit",
  "Annual General Meeting",
] as const;

export const CORRESPONDENCE_TYPES = [
  "Letter",
  "Email",
  "Internal Memo",
  "Circular",
  "Government Communication",
  "Service Provider",
  "Legal Notice",
] as const;

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const BRANCHES = ["etwatwa", "joburg_north", "joburg_south"] as const;

export function branchLabel(b?: string | null) {
  if (!b) return "All branches";
  if (b === "twatwa" || b === "etwatwa") return "Etwatwa";
  return b
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Generates the next sequential correspondence reference, ISO-register style. */
export async function nextCorrespondenceRef(prefix = "TRoGKC-CORR") {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("correspondence")
    .select("id", { count: "exact", head: true });
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `${prefix}-${year}-${seq}`;
}

/** Writes a row into the shared audit log. */
export async function logAudit(
  action: string,
  entity: string,
  entityId: string,
  details: Record<string, unknown> = {},
) {
  try {
    await supabase.rpc("log_audit", {
      _action: action,
      _entity: entity,
      _entity_id: entityId,
      _details: details as never,
    });
  } catch {
    /* auditing must never block the user action */
  }
}

/** Generic Excel-compatible export used by every secretariat module. */
export function exportRows(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  exportToCsv(filename, headers, rows);
}

/** Browser-native PDF via the print dialog. */
export function exportPdf() {
  window.print();
}

/** Maps the branch enum used on events to the feed's branch-target enum. */
export function feedBranchTarget(branch?: string | null) {
  if (!branch) return "all";
  if (branch === "etwatwa" || branch === "twatwa") return "twatwa";
  if (branch === "joburg_north" || branch === "joburg_south") return branch;
  return "all";
}

/**
 * Publishes an approved agenda onto the members' feed so everyone the meeting
 * concerns can read it without opening the secretariat module.
 * Safe to call twice — an existing post for the same agenda is left alone.
 */
export async function postAgendaToFeed(meetingId: string, agendaId: string, authorId: string) {
  const [{ data: meeting }, { data: agenda }] = await Promise.all([
    supabase.from("meetings").select("event_id, events(title, event_date, start_time, location, branch)").eq("id", meetingId).maybeSingle(),
    supabase.from("agendas").select("title, agenda_items(order_index, title, estimated_minutes)").eq("id", agendaId).maybeSingle(),
  ]);
  const ev: any = (meeting as any)?.events;
  const title = `Agenda published — ${ev?.title ?? "Meeting"}`;

  const { data: existing } = await supabase
    .from("announcements")
    .select("id")
    .eq("title", title)
    .limit(1);
  if (existing && existing.length > 0) return existing[0].id as string;

  const items = ((agenda as any)?.agenda_items ?? [])
    .slice()
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((i: any, n: number) => `${n + 1}. ${i.title}${i.estimated_minutes ? ` (${i.estimated_minutes} min)` : ""}`)
    .join("\n");

  const when = [fmtDate(ev?.event_date), ev?.start_time ? String(ev.start_time).slice(0, 5) : null, ev?.location]
    .filter(Boolean)
    .join(" · ");

  const body = [
    `The agenda for ${ev?.title ?? "the meeting"} has been approved and published by the Secretariat.`,
    when,
    items ? `\nAgenda:\n${items}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title,
      body,
      author_id: authorId,
      author_department_slug: "secretary",
      priority: false,
      target_branch: feedBranchTarget(ev?.branch) as never,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
