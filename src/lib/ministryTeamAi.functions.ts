import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ask = { question: string; team: string };

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

/** Data-grounded AI assistant for the ministry team workspaces. */
export const askMinistryTeamAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    const team = Object.keys(TEAM_LABEL).includes(input?.team) ? input.team : "youth";
    return { question: input.question.trim().slice(0, 800), team };
  })

  .handler(async ({ data, context }) => {
    const { supabase } = context;
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

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        messages: [
          {
            role: "system",
            content:
              `You are the TRoGKC ${TEAM_LABEL[t]} Assistant inside a Christian church management system. ` +
              "Ground every answer strictly in the JSON ministry snapshot supplied. Help with: discipleship pathway progress " +
              "and next steps, members needing follow-up, mentorship matching and overdue mentoring sessions, leadership " +
              "pipeline gaps and succession readiness, event and retreat planning with checklists and budgets, outreach " +
              "planning and impact summaries, volunteer shortages and burnout risk, training and certification gaps, KPI " +
              "commentary, monthly report drafts, meeting agendas and Bible study or devotional outlines aligned to " +
              "scripture. Never invent people, numbers or events that are not in the snapshot. Treat anything marked " +
              "confidential or pastoral as protected. Reply with short headings and bullets in a pastoral but practical tone.",
          },
          { role: "user", content: `Ministry snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("The assistant is busy right now — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    if (!res.ok) throw new Error(`Assistant failed [${res.status}]: ${await res.text()}`);

    const json = (await res.json()) as any;
    return { answer: json?.choices?.[0]?.message?.content ?? "No answer produced." };
  });
