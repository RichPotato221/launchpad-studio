import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";
import { sanitizeHistory, type AgentMessage } from "@/lib/aiAgent";

type Ask = { question: string ; history?: AgentMessage[] };

/** AI Technical Operations Assistant (data-grounded, tool-calling). */
export const askTechnicalAssistant = createServerFn({ method: "POST" })
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
    const [productions, assets, maintenance, faults, inventory, team, streams, training, risks] = await Promise.all([
      sb.from("tech_productions").select("*").order("service_date", { ascending: false }).limit(60),
      sb.from("tech_assets").select("*").limit(400),
      sb.from("tech_maintenance").select("*").order("due_date").limit(300),
      sb.from("tech_faults").select("*").order("created_at", { ascending: false }).limit(200),
      sb.from("tech_inventory").select("*").limit(200),
      sb.from("tech_team_members").select("*").limit(200),
      sb.from("tech_streams").select("*").order("stream_date", { ascending: false }).limit(120),
      sb.from("tech_training_records").select("*").limit(300),
      sb.from("tech_risks").select("*").limit(200),
    ]);

    const snapshot = {
      productions: productions.data ?? [],
      assets: assets.data ?? [],
      maintenance: maintenance.data ?? [],
      open_faults: (faults.data ?? []).filter((f: any) => !["resolved", "closed"].includes(f.status)),
      inventory: inventory.data ?? [],
      team: team.data ?? [],
      streams: streams.data ?? [],
      training: training.data ?? [],
      risks: risks.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "production",
        table: "tech_productions",
        describe: "technical production plan for a service",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          theme: { kind: "string" },
          service_date: { kind: "date", requiredOnCreate: true },
          start_time: { kind: "string" },
          venue: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          service_type: { kind: "string" },
          preacher: { kind: "string" },
          worship_leader: { kind: "string" },
          service_flow: { kind: "json" },
          audio_plan: { kind: "string" },
          lighting_plan: { kind: "string" },
          camera_plan: { kind: "string" },
          livestream_plan: { kind: "string" },
          presentation_plan: { kind: "string" },
          technical_notes: { kind: "string" },
          audio_ready: { kind: "boolean" },
          visual_ready: { kind: "boolean" },
          livestream_ready: { kind: "boolean" },
          cameras_ready: { kind: "boolean" },
          lighting_ready: { kind: "boolean" },
          presentation_ready: { kind: "boolean" },
          internet_ok: { kind: "boolean" },
          power_ok: { kind: "boolean" },
          status: { kind: "string" },
        },
      },
      {
        entity: "tech_asset",
        table: "tech_assets",
        describe: "technical equipment asset",
        columns: {
          asset_number: { kind: "string" },
          name: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          subcategory: { kind: "string" },
          make: { kind: "string" },
          model: { kind: "string" },
          serial_number: { kind: "string" },
          barcode: { kind: "string" },
          qr_payload: { kind: "string" },
          purchase_date: { kind: "date" },
          purchase_cost: { kind: "number" },
          supplier: { kind: "string" },
          warranty_expiry: { kind: "date" },
          insurance_ref: { kind: "string" },
          replacement_date: { kind: "date" },
          condition: { kind: "string" },
          status: { kind: "string" },
          location: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          assigned_to: { kind: "string" },
          battery_level: { kind: "number" },
          photo_url: { kind: "string" },
          manual_url: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "maintenance_task",
        table: "tech_maintenance",
        describe: "equipment maintenance task",
        columns: {
          asset_id: { kind: "uuid" },
          task: { kind: "string", requiredOnCreate: true },
          maintenance_type: { kind: "string" },
          frequency: { kind: "string" },
          due_date: { kind: "date", requiredOnCreate: true },
          completed_on: { kind: "date" },
          cost: { kind: "number" },
          status: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "fault",
        table: "tech_faults",
        describe: "reported equipment fault",
        columns: {
          asset_id: { kind: "uuid" },
          fault_type: { kind: "string" },
          title: { kind: "string", requiredOnCreate: true },
          description: { kind: "string" },
          priority: { kind: "string" },
          status: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          assigned_to: { kind: "string" },
          resolution: { kind: "string" },
          resolved_at: { kind: "timestamptz" },
        },
      },
      {
        entity: "inventory_item",
        table: "tech_inventory",
        describe: "technical spares/consumables inventory item",
        columns: {
          item: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          unit: { kind: "string" },
          quantity: { kind: "number" },
          reorder_level: { kind: "number" },
          missing_count: { kind: "number" },
          location: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          unit_cost: { kind: "number" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "team_member",
        table: "tech_team_members",
        describe: "technical team member",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          role_title: { kind: "string" },
          skills: { kind: "string" },
          certifications: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          availability: { kind: "string" },
          email: { kind: "string" },
          phone: { kind: "string" },
          emergency_contact_name: { kind: "string" },
          emergency_contact_phone: { kind: "string" },
          status: { kind: "string" },
          attendance_pct: { kind: "number" },
          performance_score: { kind: "number" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "stream",
        table: "tech_streams",
        describe: "livestream technical run record",
        columns: {
          production_id: { kind: "uuid" },
          stream_date: { kind: "date", requiredOnCreate: true },
          platform: { kind: "string" },
          status: { kind: "string" },
          health: { kind: "string" },
          bitrate_kbps: { kind: "number" },
          resolution: { kind: "string" },
          internet_mbps: { kind: "number" },
          encoder: { kind: "string" },
          camera_status: { kind: "string" },
          audio_feed_ok: { kind: "boolean" },
          peak_viewers: { kind: "number" },
          total_views: { kind: "number" },
          uptime_pct: { kind: "number" },
          recording_url: { kind: "string" },
          incident_notes: { kind: "string" },
        },
      },
      {
        entity: "training_record",
        table: "tech_training_records",
        describe: "team member's training/course completion record",
        columns: {
          member_id: { kind: "uuid" },
          course_id: { kind: "uuid" },
          status: { kind: "string" },
          score: { kind: "number" },
          completed_on: { kind: "date" },
          expires_on: { kind: "date" },
          certificate_url: { kind: "string" },
        },
      },
      {
        entity: "tech_risk",
        table: "tech_risks",
        describe: "identified technical/operational risk",
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
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey,
      systemPrompt:
        "You are the TRoGKC Technical Operations Assistant for the sound & technical team of a Christian church. " +
        "Ground every answer strictly in the JSON technical snapshot supplied. Help with: service technical readiness, " +
        "sound and livestream troubleshooting, preventative maintenance schedules, equipment lifecycle and replacement " +
        "planning, spares and consumables, crew rostering and skills gaps, training plans, and technical risk mitigation. " +
        "Never invent equipment, people or numbers that are not in the snapshot. Keep answers concise with short headings " +
        "and bullets, and give practical step-by-step checks where a fault is involved.",
      snapshot,
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "technical assistant" },
    });

    return { answer, actions };
  });
