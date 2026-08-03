import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { fmtDate } from "@/lib/finance";
import { askStrategyAssistant } from "@/lib/strategyAi.functions";

const PROMPTS = [
  "How far are we from completing the vision, and what is blocking us?",
  "Which strategic objectives are off track and what should we do this quarter?",
  "Review our project portfolio and flag the projects at risk of failing.",
  "Draft a board-ready strategy update for the next leadership meeting.",
  "Where is our biggest strategic risk and what mitigation do you recommend?",
  "Which departments are least aligned to the strategic plan?",
];

type Turn = { question: string; answer: string; at: string };

/** MODULES 16–17 — AI Strategy Assistant grounded in live SMO data. */
export default function StrategyAssistant() {
  const ask = useServerFn(askStrategyAssistant);
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
      setTurns((t) => [...t, { question: text, answer: (res as any).answer, at: new Date().toISOString() }]);
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
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI strategy assistant</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Vision tracking, portfolio triage, alignment analysis and board reporting — grounded in a live snapshot of
          plans, objectives, projects, KPIs, risks and decisions.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <Button key={p} type="button" variant="outline" size="sm" disabled={busy} onClick={() => send(p)}>{p}</Button>
          ))}
        </div>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); send(question); }}>
          <Textarea ref={boxRef} rows={3} value={question} placeholder="Ask the strategy assistant…"
            onChange={(e) => setQuestion(e.target.value)} />
          <Button type="submit" disabled={busy}>{busy ? "Thinking…" : "Ask"}</Button>
        </form>
      </Card>

      {turns.slice().reverse().map((t) => (
        <Card key={t.at} className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{fmtDate(t.at)}</p>
          <p className="mt-1 font-medium">{t.question}</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{t.answer}</div>
        </Card>
      ))}
    </div>
  );
}
