import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";

type Ask = { question: string };

/**
 * MODULE 13 — AI Children's Ministry Assistant (data-grounded, tool-calling).
 *
 * The context snapshot deliberately stays aggregated/anonymised (counts and
 * flags, not raw child records with medical/allergy detail) — this is
 * children's safeguarding data and should not be pasted into an LLM prompt
 * wholesale. Write tools operate directly on the database by id instead, so
 * the assistant can still act (log a check-in, update a classroom, close an
 * incident) without ever needing a child's medical detail in its context.
 */
export const askKidsAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    return { question: input.question.trim().slice(0, 800) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");

    const sb = supabase as any;
    const [children, checkins, rooms, volunteers, incidents, milestones, lessons] = await Promise.all([
      sb.from("children").select("age_group, status, branch, allergies, medical_conditions, special_needs").limit(1000),
      sb.from("kids_checkins").select("service_date, is_first_time, checked_out_at, branch").order("service_date", { ascending: false }).limit(1000),
      sb.from("kids_classrooms").select("id, name, capacity, active, age_min, age_max"),
      sb.from("kids_volunteers").select("id, full_name, status, role_title, background_check_status, background_check_expiry, safeguarding_expiry, services_attended, services_missed"),
      sb.from("kids_incidents").select("id, incident_type, severity, status, occurred_at").order("occurred_at", { ascending: false }).limit(200),
      sb.from("kids_milestones").select("milestone_type, achieved_on").limit(1000),
      sb.from("kids_lessons").select("id, title, theme, age_group, status, scheduled_date").limit(200),
    ]);

    const snapshot = {
      children_total: children.data?.length ?? 0,
      children_by_age: (children.data ?? []).reduce((a: Record<string, number>, c: any) => {
        const k = c.age_group ?? "unassigned"; a[k] = (a[k] ?? 0) + 1; return a;
      }, {}),
      care_alerts: (children.data ?? []).filter((c: any) => c.allergies || c.medical_conditions || c.special_needs).length,
      recent_checkins: checkins.data?.length ?? 0,
      first_timers: (checkins.data ?? []).filter((c: any) => c.is_first_time).length,
      missing_checkouts: (checkins.data ?? []).filter((c: any) => !c.checked_out_at).length,
      classrooms: rooms.data ?? [],
      volunteers: volunteers.data ?? [],
      open_incidents: (incidents.data ?? []).filter((i: any) => !["resolved", "closed"].includes(i.status)),
      incident_mix: (incidents.data ?? []).reduce((a: Record<string, number>, i: any) => { a[i.incident_type] = (a[i.incident_type] ?? 0) + 1; return a; }, {}),
      milestones: (milestones.data ?? []).reduce((a: Record<string, number>, m: any) => { a[m.milestone_type] = (a[m.milestone_type] ?? 0) + 1; return a; }, {}),
      curriculum: lessons.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "child",
        table: "children",
        describe: "child registered with the children's ministry",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          nickname: { kind: "string" },
          date_of_birth: { kind: "date" },
          gender: { kind: "string" },
          age_group: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          address: { kind: "string" },
          medical_conditions: { kind: "string" },
          allergies: { kind: "string" },
          medication: { kind: "string" },
          special_needs: { kind: "string" },
          notes: { kind: "string" },
          classroom_id: { kind: "uuid" },
          status: { kind: "string" },
          consent_media: { kind: "boolean" },
          consent_medical: { kind: "boolean" },
          consent_signed_by: { kind: "string" },
        },
      },
      {
        entity: "checkin",
        table: "kids_checkins",
        describe: "child check-in/check-out record",
        columns: {
          child_id: { kind: "uuid", requiredOnCreate: true },
          classroom_id: { kind: "uuid" },
          service_date: { kind: "date" },
          checked_in_at: { kind: "timestamptz" },
          method: { kind: "string" },
          checked_out_at: { kind: "timestamptz" },
          released_to: { kind: "string" },
          is_first_time: { kind: "boolean" },
          late_arrival: { kind: "boolean" },
          notes: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
        },
      },
      {
        entity: "classroom",
        table: "kids_classrooms",
        describe: "children's ministry classroom",
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          age_min: { kind: "number" },
          age_max: { kind: "number" },
          capacity: { kind: "number" },
          teacher_id: { kind: "uuid" },
          assistant_id: { kind: "uuid" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          room: { kind: "string" },
          notes: { kind: "string" },
          active: { kind: "boolean" },
        },
      },
      {
        entity: "kids_volunteer",
        table: "kids_volunteers",
        describe: "children's ministry volunteer/teacher",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          role_title: { kind: "string" },
          classroom_id: { kind: "uuid" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          phone: { kind: "string" },
          emergency_contact: { kind: "string" },
          skills: { kind: "string" },
          availability: { kind: "string" },
          status: { kind: "string" },
          background_check_status: { kind: "string" },
          background_check_expiry: { kind: "date" },
          safeguarding_expiry: { kind: "date" },
          services_attended: { kind: "number" },
          services_missed: { kind: "number" },
          total_hours: { kind: "number" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "incident",
        table: "kids_incidents",
        describe: "safeguarding/safety incident involving a child",
        columns: {
          child_id: { kind: "uuid" },
          classroom_id: { kind: "uuid" },
          incident_type: { kind: "string" },
          severity: { kind: "string" },
          occurred_at: { kind: "timestamptz" },
          description: { kind: "string", requiredOnCreate: true },
          action_taken: { kind: "string" },
          assigned_to: { kind: "uuid" },
          status: { kind: "string" },
          resolution: { kind: "string" },
          resolved_at: { kind: "timestamptz" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
        },
      },
      {
        entity: "milestone",
        table: "kids_milestones",
        describe: "spiritual/developmental milestone achieved by a child",
        columns: {
          child_id: { kind: "uuid", requiredOnCreate: true },
          milestone_type: { kind: "string", requiredOnCreate: true },
          detail: { kind: "string" },
          achieved_on: { kind: "date" },
        },
      },
      {
        entity: "lesson",
        table: "kids_lessons",
        describe: "curriculum lesson plan",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          scripture: { kind: "string" },
          theme: { kind: "string" },
          age_group: { kind: "string" },
          objectives: { kind: "string" },
          memory_verse: { kind: "string" },
          teaching_notes: { kind: "string" },
          activities: { kind: "string" },
          games: { kind: "string" },
          crafts: { kind: "string" },
          video_url: { kind: "string" },
          songs: { kind: "string" },
          discussion_questions: { kind: "string" },
          homework: { kind: "string" },
          assessment: { kind: "string" },
          resources_url: { kind: "string" },
          scheduled_date: { kind: "date" },
          status: { kind: "string" },
        },
      },
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey,
      systemPrompt:
        "You are the TRoGKC Children's Ministry Assistant. You advise the children's ministry leadership of a Christian church. " +
        "Ground every answer strictly in the JSON ministry snapshot supplied (which is intentionally aggregated, not raw child " +
        "records, to protect safeguarding data). Be practical and pastoral: give age-appropriate teaching ideas, safeguarding " +
        "guidance, volunteer scheduling advice, curriculum suggestions with scripture, attendance interpretation, and parent-" +
        "communication drafts. Always flag safeguarding or child-protection risks first. Never invent numbers. Keep answers " +
        "concise with short headings and bullets. When asked to record something (a check-in, an incident, a classroom change, " +
        "a milestone), use the tools directly by id — do not ask the leader to paste medical or allergy detail into the chat " +
        "unnecessarily; only request what the specific action needs.",
      snapshot,
      question: data.question,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "kids ministry assistant" },
    });

    return { answer, actions };
  });
