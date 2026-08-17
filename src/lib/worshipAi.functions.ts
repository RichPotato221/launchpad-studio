import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";
import { sanitizeHistory, type AgentMessage } from "@/lib/aiAgent";

type Ask = { question: string ; history?: AgentMessage[] };

/**
 * MODULE 12 — AI Worship Assistant (data-grounded, tool-calling).
 *
 * Can now act, not just advise: plan/update services and set-lists, log
 * rehearsals and attendance, manage the roster, track equipment and faults,
 * and record training/spiritual-formation activity — all through the same
 * conversation. The shared `songs` library is left read-only here since it's
 * a cross-department catalogue, not this department's own data.
 */
export const askWorshipAssistant = createServerFn({ method: "POST" })
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
    const [services, setSongs, songs, members, rehearsals, attendance, assignments, equipment, faults, risks, training, spiritual] =
      await Promise.all([
        sb.from("worship_services").select("*").order("service_date", { ascending: false }).limit(60),
        sb.from("worship_set_songs").select("*").limit(500),
        sb.from("songs").select("id, title, artist, song_key, tempo, themes, scripture_theme, ccli_number, licence_notes, times_used, last_used_on").limit(500),
        sb.from("worship_team_members").select("*").limit(300),
        sb.from("worship_rehearsals").select("*").order("rehearsal_date", { ascending: false }).limit(80),
        sb.from("worship_rehearsal_attendance").select("*").limit(1500),
        sb.from("worship_assignments").select("*").limit(1000),
        sb.from("worship_equipment").select("*").limit(300),
        sb.from("worship_equipment_faults").select("*").order("reported_on", { ascending: false }).limit(200),
        sb.from("worship_risks").select("*").limit(200),
        sb.from("worship_training_records").select("*").limit(500),
        sb.from("worship_spiritual_log").select("*").order("activity_date", { ascending: false }).limit(500),
      ]);

    const snapshot = {
      services: services.data ?? [],
      worship_sets: setSongs.data ?? [],
      music_library: songs.data ?? [],
      team: members.data ?? [],
      rehearsals: rehearsals.data ?? [],
      rehearsal_attendance: attendance.data ?? [],
      assignments: assignments.data ?? [],
      equipment: equipment.data ?? [],
      open_faults: (faults.data ?? []).filter((f: any) => !["resolved", "closed"].includes(f.status)),
      risks: risks.data ?? [],
      training: training.data ?? [],
      spiritual_formation: spiritual.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "service",
        table: "worship_services",
        describe: "Sunday/special worship service",
        columns: {
          service_date: { kind: "date", requiredOnCreate: true },
          title: { kind: "string", requiredOnCreate: true },
          service_type: { kind: "string" },
          start_time: { kind: "string", description: "24h time e.g. '09:30'." },
          theme: { kind: "string" },
          sermon_title: { kind: "string" },
          sermon_scriptures: { kind: "string" },
          preacher: { kind: "string" },
          worship_leader: { kind: "string" },
          venue: { kind: "string" },
          status: { kind: "string", enum: ["planning", "ready", "in_progress", "completed", "cancelled"] },
          set_approved: { kind: "boolean" },
          scriptures_loaded: { kind: "boolean" },
          stage_layout_ready: { kind: "boolean" },
          tech_team_confirmed: { kind: "boolean" },
          livestream_ready: { kind: "boolean" },
          backup_plan: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "set_song",
        table: "worship_set_songs",
        describe: "song placed in a service's worship set",
        columns: {
          service_id: { kind: "uuid", requiredOnCreate: true, description: "The service this song belongs to." },
          song_id: { kind: "uuid", description: "Id from the music_library, if this song is catalogued." },
          order_index: { kind: "number" },
          song_key: { kind: "string" },
          segment: { kind: "string", enum: ["call_to_worship", "worship", "praise", "altar", "offering", "closing", "other"] },
          duration_seconds: { kind: "number" },
          transition_note: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "team_member",
        table: "worship_team_members",
        describe: "worship team roster member (vocalist, musician, technician)",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          role_title: { kind: "string" },
          instruments: { kind: "text[]" },
          vocal_range: { kind: "string" },
          skills: { kind: "string" },
          availability: { kind: "string" },
          mentor: { kind: "string" },
          experience_years: { kind: "number" },
          email: { kind: "string" },
          phone: { kind: "string" },
          status: { kind: "string", enum: ["active", "inactive", "on_leave"] },
          performance_score: { kind: "number" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "rehearsal",
        table: "worship_rehearsals",
        describe: "team rehearsal",
        columns: {
          service_id: { kind: "uuid", description: "The service being rehearsed for, if any." },
          rehearsal_date: { kind: "date", requiredOnCreate: true },
          start_time: { kind: "string" },
          venue: { kind: "string" },
          objectives: { kind: "string" },
          practice_notes: { kind: "string" },
          technical_runthrough: { kind: "boolean" },
          prayer_session: { kind: "boolean" },
          recording_url: { kind: "string" },
          readiness_score: { kind: "number" },
          status: { kind: "string", enum: ["scheduled", "completed", "cancelled"] },
        },
      },
      {
        entity: "rehearsal_attendance",
        table: "worship_rehearsal_attendance",
        describe: "attendance record of a team member at a rehearsal",
        columns: {
          rehearsal_id: { kind: "uuid", requiredOnCreate: true },
          member_id: { kind: "uuid", requiredOnCreate: true },
          present: { kind: "boolean" },
          on_time: { kind: "boolean" },
          prepared: { kind: "boolean" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "assignment",
        table: "worship_assignments",
        describe: "team member's role assignment for a service",
        columns: {
          service_id: { kind: "uuid", requiredOnCreate: true },
          member_id: { kind: "uuid", requiredOnCreate: true },
          role_title: { kind: "string", requiredOnCreate: true },
          response: { kind: "string", enum: ["pending", "accepted", "declined"] },
          notes: { kind: "string" },
        },
      },
      {
        entity: "equipment",
        table: "worship_equipment",
        describe: "worship/tech equipment asset",
        columns: {
          asset_number: { kind: "string" },
          name: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          serial_number: { kind: "string" },
          purchase_date: { kind: "date" },
          warranty_expiry: { kind: "date" },
          condition: { kind: "string", enum: ["good", "fair", "poor"] },
          status: { kind: "string", enum: ["in_service", "in_repair", "retired"] },
          assigned_to: { kind: "string" },
          location: { kind: "string" },
          last_service_date: { kind: "date" },
          next_service_date: { kind: "date" },
          replacement_year: { kind: "number" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "equipment_fault",
        table: "worship_equipment_faults",
        describe: "reported fault on an equipment asset",
        columns: {
          equipment_id: { kind: "uuid", requiredOnCreate: true },
          reported_on: { kind: "date" },
          description: { kind: "string", requiredOnCreate: true },
          severity: { kind: "string", enum: ["low", "medium", "high", "critical"] },
          status: { kind: "string", enum: ["open", "in_progress", "resolved", "closed"] },
          resolution: { kind: "string" },
          resolved_on: { kind: "date" },
        },
      },
      {
        entity: "risk",
        table: "worship_risks",
        describe: "identified operational/ministry risk",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          description: { kind: "string" },
          likelihood: { kind: "number", description: "1–5." },
          impact: { kind: "number", description: "1–5." },
          mitigation: { kind: "string" },
          owner: { kind: "string" },
          review_date: { kind: "date" },
          status: { kind: "string", enum: ["open", "mitigated", "closed"] },
          escalation_level: { kind: "string", enum: ["department", "leadership", "senior_apostle"] },
        },
      },
      {
        entity: "training_record",
        table: "worship_training_records",
        describe: "team member's enrolment/completion of a worship course",
        columns: {
          course_id: { kind: "uuid", requiredOnCreate: true },
          member_id: { kind: "uuid", requiredOnCreate: true },
          status: { kind: "string", enum: ["enrolled", "in_progress", "completed", "lapsed"] },
          completed_on: { kind: "date" },
          score: { kind: "number" },
          certificate_url: { kind: "string" },
          renewal_due: { kind: "date" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "spiritual_log_entry",
        table: "worship_spiritual_log",
        describe: "spiritual formation activity log for a team member (prayer, fasting, mentoring, etc)",
        columns: {
          member_id: { kind: "uuid" },
          activity_type: { kind: "string", enum: ["prayer", "fasting", "mentoring", "devotion", "counsel", "other"] },
          activity_date: { kind: "date" },
          detail: { kind: "string" },
        },
      },
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey,
      systemPrompt:
        "You are the TRoGKC Worship Operations Assistant, advising the worship and music ministry of a Christian " +
        "church. Ground every answer strictly in the JSON worship snapshot supplied. Help with: building worship " +
        "sets that match a sermon theme and scripture, rehearsal plans, scheduling and burnout risk, equipment " +
        "servicing, volunteer development, spiritual formation of the team, and ministry reports. The music_library " +
        "is read-only reference data — never invent songs, ids, or names that are not in the snapshot; if you " +
        "suggest well-known songs outside the library, label them clearly as suggestions to add manually. Keep " +
        "answers concise, with short headings and bullets, and always keep the focus on ministering to the Lord " +
        "in Spirit and truth.",
      snapshot,
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "worship assistant" },
    });

    return { answer, actions };
  });
