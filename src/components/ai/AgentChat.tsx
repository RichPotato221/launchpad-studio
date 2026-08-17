import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  MessageSquarePlus,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  historyFor,
  loadThreads,
  newThread,
  saveThreads,
  statusStepsFor,
  titleFrom,
  uid,
  type AgentActionRecord,
  type ChatMessage,
  type ChatThread,
} from "@/lib/agentChat";

export type AgentAsk = (input: {
  data: { question: string; history: { role: "user" | "assistant"; content: string }[] } & Record<string, unknown>;
}) => Promise<{ answer: string; actions?: AgentActionRecord[] }>;

type Props = {
  /** Storage namespace — one conversation list per agent surface. */
  namespace: string;
  title: string;
  description?: string;
  /** Server function wrapped with useServerFn by the caller. */
  ask: AgentAsk;
  /** Extra payload merged into every request (e.g. { slug } or { team }). */
  extra?: Record<string, unknown>;
  suggestions?: string[];
  placeholder?: string;
};

/**
 * Advanced department chat agent surface.
 *
 * Threaded conversations (persisted per browser), replayed conversation
 * memory, agent status while it works, markdown/table rendering, the record
 * of any changes the agent made, and per-answer feedback.
 */
export default function AgentChat({
  namespace,
  title,
  description,
  ask,
  extra,
  suggestions = [],
  placeholder = "Ask the assistant…",
}: Props) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string>("");
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const cancelled = useRef(false);

  /* Bootstrap threads once, client-side, without duplicating the first thread. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = loadThreads(namespace);
    const list = stored.length ? stored : [newThread()];
    setThreads(list);
    setActiveId(list[0]!.id);
    if (!stored.length) saveThreads(namespace, list);
  }, [namespace]);

  const active = threads.find((t) => t.id === activeId);

  const visibleThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) => t.title.toLowerCase().includes(q) || t.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [threads, query]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.messages.length, busy, step]);

  const persist = (next: ChatThread[]) => {
    setThreads(next);
    saveThreads(namespace, next);
  };

  const patchThread = (id: string, fn: (t: ChatThread) => ChatThread) =>
    setThreads((prev) => {
      const next = prev.map((t) => (t.id === id ? fn(t) : t));
      saveThreads(namespace, next);
      return next;
    });

  const startNew = () => {
    const t = newThread();
    persist([t, ...threads]);
    setActiveId(t.id);
    setInput("");
    boxRef.current?.focus();
  };

  const removeThread = (id: string) => {
    const next = threads.filter((t) => t.id !== id);
    const list = next.length ? next : [newThread()];
    persist(list);
    if (id === activeId) setActiveId(list[0]!.id);
  };

  const rate = (messageId: string, rating: number) => {
    if (!active) return;
    patchThread(active.id, (t) => ({
      ...t,
      messages: t.messages.map((m) => (m.id === messageId ? { ...m, rating: m.rating === rating ? 0 : rating } : m)),
    }));
  };

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || busy || !active) return;
    const threadId = active.id;
    const history = historyFor(active);

    const userMsg: ChatMessage = { id: uid(), role: "user", content: question, at: new Date().toISOString() };
    patchThread(threadId, (t) => ({
      ...t,
      title: t.messages.length ? t.title : titleFrom(question),
      updatedAt: new Date().toISOString(),
      messages: [...t.messages, userMsg],
    }));
    setInput("");
    setBusy(true);
    cancelled.current = false;

    /* Visible agent status — never internal reasoning, just what it's doing. */
    const steps = statusStepsFor(question);
    setStep(steps[0]!);
    let i = 0;
    const timer = window.setInterval(() => {
      i = Math.min(i + 1, steps.length - 1);
      setStep(steps[i]!);
    }, 2200);

    try {
      const res = await ask({ data: { question, history, ...(extra ?? {}) } });
      if (cancelled.current) return;
      const answer = (res?.answer ?? "").trim() || "No answer was returned. Please rephrase the request.";
      const reply: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: answer,
        at: new Date().toISOString(),
        actions: res?.actions ?? [],
      };
      patchThread(threadId, (t) => ({ ...t, updatedAt: new Date().toISOString(), messages: [...t.messages, reply] }));
    } catch (err: any) {
      const message = err?.message ?? "The assistant could not answer right now.";
      toast.error(message);
      patchThread(threadId, (t) => ({
        ...t,
        messages: [
          ...t.messages,
          {
            id: uid(),
            role: "assistant",
            content: `I couldn't complete that request.\n\n**Reason:** ${message}\n\nYou can try again, narrow the question, or capture the change manually in the module above.`,
            at: new Date().toISOString(),
            failed: true,
          },
        ],
      }));
    } finally {
      window.clearInterval(timer);
      setStep("");
      setBusy(false);
      boxRef.current?.focus();
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Conversations */}
      <Card className="hidden h-fit p-3 lg:block">
        <Button className="w-full" size="sm" onClick={startNew}>
          <MessageSquarePlus className="mr-1.5 h-4 w-4" /> New chat
        </Button>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="h-9 pl-8" placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="mt-3 space-y-1">
          {visibleThreads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${
                t.id === activeId ? "bg-muted font-medium" : "hover:bg-muted/60"
              }`}
            >
              <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setActiveId(t.id)}>
                {t.title}
              </button>
              <button
                type="button"
                aria-label="Delete conversation"
                className="opacity-0 transition group-hover:opacity-100"
                onClick={() => removeThread(t.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
          {!visibleThreads.length && <p className="px-2 py-4 text-xs text-muted-foreground">No conversations found.</p>}
        </div>
      </Card>

      {/* Chat */}
      <Card className="flex min-h-[540px] flex-col p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-serif text-lg leading-tight">{title}</p>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          <Button size="sm" variant="outline" className="lg:hidden" onClick={startNew}>
            <MessageSquarePlus className="mr-1.5 h-4 w-4" /> New chat
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!active?.messages.length && (
            <div className="mx-auto max-w-2xl py-6 text-center">
              <p className="font-serif text-xl">How can I help?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                I work from this department's live records — ask a question, or tell me what to create, update or plan.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-lg border border-border p-3 text-left text-sm transition hover:bg-muted/60"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {active?.messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="max-w-[92%] space-y-2">
                <div className="prose prose-sm max-w-none rounded-2xl rounded-bl-sm bg-muted/60 px-4 py-3 prose-headings:font-serif prose-table:text-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
                {!!m.actions?.length && (
                  <ul className="space-y-1 rounded-lg border border-border p-3">
                    <li className="text-xs uppercase tracking-widest text-muted-foreground">Changes made</li>
                    {m.actions.map((a, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        {a.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        <span className="capitalize">{a.action}d</span>
                        <span className="text-muted-foreground">{a.entity}</span>
                        {a.id ? <span className="text-muted-foreground">#{String(a.id).slice(0, 8)}</span> : null}
                        {!a.ok && a.error ? <span className="text-destructive">— {a.error}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-7 px-2 ${m.rating === 1 ? "text-emerald-600" : "text-muted-foreground"}`}
                    onClick={() => rate(m.id, 1)}
                    aria-label="Helpful"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-7 px-2 ${m.rating === -1 ? "text-destructive" : "text-muted-foreground"}`}
                    onClick={() => rate(m.id, -1)}
                    aria-label="Not helpful"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-muted-foreground"
                    onClick={() => {
                      navigator.clipboard?.writeText(m.content);
                      toast.success("Answer copied");
                    }}
                    aria-label="Copy answer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ),
          )}

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {step || "Working…"}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3">
          {!!suggestions.length && !!active?.messages.length && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 3).map((s) => (
                <Badge key={s} variant="outline" className="cursor-pointer text-[11px] hover:bg-muted" onClick={() => send(s)}>
                  {s.length > 44 ? `${s.slice(0, 42)}…` : s}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              ref={boxRef}
              rows={2}
              value={input}
              placeholder={placeholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            {busy ? (
              <Button
                variant="outline"
                onClick={() => {
                  cancelled.current = true;
                  setBusy(false);
                  setStep("");
                }}
              >
                Stop
              </Button>
            ) : (
              <Button onClick={() => send(input)} disabled={!input.trim()}>
                Send
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Answers are grounded in this department's live records. Confidential pastoral and prayer notes are never sent to the model.
          </p>
        </div>
      </Card>
    </div>
  );
}
