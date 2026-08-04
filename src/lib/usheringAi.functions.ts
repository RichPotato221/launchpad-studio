import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

/** AI Ushering Assistant (data-grounded). */
export const askUsheringAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    return { question: input.question.trim().slice(0, 800) };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");

    const sb = supabase as any;
    const [services, volunteers, roster, visitors, seating, attendance, incidents, care, risks, training] =
      await Promise.all([
        sb.from("ush_services").select("*").order("service_date", { ascending: false }).limit(80),
        sb.from("ush_volunteers").select("*").limit(300),
        sb.from("ush_roster").select("*").order("created_at", { ascending: false }).limit(400),
        sb.from("ush_visitors").select("*").order("created_at", { ascending: false }).limit(300),
        sb.from("ush_seating").select("*").limit(200),
        sb.from("ush_attendance").select("*").order("service_date", { ascending: false }).limit(120),
        sb.from("ush_incidents").select("*").order("occurred_at", { ascending: false }).limit(200),
        sb.from("ush_care").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("ush_risks").select("*").limit(200),
        sb.from("ush_training_records").select("*").limit(300),
      ]);

    const snapshot = {
      services: services.data ?? [],
      volunteers: volunteers.data ?? [],
      roster: roster.data ?? [],
      visitors: visitors.data ?? [],
      seating: seating.data ?? [],
      attendance: attendance.data ?? [],
      incidents: incidents.data ?? [],
      care: care.data ?? [],
      risks: risks.data ?? [],
      training: training.data ?? [],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        messages: [
          {
            role: "system",
            content:
              "You are the TRoGKC Ushering Assistant for the ushering, protocol and congregational care ministry of a " +
              "Christian church. Ground every answer strictly in the JSON ushering snapshot supplied. Help with: service " +
              "readiness checklists, roster coverage gaps and fair rotation, volunteer availability, training and " +
              "certification expiry, seating and crowd flow, first-timer follow-up, congregational care for the elderly, " +
              "children and the unwell, incident trends and safety improvements, attendance patterns, and department " +
              "risks. Never invent people, numbers, incidents or visitors that are not in the snapshot. Answer concisely " +
              "with short headings, bullets and clear numbers, in a warm, servant-hearted tone.",
          },
          { role: "user", content: `Ushering snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    return { answer: json.choices?.[0]?.message?.content ?? "No answer returned." };
  });
