import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { askKidsAssistant } from "@/lib/kidsAi.functions";

const PROMPTS = [
  "Suggest an age-appropriate lesson plan with scripture for our beginners class.",
  "Which safeguarding risks should we address before Sunday?",
  "How should we schedule volunteers given our current clearances?",
  "Interpret our attendance trend and suggest follow-up actions.",
  "Draft a parent communication summarising this month in kids church.",
  "Which children need discipleship follow-up?",
];

type Turn = { question: string; answer: string };

/** MODULE 13 — AI Children's Ministry Assistant. */
export default function KidsAssistant() {
  const ask = useServerFn(askKidsAssistant);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true); setQuestion("");
    try {
      const res = await ask({ data: { question: text } });
      setTurns((t) => [...t, { question: text, answer: res.answer }]);
    } catch (err: any) {
      toast.error(err?.message ?? "The assistant could not answer.");
      setQuestion(text);
    } finally {
      setBusy(false); boxRef.current?.focus();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI children's ministry assistant</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask about lesson planning, safeguarding, volunteer scheduling, attendance and parent communication. Answers are
          grounded in a live snapshot of the children's ministry data.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <Button key={p} type="button" variant="outline" size="sm" disabled={busy} onClick={() => send(p)}>{p}</Button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Textarea
            ref={boxRef}
            rows={3}
            value={question}
            placeholder="Ask the assistant…"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(question); }}
          />
          <Button className="w-fit" disabled={busy} onClick={() => send(question)}>{busy ? "Thinking…" : "Ask assistant"}</Button>
        </div>
      </Card>

      {turns.map((t, i) => (
        <Card key={i} className="p-6">
          <p className="text-sm font-medium">{t.question}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{t.answer}</p>
        </Card>
      ))}
    </div>
  );
}
