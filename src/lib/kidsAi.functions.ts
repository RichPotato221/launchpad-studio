import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

/** MODULE 13 — AI Children's Ministry Assistant (data-grounded). */
export const askKidsAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    return { question: input.question.trim().slice(0, 800) };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");

    const [children, checkins, rooms, volunteers, incidents, milestones, lessons] = await Promise.all([
      supabase.from("children").select("age_group, status, branch, allergies, medical_conditions, special_needs").limit(1000),
      supabase.from("kids_checkins").select("service_date, is_first_time, checked_out_at, branch").order("service_date", { ascending: false }).limit(1000),
      supabase.from("kids_classrooms").select("name, capacity, active, age_min, age_max"),
      supabase.from("kids_volunteers").select("full_name, status, role_title, background_check_status, background_check_expiry, safeguarding_expiry, services_attended, services_missed"),
      supabase.from("kids_incidents").select("incident_type, severity, status, occurred_at").order("occurred_at", { ascending: false }).limit(200),
      supabase.from("kids_milestones").select("milestone_type, achieved_on").limit(1000),
      supabase.from("kids_lessons").select("title, theme, age_group, status, scheduled_date").limit(200),
    ]);

    const snapshot = {
      children_total: children.data?.length ?? 0,
      children_by_age: (children.data ?? []).reduce((a: Record<string, number>, c: any) => {
        const k = c.age_group ?? "unassigned"; a[k] = (a[k] ?? 0) + 1; return a;
      }, {}),
      care_alerts: (children.data ?? []).filter((c: any) => c.allergies || c.medical_conditions || c.special_needs).length,
      recent_checkins: checkins.data?.length ?? 0,
      first_timers: (checkins.data ?? []).filter((c: any) => c.is_first_time).length,
      missing_checkouts: (checkins.data ?? []).filter((c: any) => !c.checked_out_at).length,
      classrooms: rooms.data ?? [],
      volunteers: volunteers.data ?? [],
      open_incidents: (incidents.data ?? []).filter((i: any) => !["resolved", "closed"].includes(i.status)),
      incident_mix: (incidents.data ?? []).reduce((a: Record<string, number>, i: any) => { a[i.incident_type] = (a[i.incident_type] ?? 0) + 1; return a; }, {}),
      milestones: (milestones.data ?? []).reduce((a: Record<string, number>, m: any) => { a[m.milestone_type] = (a[m.milestone_type] ?? 0) + 1; return a; }, {}),
      curriculum: lessons.data ?? [],
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
              "You are the TRoGKC Children's Ministry Assistant. You advise the children's ministry leadership of a Christian church. " +
              "Ground every answer strictly in the JSON ministry snapshot supplied. Be practical and pastoral: give age-appropriate teaching ideas, " +
              "safeguarding guidance, volunteer scheduling advice, curriculum suggestions with scripture, attendance interpretation, and parent-communication drafts. " +
              "Always flag safeguarding or child-protection risks first. If the data does not answer the question, say so plainly and suggest what to capture. " +
              "Never invent numbers. Keep answers concise with short headings and bullets.",
          },
          { role: "user", content: `Ministry snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    return { answer: json.choices?.[0]?.message?.content ?? "No answer returned." };
  });
