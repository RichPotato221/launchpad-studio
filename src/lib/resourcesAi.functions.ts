import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

/** AI Resource Assistant (data-grounded) — Office of the Resource Administrator. */
export const askResourceAssistant = createServerFn({ method: "POST" })
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
    const [assets, facilities, tickets, schedules, requests, checkouts, projects, inventory, risks, training, bookings, procurement] =
      await Promise.all([
        sb.from("assets").select("*").limit(600),
        sb.from("res_facilities").select("*").limit(200),
        sb.from("res_maintenance_tickets").select("*").order("created_at", { ascending: false }).limit(300),
        sb.from("res_maintenance_schedules").select("*").limit(200),
        sb.from("res_requests").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("res_asset_checkouts").select("*").order("checked_out_at", { ascending: false }).limit(300),
        sb.from("res_projects").select("*").limit(150),
        sb.from("res_inventory_items").select("*").limit(300),
        sb.from("res_risks").select("*").limit(200),
        sb.from("res_training_records").select("*").limit(300),
        sb.from("res_bookings").select("*").order("starts_at", { ascending: false }).limit(200),
        sb.from("purchase_requests").select("id, pr_number, title, department_slug, status, amount_estimated, needed_by").limit(150),
      ]);

    const snapshot = {
      today: new Date().toISOString().slice(0, 10),
      assets: assets.data ?? [],
      facilities: facilities.data ?? [],
      maintenance_tickets: tickets.data ?? [],
      maintenance_schedules: schedules.data ?? [],
      resource_requests: requests.data ?? [],
      checkouts: checkouts.data ?? [],
      development_projects: projects.data ?? [],
      inventory: inventory.data ?? [],
      risks: risks.data ?? [],
      training: training.data ?? [],
      bookings: bookings.data ?? [],
      procurement: procurement.data ?? [],
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
              "You are the TRoGKC Resource Assistant for the Office of the Resource Administrator — the department that hosts " +
              "every physical resource in the church. Ground every answer strictly in the JSON resource snapshot supplied. " +
              "Help with: asset replacement planning, warranty and insurance expiry, overdue and preventive maintenance, " +
              "equipment redistribution between branches and departments, utilisation and idle assets, facility readiness and " +
              "safety compliance, inventory reorder points, procurement triggers, booking conflicts, church development project " +
              "delivery, and resource risk. Give predictive insight and clear recommendations with figures where the data allows. " +
              "Never invent assets, people, facilities or numbers that are not in the snapshot. Keep answers concise with short " +
              "headings and bullets.",
          },
          { role: "user", content: `Resource snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    return { answer: json.choices?.[0]?.message?.content ?? "No answer returned." };
  });
