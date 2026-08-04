import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import {
  DISCIPLESHIP_STAGES,
  TEAM_CONFIG,
  labelFor,
  nice,
  pct,
  ragForScore,
  riskScore,
  stageProgress,
  today,
  upcomingBirthdays,
  type TeamKey,
} from "@/lib/ministryTeams";

const sb = supabase as any;
const COLOURS = ["#0f766e", "#b45309", "#1d4ed8", "#7c3aed", "#be123c", "#047857", "#c2410c", "#4338ca"];

/** Live command dashboard for a ministry team. */
export default function TeamDashboard({ team }: { team: TeamKey }) {
  const cfg = TEAM_CONFIG[team];
  const q = useQuery({
    queryKey: ["mt-dashboard", team],
    queryFn: async () => {
      const one = (t: string) => sb.from(t).select("*").eq("team", team);
      const [members, groups, mentorships, events, attendance, outreach, prayer, tasks, risks, training] = await Promise.all([
        one("mt_members"), one("mt_groups"), one("mt_mentorships"), one("mt_events"), one("mt_attendance"),
        one("mt_outreach"), one("mt_prayer"), one("mt_tasks"), one("mt_risks"), one("mt_training_records"),
      ]);
      return {
        members: members.data ?? [], groups: groups.data ?? [], mentorships: mentorships.data ?? [],
        events: events.data ?? [], attendance: attendance.data ?? [], outreach: outreach.data ?? [],
        prayer: prayer.data ?? [], tasks: tasks.data ?? [], risks: risks.data ?? [], training: training.data ?? [],
      };
    },
    refetchInterval: 60000,
  });

  if (q.isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground">Loading ministry command dashboard…</Card>;
  const d = q.data!;

  const active = d.members.filter((m: any) => m.membership_status === "active");
  const visitors = d.members.filter((m: any) => m.stage === "first_time_visitor");
  const converts = d.members.filter((m: any) => m.stage === "new_believer");
  const baptismCandidates = d.members.filter((m: any) => m.baptism_status === "candidate");
  const serving = d.members.filter((m: any) => (m.ministry_involvement ?? "").trim().length > 0);
  const emerging = d.members.filter((m: any) => ["emerging_leader", "mentor", "team_leader", "coordinator"].includes(m.leadership_level));
  const mentors = new Set(d.mentorships.filter((m: any) => m.status === "active").map((m: any) => m.mentor_name));
  const upcoming = d.events.filter((e: any) => e.event_date >= today());
  const openPrayer = d.prayer.filter((p: any) => p.status === "open");
  const openTasks = d.tasks.filter((t: any) => t.status !== "done");
  const overdueTasks = openTasks.filter((t: any) => t.due_date && t.due_date < today());
  const openRisks = d.risks.filter((r: any) => r.status !== "closed");
  const criticalRisks = openRisks.filter((r: any) => riskScore(r.likelihood, r.impact) >= 15);
  const attendanceRate = pct(d.attendance.filter((a: any) => a.present).length, d.attendance.length || 1);
  const discipleship = d.members.length
    ? Math.round(d.members.reduce((s: number, m: any) => s + stageProgress(m.stage), 0) / d.members.length)
    : 0;
  const trainingRate = pct(d.training.filter((t: any) => Number(t.progress_pct) >= 100).length, d.training.length || 1);
  const taskRate = pct(d.tasks.filter((t: any) => t.status === "done").length, d.tasks.length || 1);
  const retention = pct(active.length, d.members.length || 1);
  const health = Math.round((attendanceRate + discipleship + trainingRate + taskRate + retention) / 5);

  const byStage = DISCIPLESHIP_STAGES.map((s) => ({
    name: s.label,
    value: d.members.filter((m: any) => m.stage === s.key).length,
  })).filter((s) => s.value > 0);

  const byType = cfg.eventTypes
    .map((t) => ({ name: t.label, value: d.events.filter((e: any) => e.event_type === t.key).length }))
    .filter((t) => t.value > 0);

  const trend = (() => {
    const map = new Map<string, { month: string; attendance: number; events: number }>();
    for (const e of d.events) {
      const key = String(e.event_date).slice(0, 7);
      const row = map.get(key) ?? { month: key, attendance: 0, events: 0 };
      row.attendance += Number(e.attendance_count ?? 0);
      row.events += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  })();

  const birthdays = upcomingBirthdays(d.members, 30);
  const disengaged = d.members.filter((m: any) => {
    const seen = d.attendance.filter((a: any) => a.member_id === m.id && a.present);
    if (!seen.length) return d.attendance.length > 0;
    const last = seen.map((a: any) => a.attended_on).sort().at(-1);
    return last ? (Date.now() - new Date(last).getTime()) / 86400000 > 21 : true;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Registered" value={d.members.length} />
        <Kpi label="Active" value={active.length} />
        <Kpi label="First-time visitors" value={visitors.length} />
        <Kpi label="New converts" value={converts.length} />
        <Kpi label="Baptism candidates" value={baptismCandidates.length} />
        <Kpi label="Small groups" value={d.groups.filter((g: any) => g.status === "active").length} />
        <Kpi label="Serving in ministry" value={serving.length} />
        <Kpi label="Active mentors" value={mentors.size} />
        <Kpi label="Emerging leaders" value={emerging.length} />
        <Kpi label="Upcoming events" value={upcoming.length} />
        <Kpi label="Open prayer requests" value={openPrayer.length} />
        <Kpi label="Ministry health" value={`${health}%`} rag={ragForScore(health, 70, 45)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-serif text-lg">Attendance &amp; activity trend</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#0f766e" strokeWidth={2} />
                <Line type="monotone" dataKey="events" stroke="#b45309" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg">Discipleship pathway</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStage} dataKey="value" nameKey="name" outerRadius={80}>
                  {byStage.map((_, i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-serif text-lg">Ministry health score</h3>
          <div className="mt-4 space-y-3">
            <Meter label="Attendance rate" value={attendanceRate} />
            <Meter label="Discipleship progress" value={discipleship} />
            <Meter label="Training completion" value={trainingRate} />
            <Meter label="Task completion" value={taskRate} />
            <Meter label="Retention" value={retention} />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg">Activity by type</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg">Alerts &amp; follow-up</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <Alert label="Members needing pastoral follow-up (3+ weeks absent)" value={disengaged.length} tone={disengaged.length ? "red" : "green"} />
            <Alert label="Overdue tasks" value={overdueTasks.length} tone={overdueTasks.length ? "amber" : "green"} />
            <Alert label="Critical risks" value={criticalRisks.length} tone={criticalRisks.length ? "red" : "green"} />
            <Alert label="Outreach projects running" value={d.outreach.filter((o: any) => o.status !== "completed").length} tone="green" />
            <Alert label="Birthdays in the next 30 days" value={birthdays.length} tone="green" />
          </ul>
          {birthdays.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Next: {birthdays.slice(0, 4).map((b: any) => `${b.full_name} (${fmtDate(b._on)})`).join(", ")}
            </p>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-serif text-lg">Upcoming ministry calendar</h3>
        <div className="mt-4 space-y-2">
          {upcoming.slice(0, 8).map((e: any) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{labelFor(cfg.eventTypes, e.event_type)} · {e.venue || "venue TBC"}</p>
              </div>
              <Badge variant="outline">{fmtDate(e.event_date)} {e.start_time}</Badge>
            </div>
          ))}
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>}
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, rag }: { label: string; value: string | number; rag?: "green" | "amber" | "red" }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {rag && <Badge variant="outline" className={`mt-2 ${RAG_CLASS[rag]}`}>{rag}</Badge>}
    </Card>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span>{label}</span><span>{value}%</span></div>
      <Progress value={value} className="mt-1 h-2" />
    </div>
  );
}

function Alert({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
      <span>{nice(label)}</span>
      <Badge variant="outline" className={RAG_CLASS[tone]}>{value}</Badge>
    </li>
  );
}
