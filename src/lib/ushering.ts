/** Shared vocabulary + helpers for the Ushering Ministry operations centre (COHCMS). */

export const USH_SERVICE_TYPES = [
  "sunday_service",
  "midweek_service",
  "prayer_meeting",
  "conference",
  "crusade",
  "wedding",
  "funeral",
  "special_event",
] as const;

export const USH_SERVICE_STATUSES = ["planned", "ready", "in_progress", "completed", "cancelled"] as const;

export const USH_TEAMS = ["auditorium", "entrance", "parking", "protocol", "welcome_desk", "overflow"] as const;

export const USH_ROLES = [
  "usher",
  "head_usher",
  "protocol_officer",
  "welcome_host",
  "parking_marshal",
  "safety_marshal",
  "section_leader",
] as const;

export const USH_DUTIES = [
  "entrance",
  "auditorium",
  "parking",
  "offering",
  "communion",
  "altar_call",
  "welcome_desk",
  "overflow",
  "safety",
  "vip_protocol",
] as const;

export const USH_ROSTER_STATUSES = ["assigned", "accepted", "declined", "on_leave", "swapped", "no_show"] as const;

export const USH_AVAILABILITY = ["available", "limited", "on_leave", "unavailable"] as const;

export const USH_TRAINING_STATUSES = ["not_started", "in_progress", "certified", "refresher_due"] as const;

export const USH_ZONE_TYPES = [
  "general",
  "vip",
  "family",
  "elderly",
  "accessible",
  "youth",
  "overflow",
  "reserved",
] as const;

export const USH_VISITOR_TYPES = ["first_time", "returning", "vip_guest", "guest_minister", "member_guest"] as const;

export const USH_FOLLOWUP_STATUSES = ["pending", "contacted", "connected", "joined", "unreachable"] as const;

export const USH_INCIDENT_TYPES = [
  "medical",
  "security",
  "child_safety",
  "disruption",
  "lost_property",
  "fire_safety",
  "facility",
  "other",
] as const;

export const USH_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export const USH_CARE_GROUPS = [
  "elderly",
  "disabled",
  "pregnant",
  "nursing_mother",
  "child",
  "bereaved",
  "unwell",
  "first_time_family",
] as const;

export const USH_COMM_TYPES = [
  "duty_reminder",
  "roster_change",
  "briefing",
  "training_invite",
  "recognition",
  "emergency",
] as const;

export const USH_RISK_CATEGORIES = [
  "crowd_safety",
  "medical_emergency",
  "fire_evacuation",
  "child_safeguarding",
  "security",
  "volunteer_shortage",
  "facility",
  "reputational",
] as const;

export const USH_COURSES = [
  "Ushering Foundations & Ministry of Welcome",
  "Crowd Control & Auditorium Flow",
  "First Aid & Medical Emergency Response",
  "Fire Safety & Evacuation Procedures",
  "Child Safeguarding Awareness",
  "Protocol & VIP Guest Handling",
  "Conflict De-escalation",
  "Offering & Communion Handling Integrity",
];

export const USH_SERVICE_CHECKLIST = [
  "Auditorium swept and chairs aligned",
  "Entrances and exits unobstructed",
  "Welcome desk stocked with cards and pens",
  "Visitor badges and gift packs ready",
  "Offering baskets and bags counted",
  "Signage and directional boards in place",
  "Accessible and family seating reserved",
  "Parking marshals briefed and in position",
  "First aid kit checked and accessible",
  "Emergency exit routes walked and clear",
  "Team briefing and prayer completed",
  "Radios / comms tested",
];

export function ushLabel(key?: string | null) {
  if (!key) return "—";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function occupancyPct(occupied: number, capacity: number) {
  if (!capacity) return 0;
  return Math.min(100, Math.round((occupied / capacity) * 100));
}

export function severityWeight(s?: string | null) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[s ?? "low"] ?? 1;
}

export const USH_SEVERITY_CLASS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};
