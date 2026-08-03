import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { fmtDate } from "@/lib/finance";
import { askGovernanceAssistant } from "@/lib/governanceAi.functions";

const sb = supabase as any;

const PROMPTS = [
  "Give me a one-page governance health briefing for the next council meeting.",
  "Which departments are underperforming on KPIs and what should I ask them?",
  "What compliance obligations are overdue or due in the next 30 days?",
  "Summarise our top risks and whether mitigation is adequate.",
  "Which decisions and resolutions are behind schedule, and who owns them?",
  "Draft an agenda for the next Chairperson's executive meeting.",
];

type Turn = { question: string; answer: string; at: string };

export default function GovernanceAssistant() {
  const ask = useServerFn(askGovernanceAssistant);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await sb
        .from("ai_query_log")
        .select("query_text, response_text, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setTurns(
        (data ?? [])
          .reverse()
          .map((r: any) => ({ question: r.query_text, answer: r.response_text ?? "", at: r.created_at })),
      );
    })();
    boxRef.current?.focus();
  }, []);

  const send = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setBusy(true);
    setQuestion("");
    try {
      const res = await ask({ data: { question: text } });
      setTurns((t) => [...t, { question: text, answer: res.answer, at: new Date().toISOString() }]);
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
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI governance assistant</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask questions about departmental performance, risk, compliance, decisions and finances. The assistant reads a
          live snapshot of the ministry's governance data before answering.
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
            </Card>
          </div>
        ))}
        {busy && (
          <Card className="max-w-4xl p-5 text-sm text-muted-foreground">The assistant is reviewing the governance data…</Card>
        )}
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
            placeholder="Ask the governance assistant…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(question);
              }
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !question.trim()}>
              {busy ? "Thinking…" : "Ask"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
