import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { fmtDate } from "@/lib/finance";
import { askMediaAssistant } from "@/lib/mediaAi.functions";

const PROMPTS = [
  "Which department requests are overdue or at risk of missing their deadline?",
  "Where is our production pipeline bottlenecked right now?",
  "Draft a week of social captions from our scheduled posts.",
  "How are our platforms growing and where should we focus?",
  "What technical issues keep recurring in our livestreams?",
  "Which media volunteers need training or are over-committed?",
];

type AgentAction = { entity: string; action: string; ok: boolean; id?: string | number; error?: string };

type Turn = { question: string; answer: string; at: string; actions: AgentAction[] };

export default function MediaAssistant() {
  const ask = useServerFn(askMediaAssistant);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setQuestion("");
    try {
      const res = await ask({ data: { question: text } });
      setTurns((t) => [...t, { question: text, answer: res.answer, actions: (res as any).actions ?? [], at: new Date().toISOString() }]);
    } catch (err: any) {
      toast.error(err?.message ?? "The assistant could not answer.");
      setQuestion(text);
    } finally {
      setBusy(false);
      boxRef.current?.focus();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI media assistant</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask about requests, production, content calendars, livestreams, analytics, archive and team capacity. Answers
          are grounded in a live snapshot of the ministry's data.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <Button key={p} type="button" variant="outline" size="sm" disabled={busy} onClick={() => send(p)}>
              {p}
            </Button>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {turns.map((t, i) => (
          <div key={`${t.at}-${i}`} className="space-y-3">
            <Card className="ml-auto max-w-3xl bg-muted p-4">
              <p className="text-sm">{t.question}</p>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">{fmtDate(t.at)}</p>
            </Card>
            <Card className="max-w-4xl p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.answer}</p>
              {t.actions.length > 0 && (
                <ul className="mt-3 space-y-1 border-t pt-3">
                  {t.actions.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      {a.ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                      )}
                      <span className="capitalize">{a.action}d</span> <span className="text-muted-foreground">{a.entity}</span>
                      {a.id ? <span className="text-muted-foreground">#{String(a.id).slice(0, 8)}</span> : null}
                      {!a.ok && a.error ? <span className="text-destructive">— {a.error}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        ))}
        {busy && <Card className="max-w-4xl p-5 text-sm text-muted-foreground">The assistant is reviewing the data…</Card>}
      </div>

      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(question);
          }}
          className="space-y-3"
        >
          <Textarea
            ref={boxRef}
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask the media assistant…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(question);
              }
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !question.trim()}>Ask</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
