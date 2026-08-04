import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

/** AI Hospitality Assistant (data-grounded). */
export const askHospitalityAssistant = createServerFn({ method: "POST" })
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
    const [events, guests, volunteers, inventory, menus, tasks, risks, training] = await Promise.all([
      sb.from("hos_events").select("*").order("starts_at", { ascending: false }).limit(120),
      sb.from("hos_guests").select("*").order("created_at", { ascending: false }).limit(300),
      sb.from("hos_volunteers").select("*").limit(200),
      sb.from("hos_inventory").select("*").limit(400),
      sb.from("hos_menus").select("*").order("service_date", { ascending: false }).limit(120),
      sb.from("hos_tasks").select("*").order("due_date").limit(300),
      sb.from("hos_risks").select("*").limit(200),
      sb.from("hos_training_records").select("*").limit(300),
    ]);

    const snapshot = {
      events: events.data ?? [],
      guests: guests.data ?? [],
      volunteers: volunteers.data ?? [],
      inventory: inventory.data ?? [],
      menus: menus.data ?? [],
      tasks: tasks.data ?? [],
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
              "You are the TRoGKC Hospitality Assistant for the hospitality ministry of a Christian church. " +
              "Ground every answer strictly in the JSON hospitality snapshot supplied. Help with: event readiness and " +
              "checklists, catering quantities and menu planning for the expected attendance, stock levels, reorder points " +
              "and expiring items, supplier and budget control, volunteer rostering and burnout, guest care and first-timer " +
              "follow-up, food hygiene and health-and-safety compliance, and department risks. Never invent guests, stock, " +
              "people or numbers that are not in the snapshot. Keep answers concise with short headings, bullets and clear " +
              "quantities, in a warm, servant-hearted tone.",
          },
          { role: "user", content: `Hospitality snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    return { answer: json.choices?.[0]?.message?.content ?? "No answer returned." };
  });
