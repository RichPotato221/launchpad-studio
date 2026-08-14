import { supabase } from "@/integrations/supabase/client";

export type PoStatus =
  | "DRAFT"
  | "PLANNED"
  | "APPROVED"
  | "RELEASED"
  | "IN_PREPARATION"
  | "READY"
  | "RUNNING"
  | "PENDING_CLOSURE"
  | "CLOSED"
  | "ON_HOLD"
  | "CANCELLED"
  | "OVERDUE";

export const PO_STATUS_FLOW: PoStatus[] = [
  "DRAFT",
  "PLANNED",
  "APPROVED",
  "RELEASED",
  "IN_PREPARATION",
  "READY",
  "RUNNING",
  "PENDING_CLOSURE",
  "CLOSED",
];

export const PO_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PLANNED: "Planned",
  APPROVED: "Approved",
  RELEASED: "Released",
  IN_PREPARATION: "In preparation",
  READY: "Ready",
  RUNNING: "Running",
  PENDING_CLOSURE: "Pending closure",
  CLOSED: "Closed",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
  OVERDUE: "Overdue PO",
};

export const ACTIVITY_STATUSES = [
  "NOT_STARTED",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
  "OVERDUE",
  "WAIVED",
  "CANCELLED",
] as const;

export const CRITICALITIES = ["CRITICAL", "MAJOR", "STANDARD"] as const;
export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const PO_DEPARTMENTS: { slug: string; label: string; code: string }[] = [
  { slug: "leadership", label: "Leadership", code: "LEAD" },
  { slug: "worship", label: "Worship & Music", code: "WORSHIP" },
  { slug: "sound-technical", label: "Sound & Technical", code: "SOUND" },
  { slug: "ushers", label: "Ushering", code: "USHR" },
  { slug: "hospitality", label: "Hospitality", code: "HOSP" },
  { slug: "childrens-ministry", label: "Children's Ministry", code: "CHILD" },
  { slug: "prayer-intercession", label: "Intercession", code: "INTER" },
  { slug: "media", label: "Media & Communications", code: "MEDIA" },
  { slug: "finance", label: "Finance", code: "FIN" },
  { slug: "resource-administrator", label: "Resource Administration", code: "RESOURCE" },
];

export function deptLabel(slug: string | null | undefined) {
  if (!slug) return "Church-wide";
  return PO_DEPARTMENTS.find((d) => d.slug === slug)?.label ?? slug;
}

export function deptCode(slug: string) {
  return PO_DEPARTMENTS.find((d) => d.slug === slug)?.code ?? slug.slice(0, 6).toUpperCase();
}

export const CLOSURE_CHECKS: { category: string; label: string }[] = [
  { category: "Service execution", label: "Event completed" },
  { category: "Service execution", label: "Programme completed" },
  { category: "Service execution", label: "Ministry activities completed" },
  { category: "Departments", label: "Department activities closed" },
  { category: "Departments", label: "Attendance captured where applicable" },
  { category: "Departments", label: "Volunteer records completed" },
  { category: "Finance", label: "Financial activities completed" },
  { category: "Finance", label: "Expenses recorded" },
  { category: "Finance", label: "Outstanding financial matters identified" },
  { category: "Resources", label: "Equipment returned" },
  { category: "Resources", label: "Assets checked" },
  { category: "Resources", label: "Venue restored" },
  { category: "Media", label: "Required recordings secured" },
  { category: "Media", label: "Required media files stored" },
  { category: "Pastoral", label: "Visitor information handed over" },
  { category: "Pastoral", label: "Pastoral matters referred" },
  { category: "Reporting", label: "Department reports submitted" },
  { category: "Reporting", label: "Exceptions closed" },
  { category: "Reporting", label: "Lessons learned recorded" },
];

export type Activity = {
  id: string;
  name: string;
  department_slug: string | null;
  criticality: string;
  status: string;
  completion_pct: number;
  due_at: string | null;
  depends_on: string | null;
};

