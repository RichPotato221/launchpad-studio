import { exportToCsv } from "@/lib/exportCsv";

export const INCOME_KINDS = [
  "sunday_contribution",
  "tithe",
  "offering",
  "first_fruits",
  "seed",
  "pledge",
] as const;

export const TRANSACTION_KINDS = [
  { key: "sunday_contribution", label: "Sunday Contribution" },
  { key: "tithe", label: "Tithe" },
  { key: "offering", label: "Offering" },
  { key: "first_fruits", label: "First Fruits" },
  { key: "seed", label: "Seed" },
  { key: "pledge", label: "Pledge" },
  { key: "journal", label: "Journal" },
  { key: "procurement", label: "Procurement" },
  { key: "other", label: "Other" },
] as const;

export const TRANSACTION_STATUSES = [
  "draft",
  "pending",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
  "completed",
  "archived",
] as const;

export const EXPENSE_CATEGORIES = [
  "Travel & transport",
  "Ministry supplies",
  "Hospitality",
  "Equipment & tech",
  "Printing & stationery",
  "Rent & venue",
  "Utilities",
  "Honorarium / stipend",
  "Missions & outreach",
  "Benevolence",
  "Repairs & maintenance",
  "Administration",
  "Other",
] as const;

export const BRANCHES = ["etwatwa", "joburg_north", "joburg_south"] as const;

export function branchLabel(b?: string | null) {
  if (!b) return "All branches";
  if (b === "twatwa" || b === "etwatwa") return "Etwatwa";
  return b
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export function money(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" });
}

export function titleCase(s?: string | null) {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type Rag = "green" | "amber" | "red";

export const RAG_CLASS: Record<Rag, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-900 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
};

/** Budget utilisation: over 100% is red, over 85% amber. */
export function ragForUtilisation(pct: number): Rag {
  if (pct > 100) return "red";
  if (pct > 85) return "amber";
  return "green";
}

export function ragForBacklog(count: number, amberAt = 1, redAt = 5): Rag {
  if (count >= redAt) return "red";
  if (count >= amberAt) return "amber";
  return "green";
}

export function trendArrow(current: number, previous: number) {
  if (current === previous) return "→";
  return current > previous ? "↑" : "↓";
}

export const STATUS_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  submitted: "bg-amber-100 text-amber-900 border-amber-200",
  chair_approved: "bg-sky-100 text-sky-900 border-sky-200",
  senior_pastor_approved: "bg-sky-100 text-sky-900 border-sky-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  archived: "bg-muted text-muted-foreground border-border",
};

export function exportRows(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  exportToCsv(`${filename}-${new Date().toISOString().slice(0, 10)}`, headers, rows);
}
