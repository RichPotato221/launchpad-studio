import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { money, fmtDate, titleCase, branchLabel, type Rag } from "@/lib/finance";
import {
  RAG_DOT,
  RAG_LABEL,
  departmentHealth,
  ragForHealth,
  ragForPct,
  ragForRisk,
  type DepartmentOversightRow,
} from "@/lib/governance";

const sb = supabase as any;

export default function ExecutiveCockpit() {
  const { data, isLoading } = useQuery({
    queryKey: ["chair-cockpit"],
    queryFn: async () => {
      const [oversight, taskStats, finance, branches, decisions, risks, approvals, compliance, activity, events] =
        await Promise.all([
          sb.rpc("get_department_oversight"),
          sb.rpc("get_task_completion", { _days: 90 }),
          sb.rpc("get_finance_summary", { _months: 12 }),
          sb.rpc("get_branch_activity", { _days: 60 }),
          sb.from("governance_decisions").select("*").order("due_date", { ascending: true }),
          sb.from("governance_risks").select("*").neq("status", "closed").order("rating", { ascending: false }),
          sb.from("governance_approvals").select("*").eq("status", "pending").order("created_at", { ascending: false }),
          sb.from("compliance_items").select("id, title, status, due_date, department_slug").in("status", ["open", "in_progress", "overdue"]),
          sb.from("audit_log").select("action, entity, created_at").order("created_at", { ascending: false }).limit(12),
          sb.from("events").select("id, title, event_date, start_time, location").gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date").limit(8),
        ]);
      return {
        departments: (oversight.data ?? []) as DepartmentOversightRow[],
        tasks: taskStats.data?.[0] ?? null,
        finance: finance.data?.[0] ?? null,
        branches: branches.data ?? [],
        decisions: decisions.data ?? [],
        risks: risks.data ?? [],
        approvals: approvals.data ?? [],
        compliance: compliance.data ?? [],
        activity: activity.data ?? [],
        events: events.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">Assembling the executive cockpit…</Card>;
  }

  const depts = data.departments;
  const healths = depts.map(departmentHealth);
  const ministryScore = healths.length ? Math.round(healths.reduce((a, b) => a + b, 0) / healths.length) : 0;

  const overdueDecisions = data.decisions.filter(
    (d: any) => ["open", "in_progress", "overdue"].includes(d.status) && d.due_date && d.due_date < new Date().toISOString().slice(0, 10),
  );
  const openDecisions = data.decisions.filter((d: any) => ["open", "in_progress", "overdue"].includes(d.status));
  const criticalRisks = data.risks.filter((r: any) => Number(r.rating) >= 15);

  const decisionCompletion = data.decisions.length
    ? Math.round((data.decisions.filter((d: any) => d.status === "implemented").length / data.decisions.length) * 100)
    : 0;
  const complianceScore = Math.max(0, 100 - data.compliance.length * 5);
  const governanceScore = Math.round(decisionCompletion * 0.4 + complianceScore * 0.35 + (100 - Math.min(100, criticalRisks.length * 20)) * 0.25);

  const taskRate = data.tasks && Number(data.tasks.total_tasks) > 0
    ? Math.round((Number(data.tasks.done_tasks) / Number(data.tasks.total_tasks)) * 100)
    : 0;
  const churchScore = Math.round(ministryScore * 0.5 + governanceScore * 0.3 + taskRate * 0.2);

  const kpiAvg = depts.filter((d) => d.kpi_count > 0);
  const kpiAchievement = kpiAvg.length
    ? Math.round(kpiAvg.reduce((s, d) => s + Number(d.kpi_avg_pct ?? 0), 0) / kpiAvg.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ScoreCard label="Church health score" value={churchScore} />
        <ScoreCard label="Governance health score" value={governanceScore} />
        <ScoreCard label="Ministry performance" value={ministryScore} />
        <ScoreCard label="KPI achievement" value={kpiAchievement} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniCard label="Outstanding decisions" value={String(openDecisions.length)} sub={`${overdueDecisions.length} overdue`} rag={overdueDecisions.length ? "red" : openDecisions.length ? "amber" : "green"} />
        <MiniCard label="Pending executive approvals" value={String(data.approvals.length)} sub="Awaiting Chairperson sign-off" rag={data.approvals.length > 4 ? "red" : data.approvals.length ? "amber" : "green"} />
        <MiniCard label="Open compliance items" value={String(data.compliance.length)} sub="Constitution, policy, audit" rag={data.compliance.length > 6 ? "red" : data.compliance.length ? "amber" : "green"} />
        <MiniCard label="Critical risks" value={String(criticalRisks.length)} sub={`${data.risks.length} open in total`} rag={criticalRisks.length ? "red" : data.risks.length ? "amber" : "green"} />
      </div>

      {data.finance && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniCard label="Cash position" value={money(data.finance.cash_position)} sub="12-month income less paid expense" />
          <MiniCard label="Giving this month" value={money(data.finance.giving_this_month)} />
          <MiniCard label="Outstanding payments" value={money(data.finance.outstanding_payments)} />
          <MiniCard label="Finance approvals pending" value={String(data.finance.pending_approvals ?? 0)} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department RAG */}
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Department performance</p>
          <div className="mt-4 space-y-2">
            {depts.slice(0, 12).map((d) => {
              const h = departmentHealth(d);
              return (
                <div key={d.department_slug} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[ragForHealth(h)]}`} />
                    <span className="text-sm">{d.department_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{h}% · {d.overdue_tasks} overdue</span>
                </div>
              );
            })}
            {depts.length === 0 && <p className="text-sm text-muted-foreground">Department oversight is visible to leadership roles only.</p>}
          </div>
        </Card>

        {/* Risk heat map */}
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Risk heat map</p>
          <div className="mt-4 grid grid-cols-6 gap-1 text-[0.65rem]">
            <div />
            {[1, 2, 3, 4, 5].map((i) => <div key={`h${i}`} className="text-center text-muted-foreground">I{i}</div>)}
            {[5, 4, 3, 2, 1].map((l) => (
              <>
                <div key={`l${l}`} className="text-muted-foreground">L{l}</div>
                {[1, 2, 3, 4, 5].map((i) => {
                  const count = data.risks.filter((r: any) => Number(r.likelihood) === l && Number(r.impact) === i).length;
                  const rag = ragForRisk(l * i);
                  return (
                    <div
                      key={`${l}-${i}`}
                      className={`flex h-9 items-center justify-center rounded ${RAG_DOT[rag]} ${count ? "opacity-100" : "opacity-20"} text-white`}
                      title={`Likelihood ${l} × Impact ${i} — ${count} risk(s)`}
                    >
                      {count || ""}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
          <div className="mt-4 space-y-1">
            {criticalRisks.slice(0, 4).map((r: any) => (
              <p key={r.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.risk_number}</span> · {r.description.slice(0, 70)} · rating {r.rating}
              </p>
            ))}
            {criticalRisks.length === 0 && <p className="text-xs text-muted-foreground">No critical risks on the register.</p>}
          </div>
        </Card>

        {/* Outstanding decisions */}
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Outstanding decisions</p>
          <div className="mt-4 space-y-2">
            {openDecisions.slice(0, 8).map((d: any) => (
              <div key={d.id} className="border-b border-border/50 pb-2 last:border-0">
                <p className="text-sm">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  {d.decision_number} · {titleCase(d.category)} · due {fmtDate(d.due_date)} · {d.implementation_pct}% implemented
                </p>
              </div>
            ))}
            {openDecisions.length === 0 && <p className="text-sm text-muted-foreground">Every recorded decision has been implemented.</p>}
          </div>
        </Card>

        {/* Executive calendar */}
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Executive calendar</p>
          <div className="mt-4 space-y-2">
            {data.events.map((e: any) => (
              <div key={e.id} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                <span className="text-sm">{e.title}</span>
                <span className="text-xs text-muted-foreground">{fmtDate(e.event_date)} {e.start_time ?? ""}</span>
              </div>
            ))}
            {data.events.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>}
          </div>
        </Card>

        {/* Branch activity */}
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Branch performance (60 days)</p>
          <div className="mt-4 space-y-2">
            {data.branches.map((b: any) => (
              <div key={b.branch} className="flex items-baseline justify-between gap-3">
                <span className="text-sm">{branchLabel(b.branch)}</span>
                <span className="text-xs text-muted-foreground">{b.total_present} attendances</span>
              </div>
            ))}
            {data.branches.length === 0 && <p className="text-sm text-muted-foreground">No attendance captured in this window.</p>}
          </div>
        </Card>

        {/* Recent leadership activity */}
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent leadership activity</p>
          <div className="mt-4 space-y-1">
            {data.activity.map((a: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">
                {fmtDate(a.created_at)} · {titleCase(a.action)} on {titleCase(a.entity)}
              </p>
            ))}
            {data.activity.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
          </div>
        </Card>
      </div>

      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />Print executive cockpit
        </Button>
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const rag = ragForHealth(value);
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-serif text-3xl">{value}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${RAG_DOT[rag]}`} style={{ width: `${value}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{RAG_LABEL[rag]}</p>
    </Card>
  );
}

function MiniCard({ label, value, sub, rag }: { label: string; value: string; sub?: string; rag?: Rag }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        {rag && <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[rag]}`} />}
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 font-serif text-2xl">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export { ragForPct };
