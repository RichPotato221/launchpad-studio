import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CARE_OPEN, ragForScore, today } from "@/lib/ministry";
import { RAG_DOT } from "@/lib/governance";

const sb = supabase as any;

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="font-serif text-lg">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </Card>
  );
}

/** MODULE 1 — Associate Pastor Executive Dashboard. */
export default function MinistryDashboard() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      const [oversight, cases, prayers, volunteers, leaders, coaching, souls, events, tasks, attendance, plans, risks] =
        await Promise.all([
          sb.rpc("get_department_oversight"),
          sb.from("pastoral_cases").select("*"),
          sb.from("prayer_requests").select("*"),
          sb.from("volunteer_profiles").select("*"),
          sb.from("leader_profiles").select("*"),
          sb.from("coaching_sessions").select("*"),
          sb.from("souls_won").select("id, created_at"),
          sb.from("events").select("id, title, event_date, department_slug").gte("event_date", today()).order("event_date").limit(8),
          sb.from("tasks").select("id, title, status, due_date, department_slug").not("status", "in", "(done,completed,cancelled)"),
          sb.rpc("get_attendance_trend", { _months: 6 }),
          sb.from("ministry_plans").select("id, status, progress_pct"),
          sb.from("governance_risks").select("id, description, rating, status, department_slug").neq("status", "closed").order("rating", { ascending: false }).limit(8),
        ]);
      setD({
        oversight: oversight.data ?? [],
        cases: cases.data ?? [],
        prayers: prayers.data ?? [],
        volunteers: volunteers.data ?? [],
        leaders: leaders.data ?? [],
        coaching: coaching.data ?? [],
        souls: souls.data ?? [],
        events: events.data ?? [],
        tasks: tasks.data ?? [],
        attendance: attendance.data ?? [],
        plans: plans.data ?? [],
        risks: risks.data ?? [],
        in30,
      });
      setLoading(false);
    })();
  }, []);

  const m = useMemo(() => {
    if (!d) return null;
    const openCases = d.cases.filter((c: any) => CARE_OPEN.includes(c.status));
    const kpiAvg =
      d.oversight.length > 0
        ? Math.round(
            d.oversight.reduce((s: number, r: any) => s + Number(r.kpi_avg_pct ?? 0), 0) / d.oversight.length,
          )
        : 0;
    const activeVols = d.volunteers.filter((v: any) => v.status === "active" && !v.on_leave);
    const engagement =
      d.volunteers.length > 0 ? Math.round((activeVols.length / d.volunteers.length) * 100) : 0;
    const overdueTasks = d.tasks.filter((t: any) => t.due_date && t.due_date < today());
    const monthSouls = d.souls.filter((s: any) => (s.created_at ?? "").slice(0, 7) === today().slice(0, 7));
    const readyLeaders = d.leaders.filter((l: any) => ["ready", "overdue"].includes(l.promotion_readiness));
    const burnoutLeaders = d.leaders.filter((l: any) => l.burnout_risk === "high");
    const burnoutVols = d.volunteers.filter((v: any) => v.burnout_risk === "high");
    const coachedThisQuarter = d.coaching.filter(
      (c: any) => c.status === "completed" && c.session_date >= new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10),
    );
    const attendanceTotal = d.attendance.reduce((s: number, r: any) => s + Number(r.total_present ?? 0), 0);
    const spiritual = Math.round(
      (Math.min(100, kpiAvg) * 0.4 + Math.min(100, engagement) * 0.3 + Math.min(100, 100 - openCases.length * 2) * 0.3),
    );
    return {
      openCases,
      kpiAvg,
      engagement,
      overdueTasks,
      monthSouls,
      readyLeaders,
      burnoutLeaders,
      burnoutVols,
      coachedThisQuarter,
      attendanceTotal,
      spiritual: Math.max(0, Math.min(100, spiritual)),
      activeVols,
    };
  }, [d]);

  if (loading || !m) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading ministry dashboard…</Card>;

  const rag = ragForScore(m.spiritual);
  const byType = (t: string) => d.cases.filter((c: any) => c.case_type === t).length;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Church spiritual health score</p>
            <div className="mt-1 flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${RAG_DOT[rag]}`} />
              <span className="font-serif text-4xl">{m.spiritual}%</span>
            </div>
          </div>
          <div className="w-full max-w-md">
            <Progress value={m.spiritual} />
            <p className="mt-2 text-xs text-muted-foreground">
              Weighted from departmental KPI achievement, volunteer engagement and open pastoral care load.
            </p>
          </div>
        </div>
      </Card>

      <Panel title="Spiritual health">
        <Stat label="Departmental KPI achievement" value={`${m.kpiAvg}%`} />
        <Stat label="New converts this month" value={m.monthSouls.length} hint={`${d.souls.length} recorded in total`} />
        <Stat label="Prayer requests open" value={d.prayers.filter((p: any) => p.status !== "closed").length} />
        <Stat label="Attendance (6 months)" value={m.attendanceTotal} hint="Present markings captured" />
      </Panel>

      <Panel title="Ministry health">
        <Stat label="Departments tracked" value={d.oversight.length} />
        <Stat label="Active ministry plans" value={d.plans.filter((p: any) => ["approved", "in_progress"].includes(p.status)).length} />
        <Stat label="Volunteer engagement" value={`${m.engagement}%`} hint={`${m.activeVols.length} of ${d.volunteers.length} serving`} />
        <Stat label="Open ministry risks" value={d.risks.length} />
      </Panel>

      <Panel title="Leadership health">
        <Stat label="Leadership profiles" value={d.leaders.length} />
        <Stat label="Coaching sessions (90 days)" value={m.coachedThisQuarter.length} />
        <Stat label="Promotion ready" value={m.readyLeaders.length} />
        <Stat label="Burnout alerts" value={m.burnoutLeaders.length + m.burnoutVols.length} hint="Leaders and volunteers flagged high" />
      </Panel>

      <Panel title="Pastoral care">
        <Stat label="Hospital visits" value={byType("hospital_visit")} />
        <Stat label="Bereavement cases" value={byType("bereavement")} />
        <Stat label="Counselling referrals" value={byType("counselling")} />
        <Stat label="Home visits" value={byType("home_visit")} />
        <Stat label="Restoration cases" value={byType("restoration")} />
        <Stat label="Open cases" value={m.openCases.length} />
        <Stat
          label="Follow-ups due"
          value={m.openCases.filter((c: any) => c.follow_up_date && c.follow_up_date <= today()).length}
        />
        <Stat label="Cases closed" value={d.cases.filter((c: any) => c.status === "closed").length} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-serif text-lg">Upcoming ministry events</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {d.events.length === 0 && <li className="text-muted-foreground">Nothing scheduled.</li>}
            {d.events.map((e: any) => (
              <li key={e.id} className="flex justify-between gap-3 border-b pb-2 last:border-0">
                <span>{e.title}</span>
                <span className="shrink-0 text-muted-foreground">{e.event_date}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg">Urgent prayer requests</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {d.prayers.filter((p: any) => p.urgency !== "normal" && p.status !== "closed").slice(0, 8).map((p: any) => (
              <li key={p.id} className="border-b pb-2 last:border-0">
                <span className="font-medium capitalize">{p.urgency}</span> — {String(p.request).slice(0, 90)}
              </li>
            ))}
            {d.prayers.filter((p: any) => p.urgency !== "normal" && p.status !== "closed").length === 0 && (
              <li className="text-muted-foreground">No urgent requests outstanding.</li>
            )}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg">Critical attention</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between border-b pb-2">
              <span>Overdue tasks</span>
              <span className="font-medium">{m.overdueTasks.length}</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span>Ministry risks open</span>
              <span className="font-medium">{d.risks.length}</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span>Volunteers on leave</span>
              <span className="font-medium">{d.volunteers.filter((v: any) => v.on_leave).length}</span>
            </li>
            <li className="flex justify-between">
              <span>Plans awaiting approval</span>
              <span className="font-medium">{d.plans.filter((p: any) => p.status === "submitted").length}</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
