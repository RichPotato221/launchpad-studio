import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string; slug: string };

/**
 * Generic, data-grounded AI assistant for any department that does not already
 * ship a specialised assistant inside its own operations centre.
 */
export const askDepartmentAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    if (!input?.slug) throw new Error("Missing department.");
    return { question: input.question.trim().slice(0, 800), slug: input.slug };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");

    const sb = supabase as any;
    const slug = data.slug;

    const [dept, kpis, tasks, reports, entries, events, purchases, budgets, resources, members] = await Promise.all([
      sb.from("departments").select("*").eq("slug", slug).maybeSingle(),
      sb.from("kpis").select("*").eq("department_slug", slug).limit(400),
      sb.from("tasks").select("*").eq("department_slug", slug).order("created_at", { ascending: false }).limit(300),
      sb.from("branch_reports").select("*").eq("department_slug", slug).order("created_at", { ascending: false }).limit(120),
      sb.from("report_entries").select("*").order("created_at", { ascending: false }).limit(120),
      sb.from("events").select("*").eq("department_slug", slug).order("starts_at", { ascending: false }).limit(150),
      sb
        .from("purchase_requests")
        .select("id, pr_number, title, department_slug, status, payment_status, amount_estimated, needed_by, created_at")
        .eq("department_slug", slug)
        .limit(150),
      sb.from("budgets").select("*").eq("department_slug", slug).limit(80),
      sb.from("department_resources").select("id, title, created_at").eq("department_slug", slug).limit(120),
      sb.from("profiles").select("id, full_name, branch, primary_department, requested_role").eq("primary_department", slug).limit(300),
    ]);

    const snapshot = {
      today: new Date().toISOString().slice(0, 10),
      department: dept.data ?? { slug },
      kpis: kpis.data ?? [],
      tasks: tasks.data ?? [],
      reports: reports.data ?? [],
      report_entries: entries.data ?? [],
      events: events.data ?? [],
      purchase_requests: purchases.data ?? [],
      budgets: budgets.data ?? [],
      documents: resources.data ?? [],
      members: members.data ?? [],
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
              `You are the TRoGKC AI assistant for the "${slug}" department. Ground every answer strictly in the JSON ` +
              "department snapshot supplied: vision, mission, functions, KPIs, tasks, reports, events, budgets, purchase " +
              "requests, documents and team members. Help leaders with performance analysis, red-flag KPIs, overdue work, " +
              "budget and spend insight, report drafting, meeting agendas, planning and next-step recommendations rooted in " +
              "the department's mandate. Never invent people, figures or records that are not in the snapshot; say plainly " +
              "when the data is missing. Keep answers concise with short headings and bullets.",
          },
          { role: "user", content: `Department snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    return { answer: json.choices?.[0]?.message?.content ?? "No answer returned." };
  });
