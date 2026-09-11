/**
 * TROGKC INTER-BRANCH ASSET MOVEMENT & RESOURCE LOAN AGREEMENT
 *
 * Shared vocabulary, workflow rules and helpers. The branches of TROGKC are
 * one church — a movement agreement records custody of church property, it is
 * never a commercial lease.
 */

export const MOVEMENT_TYPES = [
  { key: "temporary_loan", label: "Temporary Inter-Branch Loan" },
  { key: "permanent_transfer", label: "Permanent Asset Transfer" },
  { key: "event", label: "Event-Based Movement" },
  { key: "internal", label: "Internal Branch Movement" },
  { key: "other", label: "Other Approved Movement" },
] as const;

export const MOVEMENT_PURPOSES = [
  "Sunday Service", "Conference", "Worship Event", "Training", "School of Ministry",
  "Outreach", "Evangelism", "Leadership Programme", "Church Development Project",
  "Maintenance", "Temporary Operational Need", "Emergency", "Other",
] as const;

export const MOVEMENT_STATUSES = [
  "DRAFT", "REQUESTED", "PENDING_APPROVAL", "APPROVED", "READY_FOR_DISPATCH",
  "IN_TRANSIT", "RECEIVED", "ON_LOAN", "AT_EVENT", "RETURN_REQUESTED",
  "RETURN_IN_TRANSIT", "RETURNED", "CLOSED", "REJECTED", "OVERDUE",
  "INCIDENT_REVIEW", "CANCELLED",
] as const;

export type MovementStatus = (typeof MOVEMENT_STATUSES)[number];

