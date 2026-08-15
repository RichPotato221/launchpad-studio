import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { askDepartmentAssistant } from "@/lib/departmentAi.functions";

type AgentAction = { entity: string; action: string; ok: boolean; id?: string | number; error?: string };

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
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setBusy(true);
    setAnswer("");
    setActions([]);
    try {
      const res = await ask({ data: { question: q, slug } });
      setAnswer(res.answer);
      setActions((res as any).actions ?? []);
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
          placeholder="Ask about performance, reports, planning, budgets, people… or tell it to add, update, or remove something."
        />
        <Button className="mt-3" disabled={busy} onClick={() => run(question)}>
          {busy ? "Thinking…" : "Ask the assistant"}
        </Button>
      </Card>

      {actions.length > 0 && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Changes made</p>
          <ul className="mt-2 space-y-1">
            {actions.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
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
        </Card>
      )}

      {answer && (
        <Card className="p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{answer}</pre>
        </Card>
      )}
    </div>
  );
}
