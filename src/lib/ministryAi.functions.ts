import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";
import { sanitizeHistory, type AgentMessage } from "@/lib/aiAgent";

type Ask = { question: string ; history?: AgentMessage[] };

const SYSTEM = `You are the AI Ministry Assistant for the Throne Room of God Kingdom Center (TRoGKC) Leadership Portal,
serving the Office of the Associate Pastor — the Ministry Operations & Shepherding Command Centre.

You advise on ministry operations, department health, volunteer management, leadership development and succession,
coaching, pastoral care, discipleship and Kingdom impact. You are given a live snapshot of the ministry's data.
Ground every answer in that snapshot, quote the real numbers, and name the departments, leaders or volunteers concerned.
Be concise, practical and pastoral. Use short markdown headings and bullets. Where you recommend action, say who should
own it and by when. If the snapshot lacks the information, say so plainly rather than inventing figures.

You may also create, update or remove records the Office of the Associate Pastor owns directly: pastoral cases, prayer
requests routed to this office, volunteer profiles, leader profiles, coaching sessions, ministry plans and succession
candidates. Open risks and open tasks are shown for situational awareness only — those belong to Governance and each
department's own assistant respectively, so do not attempt to modify them here.`;

export const askMinistryAssistant = createServerFn({ method: "POST" })
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

    const [oversight, cases, prayers, volunteers, leaders, coaching, plans, succession, risks, tasks, attendance] =
      await Promise.all([
        sb.rpc("get_department_oversight"),
        sb.from("pastoral_cases").select("*").limit(200),
        sb.from("prayer_requests").select("*").neq("status", "closed").limit(150),
        sb.from("volunteer_profiles").select("*").limit(300),
        sb.from("leader_profiles").select("*").limit(200),
        sb.from("coaching_sessions").select("*").limit(200),
        sb.from("ministry_plans").select("*").limit(120),
        sb.from("succession_candidates").select("*").limit(100),
        sb.from("governance_risks").select("description, category, rating, status, department_slug").neq("status", "closed").limit(40),
        sb.from("tasks").select("title, status, due_date, department_slug").not("status", "in", "(done,completed,cancelled)").limit(120),
        sb.rpc("get_attendance_trend", { _months: 6 }),
      ]);

    const snapshot = {
      as_at: today,
      department_oversight: oversight.data ?? [],
      pastoral_cases: cases.data ?? [],
      open_prayer_requests: prayers.data ?? [],
      volunteers: volunteers.data ?? [],
      leaders: leaders.data ?? [],
      coaching_sessions: coaching.data ?? [],
      ministry_plans: plans.data ?? [],
      succession_pipeline: succession.data ?? [],
      open_risks_readonly: risks.data ?? [],
      open_tasks_readonly: tasks.data ?? [],
      attendance_trend: attendance.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "pastoral_case",
        table: "pastoral_cases",
        describe: "pastoral care case (counselling, hospital visit, crisis, etc)",
        columns: {
          case_number: { kind: "string" },
          case_type: { kind: "string" },
          subject_name: { kind: "string", requiredOnCreate: true },
          member_id: { kind: "uuid" },
          contact: { kind: "string" },
          location: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          department_slug: { kind: "string" },
          summary: { kind: "string" },
          care_plan: { kind: "string" },
          priority: { kind: "string" },
          status: { kind: "string" },
          assigned_to: { kind: "uuid" },
          opened_on: { kind: "date" },
          scheduled_for: { kind: "date" },
          follow_up_date: { kind: "date" },
          outcome: { kind: "string" },
          referral_to: { kind: "string" },
          confidential: { kind: "boolean" },
        },
      },
      {
        entity: "office_prayer_request",
        table: "prayer_requests",
        describe: "prayer request routed to the Office of the Associate Pastor (distinct from the Prayer department's own intercession requests)",
        columns: {
          request: { kind: "string", requiredOnCreate: true },
          requester_name: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          department_slug: { kind: "string" },
          urgency: { kind: "string" },
          confidential: { kind: "boolean" },
          status: { kind: "string" },
          assigned_to: { kind: "uuid" },
          answered_note: { kind: "string" },
        },
      },
      {
        entity: "volunteer_profile",
        table: "volunteer_profiles",
        describe: "cross-department volunteer profile used for ministry-wide oversight",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          role_title: { kind: "string" },
          availability: { kind: "string" },
          skills: { kind: "string" },
          training_status: { kind: "string" },
          serving_since: { kind: "date" },
          services_attended: { kind: "number" },
          services_missed: { kind: "number" },
          total_hours: { kind: "number" },
          performance_rating: { kind: "number" },
          recognition: { kind: "string" },
          badges: { kind: "string" },
          burnout_risk: { kind: "string" },
          on_leave: { kind: "boolean" },
          leave_reason: { kind: "string" },
          leave_until: { kind: "date" },
          status: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "leader_profile",
        table: "leader_profiles",
        describe: "leadership development & succession-readiness profile",
        columns: {
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          leadership_role: { kind: "string" },
          spiritual_gifts: { kind: "string" },
          calling_assessment: { kind: "string" },
          training_history: { kind: "string" },
          mentor_id: { kind: "uuid" },
          mentorship_plan: { kind: "string" },
          leadership_journey: { kind: "string" },
          courses_completed: { kind: "number" },
          certificates: { kind: "number" },
          readiness_score: { kind: "number" },
          promotion_readiness: { kind: "string" },
          succession_status: { kind: "string" },
          competency_notes: { kind: "string" },
          burnout_risk: { kind: "string" },
          last_coached_on: { kind: "date" },
        },
      },
      {
        entity: "coaching_session",
        table: "coaching_sessions",
        describe: "leader coaching/mentoring session record",
        columns: {
          leader_id: { kind: "uuid", requiredOnCreate: true },
          coach_id: { kind: "uuid" },
          session_type: { kind: "string" },
          session_date: { kind: "date" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          topics: { kind: "string" },
          notes: { kind: "string" },
          action_plan: { kind: "string" },
          growth_plan: { kind: "string" },
          rating: { kind: "number" },
          follow_up_date: { kind: "date" },
          status: { kind: "string" },
        },
      },
      {
        entity: "ministry_plan",
        table: "ministry_plans",
        describe: "ministry operations plan for a department or season",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          horizon: { kind: "string" },
          period_label: { kind: "string" },
          start_date: { kind: "date" },
          end_date: { kind: "date" },
          objectives: { kind: "string" },
          milestones: { kind: "string" },
          dependencies: { kind: "string" },
          budget_amount: { kind: "number" },
          expected_outcomes: { kind: "string" },
          risk_assessment: { kind: "string" },
          progress_pct: { kind: "number" },
          status: { kind: "string" },
          owner_id: { kind: "uuid" },
        },
      },
      {
        entity: "succession_candidate",
        table: "succession_candidates",
        describe: "succession-planning candidate for a leadership position",
        columns: {
          position_title: { kind: "string", requiredOnCreate: true },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          incumbent_id: { kind: "uuid" },
          candidate_id: { kind: "uuid" },
          candidate_name: { kind: "string" },
          readiness_score: { kind: "number" },
          readiness_band: { kind: "string" },
          mentorship_progress: { kind: "number" },
          training_status: { kind: "string" },
          competency_assessment: { kind: "string" },
          delegated_responsibilities: { kind: "string" },
          recommendation: { kind: "string" },
          target_date: { kind: "date" },
          status: { kind: "string" },
        },
      },
      // governance_risks and tasks are read-only context here — owned by the Governance
      // and per-department assistants respectively.
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey: key,
      systemPrompt: SYSTEM,
      snapshot,
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "ministry assistant" },
    });

    await sb.from("ai_query_log").insert({ user_id: userId, query_text: data.question, response_text: answer.slice(0, 8000) });

    return { answer, actions };
  });
