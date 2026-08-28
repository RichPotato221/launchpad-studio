/**
 * Central notification service.
 *
 *   Action → createNotification() → notification_log (queue) → worker → Gmail
 *
 * Every feature in the portal goes through this one pipeline: it resolves the
 * audience, honours per-member preferences, dedupes with an idempotency key,
 * records every attempt, and retries failures.
 */
import { appUrl, ORGANISATION_NAME } from "@/lib/appConfig";
import { sendMail } from "./mailer.server";
import { renderHtml, renderText, type EmailBody } from "./templates.server";
import {
  isCritical,
  preferenceKeyFor,
  type NotificationAudience,
  type NotificationRequest,
  type NotificationType,
} from "./types";

const MAX_RETRIES = 3;
const ORGANIZER_EMAIL = "richardmashaba.19@gmail.com";

type Admin = Awaited<ReturnType<typeof getAdmin>>;

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/* ───────────────────────── recipients ───────────────────────── */

interface Recipient {
  id: string | null;
  email: string;
  name?: string | null;
}

async function resolveRecipients(admin: Admin, audience: NotificationAudience = {}): Promise<Recipient[]> {
  const out = new Map<string, Recipient>();

  if (audience.emails?.length) {
    for (const email of audience.emails) {
      if (email?.includes("@")) out.set(email.toLowerCase(), { id: null, email });
    }
  }

  // Role-based recipients (e.g. "whoever holds the chairperson office"), so no
  // owner/admin address is ever hardcoded anywhere in the portal.
  let roleIds: string[] = [];
  if (audience.roles?.length) {
    let rq = admin.from("user_roles").select("user_id").in("role", audience.roles);
    if (audience.roleDepartmentSlug) rq = rq.eq("department_slug", audience.roleDepartmentSlug);
    const { data: rr } = await rq;
    roleIds = Array.from(new Set(((rr ?? []) as any[]).map((r) => r.user_id).filter(Boolean)));
    if (roleIds.length) {
      const { data: rp } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("approval_status", "approved")
        .in("id", roleIds);
      for (const p of (rp ?? []) as any[]) {
        if (typeof p.email === "string" && p.email.includes("@")) {
          out.set(p.email.toLowerCase(), { id: p.id, email: p.email, name: p.full_name });
        }
      }
    }
  }

  // Explicit people (private messages, approval chains) win: nobody else is emailed.
  const explicit =
    !!audience.userIds?.length || !!audience.emails?.length || !!audience.roles?.length;

  if (audience.userIds?.length || !explicit) {
    // Department audiences include people serving in the department through a
    // role assignment, not only those whose primary department matches.
    let deptUserIds: string[] | null = null;
    if (!audience.userIds?.length && audience.departmentSlug) {
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("department_slug", audience.departmentSlug);
      deptUserIds = Array.from(new Set(((roleRows ?? []) as any[]).map((r) => r.user_id)));
    }

    const baseQuery = () => {
      let q = admin
        .from("profiles")
        .select("id, email, full_name, branch, primary_department, approval_status")
        .eq("approval_status", "approved");
      if (audience.branch) q = q.eq("branch", audience.branch);
      return q;
    };

    const queries: any[] = [];
    if (audience.userIds?.length) {
      queries.push(baseQuery().in("id", audience.userIds));
    } else if (audience.departmentSlug) {
      queries.push(baseQuery().eq("primary_department", audience.departmentSlug));
      if (deptUserIds?.length) queries.push(baseQuery().in("id", deptUserIds));
    } else {
      queries.push(baseQuery());
    }

    for (const q of queries) {
      const { data } = await q;
      for (const p of (data ?? []) as any[]) {
        if (typeof p.email === "string" && p.email.includes("@")) {
          out.set(p.email.toLowerCase(), { id: p.id, email: p.email, name: p.full_name });
        }
      }
    }
  }

  const excludeIds = new Set(audience.excludeUserIds ?? []);
  const excludeEmails = new Set((audience.excludeEmails ?? []).map((e) => e.toLowerCase()));
  return [...out.values()].filter(
    (r) => !(r.id && excludeIds.has(r.id)) && !excludeEmails.has(r.email.toLowerCase()),
  );
}


