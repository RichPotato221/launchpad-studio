import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { fmtDate } from "@/lib/finance";
import { askPrayerAssistant } from "@/lib/prayerAi.functions";

const PROMPTS = [
  "Which prayer requests need urgent attention this week?",
  "Where are the gaps in our current prayer chain and how should we fill them?",
  "Give me scripture-based prayer points for our open requests.",
  "Summarise the answered prayers and testimonies for the leadership report.",
  "Which intercessors are at risk of burnout?",
  "Draft a plan for our next corporate fast.",
];

type AgentAction = { entity: string; action: string; ok: boolean; id?: string | number; error?: string };

type Turn = { question: string; answer: string; at: string; actions: AgentAction[] };

/** Module 11: AI Prayer Assistant grounded in live intercession data. */
export default function PrayerAssistant() {
  const ask = useServerFn(askPrayerAssistant);
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
      setTurns((t) => [...t, { question: text, answer: (res as any).answer, actions: (res as any).actions ?? [], at: new Date().toISOString() }]);
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
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI prayer assistant</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Triage, prayer points, chain coverage, fasting plans and testimony summaries — grounded in a live snapshot of the
          intercession department. Confidential requests are never disclosed.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <Button key={p} type="button" variant="outline" size="sm" disabled={busy} onClick={() => send(p)}>{p}</Button>
          ))}
        </div>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); send(question); }}>
          <Textarea ref={boxRef} rows={3} value={question} placeholder="Ask the prayer assistant…" onChange={(e) => setQuestion(e.target.value)} />
          <Button type="submit" disabled={busy}>{busy ? "Praying it through…" : "Ask"}</Button>
        </form>
      </Card>

      {turns.slice().reverse().map((t) => (
        <Card key={t.at} className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{fmtDate(t.at)}</p>
          <p className="mt-1 font-medium">{t.question}</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{t.answer}</div>
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
      ))}
    </div>
  );
}
