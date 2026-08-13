import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_process_orders",
  title: "List process orders",
  description: "List event Process Orders with their status and readiness, optionally filtered by status.",
  inputSchema: {
    status: z.string().optional().describe("Filter by status, e.g. RUNNING, READY, OVERDUE, CLOSED."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("process_orders")
      .select("id, po_number, title, po_type, status, readiness_pct, starts_at, ends_at, venue, branch")
      .order("starts_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status.toUpperCase());
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { process_orders: data ?? [] },
    };
  },
});
