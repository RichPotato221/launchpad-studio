import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { branchLabel, exportRows, fmtDate, money, titleCase } from "@/lib/finance";
import { RAG_DOT, RAG_LABEL, departmentHealth, ragForHealth, type DepartmentOversightRow } from "@/lib/governance";

const sb = supabase as any;

/**
 * Executive reporting & analytics: governance scorecards, trends and
 * board-ready exports (CSV for Excel, print-to-PDF for the pack).
 */
export default function GovernanceReports() {
  const { data, isLoading } = useQuery({
    queryKey: ["chair-reports"],
    queryFn: async () => {
      const [oversight, deptPerf, finTrend, attTrend, periods, taskStats, finance, decisions, risks, compliance] =
        await Promise.all([
          sb.rpc("get_department_oversight"),
          sb.rpc("get_department_performance"),
          sb.rpc("get_financial_trend", { _months: 12 }),
          sb.rpc("get_attendance_trend", { _months: 12 }),
          sb.rpc("get_kpi_period_comparison"),
          sb.rpc("get_task_completion", { _days: 90 }),
          sb.rpc("get_finance_summary", { _months: 12 }),
          sb.from("governance_decisions").select("status, due_date, implementation_pct"),
          sb.from("governance_risks").select("status, rating, category"),
          sb.from("compliance_items").select("status"),
        ]);
      return {
        departments: (oversight.data ?? []) as DepartmentOversightRow[],
        deptPerf: deptPerf.data ?? [],
        finTrend: finTrend.data ?? [],
        attTrend: attTrend.data ?? [],
        periods: periods.data ?? [],
        tasks: taskStats.data?.[0] ?? null,
        finance: finance.data?.[0] ?? null,
        decisions: decisions.data ?? [],
        risks: risks.data ?? [],
        compliance: compliance.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <Card className="p-10 text-center text-sm text-muted-foreground">Preparing governance reports…</Card>;

  const decisions = data.decisions;
  const implemented = decisions.filter((d: any) => d.status === "implemented").length;
  const openRisks = data.risks.filter((r: any) => r.status !== "closed");
  const openCompliance = data.compliance.filter((c: any) => c.status !== "resolved");

  const governanceKpis = [
    { name: "Council resolution completion", actual: decisions.length ? Math.round((implemented / decisions.length) * 100) : 0, target: 90, unit: "%" },
    { name: "Department reporting compliance", actual: data.departments.length ? Math.round((data.departments.filter((d) => d.reports_90d > 0).length / data.departments.length) * 100) : 0, target: 100, unit: "%" },
    { name: "Task completion (90 days)", actual: data.tasks && Number(data.tasks.total_tasks) ? Math.round((Number(data.tasks.done_tasks) / Number(data.tasks.total_tasks)) * 100) : 0, target: 85, unit: "%" },
    { name: "Risk mitigation completion", actual: data.risks.length ? Math.round(((data.risks.length - openRisks.length) / data.risks.length) * 100) : 0, target: 75, unit: "%" },
    { name: "Compliance items closed", actual: data.compliance.length ? Math.round(((data.compliance.length - openCompliance.length) / data.compliance.length) * 100) : 100, target: 90, unit: "%" },
  ];

  const exportScorecards = () =>
    exportRows(
      "department-scorecards",
      ["Department", "Structure", "Health", "Rating", "KPI %", "Overdue tasks", "Reports 90d", "Open risks", "Compliance", "Open decisions"],
      data.departments.map((d) => {
        const h = departmentHealth(d);
        return [d.department_name, titleCase(d.kind), h, RAG_LABEL[ragForHealth(h)], d.kpi_avg_pct ?? "", d.overdue_tasks, d.reports_90d, d.open_risks, d.open_compliance, d.open_decisions];
      }),
    );

  const exportGovernanceKpis = () =>
    exportRows(
      "governance-kpis",
      ["KPI", "Actual", "Target", "Variance"],
      governanceKpis.map((k) => [k.name, k.actual, k.target, k.actual - k.target]),
    );

  const exportFinancialTrend = () =>
    exportRows("financial-trend", ["Period", "Income", "Expense", "Net"], data.finTrend.map((r: any) => [r.period, r.income, r.expense, Number(r.income) - Number(r.expense)]));

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 print:hidden">
        <p className="text-sm text-muted-foreground">
          Executive summary for {new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}. Print to PDF for the board pack, or export any table to Excel.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportScorecards}><Download className="mr-2 h-4 w-4" />Scorecards</Button>
          <Button variant="outline" onClick={exportGovernanceKpis}><Download className="mr-2 h-4 w-4" />Governance KPIs</Button>
          <Button variant="outline" onClick={exportFinancialTrend}><Download className="mr-2 h-4 w-4" />Financial trend</Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print governance report</Button>
        </div>
      </Card>

      {/* Executive summary */}
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Executive summary</p>
        <ul className="mt-3 space-y-2 text-sm">
          <li>• {data.departments.length} departments monitored; {data.departments.filter((d) => ragForHealth(departmentHealth(d)) === "red").length} rated critical and {data.departments.filter((d) => ragForHealth(departmentHealth(d)) === "amber").length} requiring attention.</li>
          <li>• {decisions.length} executive decisions on the register, {implemented} fully implemented ({decisions.length ? Math.round((implemented / decisions.length) * 100) : 0}%).</li>
          <li>• {openRisks.length} open risks, of which {openRisks.filter((r: any) => Number(r.rating) >= 15).length} are critical.</li>
          <li>• {openCompliance.length} outstanding compliance items across constitution, policy and audit categories.</li>
          {data.finance && <li>• Cash position {money(data.finance.cash_position)}; giving this month {money(data.finance.giving_this_month)}; outstanding payments {money(data.finance.outstanding_payments)}.</li>}
        </ul>
      </Card>

      {/* Governance KPI dashboard */}
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Governance KPI dashboard</p>
        <div className="mt-4 space-y-3">
          {governanceKpis.map((k) => {
            const pct = Math.min(100, Math.round((k.actual / k.target) * 100));
            const band = ragForHealth(pct);
            return (
              <div key={k.name}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{k.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {k.actual}{k.unit} vs target {k.target}{k.unit} · variance {k.actual - k.target}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${RAG_DOT[band]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Period comparison */}
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">KPI performance — period comparison</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {data.periods.map((p: any) => (
            <div key={p.period_label} className="rounded border border-border/60 p-4">
              <p className="text-sm font-medium">{p.period_label}</p>
              <p className="font-serif text-2xl">{p.current_avg_pct ?? 0}%</p>
              <p className="text-xs text-muted-foreground">Previous: {p.previous_avg_pct ?? 0}%</p>
            </div>
          ))}
          {data.periods.length === 0 && <p className="text-sm text-muted-foreground">No KPI data captured yet.</p>}
        </div>
      </Card>

      {/* Department scorecards */}
      <Card className="overflow-x-auto p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Department scorecards</p>
        <table className="mt-4 w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="py-2">Department</th><th>Health</th><th>KPI %</th><th>Overdue</th><th>Reports</th><th>Risks</th><th>Compliance</th><th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {data.departments.map((d) => {
              const h = departmentHealth(d);
              return (
                <tr key={d.department_slug} className="border-b border-border/50">
                  <td className="py-2">{d.department_name}</td>
                  <td><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${RAG_DOT[ragForHealth(h)]}`} />{h}%</span></td>
                  <td>{d.kpi_avg_pct ?? "—"}</td>
                  <td>{d.overdue_tasks}</td>
                  <td>{d.reports_90d}</td>
                  <td>{d.open_risks}</td>
                  <td>{d.open_compliance}</td>
                  <td>{fmtDate(d.last_activity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.departments.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Scorecards are visible to church leadership only.</p>}
      </Card>

      {/* Financial & attendance trends */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Financial trend (12 months)</p>
          <div className="mt-4 space-y-1 text-sm">
            {data.finTrend.map((r: any) => (
              <div key={r.period} className="flex justify-between border-b border-border/50 py-1">
                <span>{r.period}</span>
                <span className="text-xs text-muted-foreground">{money(r.income)} in · {money(r.expense)} out</span>
              </div>
            ))}
            {data.finTrend.length === 0 && <p className="text-sm text-muted-foreground">No financial data captured yet.</p>}
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Attendance trend by branch</p>
          <div className="mt-4 space-y-1 text-sm">
            {data.attTrend.map((r: any, i: number) => (
              <div key={i} className="flex justify-between border-b border-border/50 py-1">
                <span>{r.period} · {branchLabel(r.branch)}</span>
                <span className="text-xs text-muted-foreground">{r.total_present} present</span>
              </div>
            ))}
            {data.attTrend.length === 0 && <p className="text-sm text-muted-foreground">No attendance captured yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
