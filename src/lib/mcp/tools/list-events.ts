import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_events",
  title: "List events",
  description: "List upcoming TRoGKC events (services, meetings, outreaches) visible to the signed-in member.",
  inputSchema: {
    from: z.string().optional().describe("ISO date (YYYY-MM-DD) to list events from. Defaults to today."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum events to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, event_type, event_date, start_time, end_time, location, branch, department_slug")
      .gte("event_date", from ?? new Date().toISOString().slice(0, 10))
      .order("event_date", { ascending: true })
      .limit(limit ?? 25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
