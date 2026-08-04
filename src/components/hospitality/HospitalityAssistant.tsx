import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { fmtDate } from "@/lib/finance";
import { askHospitalityAssistant } from "@/lib/hospitalityAi.functions";

const PROMPTS = [
  "How much coffee, tea and snacks do we need for Sunday's expected attendance?",
  "Which stock items are low or expiring and must be reordered now?",
  "Is our next event ready? List what is still outstanding.",
  "Which first-time guests still need follow-up?",
  "Roster our volunteers for the next event and flag anyone overloaded.",
  "Draft a hospitality report for the leadership meeting.",
];

type Turn = { question: string; answer: string; at: string };

/** AI Hospitality Assistant grounded in live hospitality data. */
export default function HospitalityAssistant() {
  const ask = useServerFn(askHospitalityAssistant);
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
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI hospitality assistant</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Catering quantities, stock control, event readiness, guest care and volunteer rostering — grounded in a live
          snapshot of the hospitality ministry.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <Button key={p} type="button" variant="outline" size="sm" disabled={busy} onClick={() => send(p)}>{p}</Button>
          ))}
        </div>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); send(question); }}>
          <Textarea ref={boxRef} rows={3} value={question} placeholder="Ask the hospitality assistant…" onChange={(e) => setQuestion(e.target.value)} />
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
