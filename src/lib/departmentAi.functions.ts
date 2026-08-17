import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";
import { sanitizeHistory, type AgentMessage } from "@/lib/aiAgent";

type Ask = { question: string; slug: string ; history?: AgentMessage[] };

/**
 * Generic, data-grounded AI assistant for any department that does not already
 * ship a specialised assistant inside its own operations centre.
 *
 * Beyond answering questions, this assistant can now act: it can update the
 * department's own "outlook" (vision/mission/purpose/functions/etc), and
 * create, update, or archive/delete the department's KPIs, tasks, report
 * entries, events, purchase requests, budgets and resource documents — all
 * scoped to this department's slug and subject to the same Row Level
 * Security policies that already govern manual edits in the UI.
 */
export const askDepartmentAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    if (!input?.slug) throw new Error("Missing department.");
    return { question: input.question.trim().slice(0, 800), slug: input.slug, history: sanitizeHistory(input.history) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");

    const sb = supabase as any;
    const slug = data.slug;

    const [dept, kpis, tasks, entries, events, purchases, budgets, resources, members] = await Promise.all([
      sb.from("departments").select("*").eq("slug", slug).maybeSingle(),
      sb.from("kpis").select("*").eq("department_slug", slug).limit(400),
      sb.from("tasks").select("*").eq("department_slug", slug).order("created_at", { ascending: false }).limit(300),
      sb.from("report_entries").select("*").eq("department_slug", slug).order("created_at", { ascending: false }).limit(120),
      sb.from("events").select("*").eq("department_slug", slug).order("event_date", { ascending: false }).limit(150),
      sb
        .from("purchase_requests")
        .select("id, pr_number, title, department_slug, status, payment_status, amount_estimated, needed_by, created_at")
        .eq("department_slug", slug)
        .limit(150),
      sb.from("budgets").select("*").eq("department_slug", slug).limit(80),
      sb.from("department_resources").select("id, title, description, file_url, created_at").eq("department_slug", slug).limit(120),
      sb.from("profiles").select("id, full_name, branch, primary_department, requested_role").eq("primary_department", slug).limit(300),
    ]);

    const snapshot = {
      today: new Date().toISOString().slice(0, 10),
      department: dept.data ?? { slug },
      kpis: kpis.data ?? [],
      tasks: tasks.data ?? [],
      report_entries: entries.data ?? [],
      events: events.data ?? [],
      purchase_requests: purchases.data ?? [],
      budgets: budgets.data ?? [],
      documents: resources.data ?? [],
      members: members.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "department_outlook",
        table: "departments",
        pk: "slug",
        describe: "department's own profile/outlook (name, vision, mission, purpose, functions, scripture, leadership names)",
        allowDelete: false, // never let chat destroy a department record — archive only if ever needed
        columns: {
          name: { kind: "string", description: "Display name of the department." },
          scripture: { kind: "string", description: "Anchor scripture reference, e.g. 'John 4:23–24'." },
          vision: { kind: "string" },
          mission: { kind: "string" },
          purpose: { kind: "string" },
          functions: { kind: "text[]", description: "List of core functions/responsibilities." },
          chair_name: { kind: "string", description: "Name of the department chair/head." },
          overseer_name: { kind: "string", description: "Name of the overseeing pastor/leader." },
          sort_order: { kind: "number" },
        },
      },
      {
        entity: "kpi",
        table: "kpis",
        describe: "KPI (key performance indicator) for this department",
        scope: { column: "department_slug", value: slug },
        columns: {
          category: {
            kind: "string",
            requiredOnCreate: true,
            enum: ["spiritual_impact", "people_development", "operational_excellence", "stewardship", "kingdom_influence"],
          },
          kpi_name: { kind: "string", requiredOnCreate: true },
          baseline: { kind: "number" },
          target: { kind: "number" },
          actual: { kind: "number" },
          period_type: { kind: "string", requiredOnCreate: true, enum: ["weekly", "monthly", "quarterly", "annual"] },
          period_date: { kind: "date", requiredOnCreate: true },
          notes: { kind: "string" },
        },
      },
      {
        entity: "task",
        table: "tasks",
        describe: "task/action item for this department",
        scope: { column: "department_slug", value: slug },
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          description: { kind: "string" },
          assigned_to: { kind: "uuid", description: "User id of the assignee, if known." },
          due_date: { kind: "date" },
          priority: { kind: "string", enum: ["low", "normal", "high", "urgent"] },
          status: { kind: "string", enum: ["todo", "in_progress", "blocked", "done", "cancelled"] },
          requires_approval: { kind: "boolean" },
        },
      },
      {
        entity: "report_entry",
        table: "report_entries",
        describe: "written report entry for this department",
        scope: { column: "department_slug", value: slug },
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          body: { kind: "string" },
          file_url: { kind: "string" },
          file_name: { kind: "string" },
        },
      },
      {
        entity: "event",
        table: "events",
        describe: "calendar event for this department",
        scope: { column: "department_slug", value: slug },
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          description: { kind: "string" },
          event_type: {
            kind: "string",
            enum: ["service", "rehearsal", "meeting", "outreach", "training", "youth", "childrens", "other"],
          },
          event_date: { kind: "date", requiredOnCreate: true },
          start_time: { kind: "string", description: "24h time, e.g. '18:30'." },
          end_time: { kind: "string", description: "24h time, e.g. '20:00'." },
          location: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
        },
      },
      {
        entity: "purchase_request",
        table: "purchase_requests",
        describe: "purchase/procurement request for this department",
        scope: { column: "department_slug", value: slug },
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          description: { kind: "string" },
          category: { kind: "string" },
          amount_estimated: { kind: "number", requiredOnCreate: true },
          amount_actual: { kind: "number" },
          needed_by: { kind: "date" },
          priority: { kind: "string" },
          status: { kind: "string" },
        },
      },
      {
        entity: "budget",
        table: "budgets",
        describe: "budget line for this department",
        scope: { column: "department_slug", value: slug },
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          fiscal_year: { kind: "number", requiredOnCreate: true },
          total_amount: { kind: "number" },
          status: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "resource_document",
        table: "department_resources",
        describe: "resource/document listed for this department (file must already be uploaded and its URL known)",
        scope: { column: "department_slug", value: slug },
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          description: { kind: "string" },
          file_url: { kind: "string", requiredOnCreate: true },
        },
      },
      // Members are intentionally read-only here: profiles are tied to Supabase Auth
      // accounts, so chat cannot safely create or delete a login — that must go
      // through invite/removal flows. Reassignment stays a manual admin action too.
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey,
      systemPrompt:
        `You are the TRoGKC AI assistant for the "${slug}" department. Ground every answer strictly in the JSON ` +
        "department snapshot supplied: outlook, KPIs, tasks, report entries, events, budgets, purchase requests, " +
        "documents and team members. Help leaders with performance analysis, red-flag KPIs, overdue work, budget " +
        "and spend insight, report drafting, meeting agendas, planning and next-step recommendations rooted in the " +
        "department's mandate. Never invent people, figures or records that are not in the snapshot; say plainly " +
        "when data is missing. Keep answers concise with short headings and bullets.",
      snapshot,
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "department assistant" },
    });

    return { answer, actions };
  });
