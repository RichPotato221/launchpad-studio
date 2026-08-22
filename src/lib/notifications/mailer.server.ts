/**
 * UTF-8 safe email delivery through the Gmail connector gateway.
 *
 * Encoding rules enforced here (these fixed the "LEADER Ã¢â‚¬â€¦" mojibake):
 *  - Subject headers are RFC 2047 encoded  =?UTF-8?B?...?=
 *  - Every body part declares charset="UTF-8" AND uses base64 transfer
 *    encoding, so 8-bit characters (– — ’ “ ” · é) survive every hop.
 */
const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

export const SENDER_NAME = "TRoGKC Leadership Portal";
export const SENDER_EMAIL = "richardmashaba.19@gmail.com";

function b64(input: string): string {
  return Buffer.from(input, "utf8").toString("base64");
}

/** base64 wrapped at 76 characters, as MIME requires. */
function b64Part(input: string): string {
  return (b64(input).match(/.{1,76}/g) ?? []).join("\r\n");
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** RFC 2047 encoded-word so non-ASCII subjects render correctly everywhere. */
export function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${b64(value)}?=`;
}

export interface MailParts {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Raw iCalendar payload, attached as text/calendar + .ics file. */
  ics?: { content: string; method: "REQUEST" | "CANCEL"; filename?: string };
  headers?: Record<string, string>;
}

export function buildRawMessage(parts: MailParts): string {
  const mixed = `mixed_${Math.random().toString(36).slice(2)}`;
  const alt = `alt_${Math.random().toString(36).slice(2)}`;

  const lines: string[] = [
    `From: ${encodeHeader(SENDER_NAME)} <${SENDER_EMAIL}>`,
    `To: ${parts.to}`,
    `Subject: ${encodeHeader(parts.subject)}`,
    "MIME-Version: 1.0",
  ];
  for (const [k, v] of Object.entries(parts.headers ?? {})) lines.push(`${k}: ${v}`);

  lines.push(`Content-Type: multipart/mixed; boundary="${mixed}"`, "");

  // ── alternative (plain + html) ──
  lines.push(
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    "",
    `--${alt}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64Part(parts.text),
    "",
  );
  if (parts.html) {
    lines.push(
      `--${alt}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      b64Part(parts.html),
      "",
    );
  }
  lines.push(`--${alt}--`, "");

  // ── calendar invite ──
  if (parts.ics) {
    lines.push(
      `--${mixed}`,
      `Content-Type: text/calendar; charset="UTF-8"; method=${parts.ics.method}`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${parts.ics.filename ?? "invite.ics"}"`,
      "",
      b64Part(parts.ics.content),
      "",
    );
  }

  lines.push(`--${mixed}--`, "");
  return b64url(lines.join("\r\n"));
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Sends one message. Never throws — the caller records the outcome. */
export async function sendMail(parts: MailParts): Promise<SendResult> {
  const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
  const GOOGLE_MAIL_API_KEY = process.env["GOOGLE_MAIL_API_KEY"];
  if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
    return { ok: false, error: "missing_email_credentials" };
  }
  try {
    const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      },
      body: JSON.stringify({ raw: buildRawMessage(parts) }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `gmail_${res.status}: ${body.slice(0, 400)}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error)?.message ?? "unknown_send_error" };
  }
}
