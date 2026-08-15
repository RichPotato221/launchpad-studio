import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";

type Ask = { question: string };

/** AI Hospitality Assistant (data-grounded, tool-calling). */
export const askHospitalityAssistant = createServerFn({ method: "POST" })
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
    const [events, guests, volunteers, inventory, menus, tasks, risks, training] = await Promise.all([
      sb.from("hos_events").select("*").order("starts_at", { ascending: false }).limit(120),
      sb.from("hos_guests").select("*").order("created_at", { ascending: false }).limit(300),
      sb.from("hos_volunteers").select("*").limit(200),
      sb.from("hos_inventory").select("*").limit(400),
      sb.from("hos_menus").select("*").order("service_date", { ascending: false }).limit(120),
      sb.from("hos_tasks").select("*").order("due_date").limit(300),
      sb.from("hos_risks").select("*").limit(200),
      sb.from("hos_training_records").select("*").limit(300),
    ]);

    const snapshot = {
      events: events.data ?? [],
      guests: guests.data ?? [],
      volunteers: volunteers.data ?? [],
      inventory: inventory.data ?? [],
      menus: menus.data ?? [],
      tasks: tasks.data ?? [],
      risks: risks.data ?? [],
      training: training.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "hospitality_event",
        table: "hos_events",
        describe: "hospitality event needing catering/venue prep",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          event_type: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          venue: { kind: "string" },
          starts_at: { kind: "timestamptz", requiredOnCreate: true },
          ends_at: { kind: "timestamptz" },
          expected_attendance: { kind: "number" },
          vip_guests: { kind: "string" },
          catering_notes: { kind: "string" },
          seating_notes: { kind: "string" },
          equipment_needed: { kind: "string" },
          budget_amount: { kind: "number" },
          actual_spend: { kind: "number" },
          checklist: { kind: "json" },
          volunteers_assigned: { kind: "string" },
          risk_notes: { kind: "string" },
          readiness_pct: { kind: "number" },
          status: { kind: "string" },
        },
      },
      {
        entity: "guest",
        table: "hos_guests",
        describe: "guest/first-timer tracked by hospitality",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          family_name: { kind: "string" },
          phone: { kind: "string" },
          email: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          first_visit_date: { kind: "date" },
          invited_by: { kind: "string" },
          interests: { kind: "string" },
          special_needs: { kind: "string" },
          dietary_requirements: { kind: "string" },
          vip: { kind: "boolean" },
          visits: { kind: "number" },
          follow_up_status: { kind: "string" },
          follow_up_owner_id: { kind: "uuid" },
          satisfaction_score: { kind: "number" },
          feedback: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "hospitality_volunteer",
        table: "hos_volunteers",
        describe: "hospitality team volunteer",
        columns: {
          full_name: { kind: "string", requiredOnCreate: true },
          role: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          phone: { kind: "string" },
          email: { kind: "string" },
          availability: { kind: "string" },
          skills: { kind: "string" },
          food_handling_certificate: { kind: "boolean" },
          training_completed: { kind: "string" },
          emergency_contact: { kind: "string" },
          medical_notes: { kind: "string" },
          serving_since: { kind: "date" },
          attendance_pct: { kind: "number" },
          reliability_score: { kind: "number" },
          recognition_points: { kind: "number" },
          current_assignment: { kind: "string" },
          performance_note: { kind: "string" },
          active: { kind: "boolean" },
        },
      },
      {
        entity: "inventory_item",
        table: "hos_inventory",
        describe: "hospitality stock/inventory item",
        columns: {
          item_code: { kind: "string" },
          name: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          quantity: { kind: "number" },
          unit: { kind: "string" },
          min_stock: { kind: "number" },
          max_stock: { kind: "number" },
          supplier: { kind: "string" },
          purchase_date: { kind: "date" },
          expiry_date: { kind: "date" },
          storage_location: { kind: "string" },
          unit_value: { kind: "number" },
          condition: { kind: "string" },
          assigned_to: { kind: "string" },
        },
      },
      {
        entity: "menu",
        table: "hos_menus",
        describe: "catering menu for a service/event",
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          service_date: { kind: "date" },
          menu_items: { kind: "string" },
          dietary_options: { kind: "string" },
          kitchen_team: { kind: "string" },
          serving_time: { kind: "string" },
          estimated_servings: { kind: "number" },
          food_cost: { kind: "number" },
          waste_note: { kind: "string" },
          hygiene_checked: { kind: "boolean" },
          cleaning_checklist: { kind: "json" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "hospitality_task",
        table: "hos_tasks",
        describe: "hospitality task/action item",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          task_type: { kind: "string" },
          description: { kind: "string" },
          event_id: { kind: "uuid" },
          assigned_to: { kind: "uuid" },
          assignee_name: { kind: "string" },
          priority: { kind: "string" },
          due_date: { kind: "date" },
          progress_pct: { kind: "number" },
          status: { kind: "string" },
          checklist: { kind: "json" },
          evidence_url: { kind: "string" },
          comments: { kind: "string" },
          recurring: { kind: "string" },
        },
      },
      {
        entity: "hospitality_risk",
        table: "hos_risks",
        describe: "identified hospitality risk",
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
        table: "hos_training_records",
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
        "You are the TRoGKC Hospitality Assistant for the hospitality ministry of a Christian church. " +
        "Ground every answer strictly in the JSON hospitality snapshot supplied. Help with: event readiness and " +
        "checklists, catering quantities and menu planning for the expected attendance, stock levels, reorder points " +
        "and expiring items, supplier and budget control, volunteer rostering and burnout, guest care and first-timer " +
        "follow-up, food hygiene and health-and-safety compliance, and department risks. Never invent guests, stock, " +
        "people or numbers that are not in the snapshot. Keep answers concise with short headings, bullets and clear " +
        "quantities, in a warm, servant-hearted tone.",
      snapshot,
      question: data.question,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "hospitality assistant" },
    });

    return { answer, actions };
  });
