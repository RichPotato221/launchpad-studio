import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const ADMIN_EMAIL = "richardmashaba.19@gmail.com";

function encodeRaw(to: string, subject: string, body: string): string {
  const msg = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");
  // base64url
  return Buffer.from(msg, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const notifyPendingApproval = createServerFn({ method: "POST" })
  .inputValidator((d: { fullName: string; email: string; branch: string; department: string; role: string }) => d)
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAIL_API_KEY = process.env.GOOGLE_MAIL_API_KEY;
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
      console.error("Missing email gateway credentials");
      return { sent: false, reason: "missing_credentials" };
    }

    const subject = `New portal signup awaiting approval: ${data.fullName}`;
    const body = [
      "A new member has signed up on the TRoGKC Leadership Portal and is awaiting approval.",
      "",
      `Name:        ${data.fullName}`,
      `Email:       ${data.email}`,
      `Branch:      ${data.branch}`,
      `Department:  ${data.department}`,
      `Role:        ${data.role}`,
      "",
      "Review and approve at: https://trog-dashboard.lovable.app/admin",
    ].join("\n");

    const raw = encodeRaw(ADMIN_EMAIL, subject, body);

    const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`Gmail send failed [${res.status}]: ${txt}`);
      return { sent: false, reason: `gmail_${res.status}` };
    }
    return { sent: true };
  });
