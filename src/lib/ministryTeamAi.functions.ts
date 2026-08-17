import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";
import { sanitizeHistory, type AgentMessage } from "@/lib/aiAgent";

type Ask = { question: string; team: string ; history?: AgentMessage[] };

const TEAM_LABEL: Record<string, string> = {
  youth: "Youth Team",
  women: "Women's Team",
  men: "Men's Team",
  care: "Hand of Christ (compassion, benevolence & family support) Team",
  life_groups: "Life Groups Team",
  outreach: "Outreach & Evangelism Team",
};

const TEAM_FOCUS: Record<string, string> = {
  care:
    "Prioritise urgent benevolence and welfare cases, flag vulnerable households needing follow-up, detect overdue assessments and home visits, draft assessment summaries, recommend referral pathways (associate pastor, elders, finance, counselling, social workers), predict volunteer shortages and summarise community impact. Never disclose confidential case detail.",
  life_groups:
    "Summarise attendance trends per group, detect declining or inactive groups, recommend members needing follow-up, suggest multiplication opportunities and apprentice leaders, highlight overdue pastoral referrals, and draft meeting agendas, discussion guides and monthly group-health reports.",
  outreach:
    "Track gospel contacts, salvations and discipleship handoffs, flag overdue follow-ups, plan campaigns with checklists, budgets and prayer points, draft evangelism scripts and follow-up messages, analyse community reach and volunteer participation, and produce Kingdom impact reports.",
};

