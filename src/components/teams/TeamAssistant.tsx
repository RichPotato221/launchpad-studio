import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { askMinistryTeamAssistant } from "@/lib/ministryTeamAi.functions";
import { TEAM_CONFIG, type TeamKey } from "@/lib/ministryTeams";

const PROMPTS = [
  "Who needs pastoral follow-up this week and why?",
  "Draft this month's ministry report for leadership.",
  "Which members are ready for the leadership pipeline?",
  "Suggest mentors for members without one, based on the data.",
  "Plan a four-week Bible study series for our small groups.",
  "Where are our biggest volunteer and training gaps?",
];

/** Data-grounded AI assistant for the ministry team workspace. */
export default function TeamAssistant({ team }: { team: TeamKey }) {
  const ask = useServerFn(askMinistryTeamAssistant);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setBusy(true);
    setAnswer("");
    try {
      const res = await ask({ data: { question: q, team } });
      setAnswer(res.answer);
    } catch (e: any) {
      toast.error(e?.message ?? "The assistant could not answer right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-serif text-lg">{TEAM_CONFIG[team].label} AI assistant</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Grounded in this department's live data. Confidential prayer requests and pastoral notes are never shared with the model.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <Badge key={p} variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => { setQuestion(p); run(p); }}>
              {p}
            </Badge>
          ))}
        </div>
        <Textarea
          className="mt-4"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about discipleship, mentorship, events, outreach, KPIs, reports…"
        />
        <Button className="mt-3" disabled={busy} onClick={() => run(question)}>
          {busy ? "Thinking…" : "Ask the assistant"}
        </Button>
      </Card>

      {answer && (
        <Card className="p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{answer}</pre>
        </Card>
      )}
    </div>
  );
}
