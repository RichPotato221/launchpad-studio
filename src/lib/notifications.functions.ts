import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { NotificationRequest } from "@/lib/notifications/types";

/**
 * The single entry point every feature uses to notify members.
 * Queues into notification_log, then attempts immediate delivery.
 */
export const notify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: NotificationRequest) => d)
  .handler(async ({ data }) => {
    const { dispatchNotification } = await import("@/lib/notifications/service.server");
    try {
      return await dispatchNotification(data);
    } catch (err: unknown) {
      console.error("notify failed:", (err as Error)?.message);
      return { queued: 0, skipped: 0, processed: 0, sent: 0, failed: 0, errors: ["dispatch_failed"] };
    }
  });

/** Read the signed-in member's notification preferences (creating defaults). */
export const getNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("notification_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return ((data as any) ?? {
        user_id: context.userId,
        events: true,
        meetings: true,
        announcements: true,
        messages: true,
        feed: false,
        leadership: true,
        channel: "both",
      }) as Record<string, unknown>;
  });

export const saveNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      events?: boolean;
      meetings?: boolean;
      announcements?: boolean;
      messages?: boolean;
      feed?: boolean;
      leadership?: boolean;
      channel?: "email" | "dashboard" | "both";
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("notification_preferences")
      .upsert({ ...data, user_id: context.userId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
