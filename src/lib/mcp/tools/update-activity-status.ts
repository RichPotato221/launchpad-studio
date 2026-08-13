import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const STATUSES = [
  "NOT_STARTED",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
  "OVERDUE",
  "WAIVED",
  "CANCELLED",
] as const;

export default defineTool({
  name: "update_activity_status",
  title: "Update ministry activity status",
  description: "Update the status of a single Process Order ministry activity and record it in the audit trail.",
  inputSchema: {
    activity_id: z.string().uuid().describe("The activity id returned by get_process_order."),
    status: z.enum(STATUSES),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ activity_id, status, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: existing, error: readError } = await supabase
      .from("process_order_activities")
      .select("id, process_order_id, name, status")
      .eq("id", activity_id)
      .maybeSingle();
    if (readError) return { content: [{ type: "text", text: readError.message }], isError: true };
    if (!existing) return { content: [{ type: "text", text: "Activity not found" }], isError: true };

    const done = status === "COMPLETED";
    const { error } = await supabase
      .from("process_order_activities")
      .update({
        status,
        completion_pct: done ? 100 : status === "IN_PROGRESS" ? 50 : 0,
        completed_by: done ? ctx.getUserId() : null,
        completed_at: done ? new Date().toISOString() : null,
        notes: notes ?? undefined,
      })
      .eq("id", activity_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    await supabase.from("process_order_audit").insert({
      process_order_id: existing.process_order_id,
      actor_id: ctx.getUserId(),
      actor_name: ctx.getUserEmail() ?? "MCP client",
      action: `Activity "${existing.name}" status changed`,
      entity: "activity",
      entity_id: activity_id,
      previous_status: existing.status,
      new_status: status,
      reason: notes ?? null,
    });

    return { content: [{ type: "text", text: `Activity updated to ${status}.` }] };
  },
});
