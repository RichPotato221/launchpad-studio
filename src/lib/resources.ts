import type { Rag } from "@/lib/finance";

/**
 * Shared vocabulary, scoring and helpers for the
 * Office of the Resource Administrator — Enterprise Asset,
 * Facilities & Resource Management System (EAFMS).
 */

export const RESOURCE_DEPT_SLUGS = ["resource-administrator"];

export const ASSET_CATEGORIES = [
  { key: "furniture", label: "Furniture (chairs, tables)" },
  { key: "sound_av", label: "Sound & AV" },
  { key: "musical", label: "Musical instruments" },
  { key: "cameras", label: "Cameras & media" },
  { key: "it", label: "IT & computers" },
  { key: "office", label: "Office equipment" },
  { key: "vehicles", label: "Vehicles" },
  { key: "kitchen", label: "Kitchen equipment" },
  { key: "childrens", label: "Children's ministry" },
  { key: "tents_banners", label: "Tents & banners" },
  { key: "building", label: "Building & fixtures" },
  { key: "other", label: "Other" },
] as const;

export const ASSET_CONDITIONS = ["excellent", "good", "fair", "poor", "faulty"] as const;
export const ASSET_LIFECYCLE = ["in_service", "in_storage", "under_repair", "loaned", "retired", "disposed", "lost"] as const;
export const INSURANCE_STATUSES = ["insured", "uninsured", "pending", "expired"] as const;

export const FACILITY_TYPES = [
  { key: "auditorium", label: "Auditorium" },
  { key: "building", label: "Church building" },
  { key: "classroom", label: "Classroom" },
  { key: "office", label: "Office" },
  { key: "prayer_room", label: "Prayer room" },
  { key: "parking", label: "Parking area" },
  { key: "kitchen", label: "Kitchen" },
  { key: "storage", label: "Storage room" },
  { key: "sound_booth", label: "Sound booth" },
  { key: "childrens_room", label: "Children's room" },
  { key: "branch", label: "Branch facility" },
  { key: "room", label: "Other room" },
] as const;

export const FACILITY_STATUSES = ["available", "occupied", "maintenance", "closed"] as const;
export const SAFETY_STATUSES = ["compliant", "due", "overdue", "failed"] as const;

export const REQUESTABLE_ITEMS = [
  "Chairs", "Tables", "Keyboards", "Cameras", "Speakers", "Microphones", "Vehicles",
  "Office equipment", "Projectors", "Laptops", "Banners", "Tents", "Ministry resources",
] as const;

export const REQUEST_STATUSES = [
  "submitted", "under_review", "awaiting_chair", "approved", "issued", "returned", "inspected", "closed", "rejected",
] as const;

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Resource admin review",
  awaiting_chair: "Awaiting Chairperson",
  approved: "Approved",
  issued: "Equipment issued",
  returned: "Returned",
  inspected: "Inspected",
  closed: "Closed",
  rejected: "Rejected",
};

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const FAULT_TYPES = [
  { key: "equipment", label: "Broken equipment" },
  { key: "electrical", label: "Electrical fault" },
  { key: "plumbing", label: "Plumbing" },
  { key: "hvac", label: "Air conditioning" },
  { key: "lighting", label: "Lighting" },
  { key: "sound", label: "Sound equipment" },
  { key: "instruments", label: "Musical instruments" },
  { key: "building", label: "Building damage" },
  { key: "furniture", label: "Furniture repair" },
  { key: "it", label: "IT equipment" },
  { key: "other", label: "Other" },
] as const;

export const MAINTENANCE_KINDS = ["preventive", "corrective", "inspection", "statutory"] as const;
export const TICKET_STATUSES = ["open", "assigned", "in_progress", "on_hold", "completed", "closed"] as const;
export const TICKET_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export const MAINTENANCE_FREQUENCIES = ["weekly", "monthly", "quarterly", "biannual", "annual", "once_off"] as const;
export const MAINTENANCE_TRIGGERS = ["time", "usage_hours", "inspection", "manufacturer"] as const;

export const PROJECT_TYPES = [
  { key: "new_branch", label: "New branch" },
  { key: "renovation", label: "Building renovation" },
  { key: "sound_install", label: "Sound installation" },
  { key: "auditorium", label: "Auditorium upgrade" },
  { key: "childrens_room", label: "Children's ministry room" },
  { key: "office", label: "Office expansion" },
  { key: "interior", label: "Interior improvement" },
  { key: "construction", label: "Construction" },
] as const;

export const PROJECT_STATUSES = ["planning", "approved", "in_progress", "on_hold", "completed", "cancelled"] as const;

