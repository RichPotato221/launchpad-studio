import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";
import { sanitizeHistory, type AgentMessage } from "@/lib/aiAgent";

type Ask = { question: string ; history?: AgentMessage[] };

/** AI Ushering Assistant (data-grounded, tool-calling). */
export const askUsheringAssistant = createServerFn({ method: "POST" })
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
    const [services, volunteers, roster, visitors, seating, attendance, incidents, care, risks, training] =
      await Promise.all([
        sb.from("ush_services").select("*").order("service_date", { ascending: false }).limit(80),
        sb.from("ush_volunteers").select("*").limit(300),
        sb.from("ush_roster").select("*").order("created_at", { ascending: false }).limit(400),
        sb.from("ush_visitors").select("*").order("created_at", { ascending: false }).limit(300),
        sb.from("ush_seating").select("*").limit(200),
        sb.from("ush_attendance").select("*").order("service_date", { ascending: false }).limit(120),
        sb.from("ush_incidents").select("*").order("occurred_at", { ascending: false }).limit(200),
        sb.from("ush_care").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("ush_risks").select("*").limit(200),
        sb.from("ush_training_records").select("*").limit(300),
      ]);

    const snapshot = {
      services: services.data ?? [],
      volunteers: volunteers.data ?? [],
      roster: roster.data ?? [],
      visitors: visitors.data ?? [],
      seating: seating.data ?? [],
      attendance: attendance.data ?? [],
      incidents: incidents.data ?? [],
      care: care.data ?? [],
      risks: risks.data ?? [],
      training: training.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "ushering_service",
        table: "ush_services",
        describe: "service being staffed by ushering",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          service_type: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          venue: { kind: "string" },
          service_date: { kind: "date" },
          starts_at: { kind: "timestamptz" },
          ends_at: { kind: "timestamptz" },
          expected_attendance: { kind: "number" },
          seating_capacity: { kind: "number" },
          status: { kind: "string" },
          checklist: { kind: "json" },
          service_lead: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "ushering_volunteer",
        table: "ush_volunteers",
        describe: "ushering team volunteer",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          photo_url: { kind: "string" },
          phone: { kind: "string" },
          email: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          team: { kind: "string" },
          role: { kind: "string" },
          section: { kind: "string" },
          availability: { kind: "string" },
          training_status: { kind: "string" },
          certifications: { kind: "json" },
          emergency_contact: { kind: "string" },
          emergency_phone: { kind: "string" },
          performance_rating: { kind: "number" },
          services_served: { kind: "number" },
          ministry_experience: { kind: "string" },
          mentor_name: { kind: "string" },
          active: { kind: "boolean" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "roster_entry",
        table: "ush_roster",
        describe: "volunteer's duty assignment for a service",
        columns: {
          service_id: { kind: "uuid", requiredOnCreate: true },
          volunteer_id: { kind: "uuid", requiredOnCreate: true },
          volunteer_name: { kind: "string" },
          duty: { kind: "string" },
          section: { kind: "string" },
          status: { kind: "string" },
          is_backup: { kind: "boolean" },
          checked_in_at: { kind: "timestamptz" },
          swap_with: { kind: "string" },
          leave_reason: { kind: "string" },
          reminder_sent: { kind: "boolean" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "visitor",
        table: "ush_visitors",
        describe: "visitor/guest welcomed at a service",
        columns: {
          service_id: { kind: "uuid" },
          full_name: { kind: "string", requiredOnCreate: true },
          phone: { kind: "string" },
          email: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          family_members: { kind: "number" },
          children: { kind: "number" },
          visitor_type: { kind: "string" },
          invited_by: { kind: "string" },
          prayer_request: { kind: "string" },
          interests: { kind: "string" },
          badge_code: { kind: "string" },
          welcome_sms_sent: { kind: "boolean" },
          welcome_email_sent: { kind: "boolean" },
          followup_status: { kind: "string" },
          followup_owner: { kind: "string" },
          assigned_pathway: { kind: "string" },
          satisfaction: { kind: "number" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "seating_section",
        table: "ush_seating",
        describe: "seating section/zone for a service",
        columns: {
          service_id: { kind: "uuid" },
          section: { kind: "string", requiredOnCreate: true },
          zone_type: { kind: "string" },
          capacity: { kind: "number" },
          occupied: { kind: "number" },
          reserved: { kind: "number" },
          usher_name: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "attendance_record",
        table: "ush_attendance",
        describe: "service attendance headcount",
        columns: {
          service_id: { kind: "uuid" },
          service_date: { kind: "date" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          adults: { kind: "number" },
          children: { kind: "number" },
          first_timers: { kind: "number" },
          returning_visitors: { kind: "number" },
          vip_guests: { kind: "number" },
          volunteers_present: { kind: "number" },
          peak_arrival_time: { kind: "string" },
          avg_entry_minutes: { kind: "number" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "incident",
        table: "ush_incidents",
        describe: "safety/security incident during a service",
        columns: {
          service_id: { kind: "uuid" },
          incident_type: { kind: "string" },
          severity: { kind: "string" },
          occurred_at: { kind: "timestamptz" },
          location: { kind: "string" },
          description: { kind: "string", requiredOnCreate: true },
          witnesses: { kind: "string" },
          actions_taken: { kind: "string" },
          responsible_leader: { kind: "string" },
          photo_url: { kind: "string" },
          escalated_to: { kind: "string" },
          followup_status: { kind: "string" },
          resolution: { kind: "string" },
          response_minutes: { kind: "number" },
        },
      },
      {
        entity: "care_case",
        table: "ush_care",
        describe: "congregational-care case handled during a service (elderly, unwell, special assistance)",
        columns: {
          service_id: { kind: "uuid" },
          member_name: { kind: "string", requiredOnCreate: true },
          care_group: { kind: "string" },
          assistance_requested: { kind: "string" },
          assistance_provided: { kind: "string" },
          assigned_volunteer: { kind: "string" },
          followup_required: { kind: "boolean" },
          followup_notes: { kind: "string" },
          status: { kind: "string" },
        },
      },
      {
        entity: "ushering_risk",
        table: "ush_risks",
        describe: "identified ushering/safety risk",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          description: { kind: "string" },
          likelihood: { kind: "number", description: "1–5" },
          impact: { kind: "number", description: "1–5" },
          owner_name: { kind: "string" },
          mitigation: { kind: "string" },
          review_date: { kind: "date" },
          status: { kind: "string", enum: ["open", "mitigated", "closed"] },
        },
      },
      {
        entity: "training_record",
        table: "ush_training_records",
        describe: "team member's training/course completion record",
        columns: {
          course_id: { kind: "uuid", requiredOnCreate: true },
          member_name: { kind: "string" },
          progress_pct: { kind: "number" },
          score: { kind: "number" },
          certificate_url: { kind: "string" },
          expires_on: { kind: "date" },
          completed_at: { kind: "date" },
        },
      },
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey,
      systemPrompt:
        "You are the TRoGKC Ushering Assistant for the ushering, protocol and congregational care ministry of a " +
        "Christian church. Ground every answer strictly in the JSON ushering snapshot supplied. Help with: service " +
        "readiness checklists, roster coverage gaps and fair rotation, volunteer availability, training and " +
        "certification expiry, seating and crowd flow, first-timer follow-up, congregational care for the elderly, " +
        "children and the unwell, incident trends and safety improvements, attendance patterns, and department " +
        "risks. Never invent people, numbers, incidents or visitors that are not in the snapshot. Answer concisely " +
        "with short headings, bullets and clear numbers, in a warm, servant-hearted tone.",
      snapshot,
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "ushering assistant" },
    });

    return { answer, actions };
  });
