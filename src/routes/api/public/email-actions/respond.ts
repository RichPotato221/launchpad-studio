import { createFileRoute } from "@tanstack/react-router";
import { APP_BASE_URL, ORGANISATION_NAME } from "@/lib/appConfig";

/**
 * Accept / Decline buttons in invitation emails.
 *
 * The link carries a single-use, expiring token. The server validates it,
 * writes the real response to the database (event_responses + event_rosters),
 * then renders a clean confirmation page.
 */

function page(title: string, message: string, tone: "ok" | "warn" | "error", detail?: string) {
  const colour = tone === "ok" ? "#0f4c4c" : tone === "warn" ? "#b8873b" : "#9b2c2c";
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — ${ORGANISATION_NAME}</title></head>
<body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#f4f1ec;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div style="max-width:480px;width:92%;background:#fff;border:1px solid #e2ddd4;border-radius:16px;padding:40px 32px;text-align:center;">
  <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b8873b;">${ORGANISATION_NAME}</div>
  <h1 style="font-size:24px;color:${colour};margin:14px 0 10px;">${title}</h1>
  <p style="font-size:15px;line-height:1.6;color:#4a5568;margin:0 0 8px;">${message}</p>
  ${detail ? `<p style="font-size:13px;color:#718096;margin:0 0 20px;">${detail}</p>` : ""}
  <a href="${APP_BASE_URL}/events" style="display:inline-block;margin-top:18px;padding:12px 24px;background:#0f4c4c;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">Open the portal</a>
</div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" } },
  );
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const action = (url.searchParams.get("action") ?? "").toLowerCase();

  if (!token || !["accept", "decline"].includes(action)) {
    return page("Invalid link", "This response link is not valid. Please respond from the portal instead.", "error");
  }

  const { getAdmin } = await import("@/lib/notifications/service.server");
  const admin = await getAdmin();

  const { data: row } = await admin
    .from("notification_action_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!row) {
    return page("Link not recognised", "This response link is no longer valid.", "error");
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return page("Link expired", "This invitation link has expired. You can still respond in the portal.", "warn");
  }

  const response = action === "accept" ? "accepted" : "declined";

  if (row.used_at && row.used_action === response) {
    return page(
      response === "accepted" ? "Already accepted" : "Already declined",
      "We already recorded this response — no further action is needed.",
      "warn",
    );
  }

  const { data: ev } = await admin
    .from("events")
    .select("id, title, event_date, start_time, location")
    .eq("id", row.entity_id)
    .maybeSingle();

  if (!ev) {
    return page("No longer available", "This event has been removed from the calendar.", "warn");
  }

  const { error: respErr } = await admin.from("event_responses").upsert(
    {
      event_id: row.entity_id,
      user_id: row.user_id,
      recipient_email: row.recipient_email,
      response,
      responded_at: new Date().toISOString(),
      source: "email",
    },
    { onConflict: "event_id,recipient_email" },
  );

  if (respErr) {
    console.error("event response write failed:", respErr.message);
    return page("Something went wrong", "We could not record your response. Please try again from the portal.", "error");
  }

  // Keep the roster in step when the member is on it.
  if (row.user_id) {
    await admin
      .from("event_rosters")
      .update({ status: response === "accepted" ? "confirmed" : "declined" })
      .eq("event_id", row.entity_id)
      .eq("user_id", row.user_id);
  }

  await admin
    .from("notification_action_tokens")
    .update({ used_at: new Date().toISOString(), used_action: response })
    .eq("id", row.id);

  const whenText = `${ev.event_date}${ev.start_time ? ` at ${String(ev.start_time).slice(0, 5)}` : ""}`;
  return response === "accepted"
    ? page(
        "Invitation accepted",
        `Thank you — we have you down for “${ev.title}”.`,
        "ok",
        `${whenText}${ev.location ? ` · ${ev.location}` : ""}`,
      )
    : page(
        "Invitation declined",
        `Thank you for letting us know you cannot attend “${ev.title}”.`,
        "ok",
        whenText,
      );
}

export const Route = createFileRoute("/api/public/email-actions/respond")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
