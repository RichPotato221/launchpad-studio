import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";
import { sanitizeHistory, type AgentMessage } from "@/lib/aiAgent";

type Ask = { question: string ; history?: AgentMessage[] };

const SYSTEM = `You are the AI Governance Assistant for the Throne Room of God Kingdom Center (TRoGKC) Leadership Portal,
serving the Office of the Chairperson. You advise on church governance, board and council practice, statutory and NPO
compliance in South Africa, risk management, meeting and minute discipline, delegation of authority, financial oversight
and departmental accountability.

You are given a live snapshot of the ministry's governance data. Ground every answer in that snapshot where relevant,
quote the actual numbers, and name the departments or owners concerned. Be concise, practical and pastoral in tone.
Structure answers with short markdown headings and bullets. Where you recommend action, state who should own it and by when.
If the snapshot does not contain the information needed, say so plainly rather than inventing figures.

You may also create, update or close governance risks and record governance decisions using the tools provided. Open
tasks are shown for situational awareness only — those belong to each department's own assistant, so do not modify them
here.`;

/** AI Governance Assistant (data-grounded, tool-calling) — Office of the Chairperson. */
export const askGovernanceAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Ask) => {
    if (!d?.question || typeof d.question !== "string" || d.question.trim().length < 3) {
      throw new Error("Please enter a question.");
    }
    return { question: d.question.trim().slice(0, 2000), history: sanitizeHistory(d.history) };
  })
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("The AI assistant is not configured yet.");

    const { supabase, userId } = context;
    const sb = supabase as any;
    const today = new Date().toISOString().slice(0, 10);

    // Note: the previous version also queried a "compliance_items" table that does not exist in
    // this schema; that query always errored and was silently swallowed by `?? []`. Dropped here.
    const [oversight, risks, decisions, tasks, finance] = await Promise.all([
      sb.rpc("get_department_oversight"),
      sb.from("governance_risks").select("*").neq("status", "closed").order("rating", { ascending: false }).limit(50),
      sb.from("governance_decisions").select("*").limit(100),
      sb.from("tasks").select("title, status, due_date, department_slug").neq("status", "done").limit(80),
      sb.rpc("get_finance_summary", { _months: 6 }),
    ]);

    const snapshot = {
      as_at: today,
      department_oversight: oversight.data ?? [],
      open_risks: risks.data ?? [],
      decisions: decisions.data ?? [],
      open_tasks_readonly: tasks.data ?? [],
      finance_summary: finance.data ?? null,
    };

    const specs: TableSpec[] = [
      {
        entity: "governance_risk",
        table: "governance_risks",
        describe: "church-wide governance/compliance risk",
        columns: {
          risk_number: { kind: "string" },
          category: { kind: "string" },
          description: { kind: "string", requiredOnCreate: true },
          likelihood: { kind: "number", description: "1–5" },
          impact: { kind: "number", description: "1–5" },
          rating: { kind: "number" },
          mitigation: { kind: "string" },
          owner_id: { kind: "uuid" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          review_date: { kind: "date" },
          status: { kind: "string", enum: ["open", "mitigated", "closed"] },
          escalation_level: { kind: "string", enum: ["department", "leadership", "senior_apostle"] },
        },
      },
      {
        entity: "governance_decision",
        table: "governance_decisions",
        describe: "board/leadership governance decision",
        columns: {
          decision_number: { kind: "string" },
          category: { kind: "string" },
          title: { kind: "string", requiredOnCreate: true },
          detail: { kind: "string" },
          meeting_id: { kind: "uuid" },
          decision_date: { kind: "date" },
          owner_id: { kind: "uuid" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          priority: { kind: "string" },
          due_date: { kind: "date" },
          status: { kind: "string" },
          implementation_pct: { kind: "number" },
          evidence: { kind: "string" },
          document_url: { kind: "string" },
          completion_date: { kind: "date" },
        },
      },
      // tasks is read-only context here — owned by each department's own assistant.
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey: key,
      systemPrompt: SYSTEM,
      snapshot,
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "governance assistant" },
    });

    await sb.from("ai_query_log").insert({
      user_id: userId,
      query_text: data.question,
      response_text: answer,
      context: { scope: "chairperson_governance", as_at: today },
    });

    return { answer, actions };
  });
