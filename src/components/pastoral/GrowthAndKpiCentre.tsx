import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { branchLabel, exportRows } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";
import { ragForScore } from "@/lib/ministry";

const sb = supabase as any;

/** MODULES 8, 9 & 16 — Spiritual growth, the Ministry KPI Centre and executive analytics. */
export default function GrowthAndKpiCentre() {
  const [d, setD] = useState<any>(null);
  const [dept, setDept] = useState("all");

  useEffect(() => {
    (async () => {
      const [kpis, perf, attendance, souls, enrol, events, departments, comparison, branchAct] = await Promise.all([
        sb.from("kpis").select("id, kpi_name, department_slug, branch, actual, target, period_date, category").order("period_date", { ascending: false }).limit(600),
        sb.rpc("get_department_performance"),
        sb.rpc("get_attendance_trend", { _months: 12 }),
        sb.from("souls_won").select("id, created_at, branch"),
        sb.from("enrollments").select("id, status"),
        sb.from("events").select("id, event_type, event_date"),
        sb.from("departments").select("slug, name").order("name"),
        sb.rpc("get_kpi_period_comparison"),
        sb.rpc("get_branch_activity", { _days: 90 }),
      ]);
      setD({
        kpis: kpis.data ?? [],
        perf: perf.data ?? [],
        attendance: attendance.data ?? [],
        souls: souls.data ?? [],
        enrol: enrol.data ?? [],
        events: events.data ?? [],
        departments: departments.data ?? [],
        comparison: comparison.data ?? [],
        branchAct: branchAct.data ?? [],
      });
    })();
  }, []);

  if (!d) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading ministry analytics…</Card>;

  const kpis = d.kpis.filter((k: any) => dept === "all" || k.department_slug === dept);
  const withPct = kpis
    .filter((k: any) => Number(k.target) > 0 && k.actual !== null)
    .map((k: any) => ({ ...k, pct: Math.round((Number(k.actual) / Number(k.target)) * 100) }));

  const eventCount = (t: string) => d.events.filter((e: any) => (e.event_type ?? "").toLowerCase().includes(t)).length;

  const exportKpis = () =>
    exportRows(
      "ministry-kpi-centre",
      ["KPI", "Department", "Branch", "Category", "Period", "Target", "Actual", "Achievement %"],
      withPct.map((k: any) => [
        k.kpi_name,
        d.departments.find((x: any) => x.slug === k.department_slug)?.name ?? k.department_slug,
        k.branch ? branchLabel(k.branch) : "",
        k.category ?? "",
        k.period_date,
        k.target,
        k.actual,
        `${k.pct}%`,
      ]),
    );

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-serif text-lg">Spiritual growth</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Prayer meetings", eventCount("prayer")],
            ["Bible studies", eventCount("study")],
            ["Training & devotions", eventCount("training")],
            ["New believers", d.souls.length],
            ["School of Ministry enrolments", d.enrol.length],
          ].map(([l, v]) => (
            <div key={String(l)} className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p>
              <p className="mt-1 font-serif text-2xl">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Ministry KPI centre</h3>
          <div className="flex gap-2">
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {d.departments.map((x: any) => <SelectItem key={x.slug} value={x.slug}>{x.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportKpis}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {withPct.length === 0 && <p className="text-sm text-muted-foreground">No KPI actuals captured for this filter yet.</p>}
          {withPct.slice(0, 40).map((k: any) => (
            <div key={k.id} className="flex flex-wrap items-center gap-3 border-b pb-2 text-sm last:border-0">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${RAG_DOT[ragForScore(k.pct)]}`} />
              <span className="min-w-64 flex-1">{k.kpi_name}</span>
              <span className="text-xs text-muted-foreground">
                {d.departments.find((x: any) => x.slug === k.department_slug)?.name ?? k.department_slug}
                {k.branch ? ` · ${branchLabel(k.branch)}` : ""} · {k.period_date}
              </span>
              <span className="w-36"><Progress value={Math.min(100, k.pct)} /></span>
              <span className="w-28 text-right">{k.actual} / {k.target} ({k.pct}%)</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-serif text-lg">Department comparison</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {d.perf.slice(0, 12).map((p: any, i: number) => (
              <li key={i} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                <span>{d.departments.find((x: any) => x.slug === p.department_slug)?.name ?? p.department_slug}</span>
                <span className="text-muted-foreground">{p.branch ? branchLabel(p.branch) : ""} · {p.avg_pct}%</span>
              </li>
            ))}
            {d.perf.length === 0 && <li className="text-muted-foreground">No performance data yet.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg">Trend analysis</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {d.comparison.map((c: any, i: number) => (
              <li key={i} className="flex justify-between border-b pb-2 last:border-0">
                <span>{c.period_label}</span>
                <span className="text-muted-foreground">
                  now {c.current_avg_pct ?? 0}% · previously {c.previous_avg_pct ?? 0}%
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg">Branch activity (90 days)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {d.branchAct.map((b: any, i: number) => (
              <li key={i} className="flex justify-between border-b pb-2 last:border-0">
                <span>{branchLabel(b.branch)}</span>
                <span className="text-muted-foreground">{b.total_present} present</span>
              </li>
            ))}
            {d.branchAct.length === 0 && <li className="text-muted-foreground">No attendance recorded.</li>}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-serif text-lg">Attendance growth (12 months)</h3>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {d.attendance.map((a: any, i: number) => (
            <li key={i} className="flex justify-between rounded-md border px-3 py-2">
              <span>{a.period} · {branchLabel(a.branch)}</span>
              <span className="text-muted-foreground">{a.total_present}</span>
            </li>
          ))}
          {d.attendance.length === 0 && <li className="text-muted-foreground">No attendance recorded.</li>}
        </ul>
      </Card>
    </div>
  );
}
