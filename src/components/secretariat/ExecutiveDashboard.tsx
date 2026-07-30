import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RAG_CLASS,
  type Rag,
  ragForBacklog,
  ragForScore,
  fmtDate,
  fmtDateTime,
  exportRows,
  exportPdf,
  branchLabel,
} from "@/lib/secretariat";
import { Download, Printer } from "lucide-react";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function loadCockpit() {
  const today = startOfToday();
  const todayIso = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const [
    pendingMembers,
    pendingTaskApprovals,
    meetings,
    events,
    openTasks,
    resolutions,
    documents,
    correspondence,
    compliance,
    branchReports,
    deptPerf,
    activity,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
    supabase.from("meetings").select("id, status, event_id, created_at"),
    supabase
      .from("events")
      .select("id, title, event_date, start_time, location, event_type, branch, department_slug")
      .gte("event_date", todayIso)
      .lte("event_date", weekEnd)
      .order("event_date"),
    supabase.from("tasks").select("id, title, status, due_date, assigned_to, branch, department_slug").not("status", "in", "(done,completed,cancelled)"),
    supabase.from("resolutions").select("id, resolution_text, status, due_date, created_at, closed_at"),
    supabase.from("documents").select("id, title, status, expiry_date, review_date, version"),
    supabase.from("correspondence").select("id, subject, status, due_date, priority, created_at, responded_at"),
    supabase.from("compliance_items").select("id, title, status, due_date, risk_score"),
    supabase.from("branch_reports").select("id, branch, status, period_end"),
    supabase.rpc("get_department_performance"),
    supabase.from("audit_log").select("id, action, entity, entity_id, created_at, actor_id").order("created_at", { ascending: false }).limit(15),
  ]);

  const tasks = openTasks.data ?? [];
  const res = resolutions.data ?? [];
  const docs = documents.data ?? [];
  const corr = correspondence.data ?? [];
  const comp = compliance.data ?? [];
  const evts = events.data ?? [];

  const overdueTasks = tasks.filter((t: any) => t.due_date && t.due_date < todayIso);
  const openResolutions = res.filter((r: any) => r.status !== "closed" && r.status !== "completed");
  const docsAwaiting = docs.filter((d: any) => d.status && d.status !== "approved" && d.status !== "active");
  const expiredDocs = docs.filter((d: any) => d.expiry_date && d.expiry_date < todayIso);
  const reviewDue = docs.filter((d: any) => d.review_date && d.review_date <= todayIso);
  const corrOpen = corr.filter((c: any) => c.status !== "closed" && c.status !== "responded");
  const compOpen = comp.filter((c: any) => c.status !== "compliant" && c.status !== "closed");
  const complianceScore = comp.length ? Math.round(((comp.length - compOpen.length) / comp.length) * 100) : 100;
  const docControlScore = docs.length ? Math.round(((docs.length - expiredDocs.length - docsAwaiting.length) / docs.length) * 100) : 100;

  const allMeetings = meetings.data ?? [];
  const approvedMinutes = allMeetings.filter((m: any) => m.status === "approved").length;
  const recordsHealth = allMeetings.length ? Math.round((approvedMinutes / allMeetings.length) * 100) : 100;

  const reports = branchReports.data ?? [];
  const submitted = reports.filter((r: any) => r.status !== "draft").length;
  const branchReportingScore = reports.length ? Math.round((submitted / reports.length) * 100) : 0;

  const closedRes = res.filter((r: any) => r.closed_at);
  const avgClosureDays = closedRes.length
    ? Math.round(
        closedRes.reduce(
          (sum: number, r: any) =>
            sum + (new Date(r.closed_at).getTime() - new Date(r.created_at).getTime()) / 86400000,
          0,
        ) / closedRes.length,
      )
    : 0;

  return {
    pendingApprovals: (pendingMembers.count ?? 0) + (pendingTaskApprovals.count ?? 0),
    upcomingMeetings: evts.filter((e: any) => (e.event_type ?? "").toLowerCase().includes("meeting")),
    todayEvents: evts.filter((e: any) => e.event_date === todayIso),
    weekEvents: evts,
    openTasks: tasks,
    overdueTasks,
    openResolutions,
    docsAwaiting,
    expiredDocs,
    reviewDue,
    corrOpen,
    complianceScore,
    docControlScore,
    recordsHealth,
    branchReportingScore,
    branchReports: reports,
    deptPerf: (deptPerf.data ?? []) as any[],
    activity: activity.data ?? [],
    avgClosureDays,
    totalResolutions: res.length,
  };
}

