/**
 * Client-side conversation store for the department AI agents.
 *
 * Each agent surface (Finance, Worship, Prayer, a department workspace, …)
 * gets its own namespace, and every namespace keeps a list of threads with
 * their messages in the browser. This is the agent's conversation memory:
 * the last turns of the active thread are replayed to the server function on
 * every request, so the model can resolve follow-ups such as "now do the same
 * for next month".
 */

export type ChatRole = "user" | "assistant";

export type AgentActionRecord = {
  entity: string;
  action: string;
  ok: boolean;
  id?: string | number;
  error?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  at: string;
  actions?: AgentActionRecord[];
  /** 1 = 👍, -1 = 👎, 0/undefined = no rating yet. */
  rating?: number;
  feedback?: string;
  failed?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const KEY = (ns: string) => `trog.agent.threads.${ns}`;

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function newThread(): ChatThread {
  const now = new Date().toISOString();
  return { id: uid(), title: "New conversation", createdAt: now, updatedAt: now, messages: [] };
}

export function loadThreads(ns: string): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY(ns));
    const parsed = raw ? (JSON.parse(raw) as ChatThread[]) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => t && t.id && Array.isArray(t.messages)) : [];
  } catch {
    return [];
  }
}

export function saveThreads(ns: string, threads: ChatThread[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(ns), JSON.stringify(threads.slice(0, 50)));
  } catch {
    /* storage full or blocked — conversations simply won't persist */
  }
}

/** Derive a readable thread title from the first thing the user asked. */
export function titleFrom(question: string) {
  const t = question.trim().replace(/\s+/g, " ");
  return t.length > 52 ? `${t.slice(0, 52)}…` : t || "New conversation";
}

/** The short-term memory replayed to the agent (last turns, trimmed). */
export function historyFor(thread: ChatThread | undefined, maxTurns = 10) {
  if (!thread) return [];
  return thread.messages
    .filter((m) => !m.failed && m.content.trim())
    .slice(-maxTurns)
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Lightweight intent read used only to drive the visible status stepper.
 * The real intent handling happens inside the agent's system contract.
 */
export function statusStepsFor(question: string): string[] {
  const q = question.toLowerCase();
  const steps = ["Understanding request"];
  if (/(plan|design|build|strategy|roadmap|workflow|programme|program)/.test(q)) steps.push("Planning the approach");
  if (/(compare|analys|analyz|trend|report|forecast|budget|variance|kpi)/.test(q)) steps.push("Analysing the data");
  if (/(create|add|update|change|delete|remove|log|capture|record|assign|schedule)/.test(q)) steps.push("Applying changes");
  steps.push("Checking the answer", "Preparing response");
  return steps;
}
