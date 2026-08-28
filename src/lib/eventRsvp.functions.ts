import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RsvpRow = {
  email: string;
  name: string | null;
  response: "accepted" | "declined" | "pending";
  responded_at: string | null;
};

/**
 * Returns the RSVP standing for one event: everybody the invitation was
 * actually delivered to, and whether they accepted, declined or have not
 * replied yet. Only the organiser of the event (or church oversight) may read
 * it.
 */
export const getEventRsvps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: ev } = await admin
      .from("events")
      .select("id, created_by, title")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!ev) return { allowed: false as const, rows: [] as RsvpRow[] };

    let allowed = ev.created_by === userId;
    if (!allowed) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      allowed = (roles ?? []).some((r: any) =>
        ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"].includes(r.role),
      );
    }
    if (!allowed) return { allowed: false as const, rows: [] as RsvpRow[] };

    const [{ data: log }, { data: responses }] = await Promise.all([
      admin
        .from("notification_log")
        .select("recipient_email, recipient_id, status")
        .eq("entity_id", data.eventId)
        .in("status", ["sent", "queued", "pending", "retrying"]),
      admin.from("event_responses").select("recipient_email, response, responded_at").eq("event_id", data.eventId),
    ]);

    const replies = new Map<string, any>();
    ((responses ?? []) as any[]).forEach((r) => replies.set(String(r.recipient_email).toLowerCase(), r));

    const byEmail = new Map<string, { email: string; userId: string | null }>();
    ((log ?? []) as any[]).forEach((r) => {
      const email = String(r.recipient_email ?? "").toLowerCase();
      if (email && !byEmail.has(email)) byEmail.set(email, { email, userId: r.recipient_id ?? null });
    });
    // Anyone who replied but is missing from the log (older invites) still counts.
    replies.forEach((_v, email) => {
      if (!byEmail.has(email)) byEmail.set(email, { email, userId: null });
    });

    const ids = Array.from(byEmail.values()).map((r) => r.userId).filter(Boolean) as string[];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", ids);
      ((profiles ?? []) as any[]).forEach((p) => names.set(p.id, p.full_name));
    }

    const rows: RsvpRow[] = Array.from(byEmail.values()).map((r) => {
      const reply = replies.get(r.email);
      return {
        email: r.email,
        name: (r.userId && names.get(r.userId)) || null,
        response: reply ? (reply.response === "accepted" ? "accepted" : "declined") : "pending",
        responded_at: reply?.responded_at ?? null,
      };
    });

    rows.sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
    return { allowed: true as const, rows };
  });
