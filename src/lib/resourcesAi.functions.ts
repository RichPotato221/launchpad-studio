import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, type TableSpec } from "@/lib/aiAgent";

type Ask = { question: string };

/**
 * AI Resource Assistant (data-grounded, tool-calling) — Office of the Resource Administrator.
 * Note: the previous version queried a non-existent "assets" table; that has been dropped here
 * since it always returned an error silently swallowed by `?? []`.
 */
export const askResourceAssistant = createServerFn({ method: "POST" })
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
    const [facilities, tickets, schedules, requests, checkouts, projects, inventory, risks, training, bookings, procurement] =
      await Promise.all([
        sb.from("res_facilities").select("*").limit(200),
        sb.from("res_maintenance_tickets").select("*").order("created_at", { ascending: false }).limit(300),
        sb.from("res_maintenance_schedules").select("*").limit(200),
        sb.from("res_requests").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("res_asset_checkouts").select("*").order("checked_out_at", { ascending: false }).limit(300),
        sb.from("res_projects").select("*").limit(150),
        sb.from("res_inventory_items").select("*").limit(300),
        sb.from("res_risks").select("*").limit(200),
        sb.from("res_training_records").select("*").limit(300),
        sb.from("res_bookings").select("*").order("starts_at", { ascending: false }).limit(200),
        sb.from("purchase_requests").select("id, pr_number, title, department_slug, status, amount_estimated, needed_by").limit(150),
      ]);

    const snapshot = {
      today: new Date().toISOString().slice(0, 10),
      facilities: facilities.data ?? [],
      maintenance_tickets: tickets.data ?? [],
      maintenance_schedules: schedules.data ?? [],
      resource_requests: requests.data ?? [],
      checkouts: checkouts.data ?? [],
      development_projects: projects.data ?? [],
      inventory: inventory.data ?? [],
      risks: risks.data ?? [],
      training: training.data ?? [],
      bookings: bookings.data ?? [],
      procurement: procurement.data ?? [],
    };

    const specs: TableSpec[] = [
      {
        entity: "facility",
        table: "res_facilities",
        describe: "physical facility/room/building",
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          facility_type: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          building: { kind: "string" },
          floor: { kind: "string" },
          room_number: { kind: "string" },
          capacity: { kind: "number" },
          description: { kind: "string" },
          status: { kind: "string" },
          cleaning_schedule: { kind: "string" },
          maintenance_schedule: { kind: "string" },
          last_safety_inspection: { kind: "date" },
          next_safety_inspection: { kind: "date" },
          safety_status: { kind: "string" },
          access_notes: { kind: "string" },
          photo_urls: { kind: "json" },
          floor_plan_url: { kind: "string" },
          pos_x: { kind: "number" },
          pos_y: { kind: "number" },
        },
      },
      {
        entity: "maintenance_ticket",
        table: "res_maintenance_tickets",
        describe: "maintenance/fault ticket for an asset or facility",
        columns: {
          ticket_number: { kind: "string" },
          title: { kind: "string", requiredOnCreate: true },
          fault_type: { kind: "string" },
          maintenance_kind: { kind: "string" },
          description: { kind: "string" },
          asset_id: { kind: "uuid" },
          facility_id: { kind: "uuid" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          priority: { kind: "string" },
          status: { kind: "string" },
          technician: { kind: "string" },
          assigned_to: { kind: "uuid" },
          estimated_cost: { kind: "number" },
          actual_cost: { kind: "number" },
          parts_used: { kind: "string" },
          labour_hours: { kind: "number" },
          downtime_hours: { kind: "number" },
          root_cause: { kind: "string" },
          due_date: { kind: "date" },
          completed_at: { kind: "timestamptz" },
          before_photo_urls: { kind: "json" },
          after_photo_urls: { kind: "json" },
        },
      },
      {
        entity: "maintenance_schedule",
        table: "res_maintenance_schedules",
        describe: "recurring/preventive maintenance schedule",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          asset_id: { kind: "uuid" },
          facility_id: { kind: "uuid" },
          trigger_type: { kind: "string" },
          frequency: { kind: "string" },
          usage_hours_interval: { kind: "number" },
          instructions: { kind: "string" },
          last_done_on: { kind: "date" },
          next_due_on: { kind: "date" },
          responsible: { kind: "string" },
          active: { kind: "boolean" },
        },
      },
      {
        entity: "resource_request",
        table: "res_requests",
        describe: "request from a department for equipment/facility/resource",
        columns: {
          request_number: { kind: "string" },
          title: { kind: "string", requiredOnCreate: true },
          purpose: { kind: "string" },
          event_name: { kind: "string" },
          department_slug: { kind: "string", requiredOnCreate: true, description: "The requesting department's slug." },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          requested_by: { kind: "uuid" },
          responsible_officer: { kind: "uuid" },
          start_date: { kind: "date" },
          return_date: { kind: "date" },
          priority: { kind: "string" },
          budget_impact: { kind: "number" },
          status: { kind: "string" },
          issued_at: { kind: "timestamptz" },
          returned_at: { kind: "timestamptz" },
          inspected_at: { kind: "timestamptz" },
          inspection_notes: { kind: "string" },
          procurement_request_id: { kind: "uuid" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "asset_checkout",
        table: "res_asset_checkouts",
        describe: "asset checked out to a department/person",
        columns: {
          asset_id: { kind: "uuid", requiredOnCreate: true },
          request_id: { kind: "uuid" },
          checked_out_to: { kind: "uuid" },
          holder_name: { kind: "string" },
          department_slug: { kind: "string" },
          purpose: { kind: "string" },
          quantity: { kind: "number" },
          checked_out_at: { kind: "timestamptz" },
          due_back_at: { kind: "timestamptz" },
          checked_in_at: { kind: "timestamptz" },
          condition_out: { kind: "string" },
          condition_in: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "development_project",
        table: "res_projects",
        describe: "church facility/infrastructure development project",
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          project_type: { kind: "string" },
          description: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          facility_id: { kind: "uuid" },
          department_slug: { kind: "string" },
          contractor: { kind: "string" },
          budget: { kind: "number" },
          spent: { kind: "number" },
          start_date: { kind: "date" },
          target_end_date: { kind: "date" },
          actual_end_date: { kind: "date" },
          completion_pct: { kind: "number" },
          status: { kind: "string" },
          risks: { kind: "string" },
          approvals: { kind: "string" },
          resource_usage: { kind: "string" },
          photo_urls: { kind: "json" },
          document_urls: { kind: "json" },
          owner_id: { kind: "uuid" },
        },
      },
      {
        entity: "inventory_item",
        table: "res_inventory_items",
        describe: "general resources inventory item",
        columns: {
          name: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          unit: { kind: "string" },
          quantity_on_hand: { kind: "number" },
          minimum_stock: { kind: "number" },
          maximum_stock: { kind: "number" },
          unit_cost: { kind: "number" },
          supplier_id: { kind: "uuid" },
          storage_location: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          expiry_date: { kind: "date" },
          last_counted_on: { kind: "date" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "resource_risk",
        table: "res_risks",
        describe: "identified resource/facility risk",
        columns: {
          title: { kind: "string", requiredOnCreate: true },
          category: { kind: "string" },
          description: { kind: "string" },
          likelihood: { kind: "number", description: "1–5" },
          impact: { kind: "number", description: "1–5" },
          mitigation: { kind: "string" },
          owner_name: { kind: "string" },
          owner_id: { kind: "uuid" },
          review_date: { kind: "date" },
          status: { kind: "string", enum: ["open", "mitigated", "closed"] },
          asset_id: { kind: "uuid" },
          facility_id: { kind: "uuid" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
        },
      },
      {
        entity: "training_record",
        table: "res_training_records",
        describe: "person's equipment/safety training record",
        columns: {
          person_name: { kind: "string", requiredOnCreate: true },
          course: { kind: "string", requiredOnCreate: true },
          competency_level: { kind: "string" },
          completed_on: { kind: "date" },
          expiry_date: { kind: "date" },
          certificate_url: { kind: "string" },
          status: { kind: "string" },
          notes: { kind: "string" },
        },
      },
      {
        entity: "booking",
        table: "res_bookings",
        describe: "facility/asset booking",
        columns: {
          facility_id: { kind: "uuid" },
          asset_id: { kind: "uuid" },
          event_id: { kind: "uuid" },
          title: { kind: "string", requiredOnCreate: true },
          purpose: { kind: "string" },
          department_slug: { kind: "string" },
          branch: { kind: "string", enum: ["twatwa", "joburg_north", "joburg_south"] },
          requested_by: { kind: "uuid" },
          starts_at: { kind: "timestamptz", requiredOnCreate: true },
          ends_at: { kind: "timestamptz", requiredOnCreate: true },
          status: { kind: "string" },
          waitlisted: { kind: "boolean" },
          notes: { kind: "string" },
        },
      },
    ];

    const { answer, actions } = await runAgentTurn({
      apiKey,
      systemPrompt:
        "You are the TRoGKC Resource Assistant for the Office of the Resource Administrator — the department that hosts " +
        "every physical resource in the church. Ground every answer strictly in the JSON resource snapshot supplied. " +
        "Help with: asset replacement planning, warranty and insurance expiry, overdue and preventive maintenance, " +
        "equipment redistribution between branches and departments, utilisation and idle assets, facility readiness and " +
        "safety compliance, inventory reorder points, procurement triggers, booking conflicts, church development project " +
        "delivery, and resource risk. Give predictive insight and clear recommendations with figures where the data allows. " +
        "Never invent assets, people, facilities or numbers that are not in the snapshot. Keep answers concise with short " +
        "headings and bullets.",
      snapshot,
      question: data.question,
      specs,
      ctx: { supabase: sb, userId, actorLabel: "resources assistant" },
    });

    return { answer, actions };
  });