/** Mirrors the database transition guard exactly. */
export const NEXT_STATUS: Record<string, MovementStatus[]> = {
  DRAFT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["READY_FOR_DISPATCH", "CANCELLED"],
  READY_FOR_DISPATCH: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["RECEIVED", "INCIDENT_REVIEW"],
  RECEIVED: ["ON_LOAN", "AT_EVENT", "RETURN_REQUESTED", "CLOSED", "INCIDENT_REVIEW"],
  AT_EVENT: ["RETURN_REQUESTED", "OVERDUE", "INCIDENT_REVIEW"],
  ON_LOAN: ["RETURN_REQUESTED", "OVERDUE", "INCIDENT_REVIEW"],
  OVERDUE: ["RETURN_REQUESTED", "ON_LOAN", "INCIDENT_REVIEW"],
  RETURN_REQUESTED: ["RETURN_IN_TRANSIT", "INCIDENT_REVIEW"],
  RETURN_IN_TRANSIT: ["RETURNED", "INCIDENT_REVIEW"],
  RETURNED: ["CLOSED", "INCIDENT_REVIEW"],
  INCIDENT_REVIEW: ["RETURNED", "CLOSED", "ON_LOAN", "CANCELLED"],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const ASSET_MOVEMENT_STATUSES = [
  "AVAILABLE", "RESERVED", "ON_LOAN", "IN_TRANSIT", "AT_EVENT", "UNDER_MAINTENANCE",
  "DAMAGED", "LOST", "STOLEN", "DISPOSED", "RETIRED", "ARCHIVED",
] as const;

export const ASSET_CONDITION_GRADES = [
  "EXCELLENT", "GOOD", "FAIR", "NEEDS_REPAIR", "POOR", "UNSERVICEABLE",
] as const;

export const INCIDENT_TYPES = [
  "DAMAGE", "LOSS", "THEFT", "MISSING_ACCESSORY", "QUANTITY_DISCREPANCY",
  "CONDITION_DISCREPANCY", "OTHER",
] as const;

export const INCIDENT_STATUSES = ["REPORTED", "UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED", "CLOSED"] as const;

export const OPEN_INCIDENT_STATUSES = ["REPORTED", "UNDER_REVIEW", "ACTION_REQUIRED"];

export function pretty(s?: string | null) {
  if (!s) return "—";
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function movementTypeLabel(k?: string | null) {
  return MOVEMENT_TYPES.find((t) => t.key === k)?.label ?? pretty(k);
}

export const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  REQUESTED: "bg-amber-100 text-amber-900 border-amber-200",
  PENDING_APPROVAL: "bg-amber-100 text-amber-900 border-amber-200",
  APPROVED: "bg-sky-100 text-sky-900 border-sky-200",
  READY_FOR_DISPATCH: "bg-sky-100 text-sky-900 border-sky-200",
  IN_TRANSIT: "bg-indigo-100 text-indigo-900 border-indigo-200",
  RECEIVED: "bg-teal-100 text-teal-900 border-teal-200",
  ON_LOAN: "bg-teal-100 text-teal-900 border-teal-200",
  AT_EVENT: "bg-teal-100 text-teal-900 border-teal-200",
  RETURN_REQUESTED: "bg-amber-100 text-amber-900 border-amber-200",
  RETURN_IN_TRANSIT: "bg-indigo-100 text-indigo-900 border-indigo-200",
  RETURNED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CLOSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  INCIDENT_REVIEW: "bg-orange-100 text-orange-900 border-orange-200",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  AVAILABLE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  RESERVED: "bg-amber-100 text-amber-900 border-amber-200",
  UNDER_MAINTENANCE: "bg-amber-100 text-amber-900 border-amber-200",
  DAMAGED: "bg-orange-100 text-orange-900 border-orange-200",
  LOST: "bg-red-100 text-red-800 border-red-200",
  STOLEN: "bg-red-100 text-red-800 border-red-200",
  DISPOSED: "bg-muted text-muted-foreground border-border",
  RETIRED: "bg-muted text-muted-foreground border-border",
  ARCHIVED: "bg-muted text-muted-foreground border-border",
  REPORTED: "bg-amber-100 text-amber-900 border-amber-200",
  UNDER_REVIEW: "bg-sky-100 text-sky-900 border-sky-200",
  ACTION_REQUIRED: "bg-orange-100 text-orange-900 border-orange-200",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

/** Asset status implied by an agreement stage. */
export function assetStatusForMovement(movementStatus: string, movementType: string) {
  switch (movementStatus) {
    case "APPROVED":
    case "READY_FOR_DISPATCH":
      return "RESERVED";
    case "IN_TRANSIT":
    case "RETURN_IN_TRANSIT":
      return "IN_TRANSIT";
    case "RECEIVED":
    case "ON_LOAN":
    case "OVERDUE":
      return movementType === "event" ? "AT_EVENT" : "ON_LOAN";
    case "AT_EVENT":
      return "AT_EVENT";
    case "RETURNED":
    case "CLOSED":
      return "AVAILABLE";
    default:
      return null;
  }
}

export function daysBetween(a?: string | null, b?: string | null) {
  if (!a) return null;
  const end = b ? new Date(b) : new Date();
  return Math.round((end.getTime() - new Date(a).getTime()) / 86_400_000);
}

/** The 13 standing terms printed on every movement agreement. */
export const AGREEMENT_TERMS = [
  "All assets remain the property of Throne Room of God Kingdom Centre (TROGKC) unless a properly authorised permanent transfer is recorded.",
  "Assets may only be used for the approved purpose recorded in this agreement.",
  "Assets may not be sold, pledged, exchanged, disposed of, modified or transferred to another person or branch without authorised approval.",
  "The receiving branch or person must exercise reasonable care over the assets.",
  "Loss, theft, damage or malfunction must be reported promptly through the system.",
  "Assets must be returned by the approved return date unless an extension is authorised.",
  "Extensions must be recorded in the system; verbal arrangements are not part of the record.",
  "The Resource Administrator maintains the official asset and movement record.",
  "Discrepancies recorded on dispatch, receipt or return may require investigation.",
  "Any recovery of reasonable costs is subject to fair assessment, authorisation and due process.",
  "Disciplinary matters follow the Church's approved disciplinary and restoration procedures.",
  "Digital records and acknowledgements form part of the official movement record.",
  "Ownership does not change unless an authorised permanent transfer is completed.",
];

export const AGREEMENT_TITLE =
  "THRONE ROOM OF GOD KINGDOM CENTRE (TROGKC)\nINTER-BRANCH ASSET MOVEMENT & RESOURCE LOAN AGREEMENT";
