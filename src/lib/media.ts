/** Shared vocabulary + helpers for the Kingdom Media Operations Centre. */

export const MED_REQUEST_TYPES = [
  "announcement",
  "poster_design",
  "flyer",
  "photography",
  "videography",
  "livestream",
  "social_campaign",
  "website_update",
  "podcast",
  "banner_signage",
] as const;

export const MED_REQUEST_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "in_production",
  "in_review",
  "published",
  "declined",
  "on_hold",
] as const;

export const MED_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const MED_PROJECT_TYPES = [
  "sermon_recording",
  "sermon_clips",
  "promo_video",
  "testimony",
  "event_coverage",
  "graphics_pack",
  "podcast_episode",
  "documentary",
  "photo_shoot",
] as const;

export const MED_STAGES = [
  "planning",
  "recording",
  "editing",
  "review",
  "approval",
  "publishing",
  "archived",
] as const;

export const MED_PLATFORMS = [
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "x",
  "whatsapp",
  "website",
  "email",
] as const;

export const MED_POST_STATUSES = ["draft", "scheduled", "published", "boosted", "archived"] as const;

export const MED_STREAM_TYPES = [
  "sunday_service",
  "midweek_service",
  "prayer_meeting",
  "conference",
  "special_event",
] as const;

export const MED_STREAM_STATUSES = ["scheduled", "pre_flight", "live", "completed", "failed"] as const;

export const MED_ASSET_TYPES = ["photo", "video", "audio", "graphic", "document", "font", "logo"] as const;

export const MED_ASSET_CATEGORIES = [
  "archive",
  "brand",
  "sermon",
  "event",
  "campaign",
  "stock",
  "template",
] as const;

export const MED_TEAM_ROLES = [
  "media_lead",
  "photographer",
  "videographer",
  "editor",
  "graphic_designer",
  "social_manager",
  "livestream_operator",
  "web_admin",
  "volunteer",
] as const;

export const MED_RISK_CATEGORIES = [
  "equipment_failure",
  "livestream_outage",
  "data_loss",
  "copyright",
  "brand_misuse",
  "volunteer_capacity",
  "reputational",
  "cyber_security",
] as const;

export const MED_COURSES = [
  "Media Ministry Foundations & Kingdom Storytelling",
  "Camera Operation & Composition",
  "Video Editing Essentials",
  "Livestream Operations & Troubleshooting",
  "Graphic Design & Brand Standards",
  "Social Media Strategy for Ministry",
  "Audio Capture & Mixing for Video",
  "Copyright, Licensing & Consent",
];

export const MED_STREAM_CHECKLIST = [
  "Cameras powered, framed and white-balanced",
  "Audio feed from desk tested",
  "Encoder connected and bitrate stable",
  "Internet speed test passed",
  "Stream title, thumbnail and description set",
  "Lower thirds and graphics loaded",
  "Backup recording armed",
  "Moderator assigned to live chat",
  "Countdown / holding slide live",
  "Post-stream upload plan confirmed",
];

export const MED_PROJECT_CHECKLIST = [
  "Brief confirmed with requesting ministry",
  "Shot list / storyboard prepared",
  "Equipment booked",
  "Consent and permissions obtained",
  "Footage captured and backed up",
  "Rough cut completed",
  "Ministry review feedback applied",
  "Final approval obtained",
  "Published to agreed platforms",
  "Archived with tags",
];

export function medLabel(key?: string | null) {
  if (!key) return "—";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function engagementRate(engagements: number, reach: number) {
  if (!reach) return 0;
  return Math.round((engagements / reach) * 1000) / 10;
}

export const MED_STATUS_CLASS: Record<string, string> = {
  submitted: "bg-sky-100 text-sky-800 border-sky-200",
  under_review: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  in_production: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_review: "bg-amber-100 text-amber-800 border-amber-200",
  published: "bg-emerald-100 text-emerald-800 border-emerald-200",
  declined: "bg-red-100 text-red-800 border-red-200",
  on_hold: "bg-muted text-muted-foreground border-border",
};
