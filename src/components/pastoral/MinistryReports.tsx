import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer } from "lucide-react";
import { branchLabel, exportRows } from "@/lib/finance";
import { CARE_OPEN, CASE_TYPES, labelOf, today } from "@/lib/ministry";

const sb = supabase as any;

const REPORTS = [
  { key: "weekly", label: "Weekly ministry report", days: 7 },
  { key: "monthly", label: "Monthly ministry report", days: 30 },
  { key: "quarterly", label: "Quarterly ministry report", days: 90 },
  { key: "annual", label: "Annual ministry report", days: 365 },
] as const;

/** MODULE 11 — Ministry Reports (executive summary, PDF via print, Excel/CSV export). */
export default function MinistryReports() {
  const [period, setPeriod] = useState<string>("monthly");
  const [d, setD] = useState<any>(null);

  const days = REPORTS.find((r) => r.key === period)?.days ?? 30;
  const since = new Date(Date.now() - days * 864e5).toISOString();

  useEffect(() => {
    (async () => {
      setD(null);
      const [cases, prayers, volunteers, leaders, coaching, plans, oversight, souls, attendance, risks] = await Promise.all([
        sb.from("pastoral_cases").select("*").gte("created_at", since),
        sb.from("prayer_requests").select("*").gte("created_at", since),
        sb.from("volunteer_profiles").select("*"),
        sb.from("leader_profiles").select("*"),
        sb.from("coaching_sessions").select("*").gte("session_date", since.slice(0, 10)),
        sb.from("ministry_plans").select("*"),
        sb.rpc("get_department_oversight"),
        sb.from("souls_won").select("id, created_at").gte("created_at", since),
        sb.rpc("get_attendance_trend", { _months: 6 }),
        sb.from("governance_risks").select("id, description, rating, status").neq("status", "closed"),
      ]);
      setD({
        cases: cases.data ?? [],
        prayers: prayers.data ?? [],
        volunteers: volunteers.data ?? [],
        leaders: leaders.data ?? [],
        coaching: coaching.data ?? [],
        plans: plans.data ?? [],
        oversight: oversight.data ?? [],
        souls: souls.data ?? [],
        attendance: attendance.data ?? [],
        risks: risks.data ?? [],
      });
    })();
  }, [period, since]);

  if (!d) return <Card className="p-8 text-center text-sm text-muted-foreground">Compiling report…</Card>;

  const label = REPORTS.find((r) => r.key === period)?.label ?? "Ministry report";
  const openCases = d.cases.filter((c: any) => CARE_OPEN.includes(c.status));
  const kpiAvg = d.oversight.length
    ? Math.round(d.oversight.reduce((s: number, r: any) => s + Number(r.kpi_avg_pct ?? 0), 0) / d.oversight.length)
    : 0;

  const exportDepartmentHealth = () =>
    exportRows(
      `department-health-${period}`,
      ["Department", "KPI avg %", "Open tasks", "Overdue", "Reports (90d)", "Open risks", "Members", "Last activity"],
      d.oversight.map((r: any) => [
        r.department_name,
        r.kpi_avg_pct ?? 0,
        r.open_tasks,
        r.overdue_tasks,
        r.reports_90d,
        r.open_risks,
        r.members,
        r.last_activity ?? "",
      ]),
    );

  const exportPastoral = () =>
    exportRows(
      `pastoral-care-${period}`,
      ["Type", "Person", "Branch", "Priority", "Opened", "Status", "Outcome"],
      d.cases.map((c: any) => [
        labelOf(CASE_TYPES, c.case_type),
        c.subject_name,
        c.branch ? branchLabel(c.branch) : "",
        c.priority,
        c.opened_on,
        c.status,
        c.outcome ?? "",
      ]),
    );

  const exportVolunteers = () =>
    exportRows(
      `volunteer-report-${period}`,
      ["Volunteer", "Department", "Attended", "Missed", "Hours", "Burnout risk", "Status"],
      d.volunteers.map((v: any) => [v.full_name, v.department_slug ?? "", v.services_attended, v.services_missed, v.total_hours, v.burnout_risk, v.status]),
    );

  const exportLeadership = () =>
    exportRows(
      `leadership-development-${period}`,
      ["Leader role", "Department", "Courses", "Readiness", "Promotion", "Succession"],
      d.leaders.map((l: any) => [l.leadership_role ?? "", l.department_slug ?? "", l.courses_completed, l.readiness_score, l.promotion_readiness, l.succession_status]),
    );

  return (
    <div className="space-y-6">
      <Card className="p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Ministry reporting</h3>
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORTS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />PDF / print</Button>
            <Button variant="outline" onClick={exportDepartmentHealth}><Download className="mr-2 h-4 w-4" />Department health</Button>
            <Button variant="outline" onClick={exportPastoral}><Download className="mr-2 h-4 w-4" />Pastoral care</Button>
            <Button variant="outline" onClick={exportVolunteers}><Download className="mr-2 h-4 w-4" />Volunteers</Button>
            <Button variant="outline" onClick={exportLeadership}><Download className="mr-2 h-4 w-4" />Leadership</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-serif text-2xl">{label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Office of the Associate Pastor · Throne Room of God Kingdom Center · generated {today()}
        </p>

        <h3 className="mt-6 font-serif text-lg">Executive summary</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Average departmental KPI achievement stands at <strong>{kpiAvg}%</strong> across {d.oversight.length} departments.</li>
          <li><strong>{d.cases.length}</strong> pastoral care cases were recorded this period, of which <strong>{openCases.length}</strong> remain open.</li>
          <li><strong>{d.souls.length}</strong> new believers were recorded and <strong>{d.prayers.length}</strong> prayer requests received.</li>
          <li><strong>{d.coaching.length}</strong> coaching and mentorship sessions took place with {d.leaders.length} leaders in the academy.</li>
          <li><strong>{d.volunteers.filter((v: any) => v.status === "active" && !v.on_leave).length}</strong> volunteers are actively serving; {d.volunteers.filter((v: any) => v.burnout_risk === "high").length} are flagged for burnout risk.</li>
          <li><strong>{d.risks.length}</strong> ministry risks remain open and {d.plans.filter((p: any) => p.status === "submitted").length} plans await approval.</li>
        </ul>

        <h3 className="mt-6 font-serif text-lg">Department health</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Department</th><th>KPI %</th><th>Open tasks</th><th>Overdue</th><th>Risks</th><th>Members</th></tr>
            </thead>
            <tbody>
              {d.oversight.map((r: any) => (
                <tr key={r.department_slug} className="border-t">
                  <td className="py-2">{r.department_name}</td>
                  <td>{r.kpi_avg_pct ?? 0}%</td>
                  <td>{r.open_tasks}</td>
                  <td>{r.overdue_tasks}</td>
                  <td>{r.open_risks}</td>
                  <td>{r.members}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 font-serif text-lg">Pastoral care report</h3>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {CASE_TYPES.map((t) => (
            <li key={t.key} className="flex justify-between border-b py-1">
              <span>{t.label}</span>
              <span>{d.cases.filter((c: any) => c.case_type === t.key).length}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 font-serif text-lg">Growth report</h3>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {d.attendance.slice(-6).map((a: any, i: number) => (
            <li key={i} className="flex justify-between border-b py-1">
              <span>{a.period} · {branchLabel(a.branch)}</span>
              <span>{a.total_present} present</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
