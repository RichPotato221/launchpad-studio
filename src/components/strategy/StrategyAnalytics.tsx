import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RAG_CLASS, exportRows, fmtDate, money } from "@/lib/finance";
import {
  achievement, alignmentScore, ragForScore, ragForStatus, scheduleVariance,
  titleish, visionCompletion,
} from "@/lib/strategy";

const sb = supabase as any;

/** MODULES 14–15 — Strategy analytics, board reporting and executive export. */
export default function StrategyAnalytics() {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [o, p, k, r, d] = await Promise.all([
        sb.from("smo_objectives").select("*"),
        sb.from("smo_projects").select("*"),
        sb.from("smo_kpis").select("*"),
        sb.from("smo_risks").select("*"),
        sb.from("smo_decisions").select("*"),
      ]);
      setObjectives(o.data ?? []); setProjects(p.data ?? []); setKpis(k.data ?? []);
      setRisks(r.data ?? []); setDecisions(d.data ?? []);
    })();
  }, []);

  const vision = visionCompletion(objectives);
  const kpiAchievement = kpis.length
    ? Math.round(kpis.reduce((s, k) => s + Math.min(150, achievement(k.actual, k.target)), 0) / kpis.length)
    : 0;
  const budget = projects.reduce((s, p) => s + Number(p.budget_approved ?? 0), 0);
  const spent = projects.reduce((s, p) => s + Number(p.spent ?? 0), 0);
  const utilisation = budget ? Math.round((spent / budget) * 100) : 0;
  const delivery = projects.length
    ? Math.round(projects.reduce((s, p) => s + Number(p.progress_pct ?? 0), 0) / projects.length)
    : 0;
  const decisionImplementation = decisions.length
    ? Math.round((decisions.filter((d) => d.implementation_status === "implemented").length / decisions.length) * 100)
    : 100;

  const byDepartment = useMemo(() => {
    const map = new Map<string, { count: number; progress: number }>();
    objectives.forEach((o) => {
      const key = o.department_slug ?? "church-wide";
      const cur = map.get(key) ?? { count: 0, progress: 0 };
      map.set(key, { count: cur.count + 1, progress: cur.progress + Number(o.progress_pct ?? 0) });
    });
    return [...map.entries()].map(([slug, v]) => ({ slug, count: v.count, avg: Math.round(v.progress / v.count) }))
      .sort((a, b) => a.avg - b.avg);
  }, [objectives]);

  const exportReport = () => {
    exportRows(
      "strategy-board-report",
      ["Metric", "Value"],
      [
        ["Vision completion", `${vision}%`],
        ["Strategic KPI achievement", `${kpiAchievement}%`],
        ["Portfolio delivery progress", `${delivery}%`],
        ["Portfolio budget approved", money(budget)],
        ["Portfolio spend", money(spent)],
        ["Budget utilisation", `${utilisation}%`],
        ["Alignment score", `${alignmentScore(projects)}%`],
        ["Objectives tracked", objectives.length],
        ["Projects in portfolio", projects.length],
        ["Open strategic risks", risks.filter((r) => r.status !== "closed").length],
        ["Decision implementation rate", `${decisionImplementation}%`],
      ],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-lg">Board & executive strategy report</h3>
        <Button variant="outline" onClick={exportReport}>Export report</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Vision completion</p>
          <p className="font-serif text-2xl">{vision}%</p>
          <Progress value={vision} className="mt-2" />
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">KPI achievement</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-serif text-2xl">{kpiAchievement}%</p>
            <Badge variant="outline" className={RAG_CLASS[ragForScore(kpiAchievement, 85, 60)]}>{ragForScore(kpiAchievement, 85, 60).toUpperCase()}</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Portfolio delivery</p>
          <p className="font-serif text-2xl">{delivery}%</p>
          <Progress value={delivery} className="mt-2" />
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Budget utilisation</p>
          <p className="font-serif text-2xl">{utilisation}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{money(spent)} of {money(budget)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Objective progress by department</p>
          <div className="mt-4 space-y-3">
            {byDepartment.map((d) => (
              <div key={d.slug}>
                <div className="flex items-center justify-between text-sm">
                  <span>{titleish(d.slug)}</span>
                  <span className="text-muted-foreground">{d.avg}% · {d.count} objective(s)</span>
                </div>
                <Progress value={d.avg} className="mt-1" />
              </div>
            ))}
            {!byDepartment.length && <p className="text-sm text-muted-foreground">No objectives captured yet.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Projects needing intervention</p>
          <ul className="mt-3 space-y-2 text-sm">
            {projects
              .map((p) => ({ p, v: scheduleVariance(p) }))
              .filter(({ p, v }) => (v !== null && v < 0) || ["at_risk", "delayed"].includes(p.status))
              .slice(0, 8)
              .map(({ p, v }) => (
                <li key={p.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                  <span>
                    {p.name}
                    <span className="block text-xs text-muted-foreground">
                      {p.manager ?? "No manager"} · due {fmtDate(p.end_date)} · {p.progress_pct ?? 0}% complete
                    </span>
                  </span>
                  <Badge variant="outline" className={RAG_CLASS[ragForStatus(p.status)]}>
                    {v !== null ? `${v}` : titleish(p.status)}
                  </Badge>
                </li>
              ))}
            {!projects.length && <li className="text-muted-foreground">No projects in the portfolio.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
