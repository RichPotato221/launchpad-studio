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
  .handler(async ({ data, context }) => {
    const { dispatchNotification } = await import("@/lib/notifications/service.server");
    try {
      // Stamp the responsible person onto every notice, so recipients can see
      // who it came from and reply directly to them.
      let request = data;
      const meta = (data.metadata ?? {}) as Record<string, unknown>;
      if (!meta["actor_email"]) {
        const { data: me } = await (context.supabase as any)
          .from("profiles")
          .select("full_name, email")
          .eq("id", context.userId)
          .maybeSingle();
        if (me?.email) {
          request = { ...data, metadata: { ...meta, actor_email: me.email, actor_name: me.full_name ?? null } };
        }
      }
      return await dispatchNotification(request);
    } catch (err: unknown) {
      console.error("notify failed:", (err as Error)?.message);
      return { queued: 0, skipped: 0, processed: 0, sent: 0, failed: 0, errors: ["dispatch_failed"] };
    }
  });

export interface NotificationPrefs {
  user_id: string;
  events: boolean;
  meetings: boolean;
  announcements: boolean;
  messages: boolean;
  feed: boolean;
  leadership: boolean;
  channel: string;
}

/** Read the signed-in member's notification preferences (defaults when unset). */
export const getNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationPrefs> => {
    const { data } = await (context.supabase as any)
      .from("notification_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    const row = (data ?? {}) as Partial<NotificationPrefs>;
    return {
      user_id: context.userId,
      events: row.events ?? true,
      meetings: row.meetings ?? true,
      announcements: row.announcements ?? true,
      messages: row.messages ?? true,
      feed: row.feed ?? false,
      leadership: row.leadership ?? true,
      channel: row.channel ?? "both",
    };
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
