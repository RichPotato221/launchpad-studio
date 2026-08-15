import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { askResourceAssistant } from "@/lib/resourcesAi.functions";

type AgentAction = { entity: string; action: string; ok: boolean; id?: string | number; error?: string };

const SUGGESTIONS = [
  "Which assets are due for replacement in the next 12 months and what will it cost?",
  "Which equipment is under-used and could be redistributed between branches?",
  "What maintenance is overdue and what is the risk if we delay it further?",
  "Which stock items should we reorder now, and what should we budget?",
  "Which facilities are not ready for Sunday service?",
  "Where are our biggest resource risks and what should we do about them?",
];

/** MODULE 15 — AI Resource Assistant. */
export default function ResourceAssistant() {
  const ask = useServerFn(askResourceAssistant);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setAnswer(""); setActions([]);
    try {
      const res = await ask({ data: { question: q } });
      setAnswer(res.answer);
      setActions((res as any).actions ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "The assistant could not answer right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">AI Resource Assistant</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about assets, maintenance, facilities, stock, bookings, projects and risk. Every answer is grounded in the
          live resource records of the church.
        </p>
        <Textarea
          className="mt-4"
          rows={3}
          placeholder="e.g. Which departments hold the most equipment and what is idle?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={loading} onClick={() => run(question)}>{loading ? "Thinking…" : "Ask"}</Button>
          {SUGGESTIONS.map((s) => (
            <Button key={s} size="sm" variant="outline" disabled={loading} onClick={() => { setQuestion(s); run(s); }}>
              {s.length > 46 ? `${s.slice(0, 44)}…` : s}
            </Button>
          ))}
        </div>
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
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Answer</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
        </Card>
      )}
    </div>
  );
}