async function filterByPreferences(
  admin: Admin,
  recipients: Recipient[],
  type: NotificationType,
): Promise<Recipient[]> {
  if (isCritical(type)) return recipients;
  const ids = recipients.map((r) => r.id).filter(Boolean) as string[];
  if (!ids.length) return recipients;
  const key = preferenceKeyFor(type);
  const { data } = await admin
    .from("notification_preferences")
    .select(`user_id, channel, ${key}`)
    .in("user_id", ids);
  const prefs = new Map<string, any>((data ?? []).map((p: any) => [p.user_id, p]));
  return recipients.filter((r) => {
    if (!r.id) return true;
    const p = prefs.get(r.id);
    if (!p) return key !== "feed"; // feed digests are opt-in, everything else opt-out
    if (p.channel === "dashboard") return false;
    return p[key] !== false;
  });
}

/* ───────────────────────── tokens ───────────────────────── */

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function issueActionToken(
  admin: Admin,
  entityId: string,
  recipient: Recipient,
  entityType = "event",
): Promise<string | null> {
  const token = randomToken();
  const { error } = await admin.from("notification_action_tokens").insert({
    token,
    entity_type: entityType,
    entity_id: entityId,
    user_id: recipient.id,
    recipient_email: recipient.email,
  });
  if (error) {
    console.error("notification token insert failed:", error.message);
    return null;
  }
  return token;
}

