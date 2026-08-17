import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";
import { sanitizeHistory, type AgentMessage } from "@/lib/aiAgent";

type Ask = { question: string ; history?: AgentMessage[] };

/** AI Strategy Assistant for the Strategy Management Office (data-grounded, tool-calling). */
export const askStrategyAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    return { question: input.question.trim().slice(0, 800), history: sanitizeHistory(input.history) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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

    const specs: TableSpec[] = [
      {
        entity: "strategic_plan",
        table: "smo_plans",
        describe: "top-level strategic plan/vision cycle",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          plan_type: { kind: "string" },
          vision_statement: { kind: "string" },
          mission_statement: { kind: "string" },
          themes: { kind: "json" },
          horizon_start: { kind: "date" },
          horizon_end: { kind: "date" },
          status: { kind: "string" },
          progress_pct: { kind: "number" },
          owner: { kind: "string" },
        },
      },
      {
        entity: "objective",
        table: "smo_objectives",
        describe: "strategic objective/OKR",
        columns: {
          plan_id: { kind: "uuid" },
          title: { kind: "string", requiredOnCreate: true },
          theme: { kind: "string" },
          perspective: { kind: "string" },
          description: { kind: "string" },
          key_results: { kind: "json" },
          owner: { kind: "string" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          period: { kind: "string" },
          start_date: { kind: "date" },
          due_date: { kind: "date" },
          budget: { kind: "number" },
          progress_pct: { kind: "number" },
          status: { kind: "string" },
          dependencies: { kind: "string" },
          risks: { kind: "string" },
        },
      },
      {
        entity: "strategic_project",
        table: "smo_projects",
        describe: "strategic portfolio project",
        columns: {
          objective_id: { kind: "uuid" },
          name: { kind: "string", requiredOnCreate: true },
          project_type: { kind: "string" },
          scope: { kind: "string" },
          business_case: { kind: "string" },
          objectives: { kind: "string" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          sponsor: { kind: "string" },
          manager: { kind: "string" },
          stakeholders: { kind: "string" },
          budget_requested: { kind: "number" },
          budget_approved: { kind: "number" },
          spent: { kind: "number" },
          funding_source: { kind: "string" },
          start_date: { kind: "date" },
          end_date: { kind: "date" },
          progress_pct: { kind: "number" },
          stage: { kind: "string" },
          status: { kind: "string" },
          risks: { kind: "string" },
          approval_status: { kind: "string" },
          photo_url: { kind: "string" },
          document_url: { kind: "string" },
        },
      },
      {
        entity: "milestone",
        table: "smo_milestones",
        describe: "project milestone",
        columns: {
          project_id: { kind: "uuid", requiredOnCreate: true },
          title: { kind: "string", requiredOnCreate: true },
          due_date: { kind: "date" },
          completed_on: { kind: "date" },
          status: { kind: "string" },
          deliverable: { kind: "string" },
          owner: { kind: "string" },
        },
      },
      {
        entity: "strategic_kpi",
        table: "smo_kpis",
        describe: "balanced-scorecard strategic KPI",
        columns: {
          objective_id: { kind: "uuid" },
          name: { kind: "string", requiredOnCreate: true },
          kpi_group: { kind: "string" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          period: { kind: "string" },
          period_label: { kind: "string" },
          target: { kind: "number" },
          actual: { kind: "number" },
          forecast: { kind: "number" },
          unit: { kind: "string" },
        },
      },
      {
        entity: "executive_decision",
        table: "smo_decisions",
        describe: "executive/strategic decision record",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          decision_type: { kind: "string" },
          decision_date: { kind: "date" },
          owner: { kind: "string" },
          impact: { kind: "string" },
          affected_departments: { kind: "string" },
          action_items: { kind: "string" },
          deadline: { kind: "date" },
          vote_outcome: { kind: "string" },
          implementation_status: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "strategic_risk",
        table: "smo_risks",
        describe: "identified strategic risk",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          description: { kind: "string" },
          likelihood: { kind: "number", description: "1–5" },
          impact: { kind: "number", description: "1–5" },
          mitigation: { kind: "string" },
          owner: { kind: "string" },
          review_date: { kind: "date" },
          status: { kind: "string", enum: ["open", "mitigated", "closed"] },
          escalation_level: { kind: "string", enum: ["department", "leadership", "senior_apostle"] },
        },
      },
      {
        entity: "innovation_idea",
        table: "smo_ideas",
        describe: "submitted innovation/improvement idea",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          idea_type: { kind: "string" },
          description: { kind: "string" },
          submitted_by: { kind: "uuid" },
          submitter_name: { kind: "string" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          stage: { kind: "string" },
          review_notes: { kind: "string" },
        },
      },
      {
        entity: "department_request",
        table: "smo_requests",
        describe: "department request routed to the Strategy office",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          request_type: { kind: "string" },
          description: { kind: "string" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          amount: { kind: "number" },
          requested_by: { kind: "uuid" },
          requester_name: { kind: "string" },
          route_to: { kind: "string" },
          status: { kind: "string" },
          decision_notes: { kind: "string" },
        },
      },
      // department_kpis is read-only reference here — owned by each department's own assistant.
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey,
      systemPrompt:
        "You are the TRoGKC Strategy Assistant, advising the Office of the Strategic Adviser & Planner of a Christian church. " +
        "Ground every answer strictly in the JSON strategy snapshot supplied. Help with: vision completion tracking, strategic " +
        "objectives and OKRs, project portfolio prioritisation and appraisal, balanced-scorecard analysis, resource allocation, " +
        "risk mitigation, scenario thinking, and executive briefing notes for the Senior Pastors and Chairperson. Never invent " +
        "numbers, projects or people that are not in the snapshot. Keep answers concise, structured with short headings and " +
        "bullets, and always tie recommendations back to the church's vision and kingdom impact.",
      snapshot,
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "strategy assistant" },
    });

    return { answer, actions };
  });