/** Data-grounded, tool-calling AI assistant for the ministry team workspaces. */
export const askMinistryTeamAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    const team = Object.keys(TEAM_LABEL).includes(input?.team) ? input.team : "youth";
    return { question: input.question.trim().slice(0, 800), team, history: sanitizeHistory(input.history) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");

    const sb = supabase as any;
    const t = data.team;
    const q = (table: string, limit: number) => sb.from(table).select("*").eq("team", t).limit(limit);

    const [members, groups, mentorships, events, attendance, outreach, prayer, tasks, risks, training] =
      await Promise.all([
        q("mt_members", 500),
        q("mt_groups", 100),
        q("mt_mentorships", 300),
        q("mt_events", 200),
        q("mt_attendance", 1000),
        q("mt_outreach", 150),
        q("mt_prayer", 300),
        q("mt_tasks", 300),
        q("mt_risks", 200),
        q("mt_training_records", 300),
      ]);

    // Pastoral notes and confidential prayer detail never leave the department.
    const safeMembers = (members.data ?? []).map((m: any) => ({ ...m, notes: m.notes ? "[pastoral note on file]" : null }));
    const safePrayer = (prayer.data ?? []).map((p: any) =>
      p.confidential ? { ...p, request: "[confidential]", requester_name: null } : p,
    );

    const snapshot = {
      members: safeMembers,
      groups: groups.data ?? [],
      mentorships: (mentorships.data ?? []).map((m: any) => ({ ...m, confidential_notes: undefined })),
      events: events.data ?? [],
      attendance: attendance.data ?? [],
      outreach: outreach.data ?? [],
      prayer: safePrayer,
      tasks: tasks.data ?? [],
      risks: risks.data ?? [],
      training: training.data ?? [],
    };

    const scope = { column: "team", value: t };

    const specs: TableSpec[] = [
      {
        entity: "member",
        table: "mt_members",
        describe: `${TEAM_LABEL[t]} member profile`,
        scope,
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          photo_url: { kind: "string" },
          gender: { kind: "string" },
          date_of_birth: { kind: "date" },
          phone: { kind: "string" },
          email: { kind: "string" },
          address: { kind: "string" },
          marital_status: { kind: "string" },
          occupation: { kind: "string" },
          school: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          guardian_name: { kind: "string" },
          guardian_phone: { kind: "string" },
          emergency_contact: { kind: "string" },
          emergency_phone: { kind: "string" },
          small_group_id: { kind: "uuid" },
          mentor_name: { kind: "string" },
          ministry_involvement: { kind: "string" },
          spiritual_gifts: { kind: "string" },
          talents: { kind: "string" },
          baptism_status: { kind: "string" },
          salvation_date: { kind: "date" },
          membership_status: { kind: "string" },
          stage: { kind: "string" },
          leadership_level: { kind: "string" },
          safeguarding_status: { kind: "string" },
          training_completed: { kind: "string" },
          notes: { kind: "string", description: "Pastoral note — handle with care." },
        },
      },
      {
        entity: "small_group",
        table: "mt_groups",
        describe: `${TEAM_LABEL[t]} small/life group`,
        scope,
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          leader_name: { kind: "string" },
          assistant_name: { kind: "string" },
          mentor_name: { kind: "string" },
          venue: { kind: "string" },
          meeting_day: { kind: "string" },
          meeting_time: { kind: "string" },
          capacity: { kind: "number" },
          focus: { kind: "string" },
          notes: { kind: "string" },
          status: { kind: "string" },
        },
      },
      {
        entity: "mentorship",
        table: "mt_mentorships",
        describe: `${TEAM_LABEL[t]} mentorship pairing`,
        scope,
        columns: {
          mentor_name: { kind: "string", requiredOnCreate: true },
          mentee_name: { kind: "string", requiredOnCreate: true },
          member_id: { kind: "uuid" },
          goals: { kind: "string" },
          cadence: { kind: "string" },
          last_session_date: { kind: "date" },
          next_session_date: { kind: "date" },
          sessions_completed: { kind: "number" },
          progress_pct: { kind: "number" },
          prayer_notes: { kind: "string" },
          progress_notes: { kind: "string" },
          status: { kind: "string" },
        },
      },
      {
        entity: "event",
        table: "mt_events",
        describe: `${TEAM_LABEL[t]} event/retreat/gathering`,
        scope,
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          event_type: { kind: "string" },
          event_date: { kind: "date", requiredOnCreate: true },
          start_time: { kind: "string" },
          venue: { kind: "string" },
          speaker: { kind: "string" },
          theme: { kind: "string" },
          capacity: { kind: "number" },
          budget: { kind: "number" },
          actual_cost: { kind: "number" },
          resources: { kind: "string" },
          checklist: { kind: "string" },
          risk_notes: { kind: "string" },
          registrations: { kind: "number" },
          attendance_count: { kind: "number" },
          feedback: { kind: "string" },
          follow_up: { kind: "string" },
          status: { kind: "string" },
        },
      },
      {
        entity: "attendance_record",
        table: "mt_attendance",
        describe: `${TEAM_LABEL[t]} attendance record`,
        scope,
        columns: {
          event_id: { kind: "uuid" },
          member_id: { kind: "uuid" },
          member_name: { kind: "string" },
          attended_on: { kind: "date" },
          present: { kind: "boolean" },
          context: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "outreach_activity",
        table: "mt_outreach",
        describe: `${TEAM_LABEL[t]} outreach/evangelism activity`,
        scope,
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          location: { kind: "string" },
          leader_name: { kind: "string" },
          start_date: { kind: "date" },
          end_date: { kind: "date" },
          budget: { kind: "number" },
          volunteers: { kind: "number" },
          volunteer_hours: { kind: "number" },
          people_reached: { kind: "number" },
          salvations: { kind: "number" },
          follow_ups: { kind: "number" },
          beneficiaries: { kind: "string" },
          impact: { kind: "string" },
          status: { kind: "string" },
        },
      },
      {
        entity: "prayer_request",
        table: "mt_prayer",
        describe: `${TEAM_LABEL[t]} prayer request`,
        scope,
        columns: {
          requester_name: { kind: "string" },
          category: { kind: "string" },
          request: { kind: "string", requiredOnCreate: true },
          confidential: { kind: "boolean" },
          assigned_to: { kind: "string" },
          follow_up_date: { kind: "date" },
          answered_note: { kind: "string" },
          status: { kind: "string" },
        },
      },
      {
        entity: "task",
        table: "mt_tasks",
        describe: `${TEAM_LABEL[t]} task/action item`,
        scope,
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          description: { kind: "string" },
          assignee_name: { kind: "string" },
          priority: { kind: "string" },
          due_date: { kind: "date" },
          progress_pct: { kind: "number" },
          status: { kind: "string" },
        },
      },
      {
        entity: "risk",
        table: "mt_risks",
        describe: `identified ${TEAM_LABEL[t]} risk`,
        scope,
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          description: { kind: "string" },
          likelihood: { kind: "number", description: "1–5" },
          impact: { kind: "number", description: "1–5" },
          owner_id: { kind: "uuid" },
          owner_name: { kind: "string" },
          mitigation: { kind: "string" },
          review_date: { kind: "date" },
          status: { kind: "string", enum: ["open", "mitigated", "closed"] },
        },
      },
      {
        entity: "training_record",
        table: "mt_training_records",
        describe: "team member's training/course completion record",
        scope,
        columns: {
          course_id: { kind: "uuid", requiredOnCreate: true },
          member_name: { kind: "string" },
          progress_pct: { kind: "number" },
          score: { kind: "number" },
          certificate_url: { kind: "string" },
          completed_at: { kind: "date" },
        },
      },
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey,
      systemPrompt:
        `You are the TRoGKC ${TEAM_LABEL[t]} Assistant inside a Christian church management system. ` +
        "Ground every answer strictly in the JSON ministry snapshot supplied. Help with: discipleship pathway progress " +
        "and next steps, members needing follow-up, mentorship matching and overdue mentoring sessions, leadership " +
        "pipeline gaps and succession readiness, event and retreat planning with checklists and budgets, outreach " +
        "planning and impact summaries, volunteer shortages and burnout risk, training and certification gaps, KPI " +
        "commentary, monthly report drafts, meeting agendas and Bible study or devotional outlines aligned to " +
        (TEAM_FOCUS[t] ? `Team-specific focus: ${TEAM_FOCUS[t]} ` : "") +
        "scripture. Never invent people, numbers or events that are not in the snapshot. Treat anything marked " +
        "confidential or pastoral as protected. Reply with short headings and bullets in a pastoral but practical tone.",
      snapshot,
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "ministry team assistant" },
    });

    return { answer, actions };
  });
