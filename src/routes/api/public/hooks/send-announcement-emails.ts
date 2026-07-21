import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const APP_URL = "https://trog-dashboard.lovable.app";

function encodeRaw(to: string, subject: string, body: string): string {
  const msg = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");
  return Buffer.from(msg, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendGmail(to: string, subject: string, body: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAIL_API_KEY = process.env.GOOGLE_MAIL_API_KEY;
  if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) return { ok: false, err: "missing_creds" };
  const raw = encodeRaw(to, subject, body);
  const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) return { ok: false, err: `gmail_${res.status}:${await res.text()}` };
  return { ok: true };
}

export const Route = createFileRoute("/api/public/hooks/send-announcement-emails")({
  server: {
    handlers: {
      POST: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const admin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data: queue, error: qErr } = await admin
          .from("notify_queue")
          .select("*")
          .eq("processed", false)
          .order("created_at", { ascending: true })
          .limit(25);
        if (qErr) return new Response(JSON.stringify({ error: qErr.message }), { status: 500 });
        if (!queue || queue.length === 0) return new Response(JSON.stringify({ processed: 0 }));

        let sent = 0;
        const errors: string[] = [];

        for (const item of queue) {
          const payload: any = item.payload ?? {};
          const target = String(payload.target_branch ?? "all");

          let q = admin
            .from("profiles")
            .select("email, branch")
            .eq("approval_status", "approved");
          if (target !== "all") q = q.eq("branch", target);
          const { data: recipients } = await q;
          const emails = (recipients ?? []).map((r: any) => r.email).filter(Boolean);

          const priority = !!payload.priority;
          const subject = `${priority ? "[Priority] " : ""}New announcement — TRoGKC Portal`;
          const body = [
            payload.body ?? "A new announcement was posted on the TRoGKC Portal.",
            "",
            `View it in the portal: ${APP_URL}/feed`,
          ].join("\n");

          for (const to of emails) {
            const r = await sendGmail(to, subject, body);
            if (r.ok) sent++;
            else errors.push(`${to}: ${r.err}`);
          }

          await admin.from("notify_queue").update({ processed: true }).eq("id", item.id);
        }

        return new Response(JSON.stringify({ processed: queue.length, sent, errors: errors.slice(0, 10) }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () => new Response("ok"),
    },
  },
});
