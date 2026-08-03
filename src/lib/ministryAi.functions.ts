import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string };

const SYSTEM = `You are the AI Ministry Assistant for the Throne Room of God Kingdom Center (TRoGKC) Leadership Portal,
serving the Office of the Associate Pastor — the Ministry Operations & Shepherding Command Centre.

You advise on ministry operations, department health, volunteer management, leadership development and succession,
coaching, pastoral care, discipleship and Kingdom impact. You are given a live snapshot of the ministry's data.
Ground every answer in that snapshot, quote the real numbers, and name the departments, leaders or volunteers concerned.
Be concise, practical and pastoral. Use short markdown headings and bullets. Where you recommend action, say who should
own it and by when. If the snapshot lacks the information, say so plainly rather than inventing figures.`;

export const askMinistryAssistant = createServerFn({ method: "POST" })
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
    const sb = supabase as any;
    const today = new Date().toISOString().slice(0, 10);

    const [oversight, cases, prayers, volunteers, leaders, coaching, plans, succession, risks, tasks, attendance] =
      await Promise.all([
        sb.rpc("get_department_oversight"),
        sb.from("pastoral_cases").select("case_type, subject_name, status, priority, follow_up_date, department_slug, branch").limit(120),
        sb.from("prayer_requests").select("request, urgency, status").neq("status", "closed").limit(60),
        sb.from("volunteer_profiles").select("full_name, department_slug, status, on_leave, services_attended, services_missed, total_hours, burnout_risk, training_status").limit(300),
        sb.from("leader_profiles").select("leadership_role, department_slug, courses_completed, readiness_score, promotion_readiness, succession_status, burnout_risk, last_coached_on").limit(200),
        sb.from("coaching_sessions").select("session_type, session_date, status, follow_up_date, department_slug").limit(200),
        sb.from("ministry_plans").select("title, horizon, department_slug, status, progress_pct, budget_amount").limit(120),
        sb.from("succession_candidates").select("position_title, candidate_name, readiness_band, readiness_score, training_status").limit(100),
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
      open_risks: risks.data ?? [],
      open_tasks: tasks.data ?? [],
      attendance_trend: attendance.data ?? [],
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
            content: `Live ministry snapshot (JSON):\n${JSON.stringify(snapshot).slice(0, 90000)}\n\nQuestion: ${data.question}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("The AI assistant is busy right now. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace.");
      throw new Error(`AI request failed [${res.status}]: ${body.slice(0, 300)}`);
    }

    const json: any = await res.json();
    const answer = json?.choices?.[0]?.message?.content ?? "No answer was returned.";

    await sb.from("ai_query_log").insert({ user_id: userId, query_text: data.question, response_text: answer.slice(0, 8000) });

    return { answer };
  });
