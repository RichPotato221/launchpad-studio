import { createServerFn } from "@tanstack/react-start";

type Action = "create" | "update" | "cancel";

/**
 * Emails a real calendar invite (.ics) plus Accept / Decline buttons to every
 * approved member. Kept as the stable entry point used across the portal, but
 * it now runs on the central notification pipeline (queue → worker → Gmail).
 */
export const sendEventInvites = createServerFn({ method: "POST" })
  .inputValidator((d: { eventId: string; action?: Action; branch?: string | null }) => d)
  .handler(async ({ data }) => {
    const { dispatchNotification, getAdmin } = await import("@/lib/notifications/service.server");
    const action: Action = data.action ?? "create";

    const admin = await getAdmin();
    const { data: ev } = await admin
      .from("events")
      .select("id, branch, event_type, updated_at")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!ev) return { sent: 0, reason: "event_not_found" };

    const isMeeting = String(ev.event_type ?? "").toLowerCase().includes("meeting");
    const type =
      action === "cancel"
        ? isMeeting
          ? "MEETING_CANCELLED"
          : "EVENT_CANCELLED"
        : action === "update"
          ? isMeeting
            ? "MEETING_UPDATED"
            : "EVENT_UPDATED"
          : isMeeting
            ? "MEETING_INVITATION"
            : "EVENT_INVITATION";

    const result = await dispatchNotification({
      type: type as never,
      entityType: isMeeting ? "meeting" : "event",
      entityId: data.eventId,
      entityVersion: `${action}:${ev.updated_at ?? ""}`,
      audience: ev.branch ? { branch: ev.branch } : {},
    });

    return { sent: result.sent, queued: result.queued, failed: result.failed, errors: result.errors };
  });
