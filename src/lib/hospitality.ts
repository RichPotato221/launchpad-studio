import type { Rag } from "@/lib/finance";

/** Shared vocabulary and scoring for the Hospitality Operations Centre. */

export const HOS_EVENT_TYPES = [
  { key: "sunday_service", label: "Sunday service" },
  { key: "conference", label: "Conference" },
  { key: "leadership_meeting", label: "Leadership meeting" },
  { key: "wedding", label: "Wedding" },
  { key: "funeral", label: "Funeral" },
  { key: "prayer_night", label: "Prayer night" },
  { key: "youth_event", label: "Youth event" },
  { key: "childrens_event", label: "Children's event" },
  { key: "outreach", label: "Community outreach" },
  { key: "special_guest", label: "Special guest" },
] as const;

export const HOS_INVENTORY_CATEGORIES = [
  { key: "refreshments", label: "Refreshments" },
  { key: "coffee", label: "Coffee" },
  { key: "tea", label: "Tea" },
  { key: "water", label: "Water" },
  { key: "juice", label: "Juice" },
  { key: "snacks", label: "Snacks" },
  { key: "cleaning", label: "Cleaning supplies" },
  { key: "kitchen_equipment", label: "Kitchen equipment" },
  { key: "serving_equipment", label: "Serving equipment" },
  { key: "tables", label: "Tables" },
  { key: "chairs", label: "Chairs" },
  { key: "decor", label: "Decor" },
  { key: "guest_packs", label: "Guest packs" },
  { key: "stationery", label: "Stationery" },
  { key: "consumables", label: "Consumables" },
] as const;

export const HOS_VOLUNTEER_ROLES = [
  { key: "leader", label: "Hospitality leader" },
  { key: "coordinator", label: "Coordinator" },
  { key: "kitchen", label: "Kitchen team" },
  { key: "guest_host", label: "Guest host" },
  { key: "serving", label: "Serving team" },
  { key: "setup", label: "Setup & décor" },
  { key: "volunteer", label: "Volunteer" },
] as const;

export const HOS_TASK_TYPES = [
  { key: "refreshments", label: "Prepare refreshments" },
  { key: "setup", label: "Set up tables & venue" },
  { key: "guest_packs", label: "Guest packs" },
  { key: "kitchen_cleaning", label: "Kitchen cleaning" },
  { key: "inventory_count", label: "Inventory count" },
  { key: "supplier_order", label: "Supplier order" },
  { key: "vip", label: "VIP preparation" },
  { key: "cleanup", label: "Venue cleanup" },
  { key: "maintenance", label: "Maintenance" },
] as const;

export const HOS_TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
export const HOS_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export const MOVEMENT_TYPES = ["receive", "issue", "transfer", "dispose", "audit"] as const;

export const HOS_RISK_CATEGORIES = [
  "food_safety",
  "budget_overrun",
  "supply_shortage",
  "volunteer_burnout",
  "guest_experience",
  "equipment_failure",
  "health_safety",
  "event_delay",
] as const;

export const HOS_COURSES = [
  "Biblical Hospitality",
  "Customer Service Excellence",
  "Food Hygiene",
  "Kitchen Safety",
  "Food Preparation",
  "Health & Safety",
  "Leadership",
  "Volunteer Management",
  "Conflict Resolution",
  "Emergency Procedures",
];

/** Default hospitality readiness checklist applied to every event. */
export const READINESS_CHECKLIST = [
  "Venue set up",
  "Tables & chairs arranged",
  "Refreshments prepared",
  "Supplies available",
  "Kitchen ready",
  "Guest lounge ready",
  "Guest packs prepared",
  "VIP arrangements confirmed",
  "Volunteers on site",
  "Cleanliness checked",
];

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

export function ragForScore(value: number, amberAt = 75, redAt = 50): Rag {
  if (value < redAt) return "red";
  if (value < amberAt) return "amber";
  return "green";
}

export function ragForCount(count: number, amberAt = 2, redAt = 5): Rag {
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

/** Checklist stored as [{ label, done }]. */
export type ChecklistItem = { label: string; done: boolean };

export function normaliseChecklist(value: any): ChecklistItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    return READINESS_CHECKLIST.map((label) => ({ label, done: false }));
  }
  return value.map((i: any) =>
    typeof i === "string" ? { label: i, done: false } : { label: String(i.label ?? ""), done: !!i.done },
  );
}

export function checklistProgress(value: any) {
  const items = normaliseChecklist(value);
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, pct: pct(done, items.length) };
}

/** Rule-of-thumb catering estimate for an expected attendance. */
export function estimateRefreshments(expected: number) {
  const a = Math.max(0, Number(expected) || 0);
  return [
    { item: "Coffee (servings)", qty: Math.ceil(a * 0.45) },
    { item: "Tea (servings)", qty: Math.ceil(a * 0.35) },
    { item: "Water (500ml bottles)", qty: Math.ceil(a * 0.6) },
    { item: "Juice (litres)", qty: Math.ceil(a * 0.15) },
    { item: "Snacks / biscuits (portions)", qty: Math.ceil(a * 1.2) },
    { item: "Cups & serviettes", qty: Math.ceil(a * 1.4) },
    { item: "Guest packs (first-timers)", qty: Math.ceil(a * 0.08) },
  ];
}

export function stockRag(item: any): Rag {
  const qty = Number(item?.quantity ?? 0);
  const min = Number(item?.min_stock ?? 0);
  if (qty <= min) return "red";
  if (min > 0 && qty <= min * 1.5) return "amber";
  return "green";
}

export function isExpiringSoon(item: any, days = 30) {
  if (!item?.expiry_date) return false;
  const diff = (new Date(item.expiry_date).getTime() - Date.now()) / 86_400_000;
  return diff <= days;
}
