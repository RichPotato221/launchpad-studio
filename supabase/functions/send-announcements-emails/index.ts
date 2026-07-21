// supabase/functions/send-announcement-emails/index.ts
//
// Polls notify_queue for unprocessed 'new_announcement' rows and emails
// every approved member. Uses Resend (https://resend.com) — swap the fetch
// call below for whatever email provider/connector you have configured if
// you're not using Resend.
//
// Required secrets (Project Settings -> Edge Functions -> Secrets):
// SUPABASE_URL (already available by default)
// SUPABASE_SERVICE_ROLE_KEY (already available by default)
// RESEND_API_KEY
// APP_URL e.g. https://trog-dashboard.lovable.app
//
// Schedule this function to run every 1-2 minutes (Project Settings ->
// Edge Functions -> your function -> Cron), or trigger it from a database
// webhook on INSERT to notify_queue.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://trog-dashboard.lovable.app";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async () => {
  try {
    const { data: queueRows, error: queueError } = await supabase
      .from("notify_queue")
      .select("*")
      .eq("processed", false)
      .eq("event_type", "new_announcement")
      .limit(20);

    if (queueError) {
      return new Response(JSON.stringify({ error: queueError.message }), { status: 500 });
    }
    if (!queueRows || queueRows.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    // Only approved members get emailed.
    const { data: approvedProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .eq("approval_status", "approved");

    if (profilesError) {
      return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 });
    }
    const approvedIds = new Set((approvedProfiles ?? []).map((p) => p.id));

    // auth.users (and its email addresses) is only reachable via the admin API.
    const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    if (usersError) {
      return new Response(JSON.stringify({ error: usersError.message }), { status: 500 });
    }

    const recipientEmails = (usersPage?.users ?? [])
      .filter((u) => approvedIds.has(u.id) && !!u.email)
      .map((u) => u.email as string);

    let processedCount = 0;

    for (const row of queueRows) {
      const payload = (row.payload ?? {}) as { body?: string; priority?: boolean };
      const bodyPreview = (payload.body ?? "").slice(0, 140);
      const subjectPrefix = payload.priority ? "🔴 PRIORITY — " : "";

      await Promise.all(
        recipientEmails.map((email) =>
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "TRoGKC Portal <notifications@yourdomain.org>",
              to: email,
              subject: `${subjectPrefix}New announcement on the Feed`,
              html: `<p>${bodyPreview}</p><p><a href="${APP_URL}/feed">Open the Feed</a></p>`,
            }),
          }).catch((err) => console.error("Failed to send to", email, err))
        )
      );

      await supabase.from("notify_queue").update({ processed: true }).eq("id", row.id);
      processedCount += 1;
    }

    return new Response(JSON.stringify({ processed: processedCount }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
