import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { askDepartmentAssistant } from "@/lib/departmentAi.functions";

const PROMPTS = [
  "Which of our KPIs are red and what should we do about them?",
  "Summarise this department's performance for the leadership meeting.",
  "What tasks are overdue and who should action them?",
  "Draft this month's departmental report.",
  "How is our budget and spend tracking so far?",
  "Suggest priorities for the next 30 days based on our mandate.",
];

/** Data-grounded AI assistant for departments without a specialised operations centre. */
export function DepartmentAssistant({ slug, name }: { slug: string; name: string }) {
  const ask = useServerFn(askDepartmentAssistant);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setBusy(true);
    setAnswer("");
    try {
      const res = await ask({ data: { question: q, slug } });
      setAnswer(res.answer);
    } catch (e: any) {
      toast.error(e?.message ?? "The assistant could not answer right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">AI Assistant</p>
        <h3 className="mt-1 font-serif text-lg">{name} assistant</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Grounded in this department's live KPIs, tasks, reports, events, budgets and purchase requests.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <Badge
              key={p}
              variant="outline"
              className="cursor-pointer hover:bg-muted"
              onClick={() => {
                setQuestion(p);
                run(p);
              }}
            >
              {p}
            </Badge>
          ))}
        </div>
        <Textarea
          className="mt-4"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about performance, reports, planning, budgets, people…"
        />
        <Button className="mt-3" disabled={busy} onClick={() => run(question)}>
          {busy ? "Thinking…" : "Ask the assistant"}
        </Button>
      </Card>

      {answer && (
        <Card className="p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{answer}</pre>
        </Card>
      )}
    </div>
  );
}
