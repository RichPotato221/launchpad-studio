import { APP_BASE_URL, appUrl, ORGANISATION_NAME } from "@/lib/appConfig";

const TEAL = "#0f4c4c";
const GOLD = "#b8873b";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface EmailButton {
  label: string;
  url: string;
  variant?: "primary" | "secondary" | "danger";
}

export interface EmailBody {
  heading: string;
  intro?: string;
  /** Label / value rows rendered as a details table. */
  details?: Array<[string, string | null | undefined]>;
  paragraphs?: string[];
  buttons?: EmailButton[];
  footerNote?: string;
}

export function renderHtml(body: EmailBody): string {
  const colour = (v: EmailButton["variant"]) =>
    v === "danger" ? "#9b2c2c" : v === "secondary" ? "#4a5568" : TEAL;

  const details = (body.details ?? []).filter(([, v]) => v != null && String(v).trim() !== "");

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(body.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Helvetica,Arial,sans-serif;color:#1a202c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2ddd4;">
  <tr><td style="background:${TEAL};padding:22px 28px;">
    <div style="color:${GOLD};font-size:11px;letter-spacing:3px;text-transform:uppercase;">${esc(ORGANISATION_NAME)}</div>
    <div style="color:#ffffff;font-size:21px;font-weight:bold;margin-top:6px;">${esc(body.heading)}</div>
  </td></tr>
  <tr><td style="padding:26px 28px;">
    ${body.intro ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${esc(body.intro)}</p>` : ""}
    ${
      details.length
        ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 18px;">
        ${details
          .map(
            ([k, v]) =>
              `<tr><td style="padding:7px 0;font-size:13px;color:#718096;width:130px;vertical-align:top;">${esc(k)}</td>
               <td style="padding:7px 0;font-size:14px;color:#1a202c;">${esc(v)}</td></tr>`,
          )
          .join("")}
      </table>`
        : ""
    }
    ${(body.paragraphs ?? [])
      .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;white-space:pre-wrap;">${esc(p)}</p>`)
      .join("")}
    ${
      (body.buttons ?? []).length
        ? `<div style="margin:22px 0 8px;">${(body.buttons ?? [])
            .map(
              (b) =>
                `<a href="${esc(b.url)}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 22px;background:${colour(
                  b.variant,
                )};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">${esc(b.label)}</a>`,
            )
            .join("")}</div>`
        : ""
    }
    ${body.footerNote ? `<p style="margin:18px 0 0;font-size:12px;color:#718096;line-height:1.5;">${esc(body.footerNote)}</p>` : ""}
  </td></tr>
  <tr><td style="background:#faf8f5;padding:16px 28px;border-top:1px solid #ece7de;">
    <p style="margin:0;font-size:12px;color:#718096;">
      Sent by the ${esc(ORGANISATION_NAME)} · <a href="${APP_BASE_URL}" style="color:${TEAL};">${esc(APP_BASE_URL.replace(/^https:\/\//, ""))}</a><br />
      Manage what you receive in <a href="${appUrl("/Profile")}" style="color:${TEAL};">your notification preferences</a>.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function renderText(body: EmailBody): string {
  const details = (body.details ?? []).filter(([, v]) => v != null && String(v).trim() !== "");
  return [
    body.heading,
    "".padEnd(Math.min(body.heading.length, 60), "="),
    "",
    body.intro ?? "",
    "",
    ...details.map(([k, v]) => `${k.padEnd(14)}${v}`),
    "",
    ...(body.paragraphs ?? []),
    "",
    ...(body.buttons ?? []).map((b) => `${b.label}: ${b.url}`),
    "",
    body.footerNote ?? "",
    "",
    `${ORGANISATION_NAME} — ${APP_BASE_URL}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}
