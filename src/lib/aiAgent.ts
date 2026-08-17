/**
 * Shared agentic core for department AI assistants.
 *
 * This gives each department's chat assistant the same basic shape as a
 * tool-calling AI agent: a typed registry of tables it may touch, auto
 * generated create/update/delete tools, a tool-calling loop against the
 * Lovable AI gateway, and safe execution through the signed-in user's own
 * Supabase client (so Row Level Security is always the real authority).
 *
 * Every write is:
 *   1. Restricted to an explicit column whitelist per table (no arbitrary
 *      column writes, no touching tables that were never registered).
 *   2. Re-scoped to the department's own slug/service/etc even if the model
 *      tries to target another department's row (defense in depth on top
 *      of RLS, which independently blocks this at the database level).
 *   3. Recorded in `public.audit_log` with the acting user, the table, the
 *      row id and a JSON diff of what was requested — so every AI-driven
 *      change is reviewable after the fact.
 */

export type ColumnKind = "string" | "text[]" | "number" | "boolean" | "date" | "timestamptz" | "uuid" | "json";

export type ColumnSpec = {
  kind: ColumnKind;
  description?: string;
  /** Required on create even though optional on update. */
  requiredOnCreate?: boolean;
  /** Restrict to a fixed set of values (rendered as a JSON-schema enum). */
  enum?: string[];
};

export type TableSpec = {
  /** Singular, human/tool-friendly name, e.g. "kpi", "task", "department". */
  entity: string;
  /** Real Supabase table name. */
  table: string;
  /** Primary key column. Defaults to "id". */
  pk?: string;
  /** Short description shown to the model. */
  describe: string;
  /** Columns the AI is allowed to set on create/update. */
  columns: Record<string, ColumnSpec>;
  /**
   * Scope this table to the current department so a write can never land
   * on (or target) another department's row, regardless of what the model
   * requests.
   */
  scope?: { column: string; value: string };
  /** Allow delete at all. Defaults to true. */
  allowDelete?: boolean;
  /** If set, "delete" flips this boolean column to true instead of a real DELETE. */
  softDeleteColumn?: string;
  /** Read-only: expose no write tools for this table, only used for the snapshot. */
  readOnly?: boolean;
};

export type AgentAction = {
  entity: string;
  action: "create" | "update" | "delete" | "archive";
  ok: boolean;
  id?: string | number;
  error?: string;
};

type ToolFunctionDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
};

function columnToJsonSchema(col: ColumnSpec): Record<string, unknown> {
  const base: Record<string, unknown> = { description: col.description };
  switch (col.kind) {
    case "text[]":
      return { ...base, type: "array", items: { type: "string" } };
    case "number":
      return { ...base, type: "number" };
    case "boolean":
      return { ...base, type: "boolean" };
    case "json":
      return { ...base, type: "object" };
    case "date":
    case "timestamptz":
      return { ...base, type: "string", description: `${col.description ?? ""} (ISO 8601)`.trim() };
    default:
      return col.enum ? { ...base, type: "string", enum: col.enum } : { ...base, type: "string" };
  }
}

/** Build the create/update/delete tool definitions for a set of table specs. */
export function buildTools(specs: TableSpec[]): ToolFunctionDef[] {
  const tools: ToolFunctionDef[] = [];

  for (const spec of specs) {
    if (spec.readOnly) continue;
    const pk = spec.pk ?? "id";
    const props: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [name, col] of Object.entries(spec.columns)) {
      props[name] = columnToJsonSchema(col);
      if (col.requiredOnCreate) required.push(name);
    }

    tools.push({
      type: "function",
      function: {
        name: `create_${spec.entity}`,
        description: `Create a new ${spec.describe}.`,
        parameters: { type: "object", properties: props, required },
      },
    });

    tools.push({
      type: "function",
      function: {
        name: `update_${spec.entity}`,
        description: `Update an existing ${spec.describe} by id. Only pass the fields you want to change.`,
        parameters: {
          type: "object",
          properties: { [pk]: { type: "string", description: `The ${pk} of the row to update.` }, ...props },
          required: [pk],
        },
      },
    });

    if (spec.allowDelete !== false) {
      tools.push({
        type: "function",
        function: {
          name: spec.softDeleteColumn ? `archive_${spec.entity}` : `delete_${spec.entity}`,
          description: spec.softDeleteColumn
            ? `Archive (soft-delete) a ${spec.describe} by id. It is hidden but not destroyed.`
            : `Permanently delete a ${spec.describe} by id. Ask the user to confirm before calling this if the request was ambiguous.`,
          parameters: {
            type: "object",
            properties: { [pk]: { type: "string", description: `The ${pk} of the row to remove.` } },
            required: [pk],
          },
        },
      });
    }
  }

  return tools;
}

