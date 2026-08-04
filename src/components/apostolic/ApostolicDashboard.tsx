import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { money, branchLabel } from "@/lib/finance";
import { departmentHealth, type DepartmentOversightRow } from "@/lib/governance";
import { kingdomImpactScore } from "@/lib/apostolic";
import { Stat, ScoreDial, Section, BarRow, Empty } from "./shared";

const sb = supabase as any;

export function ApostolicDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["apo-dashboard"],
    queryFn: async () => {
      const [
        members,
        departments,
        volunteers,
        souls,
        oversight,
        finance,
        tasks,
        attendance,
        branches,
        risks,
        decisions,
        compliance,
        projects,
        objectives,
        vision,
        fivefold,
        coaching,
        kpiCompare,
      ] = await Promise.all([
        sb.from("profiles").select("id", { count: "exact", head: true }),
        sb.from("departments").select("slug", { count: "exact", head: true }),
        sb.from("volunteer_profiles").select("id", { count: "exact", head: true }),
        sb.from("souls_won").select("*").limit(2000),
        sb.rpc("get_department_oversight"),
        sb.rpc("get_finance_summary", { _months: 12 }),
        sb.rpc("get_task_completion", { _days: 90 }),
        sb.rpc("get_attendance_trend", { _months: 6 }),
        sb.rpc("get_branch_activity", { _days: 60 }),
        sb.from("governance_risks").select("*").neq("status", "closed"),
        sb.from("governance_decisions").select("status"),
        sb.from("compliance_items").select("id").in("status", ["open", "in_progress", "overdue"]),
        sb.from("apo_projects").select("*"),
        sb.from("apo_objectives").select("progress_pct, status"),
        sb.from("apo_vision").select("*").order("year", { ascending: false }).limit(1),
        sb.from("apo_fivefold").select("office, performance_pct, succession_readiness, status"),
        sb.from("coaching_sessions").select("id", { count: "exact", head: true }),
        sb.rpc("get_kpi_period_comparison"),
      ]);

      return {
        members: members.count ?? 0,
        departments: departments.count ?? 0,
        volunteers: volunteers.count ?? 0,
        souls: souls.data ?? [],
        oversight: (oversight.data ?? []) as DepartmentOversightRow[],
        finance: finance.data?.[0] ?? null,
        tasks: tasks.data?.[0] ?? null,
        attendance: attendance.data ?? [],
        branches: branches.data ?? [],
        risks: risks.data ?? [],
        decisions: decisions.data ?? [],
        compliance: compliance.data ?? [],
        projects: projects.data ?? [],
        objectives: objectives.data ?? [],
        vision: vision.data?.[0] ?? null,
        fivefold: fivefold.data ?? [],
        coaching: coaching.count ?? 0,
        kpiCompare: kpiCompare.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">Assembling the apostolic dashboard…</Card>;
  }

  const depts = data.oversight;
  const healths = depts.map(departmentHealth);
  const ministryScore = healths.length ? Math.round(healths.reduce((a, b) => a + b, 0) / healths.length) : 0;

  const kpiRows = depts.filter((d) => Number(d.kpi_count) > 0);
  const kpiAchievement = kpiRows.length
    ? Math.round(kpiRows.reduce((s, d) => s + Number(d.kpi_avg_pct ?? 0), 0) / kpiRows.length)
    : 0;

  const criticalRisks = data.risks.filter((r: any) => Number(r.rating) >= 15).length;
  const implemented = data.decisions.filter((d: any) => d.status === "implemented").length;
  const decisionRate = data.decisions.length ? Math.round((implemented / data.decisions.length) * 100) : 0;
  const complianceScore = Math.max(0, 100 - data.compliance.length * 5);
  const governanceScore = Math.round(
    decisionRate * 0.4 + complianceScore * 0.35 + Math.max(0, 100 - criticalRisks * 20) * 0.25,
  );

  const fin = data.finance;
  const income = Number(fin?.total_income ?? 0);
  const expense = Number(fin?.total_expense ?? 0);
  const financeScore = income > 0 ? Math.max(0, Math.min(100, Math.round(((income - expense) / income) * 100 + 50))) : 50;

  const leaderPerf = data.fivefold.length
    ? Math.round(data.fivefold.reduce((s: number, f: any) => s + Number(f.performance_pct ?? 0), 0) / data.fivefold.length)
    : 0;
  const readyNow = data.fivefold.filter((f: any) => f.succession_readiness === "ready_now").length;
  const leadershipScore = Math.round(
    leaderPerf * 0.6 + (data.fivefold.length ? Math.min(100, (readyNow / data.fivefold.length) * 100) : 0) * 0.4,
  );

  const visionProgress = data.objectives.length
    ? Math.round(data.objectives.reduce((s: number, o: any) => s + Number(o.progress_pct ?? 0), 0) / data.objectives.length)
    : 0;

  const kingdomScore = kingdomImpactScore({
    ministry: ministryScore,
    governance: governanceScore,
    finance: financeScore,
    leadership: leadershipScore,
    vision: visionProgress,
  });

  const attRows = data.attendance as any[];
  const periods = Array.from(new Set(attRows.map((r) => r.period))).sort();
  const perPeriod = periods.map((p) => ({
    period: p,
    total: attRows.filter((r) => r.period === p).reduce((s, r) => s + Number(r.total_present ?? 0), 0),
  }));
  const latest = perPeriod[perPeriod.length - 1]?.total ?? 0;
  const previous = perPeriod[perPeriod.length - 2]?.total ?? 0;
  const growth = previous ? Math.round(((latest - previous) / previous) * 100) : 0;
  const weekly = Math.round(latest / 4);

  const baptisms = data.souls.filter((s: any) => s.baptised === true || s.baptized === true || s.status === "baptised").length;

  const maxAtt = Math.max(1, ...perPeriod.map((p) => p.total));
  const topDepts = [...depts].sort((a, b) => departmentHealth(b) - departmentHealth(a)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <Stat label="Total active members" value={data.members} />
        <Stat label="Branches" value={data.branches.length || 3} />
        <Stat label="Weekly attendance" value={weekly} sub="Latest month ÷ 4" />
        <Stat label="Monthly growth" value={`${growth > 0 ? "+" : ""}${growth}%`} sub="vs previous month" />
        <Stat label="Salvations" value={data.souls.length} />
        <Stat label="Baptisms" value={baptisms} />
        <Stat label="Active volunteers" value={data.volunteers} />
        <Stat label="Departments" value={data.departments} />
        <Stat label="Development projects" value={data.projects.length} />
        <Stat label="Coaching sessions" value={data.coaching} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ScoreDial label="Kingdom impact" value={kingdomScore} />
        <ScoreDial label="Leadership health" value={leadershipScore} />
        <ScoreDial label="Financial health" value={financeScore} />
        <ScoreDial label="Ministry health" value={ministryScore} />
        <ScoreDial label="Governance compliance" value={governanceScore} />
        <ScoreDial label="Vision implementation" value={visionProgress} />
      </div>

      {data.vision && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Vision {data.vision.year} · {data.vision.status === "published" ? "Published" : "Draft"}
          </p>
          <h3 className="mt-1 font-serif text-2xl">{data.vision.theme}</h3>
          {data.vision.scripture && <p className="text-xs italic text-muted-foreground">{data.vision.scripture}</p>}
          {data.vision.vision_statement && <p className="mt-2 text-sm">{data.vision.vision_statement}</p>}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Attendance trend" description="Total present per month across all branches">
          <div className="space-y-3">
            {perPeriod.map((p) => (
              <BarRow key={p.period} label={p.period} value={p.total} max={maxAtt} />
            ))}
            {perPeriod.length === 0 && <Empty>No attendance captured yet.</Empty>}
          </div>
        </Section>

        <Section title="Giving & financial position" description="Rolling twelve months">
          {fin ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="Total income" value={money(income)} />
              <Stat label="Total expenditure" value={money(expense)} />
              <Stat label="Net position" value={money(income - expense)} />
              <Stat label="Giving this month" value={money(fin.giving_this_month)} />
              <Stat label="Outstanding payments" value={money(fin.outstanding_payments)} />
              <Stat label="Approvals pending" value={String(fin.pending_approvals ?? 0)} />
            </div>
          ) : (
            <Empty>Finance summary is not available for your role.</Empty>
          )}
        </Section>

        <Section title="Department performance" description="Top departments by composite health">
          <div className="space-y-3">
            {topDepts.map((d) => (
              <BarRow
                key={d.department_slug}
                label={d.department_name}
                value={departmentHealth(d)}
                max={100}
                hint={`${departmentHealth(d)}% · ${d.overdue_tasks} overdue`}
              />
            ))}
            {topDepts.length === 0 && <Empty>No department oversight data yet.</Empty>}
          </div>
        </Section>

        <Section title="Branch activity" description="Attendances captured in the last 60 days">
          <div className="space-y-3">
            {(data.branches as any[]).map((b) => (
              <BarRow
                key={b.branch}
                label={branchLabel(b.branch)}
                value={Number(b.total_present ?? 0)}
                max={Math.max(1, ...(data.branches as any[]).map((x) => Number(x.total_present ?? 0)))}
              />
            ))}
            {data.branches.length === 0 && <Empty>No branch activity in this window.</Empty>}
          </div>
        </Section>

        <Section title="Strategic objectives progress" description="Objectives linked to the current annual vision">
          <div className="space-y-3">
            <BarRow label="Average implementation" value={visionProgress} max={100} hint={`${visionProgress}%`} />
            <BarRow label="KPI achievement" value={kpiAchievement} max={100} hint={`${kpiAchievement}%`} />
            <BarRow
              label="Task completion (90 days)"
              value={
                data.tasks && Number(data.tasks.total_tasks) > 0
                  ? Math.round((Number(data.tasks.done_tasks) / Number(data.tasks.total_tasks)) * 100)
                  : 0
              }
              max={100}
            />
          </div>
        </Section>

        <Section title="Fivefold ministry health" description="Average performance per office">
          <div className="space-y-3">
            {["apostle", "prophet", "evangelist", "pastor", "teacher"].map((office) => {
              const rows = (data.fivefold as any[]).filter((f) => f.office === office);
              const avg = rows.length
                ? Math.round(rows.reduce((s, r) => s + Number(r.performance_pct ?? 0), 0) / rows.length)
                : 0;
              return (
                <BarRow
                  key={office}
                  label={`${office[0]!.toUpperCase()}${office.slice(1)}s`}
                  value={avg}
                  max={100}
                  hint={`${rows.length} on register · ${avg}%`}
                />
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}