/* ───────────────────────── iCalendar ───────────────────────── */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function icsStamp(dateStr: string, timeStr?: string | null): string {
  const iso = timeStr ? `${dateStr}T${timeStr.slice(0, 5)}:00+02:00` : `${dateStr}T00:00:00+02:00`;
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function addHour(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return `${pad((h + 1) % 24)}:${pad(m)}`;
}

function icsEsc(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(
  ev: any,
  attendee: string,
  action: "create" | "update" | "cancel",
): { content: string; method: "REQUEST" | "CANCEL" } {
  const method = action === "cancel" ? "CANCEL" : "REQUEST";
  const sequence = action === "create" ? 0 : action === "update" ? 1 : 2;
  const start = icsStamp(ev.event_date, ev.start_time);
  const end = ev.end_time
    ? icsStamp(ev.event_date, ev.end_time)
    : icsStamp(ev.event_date, ev.start_time ? addHour(ev.start_time) : "23:59");
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const content = [
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
    `SUMMARY:${icsEsc(ev.title ?? "TRoGKC Event")}`,
    `DESCRIPTION:${icsEsc([ev.description ?? "", `View in the portal: ${appUrl("/events")}`].filter(Boolean).join("\n\n"))}`,
    ev.location ? `LOCATION:${icsEsc(ev.location)}` : "",
    `ORGANIZER;CN=${ORGANISATION_NAME}:mailto:${ORGANIZER_EMAIL}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee}`,
    `STATUS:${action === "cancel" ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return { content, method };
}

/* ───────────────────────── composition ───────────────────────── */

function when(ev: any): string {
  const time = ev?.start_time ? ` at ${String(ev.start_time).slice(0, 5)}` : "";
  return `${ev?.event_date ?? ""}${time}`;
}

interface Composed {
  subject: string;
  body: EmailBody;
  icsAction?: "create" | "update" | "cancel";
  needsRsvp?: boolean;
}

function compose(type: NotificationType, payload: any): Composed {
  const ev = payload.event ?? {};
  const cancelled = type.endsWith("_CANCELLED");
  const updated = type.endsWith("_UPDATED");
  const isMeeting = type.startsWith("MEETING_");
  const noun = isMeeting ? "meeting" : "event";

  switch (type) {
    case "EVENT_CREATED":
    case "EVENT_INVITATION":
    case "EVENT_UPDATED":
    case "EVENT_CANCELLED":
    case "EVENT_REMINDER":
    case "MEETING_CREATED":
    case "MEETING_INVITATION":
    case "MEETING_UPDATED":
    case "MEETING_CANCELLED":
    case "MEETING_REMINDER": {
      const prefix = cancelled ? "Cancelled: " : updated ? "Updated: " : type.endsWith("_REMINDER") ? "Reminder: " : "Invitation: ";
      return {
        subject: `${prefix}${ev.title ?? "TRoGKC gathering"} — ${when(ev)}`,
        icsAction: cancelled ? "cancel" : updated ? "update" : "create",
        needsRsvp: !cancelled,
        body: {
          heading: cancelled
            ? `${isMeeting ? "Meeting" : "Event"} cancelled`
            : updated
              ? `${isMeeting ? "Meeting" : "Event"} updated`
              : `You are invited: ${ev.title ?? "TRoGKC gathering"}`,
          intro: cancelled
            ? `The following ${noun} has been cancelled and removed from your calendar.`
            : updated
              ? `The details of this ${noun} have changed. Your calendar entry has been updated.`
              : `You are invited to the following ${noun}. Please let us know whether you can attend.`,
          details: [
            [isMeeting ? "Meeting" : "Event", ev.title],
            ["Date", when(ev)],
            ["Location", ev.location],
            ["Type", ev.event_type],
            ["Branch", ev.branch],
          ],
          paragraphs: ev.description ? [ev.description] : [],
          footerNote: cancelled
            ? undefined
            : "Accepting adds this to your Google, Outlook or Apple calendar and records your response in the portal.",
        },
      };
    }

    case "ANNOUNCEMENT_CREATED":
    case "ANNOUNCEMENT_UPDATED":
    case "ANNOUNCEMENT_PUBLISHED": {
      const priority = !!payload.priority;
      return {
        subject: `${priority ? "[Priority] " : ""}New announcement — ${ORGANISATION_NAME}`,
        body: {
          heading: priority ? "Priority announcement" : "New announcement",
          intro: payload.author_name ? `Posted by ${payload.author_name}.` : undefined,
          paragraphs: [String(payload.body ?? "A new announcement was posted on the portal.")],
          buttons: [{ label: "Open the feed", url: appUrl("/feed") }],
        },
      };
    }

    case "MESSAGE_RECEIVED":
    case "MESSAGE_REPLY":
    case "MESSAGE_MENTION": {
      const from = payload.sender_name ?? "A member";
      return {
        subject: `New message from ${from} — ${ORGANISATION_NAME}`,
        body: {
          heading: `New message from ${from}`,
          paragraphs: [String(payload.preview ?? "You have a new private message in the portal.")],
          buttons: [
            {
              label: "Read and reply",
              url: appUrl(payload.sender_id ? `/messages/${payload.sender_id}` : "/messages"),
            },
          ],
        },
      };
    }

    case "FEED_POST_CREATED":
    case "FEED_POST_UPDATED":
    case "FEED_COMMENT":
    case "FEED_MENTION": {
      return {
        subject: `${payload.author_name ?? "A member"} posted on the feed — ${ORGANISATION_NAME}`,
        body: {
          heading: type === "FEED_COMMENT" ? "New comment on the feed" : "New feed post",
          paragraphs: [String(payload.body ?? "There is new activity on the portal feed.")],
          buttons: [{ label: "Open the feed", url: appUrl("/feed") }],
        },
      };
    }

    case "LEADERSHIP_NOTICE":
    case "SYSTEM_NOTIFICATION":
    default: {
      return {
        subject: String(payload.subject ?? `Notice from the ${ORGANISATION_NAME}`),
        body: {
          heading: String(payload.heading ?? "Portal notice"),
          intro: payload.intro ? String(payload.intro) : undefined,
          paragraphs: payload.body ? [String(payload.body)] : [],
          details: payload.details as any,
          buttons: [{ label: "Open the portal", url: appUrl(String(payload.path ?? "/home")) }],
        },
      };
    }
  }
}

/* ───────────────────────── queueing ───────────────────────── */

export interface EnqueueResult {
  queued: number;
  skipped: number;
}

export async function enqueueNotification(req: NotificationRequest): Promise<EnqueueResult> {
  const admin = await getAdmin();
  const recipients = await filterByPreferences(
    admin,
    await resolveRecipients(admin, req.audience),
    req.type,
  );
  if (!recipients.length) return { queued: 0, skipped: 0 };

  // Enrich event-backed notifications so the worker can render without extra reads.
  let payload: Record<string, unknown> = { ...(req.metadata ?? {}) };
  if (req.entityId && (req.entityType === "event" || req.entityType === "meeting")) {
    const { data: ev } = await admin.from("events").select("*").eq("id", req.entityId).maybeSingle();
    if (ev) payload = { ...payload, event: ev };
  }

  const version = String(req.entityVersion ?? "1");
  const rows = recipients.map((r) => ({
    notification_type: req.type,
    entity_type: req.entityType ?? null,
    entity_id: req.entityId ?? null,
    recipient_id: r.id,
    recipient_email: r.email,
    status: "PENDING",
    idempotency_key: `${req.type}:${req.entityId ?? "none"}:${version}:${r.email.toLowerCase()}`,
    payload: { ...payload, recipient_name: r.name ?? null },
  }));

  const { data, error } = await admin
    .from("notification_log")
    .upsert(rows, { onConflict: "idempotency_key", ignoreDuplicates: true })
    .select("id");
  if (error) {
    console.error("notification enqueue failed:", error.message);
    return { queued: 0, skipped: rows.length };
  }
  const queued = data?.length ?? 0;
  return { queued, skipped: rows.length - queued };
}

/* ───────────────────────── worker ───────────────────────── */

export interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}

export async function processPendingNotifications(limit = 60): Promise<ProcessResult> {
  const admin = await getAdmin();
  const { data: queue, error } = await admin
    .from("notification_log")
    .select("*")
    .in("status", ["PENDING", "FAILED"])
    .lt("retry_count", MAX_RETRIES)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return { processed: 0, sent: 0, failed: 0, errors: [error.message] };
  if (!queue?.length) return { processed: 0, sent: 0, failed: 0, errors: [] };

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of queue as any[]) {
    await admin.from("notification_log").update({ status: "PROCESSING" }).eq("id", row.id);

    const type = row.notification_type as NotificationType;
    const payload = (row.payload ?? {}) as any;
    const composed = compose(type, payload);
    const body: EmailBody = { ...composed.body };
    let ics: { content: string; method: "REQUEST" | "CANCEL" } | undefined;

    if (composed.icsAction && payload.event?.id) {
      ics = buildIcs(payload.event, row.recipient_email, composed.icsAction);
      const buttons = [...(body.buttons ?? [])];
      if (composed.needsRsvp) {
        const token = await issueActionToken(
          admin,
          payload.event.id,
          { id: row.recipient_id, email: row.recipient_email },
          row.entity_type ?? "event",
        );
        if (token) {
          buttons.unshift(
            { label: "Accept", url: appUrl(`/api/public/email-actions/respond?token=${token}&action=accept`) },
            {
              label: "Decline",
              url: appUrl(`/api/public/email-actions/respond?token=${token}&action=decline`),
              variant: "danger",
            },
          );
        }
      }
      buttons.push({ label: "View in the portal", url: appUrl("/events"), variant: "secondary" });
      body.buttons = buttons;
    }

    const result = await sendMail({
      to: row.recipient_email,
      subject: composed.subject,
      text: renderText(body),
      html: renderHtml(body),
      ...(ics ? { ics: { ...ics, filename: "invite.ics" } } : {}),
    });

    if (result.ok) {
      sent++;
      await admin
        .from("notification_log")
        .update({ status: "SENT", sent_at: new Date().toISOString(), subject: composed.subject, error_message: null })
        .eq("id", row.id);
    } else {
      failed++;
      const retry = (row.retry_count ?? 0) + 1;
      errors.push(`${row.recipient_email}: ${result.error}`);
      await admin
        .from("notification_log")
        .update({
          status: "FAILED",
          retry_count: retry,
          error_message: result.error ?? "unknown",
          failed_at: new Date().toISOString(),
          subject: composed.subject,
        })
        .eq("id", row.id);
    }
  }

  if (errors.length) console.error("notification worker errors:", errors.slice(0, 5));
  return { processed: queue.length, sent, failed, errors: errors.slice(0, 10) };
}

/**
 * Queue a notification and immediately attempt delivery, so members are
 * notified in seconds. Anything that fails stays queued for the worker.
 */
export async function dispatchNotification(req: NotificationRequest): Promise<EnqueueResult & ProcessResult> {
  const queued = await enqueueNotification(req);
  const processed = queued.queued
    ? await processPendingNotifications(Math.max(queued.queued, 20))
    : { processed: 0, sent: 0, failed: 0, errors: [] };
  return { ...queued, ...processed };
}
