import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RAG_DOT, RAG_LABEL, departmentHealth, ragForHealth, type DepartmentOversightRow } from "@/lib/governance";
import { CARE_OPEN, today } from "@/lib/ministry";
import { titleCase } from "@/lib/finance";

const sb = supabase as any;

/** Roles that report into the Office of the Lead / Assistant Pastor. */
const OVERSIGHT_ROLES = ["associate_pastor", "elder"];

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Executive oversight for the Office of the Lead / Assistant Pastor.
 * Church-wide health, the ministry health meter and the leadership line
 * (Associate Pastors and Elders) reporting into this office.
 */
export default function ExecutiveOversight() {
  const { data, isLoading } = useQuery({
    queryKey: ["lead-pastor-oversight"],
    queryFn: async () => {
      const [oversight, profiles, roles, cases, prayers, souls, attendance, taskStats, reports, leaders] =
        await Promise.all([
          sb.rpc("get_department_oversight"),
          sb.from("profiles").select("id, full_name, primary_department, branch, approval_status"),
          sb.from("user_roles").select("user_id, role"),
          sb.from("pastoral_cases").select("id, status, case_type, assigned_to"),
          sb.from("prayer_requests").select("id, status"),
          sb.from("souls_won").select("id, created_at"),
          sb.rpc("get_attendance_trend", { _months: 6 }),
          sb.rpc("get_task_completion", { _days: 30 }),
          sb.from("branch_reports").select("id, status, department_slug, submitted_at").gte("period_end", new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10)),
          sb.from("leader_profiles").select("user_id, department_slug, readiness_score, burnout_risk, last_coached_on"),
        ]);
      return {
        oversight: (oversight.data ?? []) as DepartmentOversightRow[],
        profiles: profiles.data ?? [],
        roles: roles.data ?? [],
        cases: cases.data ?? [],
        prayers: prayers.data ?? [],
        souls: souls.data ?? [],
        attendance: attendance.data ?? [],
        taskStats: (taskStats.data ?? [])[0] ?? null,
        reports: reports.data ?? [],
        leaders: leaders.data ?? [],
      };
    },
  });

  const view = useMemo(() => {
    if (!data) return null;
    const approved = data.profiles.filter((p: any) => p.approval_status === "approved");
    const openCases = data.cases.filter((c: any) => CARE_OPEN.includes(c.status));
    const months = [...data.attendance].reduce((acc: Record<string, number>, r: any) => {
      acc[r.period] = (acc[r.period] ?? 0) + Number(r.total_present ?? 0);
      return acc;
    }, {});
    const periods = Object.keys(months).sort();
    const latest = periods.length ? months[periods[periods.length - 1]] : 0;
    const prior = periods.length > 1 ? months[periods[periods.length - 2]] : 0;
    const growth = prior ? Math.round(((latest - prior) / prior) * 100) : 0;
    const soulsYtd = data.souls.filter((s: any) => (s.created_at ?? "").slice(0, 4) === today().slice(0, 4)).length;

    const scored = data.oversight
      .map((r) => ({ row: r, health: departmentHealth(r) }))
      .sort((a, b) => b.health - a.health);
    const overall = scored.length ? Math.round(scored.reduce((s, x) => s + x.health, 0) / scored.length) : 0;

    const roleByUser = new Map<string, string[]>();
    for (const r of data.roles as any[]) {
      roleByUser.set(r.user_id, [...(roleByUser.get(r.user_id) ?? []), r.role]);
    }
    const leaderByUser = new Map<string, any>();
    for (const l of data.leaders as any[]) leaderByUser.set(l.user_id, l);

    const line = approved
      .filter((p: any) => (roleByUser.get(p.id) ?? []).some((r) => OVERSIGHT_ROLES.includes(r)))
      .map((p: any) => {
        const roles = roleByUser.get(p.id) ?? [];
        const dept = data.oversight.find((o) => o.department_slug === p.primary_department);
        const lp = leaderByUser.get(p.id);
        return {
          id: p.id,
          name: p.full_name ?? "Unnamed leader",
          office: roles.includes("associate_pastor") ? "Associate Pastor" : "Elder",
          department: dept?.department_name ?? titleCase(p.primary_department ?? "unassigned"),
          health: dept ? departmentHealth(dept) : null,
          openCases: openCases.filter((c: any) => c.assigned_to === p.id).length,
          readiness: lp?.readiness_score ?? null,
          burnout: lp?.burnout_risk ?? null,
          lastCoached: lp?.last_coached_on ?? null,
        };
      })
      .sort((a, b) => (a.office === b.office ? a.name.localeCompare(b.name) : a.office.localeCompare(b.office)));

    const pendingReviews = data.reports.filter((r: any) => r.status === "submitted").length;

    return {
      members: approved.length,
      openCases: openCases.length,
      prayers: data.prayers.filter((p: any) => p.status !== "closed").length,
      soulsYtd,
      latest,
      growth,
      overall,
      scored,
      line,
      pendingReviews,
      tasks: data.taskStats,
    };
  }, [data]);

  if (isLoading || !view) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Loading executive oversight…</Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-serif text-lg">Church health overview</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Approved members" value={view.members} />
          <Stat label="Latest month attendance" value={view.latest} hint={`${view.growth >= 0 ? "+" : ""}${view.growth}% vs prior month`} />
          <Stat label="New converts (YTD)" value={view.soulsYtd} />
          <Stat label="Open pastoral cases" value={view.openCases} />
          <Stat label="Open prayer requests" value={view.prayers} />
          <Stat label="Tasks completed (30d)" value={`${view.tasks?.done_tasks ?? 0}/${view.tasks?.total_tasks ?? 0}`} hint={`${view.tasks?.overdue_tasks ?? 0} overdue`} />
          <Stat label="Reports awaiting review" value={view.pendingReviews} />
          <Stat label="Overall ministry health" value={`${view.overall}%`} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg">Ministry health meter</h3>
          <Badge variant="outline">
            <span className={RAG_DOT[ragForHealth(view.overall)]} /> Overall {view.overall}% · {RAG_LABEL[ragForHealth(view.overall)]}
          </Badge>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {view.scored.map(({ row, health }) => (
            <div key={row.department_slug} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{row.department_name}</p>
                <span className="text-sm tabular-nums">{health}%</span>
              </div>
              <Progress value={health} className="mt-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                KPI {row.kpi_avg_pct ?? 0}% · {row.open_tasks ?? 0} open tasks · {row.overdue_tasks ?? 0} overdue · {row.open_risks ?? 0} risks
              </p>
            </div>
          ))}
          {!view.scored.length && <p className="text-sm text-muted-foreground">No department activity recorded yet.</p>}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-serif text-lg">Leadership oversight — Associate Pastors &amp; Elders</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Every leader reporting into this office, with their assigned ministry, care load and development status.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Leader</th>
                <th className="py-2 pr-3">Office</th>
                <th className="py-2 pr-3">Assigned ministry</th>
                <th className="py-2 pr-3">Ministry health</th>
                <th className="py-2 pr-3">Open cases</th>
                <th className="py-2 pr-3">Readiness</th>
                <th className="py-2 pr-3">Burnout</th>
                <th className="py-2 pr-3">Last coached</th>
              </tr>
            </thead>
            <tbody>
              {view.line.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{l.name}</td>
                  <td className="py-2 pr-3">{l.office}</td>
                  <td className="py-2 pr-3">{l.department}</td>
                  <td className="py-2 pr-3">
                    {l.health === null ? "—" : (
                      <span className="inline-flex items-center gap-2">
                        <span className={RAG_DOT[ragForHealth(l.health)]} />
                        {l.health}%
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{l.openCases}</td>
                  <td className="py-2 pr-3">{l.readiness === null ? "—" : `${l.readiness}%`}</td>
                  <td className="py-2 pr-3">{l.burnout ? titleCase(l.burnout) : "—"}</td>
                  <td className="py-2 pr-3">{l.lastCoached ?? "Never"}</td>
                </tr>
              ))}
              {!view.line.length && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    No Associate Pastors or Elders have been appointed yet. Assign the roles in the Admin office and they will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