type ExecCtx = {
  supabase: any;
  userId: string;
  actorLabel: string;
};

async function logAction(ctx: ExecCtx, action: string, entity: string, entityId: string | number | undefined, details: unknown) {
  try {
    await ctx.supabase.from("audit_log").insert({
      actor_id: ctx.userId,
      action,
      entity,
      entity_id: entityId != null ? String(entityId) : null,
      details: details as any,
    });
  } catch {
    // Audit logging must never break the actual operation.
  }
}

/** Execute a single tool call against Supabase, scoped and column-whitelisted. */
export async function executeTool(
  specs: TableSpec[],
  toolName: string,
  args: Record<string, any>,
  ctx: ExecCtx,
): Promise<{ result: string; action?: AgentAction }> {
  const match = specs
    .filter((s) => !s.readOnly)
    .map((spec) => {
      const pk = spec.pk ?? "id";
      if (toolName === `create_${spec.entity}`) return { spec, kind: "create" as const, pk };
      if (toolName === `update_${spec.entity}`) return { spec, kind: "update" as const, pk };
      if (toolName === `delete_${spec.entity}`) return { spec, kind: "delete" as const, pk };
      if (toolName === `archive_${spec.entity}`) return { spec, kind: "archive" as const, pk };
      return null;
    })
    .find(Boolean);

  if (!match) return { result: `Unknown tool: ${toolName}` };
  const { spec, kind, pk } = match;

  // Only pass through whitelisted columns — never arbitrary keys the model invents.
  const clean: Record<string, any> = {};
  for (const key of Object.keys(spec.columns)) {
    if (args[key] !== undefined) clean[key] = args[key];
  }
  if (spec.scope) clean[spec.scope.column] = spec.scope.value;

  const sb = ctx.supabase;

  try {
    if (kind === "create") {
      const { data, error } = await sb.from(spec.table).insert(clean).select().maybeSingle();
      if (error) return { result: `Failed: ${error.message}`, action: { entity: spec.entity, action: "create", ok: false, error: error.message } };
      await logAction(ctx, `AI created ${spec.entity}`, spec.entity, data?.[pk], clean);
      return {
        result: `Created ${spec.entity} ${data?.[pk] ?? ""}.`,
        action: { entity: spec.entity, action: "create", ok: true, id: data?.[pk] },
      };
    }

    const id = args[pk];
    if (!id) return { result: `Missing "${pk}" — cannot locate the row.` };

    let query = sb.from(spec.table);

    if (kind === "update") {
      let q = query.update(clean).eq(pk, id);
      if (spec.scope) q = q.eq(spec.scope.column, spec.scope.value);
      const { data, error } = await q.select().maybeSingle();
      if (error) return { result: `Failed: ${error.message}`, action: { entity: spec.entity, action: "update", ok: false, id, error: error.message } };
      if (!data) return { result: `No matching ${spec.entity} found (it may belong to another department).` };
      await logAction(ctx, `AI updated ${spec.entity}`, spec.entity, id, clean);
      return { result: `Updated ${spec.entity} ${id}.`, action: { entity: spec.entity, action: "update", ok: true, id } };
    }

    if (kind === "archive" && spec.softDeleteColumn) {
      let q = query.update({ [spec.softDeleteColumn]: true }).eq(pk, id);
      if (spec.scope) q = q.eq(spec.scope.column, spec.scope.value);
      const { error } = await q;
      if (error) return { result: `Failed: ${error.message}`, action: { entity: spec.entity, action: "archive", ok: false, id, error: error.message } };
      await logAction(ctx, `AI archived ${spec.entity}`, spec.entity, id, {});
      return { result: `Archived ${spec.entity} ${id}.`, action: { entity: spec.entity, action: "archive", ok: true, id } };
    }

    // delete
    let q = query.delete().eq(pk, id);
    if (spec.scope) q = q.eq(spec.scope.column, spec.scope.value);
    const { error } = await q;
    if (error) return { result: `Failed: ${error.message}`, action: { entity: spec.entity, action: "delete", ok: false, id, error: error.message } };
    await logAction(ctx, `AI deleted ${spec.entity}`, spec.entity, id, {});
    return { result: `Deleted ${spec.entity} ${id}.`, action: { entity: spec.entity, action: "delete", ok: true, id } };
  } catch (err: any) {
    return { result: `Error: ${err?.message ?? String(err)}` };
  }
}

export type AgentTurnResult = { answer: string; actions: AgentAction[] };

