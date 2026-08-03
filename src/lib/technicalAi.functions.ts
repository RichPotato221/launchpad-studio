import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

/** AI Technical Operations Assistant (data-grounded). */
export const askTechnicalAssistant = createServerFn({ method: "POST" })
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
    const [productions, assets, maintenance, faults, inventory, team, streams, training, risks] = await Promise.all([
      sb.from("tech_productions").select("*").order("service_date", { ascending: false }).limit(60),
      sb.from("tech_assets").select("*").limit(400),
      sb.from("tech_maintenance").select("*").order("due_date").limit(300),
      sb.from("tech_faults").select("*").order("created_at", { ascending: false }).limit(200),
      sb.from("tech_inventory").select("*").limit(200),
      sb.from("tech_team_members").select("*").limit(200),
      sb.from("tech_streams").select("*").order("stream_date", { ascending: false }).limit(120),
      sb.from("tech_training_records").select("*").limit(300),
      sb.from("tech_risks").select("*").limit(200),
    ]);

    const snapshot = {
      productions: productions.data ?? [],
      assets: assets.data ?? [],
      maintenance: maintenance.data ?? [],
      open_faults: (faults.data ?? []).filter((f: any) => !["resolved", "closed"].includes(f.status)),
      inventory: inventory.data ?? [],
      team: team.data ?? [],
      streams: streams.data ?? [],
      training: training.data ?? [],
      risks: risks.data ?? [],
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
              "You are the TRoGKC Technical Operations Assistant for the sound & technical team of a Christian church. " +
              "Ground every answer strictly in the JSON technical snapshot supplied. Help with: service technical readiness, " +
              "sound and livestream troubleshooting, preventative maintenance schedules, equipment lifecycle and replacement " +
              "planning, spares and consumables, crew rostering and skills gaps, training plans, and technical risk mitigation. " +
              "Never invent equipment, people or numbers that are not in the snapshot. Keep answers concise with short headings " +
              "and bullets, and give practical step-by-step checks where a fault is involved.",
          },
          { role: "user", content: `Technical snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    return { answer: json.choices?.[0]?.message?.content ?? "No answer returned." };
  });