function Kpi({
  label,
  value,
  rag,
  sub,
}: {
  label: string;
  value: string | number;
  rag: Rag;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${rag === "green" ? "bg-emerald-500" : rag === "amber" ? "bg-amber-500" : "bg-red-500"}`} />
      </div>
      <p className="mt-2 text-3xl font-semibold leading-none">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export default function ExecutiveDashboard() {
  const q = useQuery({ queryKey: ["secretariat-cockpit"], queryFn: loadCockpit });

  if (q.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (q.error || !q.data) {
    return <p className="text-sm text-muted-foreground">Could not load the executive cockpit.</p>;
  }
  const d = q.data;

  const exportSummary = () =>
    exportRows(
      "secretariat-executive-summary",
      ["Indicator", "Value"],
      [
        ["Pending approvals", d.pendingApprovals],
        ["Upcoming meetings (7 days)", d.upcomingMeetings.length],
        ["Outstanding action items", d.openTasks.length],
        ["Overdue action items", d.overdueTasks.length],
        ["Resolutions awaiting closure", d.openResolutions.length],
        ["Documents awaiting approval", d.docsAwaiting.length],
        ["Correspondence awaiting response", d.corrOpen.length],
        ["Compliance score %", d.complianceScore],
        ["Document control score %", d.docControlScore],
        ["Records health score %", d.recordsHealth],
        ["Branch reporting completion %", d.branchReportingScore],
        ["Average resolution closure (days)", d.avgClosureDays],
      ],
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted-foreground">
          Live governance position across every branch and department.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportSummary}>
            <Download className="mr-1.5 h-4 w-4" /> Export Excel (CSV)
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf}>
            <Printer className="mr-1.5 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending approvals" value={d.pendingApprovals} rag={ragForBacklog(d.pendingApprovals, 1, 5)} sub="Members & task approvals" />
        <Kpi label="Upcoming meetings" value={d.upcomingMeetings.length} rag="green" sub="Next 7 days" />
        <Kpi label="Outstanding actions" value={d.openTasks.length} rag={ragForBacklog(d.overdueTasks.length, 1, 5)} sub={`${d.overdueTasks.length} overdue`} />
        <Kpi label="Resolutions open" value={d.openResolutions.length} rag={ragForBacklog(d.openResolutions.length, 3, 10)} sub={`Avg closure ${d.avgClosureDays} days`} />
        <Kpi label="Docs awaiting approval" value={d.docsAwaiting.length} rag={ragForBacklog(d.docsAwaiting.length, 1, 5)} sub={`${d.expiredDocs.length} expired`} />
        <Kpi label="Correspondence open" value={d.corrOpen.length} rag={ragForBacklog(d.corrOpen.length, 3, 10)} sub="Awaiting response" />
        <Kpi label="Meetings today" value={d.todayEvents.length} rag="green" sub={`${d.weekEvents.length} this week`} />
        <Kpi label="Compliance score" value={`${d.complianceScore}%`} rag={ragForScore(d.complianceScore)} sub="Policy & statutory items" />
        <Kpi label="Document control" value={`${d.docControlScore}%`} rag={ragForScore(d.docControlScore)} sub={`${d.reviewDue.length} reviews due`} />
        <Kpi label="Records health" value={`${d.recordsHealth}%`} rag={ragForScore(d.recordsHealth)} sub="Minutes approved vs held" />
        <Kpi label="Branch reporting" value={`${d.branchReportingScore}%`} rag={ragForScore(d.branchReportingScore)} sub={`${d.branchReports.length} reports on file`} />
        <Kpi label="Departments tracked" value={d.deptPerf.length} rag="green" sub="With live KPI data" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-serif text-lg">Calendar — next 7 days</h3>
          {d.weekEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {d.weekEvents.slice(0, 8).map((e: any) => (
                <li key={e.id} className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(e.event_date)}
                      {e.start_time ? ` · ${String(e.start_time).slice(0, 5)}` : ""}
                      {e.location ? ` · ${e.location}` : ""} · {branchLabel(e.branch)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[0.65rem]">{e.event_type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-serif text-lg">KPI summary by department</h3>
          {d.deptPerf.length === 0 ? (
            <p className="text-sm text-muted-foreground">No KPI actuals captured in the last 90 days.</p>
          ) : (
            <ul className="space-y-2">
              {d.deptPerf.slice(0, 8).map((r: any, i: number) => {
                const pct = Number(r.avg_pct ?? 0);
                const rag: Rag = ragForScore(pct);
                return (
                  <li key={i} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium capitalize">{String(r.department_slug).replace(/-/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{branchLabel(r.branch)} · {r.kpi_count} KPIs</p>
                    </div>
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${RAG_CLASS[rag]}`}>{pct}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-serif text-lg">Branch reporting status</h3>
          {d.branchReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branch reports submitted yet.</p>
          ) : (
            <ul className="space-y-2">
              {d.branchReports.slice(0, 8).map((r: any) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                  <p className="text-sm">{branchLabel(r.branch)} · period to {fmtDate(r.period_end)}</p>
                  <Badge variant={r.status === "draft" ? "outline" : "secondary"} className="text-[0.65rem] capitalize">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-serif text-lg">Recent activity timeline</h3>
          {d.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {d.activity.map((a: any) => (
                <li key={a.id} className="border-b border-border/50 pb-2 text-sm last:border-0">
                  <span className="font-medium capitalize">{a.action}</span>{" "}
                  <span className="text-muted-foreground">on {a.entity}</span>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