/** A prior turn of the conversation, replayed so the agent keeps context. */
export type AgentMessage = { role: "user" | "assistant"; content: string };

/**
 * Trim and normalise conversation history coming from the browser: only the
 * last turns are replayed, each message is capped, and anything malformed is
 * dropped. This is the short-term memory of the agent — enough for pronouns
 * and follow-ups ("now do that for Finance") without blowing the context.
 */
export function sanitizeHistory(history: unknown, maxTurns = 12): AgentMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-maxTurns)
    .map((m: any) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 4000) }));
}

/** Behavioural contract shared by every department agent. */
const AGENT_CONTRACT = `
Operating contract — behave as an intelligent collaborator, not a form-filling chatbot:
1. Understand intent first (question, research, planning, analysis, writing, workflow execution, follow-up, clarification), then decide whether to answer directly, ask ONE clarifying question, or use tools.
2. Use the conversation so far to resolve references ("that", "the same for next month", "now from Finance's view").
3. Do not ask unnecessary questions. Make sensible defaults and state important assumptions in one line. Only ask when missing information would materially change the result.
4. For complex requests, work through the steps internally and present the result — never expose internal reasoning or chain-of-thought.
5. Match the shape of the answer to the request: short answers for simple questions; headings, tables and bullets for complex ones; executive summary + analysis + risks + recommendations for business questions; data models and implementation detail for technical ones.
6. Ground every factual claim in the JSON snapshot. Never invent records, ids, numbers or citations. If the snapshot cannot answer it, say so and say what data would be needed.
7. Signal confidence naturally when it matters (certain / likely / uncertain). Never present speculation as fact.
8. Before answering, self-check: did I answer the real question, follow the requested format, keep the numbers consistent, and avoid inventing anything? Correct it before replying.
9. Handle failures gracefully: if a tool call fails, explain plainly what failed and offer an alternative path.
10. Use markdown (headings, bullet lists, tables) so the answer renders well in the chat.
`.trim();

/**
 * Run a full tool-calling turn: send the snapshot + conversation + question +
 * tools to the gateway, execute any tool calls the model makes against
 * Supabase, feed the results back, and repeat until the model gives a
 * plain-text final answer (or the iteration cap is hit).
 */
export async function runAgentTurn(opts: {
  apiKey: string;
  systemPrompt: string;
  snapshot: unknown;
  question: string;
  specs: TableSpec[];
  ctx: ExecCtx;
  maxIterations?: number;
  /** Prior turns of this conversation (short-term memory). */
  history?: AgentMessage[];
}): Promise<AgentTurnResult> {
  const tools = buildTools(opts.specs);
  const actions: AgentAction[] = [];

  const history = sanitizeHistory(opts.history);

  const messages: any[] = [
    {
      role: "system",
      content:
        `${opts.systemPrompt}\n\n${AGENT_CONTRACT}\n\nYou may also make changes on the user's behalf using the provided tools ` +
        "(create/update/delete or archive records). Always ground reads in the JSON snapshot supplied, never " +
        "invent ids. Before a delete that removes data (not archive), briefly confirm you understood the " +
        "request correctly in your final summary. After making changes, tell the user plainly what you did.",
    },
    ...history,
    { role: "user", content: `Snapshot:\n${JSON.stringify(opts.snapshot)}\n\nRequest: ${opts.question}` },
  ];

  const maxIterations = opts.maxIterations ?? 6;

  for (let i = 0; i < maxIterations; i++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // gemini-2.5-flash supports function/tool calling on the gateway; the
        // previous gpt-5.6-sol model rejects tool definitions with a 400
        // ("Function tools with reasoning_effort are not supported").
        model: "google/gemini-2.5-flash",
        messages,
        tools: tools.length ? tools : undefined,
      }),
    });

    if (res.status === 429) throw new Error("The AI assistant is rate limited right now. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up the workspace to continue.");
    if (!res.ok) throw new Error(`AI request failed [${res.status}]: ${await res.text()}`);

    const json = await res.json();
    const msg = json.choices?.[0]?.message;
    if (!msg) throw new Error("No response returned.");

    const toolCalls = msg.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | undefined;

    if (!toolCalls || toolCalls.length === 0) {
      return { answer: msg.content ?? "No answer returned.", actions };
    }

    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: toolCalls });

    for (const call of toolCalls) {
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // fall through with empty args; executeTool will report the failure
      }
      const { result, action } = await executeTool(opts.specs, call.function.name, args, opts.ctx);
      if (action) actions.push(action);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  return { answer: "I made the changes requested but ran out of steps summarising them — check the activity above.", actions };
}
