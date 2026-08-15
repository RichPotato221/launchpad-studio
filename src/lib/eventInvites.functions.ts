import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const ORGANIZER_EMAIL = "richardmashaba.19@gmail.com";
const APP_URL = "https://trog-dashboard.lovable.app";

type Action = "create" | "update" | "cancel";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Format a Johannesburg local date/time as a UTC iCalendar stamp. */
function icsStamp(dateStr: string, timeStr?: string | null): string {
  const iso = timeStr
    ? `${dateStr}T${timeStr.slice(0, 5)}:00+02:00`
    : `${dateStr}T00:00:00+02:00`;
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function esc(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcs(ev: any, attendee: string, action: Action, sequence: number) {
  const method = action === "cancel" ? "CANCEL" : "REQUEST";
  const start = icsStamp(ev.event_date, ev.start_time);
  const end = ev.end_time
    ? icsStamp(ev.event_date, ev.end_time)
    : icsStamp(ev.event_date, ev.start_time ? addHour(ev.start_time) : "23:59");
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//TRoGKC//Leadership Portal//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${ev.id}@trogkc.org`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${esc(ev.title ?? "TRoGKC Event")}`,
    `DESCRIPTION:${esc([ev.description ?? "", `View in portal: ${APP_URL}/events`].filter(Boolean).join("\n\n"))}`,
    ev.location ? `LOCATION:${esc(ev.location)}` : "",
    `ORGANIZER;CN=TRoGKC Leadership Portal:mailto:${ORGANIZER_EMAIL}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee}`,
    `STATUS:${action === "cancel" ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

function addHour(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return `${pad((h + 1) % 24)}:${pad(m)}`;
}

function b64url(s: string) {
  return Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRaw(to: string, subject: string, text: string, ics: string, method: string) {
  const boundary = "trog_invite_boundary_1";
  const msg = [
    `From: TRoGKC Leadership Portal <${ORGANIZER_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text,
    "",
    `--${boundary}`,
    `Content-Type: text/calendar; charset="UTF-8"; method=${method}`,
    "Content-Transfer-Encoding: 7bit",
    "",
    ics,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
  return b64url(msg);
}

/**
 * Emails a real calendar invite (.ics) to every approved member so the event
 * lands on their Google / Outlook / Apple calendar with one tap.
 */
export const sendEventInvites = createServerFn({ method: "POST" })
  .inputValidator((d: { eventId: string; action?: Action }) => d)
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env['LOVABLE_API_KEY'];
    const GOOGLE_MAIL_API_KEY = process.env['GOOGLE_MAIL_API_KEY'];
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
      console.error("Calendar invite: missing Gmail gateway credentials");
      return { sent: 0, reason: "missing_credentials" };
    }

    const action: Action = data.action ?? "create";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ev, error: evErr } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr || !ev) {
      console.error("Calendar invite: event not found", evErr?.message);
      return { sent: 0, reason: "event_not_found" };
    }

    let q = supabaseAdmin.from("profiles").select("email, branch").eq("approval_status", "approved");
    if (ev.branch) q = q.eq("branch", ev.branch);
    const { data: recipients } = await q;
    const emails = Array.from(
      new Set((recipients ?? []).map((r: any) => r.email).filter((e: any) => typeof e === "string" && e.includes("@"))),
    );

    const sequence = action === "create" ? 0 : action === "update" ? 1 : 2;
    const method = action === "cancel" ? "CANCEL" : "REQUEST";
    const prefix = action === "cancel" ? "Cancelled: " : action === "update" ? "Updated: " : "Invitation: ";
    const subject = `${prefix}${ev.title} — ${ev.event_date}${ev.start_time ? ` ${ev.start_time.slice(0, 5)}` : ""}`;
    const text = [
      action === "cancel"
        ? "The following TRoGKC event has been cancelled."
        : "You are invited to the following TRoGKC event. Accept to add it to your calendar.",
      "",
      `Event:    ${ev.title}`,
      `Date:     ${ev.event_date}${ev.start_time ? ` at ${ev.start_time.slice(0, 5)}` : ""}`,
      ev.location ? `Location: ${ev.location}` : "",
      ev.description ? `\n${ev.description}` : "",
      "",
      `View in the portal: ${APP_URL}/events`,
    ]
      .filter(Boolean)
      .join("\n");

    let sent = 0;
    const errors: string[] = [];
    for (const to of emails) {
      try {
        const ics = buildIcs(ev, to, action, sequence);
        const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
          },
          body: JSON.stringify({ raw: buildRaw(to, subject, text, ics, method) }),
        });
        if (!res.ok) {
          errors.push(`${to}: ${res.status} ${await res.text()}`);
        } else sent++;
      } catch (err: any) {
        errors.push(`${to}: ${err?.message ?? "unknown"}`);
      }
    }

    if (errors.length) console.error("Calendar invite errors:", errors.slice(0, 5));
    return { sent, total: emails.length, errors: errors.slice(0, 5) };
  });
