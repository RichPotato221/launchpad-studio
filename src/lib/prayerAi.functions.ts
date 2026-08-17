import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";
import { sanitizeHistory, type AgentMessage } from "@/lib/aiAgent";

type Ask = { question: string ; history?: AgentMessage[] };

/** AI Prayer & Intercession Assistant (data-grounded, tool-calling). */
export const askPrayerAssistant = createServerFn({ method: "POST" })
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
    const [requests, meetings, chains, slots, fasts, team, risks, training] = await Promise.all([
      sb.from("int_requests").select("*").order("created_at", { ascending: false }).limit(300),
      sb.from("int_meetings").select("*").order("starts_at", { ascending: false }).limit(120),
      sb.from("int_chains").select("*").limit(60),
      sb.from("int_chain_slots").select("*").limit(600),
      sb.from("int_fasts").select("*").limit(60),
      sb.from("int_team_members").select("*").limit(200),
      sb.from("int_risks").select("*").limit(200),
      sb.from("int_training_records").select("*").limit(300),
    ]);

    // Confidential detail never leaves the department — strip narrative text from protected requests.
    const safeRequests = (requests.data ?? []).map((r: any) =>
      r.confidential || r.leadership_only
        ? { ...r, description: "[confidential]", requester_name: null, phone: null, email: null }
        : r,
    );

    const snapshot = {
      requests: safeRequests,
      meetings: meetings.data ?? [],
      chains: chains.data ?? [],
      chain_slots: slots.data ?? [],
      fasts: fasts.data ?? [],
      team: team.data ?? [],
      risks: risks.data ?? [],
      training: training.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "prayer_request",
        table: "int_requests",
        describe: "intercession prayer request",
        columns: {
          prayer_no: { kind: "string" },
          requester_name: { kind: "string" },
          is_anonymous: { kind: "boolean" },
          phone: { kind: "string" },
          email: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          category: { kind: "string" },
          priority: { kind: "string" },
          status: { kind: "string" },
          title: { kind: "string", requiredOnCreate: true },
          description: { kind: "string" },
          confidential: { kind: "boolean" },
          leadership_only: { kind: "boolean" },
          assigned_to: { kind: "uuid" },
          assigned_department: { kind: "string" },
          prayer_duration_days: { kind: "number" },
          follow_up_required: { kind: "boolean" },
          follow_up_date: { kind: "date" },
          answered_at: { kind: "timestamptz" },
          answer_note: { kind: "string" },
          attachment_url: { kind: "string" },
          escalated: { kind: "boolean" },
          archived: { kind: "boolean" },
        },
      },
      {
        entity: "prayer_meeting",
        table: "int_meetings",
        describe: "prayer meeting/gathering",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          meeting_type: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          venue: { kind: "string" },
          host: { kind: "string" },
          leader_id: { kind: "uuid" },
          starts_at: { kind: "timestamptz", requiredOnCreate: true },
          ends_at: { kind: "timestamptz" },
          prayer_focus: { kind: "string" },
          topics: { kind: "string" },
          declarations: { kind: "string" },
          scriptures: { kind: "string" },
          testimonies: { kind: "string" },
          minutes: { kind: "string" },
          action_items: { kind: "string" },
          attendance_count: { kind: "number" },
          expected_count: { kind: "number" },
          prayer_hours: { kind: "number" },
          recording_url: { kind: "string" },
          recurrence: { kind: "string" },
          status: { kind: "string" },
        },
      },
      {
        entity: "prayer_chain",
        table: "int_chains",
        describe: "24/7-style prayer chain/watch",
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          focus: { kind: "string" },
          leader_id: { kind: "uuid" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          starts_at: { kind: "timestamptz" },
          ends_at: { kind: "timestamptz" },
          slot_minutes: { kind: "number" },
          status: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "chain_slot",
        table: "int_chain_slots",
        describe: "individual time slot within a prayer chain",
        columns: {
          chain_id: { kind: "uuid", requiredOnCreate: true },
          slot_start: { kind: "timestamptz", requiredOnCreate: true },
          slot_end: { kind: "timestamptz", requiredOnCreate: true },
          intercessor_id: { kind: "uuid" },
          intercessor_name: { kind: "string" },
          covered: { kind: "boolean" },
          missed: { kind: "boolean" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "fast",
        table: "int_fasts",
        describe: "corporate fast/prayer campaign",
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          fast_type: { kind: "string" },
          purpose: { kind: "string" },
          start_date: { kind: "date", requiredOnCreate: true },
          end_date: { kind: "date", requiredOnCreate: true },
          daily_scriptures: { kind: "string" },
          prayer_points: { kind: "string" },
          status: { kind: "string" },
        },
      },
      {
        entity: "intercessor",
        table: "int_team_members",
        describe: "prayer team member/intercessor",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          role: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          phone: { kind: "string" },
          email: { kind: "string" },
          availability: { kind: "string" },
          prayer_watch: { kind: "string" },
          spiritual_gifts: { kind: "string" },
          skills: { kind: "string" },
          years_serving: { kind: "number" },
          training_status: { kind: "string" },
          certificates: { kind: "string" },
          safeguarding_cleared: { kind: "boolean" },
          emergency_contact: { kind: "string" },
          attendance_pct: { kind: "number" },
          performance_note: { kind: "string" },
          active: { kind: "boolean" },
        },
      },
      {
        entity: "prayer_risk",
        table: "int_risks",
        describe: "identified prayer-department risk",
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
        table: "int_training_records",
        describe: "team member's training/course completion record",
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
        "You are the TRoGKC Prayer & Intercession Assistant for the intercession department of a Christian church. " +
        "Ground every answer strictly in the JSON prayer snapshot supplied. Help with: triaging and prioritising prayer " +
        "requests, spotting overdue or neglected requests, designing prayer chains and watch rotas that close coverage " +
        "gaps, suggesting scripture-based prayer points and declarations, planning fasts and prayer nights, summarising " +
        "answered prayers and testimonies, and identifying intercessor burnout, training gaps and department risks. " +
        "Suggested scriptures may come from the Bible, but never invent people, requests, numbers or events that are not " +
        "in the snapshot. Treat anything marked confidential as protected — never reveal it. Reply with short headings " +
        "and bullets, in a pastoral, faith-filled but practical tone.",
      snapshot,
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "prayer assistant" },
    });

    return { answer, actions };
  });
