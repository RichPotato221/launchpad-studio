import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

/** AI Strategy Assistant for the Strategy Management Office (data-grounded). */
export const askStrategyAssistant = createServerFn({ method: "POST" })
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
    const [plans, objectives, projects, milestones, kpis, decisions, risks, ideas, requests, deptKpis] = await Promise.all([
      sb.from("smo_plans").select("*").limit(50),
      sb.from("smo_objectives").select("*").limit(300),
      sb.from("smo_projects").select("*").limit(300),
      sb.from("smo_milestones").select("*").limit(500),
      sb.from("smo_kpis").select("*").limit(400),
      sb.from("smo_decisions").select("*").order("decision_date", { ascending: false }).limit(150),
      sb.from("smo_risks").select("*").limit(200),
      sb.from("smo_ideas").select("*").limit(200),
      sb.from("smo_requests").select("*").limit(200),
      sb.from("kpis").select("name, department_slug, branch, target, actual, period, category").limit(500),
    ]);

    const snapshot = {
      strategic_plans: plans.data ?? [],
      objectives_okrs: objectives.data ?? [],
      projects: projects.data ?? [],
      milestones: milestones.data ?? [],
      strategic_kpis: kpis.data ?? [],
      department_kpis: deptKpis.data ?? [],
      executive_decisions: decisions.data ?? [],
      strategic_risks: risks.data ?? [],
      innovation_ideas: ideas.data ?? [],
      department_requests: requests.data ?? [],
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
              "You are the TRoGKC Strategy Assistant, advising the Office of the Strategic Adviser & Planner of a Christian church. " +
              "Ground every answer strictly in the JSON strategy snapshot supplied. Help with: vision completion tracking, strategic " +
              "objectives and OKRs, project portfolio prioritisation and appraisal, balanced-scorecard analysis, resource allocation, " +
              "risk mitigation, scenario thinking, and executive briefing notes for the Senior Pastors and Chairperson. Never invent " +
              "numbers, projects or people that are not in the snapshot. Keep answers concise, structured with short headings and " +
              "bullets, and always tie recommendations back to the church's vision and kingdom impact.",
          },
          { role: "user", content: `Strategy snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    return { answer: json.choices?.[0]?.message?.content ?? "No answer returned." };
  });