export const INVENTORY_CATEGORIES = [
  { key: "stationery", label: "Stationery" },
  { key: "cleaning", label: "Cleaning supplies" },
  { key: "communion", label: "Communion elements" },
  { key: "printing", label: "Printing paper" },
  { key: "batteries", label: "Batteries" },
  { key: "electrical", label: "Electrical supplies" },
  { key: "kitchen", label: "Kitchen supplies" },
  { key: "childrens", label: "Children's ministry materials" },
  { key: "marketing", label: "Marketing materials" },
] as const;

export const RISK_CATEGORIES = [
  { key: "theft", label: "Asset theft" },
  { key: "asset_loss", label: "Asset loss" },
  { key: "equipment_failure", label: "Equipment failure" },
  { key: "fire", label: "Fire risk" },
  { key: "building_damage", label: "Building damage" },
  { key: "safety", label: "Safety hazard" },
  { key: "project_delay", label: "Project delay" },
  { key: "shortage", label: "Resource shortage" },
  { key: "backlog", label: "Maintenance backlog" },
  { key: "shrinkage", label: "Inventory shrinkage" },
] as const;

export const TRAINING_COURSES = [
  "Asset Management", "Inventory Control", "Health & Safety", "Fire Safety", "First Aid",
  "Preventive Maintenance", "Equipment Handling", "Facilities Management", "Risk Management",
] as const;

export const COMPETENCY_LEVELS = ["foundation", "competent", "advanced", "trainer"] as const;

export const BOOKING_STATUSES = ["requested", "confirmed", "in_use", "returned", "cancelled", "waitlisted"] as const;

/* ------------------------- helpers ------------------------- */

export function labelFor(list: readonly { key: string; label: string }[], key?: string | null) {
  return list.find((i) => i.key === key)?.label ?? titleish(key);
}

export function titleish(s?: string | null) {
  if (!s) return "—";
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function daysUntil(date?: string | null) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

/** Straight-line depreciation from purchase price and annual rate. */
export function depreciatedValue(asset: {
  purchase_value?: number | null;
  purchase_date?: string | null;
  depreciation_rate?: number | null;
  current_value?: number | null;
}) {
  if (asset.current_value != null) return Number(asset.current_value);
  const price = Number(asset.purchase_value ?? 0);
  if (!price || !asset.purchase_date) return price;
  const years = (Date.now() - new Date(asset.purchase_date).getTime()) / (365.25 * 86_400_000);
  const rate = Number(asset.depreciation_rate ?? 20) / 100;
  return Math.max(0, price * (1 - rate * years));
}

export function riskScore(likelihood: number, impact: number) {
  return Number(likelihood || 0) * Number(impact || 0);
}

export function ragForRisk(score: number): Rag {
  if (score >= 15) return "red";
  if (score >= 8) return "amber";
  return "green";
}

export function ragForPct(pct: number, amberAt = 80, redAt = 60): Rag {
  if (pct >= amberAt) return "green";
  if (pct >= redAt) return "amber";
  return "red";
}

export function ragForOverdue(count: number, amberAt = 1, redAt = 5): Rag {
  if (count >= redAt) return "red";
  if (count >= amberAt) return "amber";
  return "green";
}

/** Facility readiness = safety compliance + no open critical tickets. */
export function facilityReadiness(facilities: any[], tickets: any[]) {
  if (!facilities.length) return 0;
  const openByFacility = new Set(
    tickets.filter((t) => !["completed", "closed"].includes(t.status) && t.facility_id).map((t) => t.facility_id),
  );
  const ready = facilities.filter(
    (f) => f.status === "available" && f.safety_status === "compliant" && !openByFacility.has(f.id),
  ).length;
  return Math.round((ready / facilities.length) * 100);
}

/** Utilisation = share of assets currently issued out or in service. */
export function assetUtilisation(assets: any[], checkouts: any[]) {
  if (!assets.length) return 0;
  const out = new Set(checkouts.filter((c) => !c.checked_in_at).map((c) => c.asset_id));
  return Math.round((out.size / assets.length) * 100);
}

export function isOverdueReturn(c: any) {
  return !c.checked_in_at && c.due_back_at && new Date(c.due_back_at) < new Date();
}

/** Replacement forecast: assets at/over end of useful life within horizon years. */
export function replacementForecast(assets: any[], horizonYears = 1) {
  let total = 0;
  const items: { name: string; value: number; reason: string }[] = [];
  for (const a of assets) {
    const rate = Number(a.depreciation_rate ?? 20) / 100;
    const life = rate > 0 ? 1 / rate : 5;
    const age = a.purchase_date ? (Date.now() - new Date(a.purchase_date).getTime()) / (365.25 * 86_400_000) : 0;
    const failing = ["poor", "faulty"].includes(a.condition ?? "");
    if (age + horizonYears >= life || failing) {
      const value = Number(a.purchase_value ?? 0);
      total += value;
      items.push({
        name: a.name,
        value,
        reason: failing ? `Condition: ${a.condition}` : `End of ${Math.round(life)}-year useful life`,
      });
    }
  }
  return { total, items };
}
