import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

const SYSTEM = `You are the AI Governance Assistant for the Throne Room of God Kingdom Center (TRoGKC) Leadership Portal,
serving the Office of the Chairperson. You advise on church governance, board and council practice, statutory and NPO
compliance in South Africa, risk management, meeting and minute discipline, delegation of authority, financial oversight
and departmental accountability.

You are given a live snapshot of the ministry's governance data. Ground every answer in that snapshot where relevant,
quote the actual numbers, and name the departments or owners concerned. Be concise, practical and pastoral in tone.
Structure answers with short markdown headings and bullets. Where you recommend action, state who should own it and by when.
If the snapshot does not contain the information needed, say so plainly rather than inventing figures.`;

export const askGovernanceAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Ask) => {
    if (!d?.question || typeof d.question !== "string" || d.question.trim().length < 3) {
      throw new Error("Please enter a question.");
    }
    return { question: d.question.trim().slice(0, 2000) };
  })
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("The AI assistant is not configured yet.");

    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [oversight, risks, compliance, decisions, tasks, finance] = await Promise.all([
      (supabase as any).rpc("get_department_oversight"),
      (supabase as any).from("governance_risks").select("risk_number, description, category, rating, status, department_slug, review_date").neq("status", "closed").order("rating", { ascending: false }).limit(25),
      (supabase as any).from("compliance_items").select("title, category, status, due_date, risk_score, department_slug").limit(50),
      (supabase as any).from("governance_decisions").select("decision_number, title, status, due_date, implementation_pct, department_slug").limit(50),
      (supabase as any).from("tasks").select("title, status, due_date, department_slug").neq("status", "done").limit(80),
      (supabase as any).rpc("get_finance_summary", { _months: 6 }),
    ]);

    const snapshot = {
      as_at: today,
      department_oversight: oversight.data ?? [],
      open_risks: risks.data ?? [],
      compliance_register: compliance.data ?? [],
      decisions: decisions.data ?? [],
      open_tasks: tasks.data ?? [],
      finance_summary: finance.data ?? null,
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Live governance snapshot (JSON):\n${JSON.stringify(snapshot).slice(0, 90000)}\n\nQuestion: ${data.question}`,
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The assistant is busy right now — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace credits.");
    if (!res.ok) {
      const body = await res.text();
      console.error(`AI gateway error [${res.status}]: ${body}`);
      throw new Error(`The assistant could not answer right now [${res.status}].`);
    }

    const json = (await res.json()) as any;
    const answer: string = json?.choices?.[0]?.message?.content ?? "No answer was returned.";

    await (supabase as any).from("ai_query_log").insert({
      user_id: userId,
      query_text: data.question,
      response_text: answer,
      context: { scope: "chairperson_governance", as_at: today },
    });

    return { answer };
  });
