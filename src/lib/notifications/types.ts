/** Centralised notification event catalogue (client-safe: types only). */
export const NOTIFICATION_TYPES = [
  "EVENT_CREATED",
  "EVENT_UPDATED",
  "EVENT_CANCELLED",
  "EVENT_INVITATION",
  "EVENT_REMINDER",
  "EVENT_ACCEPTED",
  "EVENT_DECLINED",

  "MEETING_CREATED",
  "MEETING_UPDATED",
  "MEETING_CANCELLED",
  "MEETING_INVITATION",
  "MEETING_REMINDER",

  "MESSAGE_RECEIVED",
  "MESSAGE_MENTION",
  "MESSAGE_REPLY",

  "FEED_POST_CREATED",
  "FEED_POST_UPDATED",
  "FEED_COMMENT",
  "FEED_MENTION",

  "ANNOUNCEMENT_CREATED",
  "ANNOUNCEMENT_UPDATED",
  "ANNOUNCEMENT_PUBLISHED",

  "LEADERSHIP_NOTICE",
  "SYSTEM_NOTIFICATION",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Which preference column governs each notification type. */
export type PreferenceKey =
  | "events"
  | "meetings"
  | "announcements"
  | "messages"
  | "feed"
  | "leadership";

export function preferenceKeyFor(type: NotificationType): PreferenceKey {
  if (type.startsWith("EVENT_")) return "events";
  if (type.startsWith("MEETING_")) return "meetings";
  if (type.startsWith("MESSAGE_")) return "messages";
  if (type.startsWith("FEED_")) return "feed";
  if (type.startsWith("ANNOUNCEMENT_")) return "announcements";
  return "leadership";
}

/** Critical notices always go out, regardless of preferences. */
export function isCritical(type: NotificationType): boolean {
  return (
    type === "EVENT_CANCELLED" ||
    type === "MEETING_CANCELLED" ||
    type === "SYSTEM_NOTIFICATION" ||
    type === "LEADERSHIP_NOTICE"
  );
}

/** Audience selector resolved server-side into concrete recipients. */
export interface NotificationAudience {
  /** "all approved members" when nothing else is given */
  branch?: string | null;
  departmentSlug?: string | null;
  userIds?: string[];
  emails?: string[];
}

export interface NotificationRequest {
  type: NotificationType;
  entityType?: string;
  entityId?: string | null;
  audience?: NotificationAudience;
  /** Bumped when an entity changes, so updates are not deduped against creates. */
  entityVersion?: string | number;
  metadata?: Record<string, unknown>;
}
