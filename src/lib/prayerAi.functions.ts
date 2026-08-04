import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

/** AI Prayer & Intercession Assistant (data-grounded). */
export const askPrayerAssistant = createServerFn({ method: "POST" })
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
    const [requests, meetings, chains, slots, fasts, team, risks, training] = await Promise.all([
      sb.from("int_requests").select("*").order("created_at", { ascending: false }).limit(300),
      sb.from("int_meetings").select("*").order("starts_at", { ascending: false }).limit(120),
      sb.from("int_chains").select("*").limit(60),
      sb.from("int_chain_slots").select("*").limit(600),
      sb.from("int_fasts").select("*").limit(60),
      sb.from("int_team_members").select("*").limit(200),
      sb.from("int_risks").select("*").limit(200),
      sb.from("int_training_records").select("*").limit(300),
    ]);

    // Confidential detail never leaves the department — strip narrative text from protected requests.
    const safeRequests = (requests.data ?? []).map((r: any) =>
      r.confidential || r.leadership_only
        ? { ...r, description: "[confidential]", requester_name: null, phone: null, email: null }
        : r,
    );

    const snapshot = {
      requests: safeRequests,
      meetings: meetings.data ?? [],
      chains: chains.data ?? [],
      chain_slots: slots.data ?? [],
      fasts: fasts.data ?? [],
      team: team.data ?? [],
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
              "You are the TRoGKC Prayer & Intercession Assistant for the intercession department of a Christian church. " +
              "Ground every answer strictly in the JSON prayer snapshot supplied. Help with: triaging and prioritising prayer " +
              "requests, spotting overdue or neglected requests, designing prayer chains and watch rotas that close coverage " +
              "gaps, suggesting scripture-based prayer points and declarations, planning fasts and prayer nights, summarising " +
              "answered prayers and testimonies, and identifying intercessor burnout, training gaps and department risks. " +
              "Suggested scriptures may come from the Bible, but never invent people, requests, numbers or events that are not " +
              "in the snapshot. Treat anything marked confidential as protected — never reveal it. Reply with short headings " +
              "and bullets, in a pastoral, faith-filled but practical tone.",
          },
          { role: "user", content: `Prayer snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    return { answer: json.choices?.[0]?.message?.content ?? "No answer returned." };
  });
