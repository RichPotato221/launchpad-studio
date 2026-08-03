import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RAG_CLASS, fmtDate, money } from "@/lib/finance";
import {
  achievement, alignmentScore, ragForCount, ragForRisk, ragForScore, ragForStatus,
  riskScore, scheduleVariance, titleish, visionCompletion,
} from "@/lib/strategy";

const sb = supabase as any;

function Stat({ label, value, hint, rag }: { label: string; value: string | number; hint?: string; rag?: "green" | "amber" | "red" }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-serif text-2xl">{value}</p>
        {rag && <Badge variant="outline" className={RAG_CLASS[rag]}>{rag.toUpperCase()}</Badge>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

/** MODULE 1 — Strategy Management Office executive dashboard. */
export default function StrategyDashboard() {
  const [plans, setPlans] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [p, o, pr, k, r, d, i] = await Promise.all([
        sb.from("smo_plans").select("*"),
        sb.from("smo_objectives").select("*"),
        sb.from("smo_projects").select("*"),
        sb.from("smo_kpis").select("*"),
        sb.from("smo_risks").select("*"),
        sb.from("smo_decisions").select("*").order("decision_date", { ascending: false }).limit(20),
        sb.from("smo_ideas").select("*"),
      ]);
      setPlans(p.data ?? []); setObjectives(o.data ?? []); setProjects(pr.data ?? []);
      setKpis(k.data ?? []); setRisks(r.data ?? []); setDecisions(d.data ?? []); setIdeas(i.data ?? []);
    })();
  }, []);

  const vision = visionCompletion(objectives);
  const atRisk = objectives.filter((o) => ["at_risk", "off_track"].includes(o.status));
  const activeProjects = projects.filter((p) => !["closed", "cancelled"].includes(p.stage));
  const delayed = projects.filter((p) => {
    const v = scheduleVariance(p);
    return v !== null && v < -10;
  });
  const budget = projects.reduce((s, p) => s + Number(p.budget_approved ?? 0), 0);
  const spent = projects.reduce((s, p) => s + Number(p.spent ?? 0), 0);
  const kpiAchievement = kpis.length
    ? Math.round(kpis.reduce((s, k) => s + Math.min(150, achievement(k.actual, k.target)), 0) / kpis.length)
    : 0;
  const openRisks = risks.filter((r) => r.status !== "closed");
  const criticalRisks = openRisks.filter((r) => riskScore(r.likelihood, r.impact) >= 15);
  const pendingDecisions = decisions.filter((d) => d.implementation_status !== "implemented");

  const topObjectives = useMemo(
    () => [...objectives].sort((a, b) => Number(a.progress_pct ?? 0) - Number(b.progress_pct ?? 0)).slice(0, 6),
    [objectives],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Vision completion" value={`${vision}%`} rag={ragForScore(vision, 70, 40)}
          hint={`${objectives.length} objectives across ${plans.length} plan(s)`} />
        <Stat label="Objectives at risk" value={atRisk.length} rag={ragForCount(atRisk.length, 1, 4)} />
        <Stat label="Active projects" value={activeProjects.length} hint={`${delayed.length} behind schedule`} />
        <Stat label="Strategic KPI achievement" value={`${kpiAchievement}%`} rag={ragForScore(kpiAchievement, 85, 60)} />
        <Stat label="Portfolio budget" value={money(budget)} hint={`${money(spent)} spent to date`} />
        <Stat label="Alignment score" value={`${alignmentScore(projects)}%`} rag={ragForScore(alignmentScore(projects), 80, 50)}
          hint="Projects linked to a strategic objective" />
        <Stat label="Open strategic risks" value={openRisks.length} rag={ragForCount(openRisks.length, 2, 6)}
          hint={`${criticalRisks.length} critical`} />
        <Stat label="Innovation pipeline" value={ideas.filter((i) => !["adopted", "declined"].includes(i.stage)).length}
          hint={`${ideas.filter((i) => i.stage === "adopted").length} adopted`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Objectives needing attention</p>
          <div className="mt-4 space-y-4">
            {topObjectives.map((o) => (
              <div key={o.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{o.title}</span>
                  <Badge variant="outline" className={RAG_CLASS[ragForStatus(o.status)]}>{titleish(o.status)}</Badge>
                </div>
                <Progress value={Number(o.progress_pct ?? 0)} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {o.owner ?? "Unassigned"} · {o.progress_pct ?? 0}% · due {fmtDate(o.due_date)}
                </p>
              </div>
            ))}
            {!topObjectives.length && <p className="text-sm text-muted-foreground">No strategic objectives captured yet.</p>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Top strategic risks</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[...openRisks].sort((a, b) => riskScore(b.likelihood, b.impact) - riskScore(a.likelihood, a.impact)).slice(0, 5).map((r) => {
                const score = riskScore(r.likelihood, r.impact);
                return (
                  <li key={r.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                    <span>{r.title}<span className="block text-xs text-muted-foreground">{titleish(r.category)}</span></span>
                    <Badge variant="outline" className={RAG_CLASS[ragForRisk(score)]}>{score}</Badge>
                  </li>
                );
              })}
              {!openRisks.length && <li className="text-muted-foreground">No open strategic risks.</li>}
            </ul>
          </Card>

          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Decisions awaiting implementation</p>
            <ul className="mt-3 space-y-2 text-sm">
              {pendingDecisions.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                  <span>{d.title}<span className="block text-xs text-muted-foreground">{fmtDate(d.decision_date)} · {d.owner ?? "—"}</span></span>
                  <Badge variant="outline">{titleish(d.implementation_status)}</Badge>
                </li>
              ))}
              {!pendingDecisions.length && <li className="text-muted-foreground">All executive decisions implemented.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