/** Readiness % plus the critical-activity gate. */
export function computeReadiness(activities: Activity[]) {
  const live = activities.filter((a) => a.status !== "CANCELLED");
  const counted = live.filter((a) => a.status !== "WAIVED");
  const complete = counted.filter((a) => a.status === "COMPLETED");
  const pct = counted.length ? Math.round((complete.length / counted.length) * 1000) / 10 : 0;
  const criticalOutstanding = live.filter(
    (a) => a.criticality === "CRITICAL" && a.status !== "COMPLETED" && a.status !== "WAIVED",
  );
  return {
    pct,
    total: counted.length,
    complete: complete.length,
    criticalOutstanding: criticalOutstanding.length,
    isReady: pct >= 100 || (criticalOutstanding.length === 0 && pct >= 95),
  };
}

/** An activity is blocked when its dependency is not complete. */
export function isBlockedByDependency(activity: Activity, all: Activity[]) {
  if (!activity.depends_on) return false;
  const dep = all.find((a) => a.id === activity.depends_on);
  return !!dep && dep.status !== "COMPLETED" && dep.status !== "WAIVED";
}

export function departmentStatus(activities: Activity[]): string {
  if (!activities.length) return "NOT_STARTED";
  if (activities.every((a) => a.status === "COMPLETED" || a.status === "WAIVED")) return "COMPLETE";
  if (activities.some((a) => a.status === "BLOCKED")) return "BLOCKED";
  if (activities.some((a) => a.status === "OVERDUE")) return "OVERDUE";
  if (activities.some((a) => a.status === "IN_PROGRESS")) return "RUNNING";
  if (activities.every((a) => a.status === "NOT_STARTED")) return "NOT_STARTED";
  return "READY";
}

export async function logPoAudit(input: {
  processOrderId: string;
  action: string;
  entity?: string;
  entityId?: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  reason?: string | null;
  actorName?: string | null;
}) {
  const { data: userRes } = await supabase.auth.getUser();
  await supabase.from("process_order_audit").insert({
    process_order_id: input.processOrderId,
    actor_id: userRes.user?.id ?? null,
    actor_name: input.actorName ?? userRes.user?.email ?? null,
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entityId ?? null,
    previous_status: input.previousStatus ?? null,
    new_status: input.newStatus ?? null,
    reason: input.reason ?? null,
  });
}

/** Auto-transition rules driven by the event clock. Returns the status to persist, or null. */
export function evaluateAutoStatus(po: {
  status: string;
  starts_at: string | null;
  ends_at: string | null;
}, readinessCriticalOutstanding: number, allMandatoryDone: boolean): PoStatus | null {
  const now = Date.now();
  const start = po.starts_at ? new Date(po.starts_at).getTime() : null;
  const end = po.ends_at ? new Date(po.ends_at).getTime() : null;
  const terminal = ["CLOSED", "CANCELLED", "ON_HOLD", "DRAFT", "PLANNED", "APPROVED"];
  if (terminal.includes(po.status)) return null;

  if (end && now >= end && po.status !== "PENDING_CLOSURE" && po.status !== "OVERDUE") {
    return allMandatoryDone ? "PENDING_CLOSURE" : "OVERDUE";
  }
  if (start && now >= start && (!end || now < end) && po.status !== "RUNNING") {
    return "RUNNING";
  }
  if (start && now < start && po.status === "IN_PREPARATION" && readinessCriticalOutstanding === 0) {
    return "READY";
  }
  return null;
}

export function fmtDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusTone(status: string) {
  switch (status) {
    case "CLOSED":
    case "COMPLETE":
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800";
    case "READY":
      return "bg-sky-100 text-sky-800";
    case "RUNNING":
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-900";
    case "OVERDUE":
    case "BLOCKED":
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    case "IN_PREPARATION":
      return "bg-yellow-100 text-yellow-900";
    default:
      return "bg-muted text-muted-foreground";
  }
}
