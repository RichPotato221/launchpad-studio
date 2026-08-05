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
