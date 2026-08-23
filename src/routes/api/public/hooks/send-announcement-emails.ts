import { createFileRoute } from "@tanstack/react-router";

/**
 * Legacy endpoint kept for the scheduled GitHub Action.
 * Announcements now flow through the central notification pipeline, so this
 * simply runs the shared worker.
 */
async function run() {
  const { getAdmin, enqueueNotification, processPendingNotifications } = await import(
    "@/lib/notifications/service.server"
  );
  const admin = await getAdmin();

  const { data: queue } = await admin
    .from("notify_queue")
    .select("*")
    .eq("processed", false)
    .order("created_at", { ascending: true })
    .limit(25);

  for (const item of (queue ?? []) as any[]) {
    const payload = item.payload ?? {};
    const target = String(payload.target_branch ?? "all");
    await enqueueNotification({
      type: "ANNOUNCEMENT_CREATED",
      entityType: "announcement",
      entityId: payload.announcement_id ?? item.id,
      entityVersion: item.id,
      audience: target === "all" ? {} : { branch: target },
      metadata: { body: payload.body, priority: !!payload.priority, author_name: payload.author_name },
    });
    await admin.from("notify_queue").update({ processed: true }).eq("id", item.id);
  }

  const result = await processPendingNotifications(80);
  return { queued: queue?.length ?? 0, ...result };
}

export const Route = createFileRoute("/api/public/hooks/send-announcement-emails")({
  server: {
    handlers: {
      POST: async () => {
        try {
          return new Response(JSON.stringify(await run()), {
            headers: { "Content-Type": "application/json; charset=UTF-8" },
          });
        } catch (err: unknown) {
          console.error("announcement worker failed:", (err as Error)?.message);
          return new Response(JSON.stringify({ error: (err as Error)?.message ?? "worker_failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=UTF-8" },
          });
        }
      },
      GET: async () =>
        new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json; charset=UTF-8" },
        }),
    },
  },
});
