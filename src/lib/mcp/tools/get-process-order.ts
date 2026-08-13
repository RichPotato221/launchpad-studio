import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_process_order",
  title: "Get process order",
  description: "Get one Process Order by PO number, including its ministry activities and open exceptions.",
  inputSchema: { po_number: z.string().trim().min(1).describe("e.g. TROG-PO-2026-SUN-0001") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ po_number }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: po, error } = await supabase
      .from("process_orders")
      .select("*")
      .eq("po_number", po_number)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!po) return { content: [{ type: "text", text: `No process order found for ${po_number}` }], isError: true };

    const [{ data: activities }, { data: exceptions }] = await Promise.all([
      supabase
        .from("process_order_activities")
        .select("id, name, department_slug, criticality, status, completion_pct, due_at")
        .eq("process_order_id", po.id)
        .order("sort_order"),
      supabase
        .from("process_order_exceptions")
        .select("id, description, severity, status, department_slug")
        .eq("process_order_id", po.id)
        .neq("status", "CLOSED"),
    ]);

    const payload = { process_order: po, activities: activities ?? [], exceptions: exceptions ?? [] };
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});
