import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, Printer } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate } from "@/lib/finance";
import {
  TEAM_CONFIG,
  nice,
  pct,
  ragForScore,
  riskScore,
  stageProgress,
  today,
  type TeamKey,
} from "@/lib/ministryTeams";

const sb = supabase as any;

/** KPI scorecard + reporting centre (weekly / monthly / quarterly / annual). */
export default function TeamReportsModule({ team }: { team: TeamKey }) {
  const cfg = TEAM_CONFIG[team];
  const q = useQuery({
    queryKey: ["mt-reports", team],
    queryFn: async () => {
      const one = (t: string) => sb.from(t).select("*").eq("team", team);
      const [members, mentorships, events, attendance, outreach, prayer, tasks, risks, training, groups] = await Promise.all([
        one("mt_members"), one("mt_mentorships"), one("mt_events"), one("mt_attendance"),
        one("mt_outreach"), one("mt_prayer"), one("mt_tasks"), one("mt_risks"), one("mt_training_records"), one("mt_groups"),
      ]);
      return {
        members: members.data ?? [], mentorships: mentorships.data ?? [], events: events.data ?? [],
        attendance: attendance.data ?? [], outreach: outreach.data ?? [], prayer: prayer.data ?? [],
        tasks: tasks.data ?? [], risks: risks.data ?? [], training: training.data ?? [], groups: groups.data ?? [],
      };
    },
  });

  if (q.isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground">Compiling reports…</Card>;
  const d = q.data!;

  const active = d.members.filter((m: any) => m.membership_status === "active");
  const attendanceRate = pct(d.attendance.filter((a: any) => a.present).length, d.attendance.length || 1);
  const discipleship = d.members.length
    ? Math.round(d.members.reduce((s: number, m: any) => s + stageProgress(m.stage), 0) / d.members.length)
    : 0;

  const groupsKpi: { group: string; rows: { name: string; value: number; unit?: string }[] }[] = [
    {
      group: "Spiritual formation & discipleship",
      rows: [
        { name: "Attendance rate", value: attendanceRate, unit: "%" },
        { name: "Discipleship progress", value: discipleship, unit: "%" },
        { name: "New believers", value: d.members.filter((m: any) => m.stage === "new_believer").length },
        { name: "Baptisms", value: d.members.filter((m: any) => m.baptism_status === "baptised").length },
        { name: "Visitor retention", value: pct(d.members.filter((m: any) => m.stage !== "first_time_visitor").length, d.members.length || 1), unit: "%" },
        { name: "Prayer participation", value: d.prayer.length },
      ],
    },
    {
      group: "Mentorship & leadership development",
      rows: [
        { name: "Active mentorship pairs", value: d.mentorships.filter((m: any) => m.status === "active").length },
        { name: "Mentoring sessions completed", value: d.mentorships.reduce((s: number, m: any) => s + Number(m.sessions_completed ?? 0), 0) },
        { name: "Emerging leaders", value: d.members.filter((m: any) => m.leadership_level !== "member").length },
        { name: "Leaders trained", value: d.training.filter((t: any) => Number(t.progress_pct) >= 100).length },
        { name: "Training completion", value: pct(d.training.filter((t: any) => Number(t.progress_pct) >= 100).length, d.training.length || 1), unit: "%" },
        { name: "Succession readiness", value: pct(d.members.filter((m: any) => ["team_leader", "coordinator", "mentor"].includes(m.leadership_level)).length, d.members.length || 1), unit: "%" },
      ],
    },
    {
      group: "Outreach & community impact",
      rows: [
        { name: "Projects completed", value: d.outreach.filter((o: any) => o.status === "completed").length },
        { name: "People reached", value: d.outreach.reduce((s: number, o: any) => s + Number(o.people_reached ?? 0), 0) },
        { name: "Salvations", value: d.outreach.reduce((s: number, o: any) => s + Number(o.salvations ?? 0), 0) },
        { name: "Volunteers mobilised", value: d.outreach.reduce((s: number, o: any) => s + Number(o.volunteers ?? 0), 0) },
        { name: "Service hours", value: d.outreach.reduce((s: number, o: any) => s + Number(o.volunteer_hours ?? 0), 0) },
        { name: "Follow-ups completed", value: d.outreach.reduce((s: number, o: any) => s + Number(o.follow_ups ?? 0), 0) },
      ],
    },
    {
      group: "Ministry health & administration",
      rows: [
        { name: "Retention", value: pct(active.length, d.members.length || 1), unit: "%" },
        { name: "Events completed", value: d.events.filter((e: any) => e.status === "completed").length },
        { name: "Small groups active", value: d.groups.filter((g: any) => g.status === "active").length },
        { name: "Tasks completed", value: pct(d.tasks.filter((t: any) => t.status === "done").length, d.tasks.length || 1), unit: "%" },
        { name: "Attendance records captured", value: d.attendance.length },
        { name: "Open risks", value: d.risks.filter((r: any) => r.status !== "closed").length },
      ],
    },
  ];

  const highlights = d.events
    .filter((e: any) => e.status === "completed")
    .slice(0, 6)
    .map((e: any) => `${e.title} (${fmtDate(e.event_date)}) — ${e.attendance_count} attended`);

  const topRisks = [...d.risks]
    .filter((r: any) => r.status !== "closed")
    .sort((a: any, b: any) => riskScore(b.likelihood, b.impact) - riskScore(a.likelihood, a.impact))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="p-5 print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h3 className="font-serif text-lg">{cfg.label} KPI scorecard &amp; reporting centre</h3>
            <p className="text-xs text-muted-foreground">Live figures as at {fmtDate(today())}. Print to PDF or export to Excel/Word.</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportRows(
                  `${team}-kpi-scorecard`,
                  ["Group", "KPI", "Value"],
                  groupsKpi.flatMap((g) => g.rows.map((r) => [g.group, r.name, `${r.value}${r.unit ?? ""}`])),
                )
              }
            >
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print / PDF
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {groupsKpi.map((g) => (
            <Card key={g.group} className="p-4">
              <h4 className="font-medium">{g.group}</h4>
              <div className="mt-3 space-y-3">
                {g.rows.map((r) => (
                  <div key={r.name}>
                    <div className="flex justify-between text-sm">
                      <span>{r.name}</span>
                      <span className="font-medium">{r.value}{r.unit ?? ""}</span>
                    </div>
                    {r.unit === "%" && (
                      <>
                        <Progress value={r.value} className="mt-1 h-2" />
                        <Badge variant="outline" className={`mt-1 text-[10px] ${RAG_CLASS[ragForScore(r.value, 70, 45)]}`}>
                          {ragForScore(r.value, 70, 45)}
                        </Badge>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-serif text-lg">Report narrative</h3>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium">Ministry highlights</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {highlights.length ? highlights.map((h: string) => <li key={h}>{h}</li>) : <li>No completed events yet.</li>}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium">Top risks</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {topRisks.length ? topRisks.map((r: any) => (
                <li key={r.id}>{r.title} — {nice(r.category)} (score {riskScore(r.likelihood, r.impact)})</li>
              )) : <li>No open risks.</li>}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium">Prayer &amp; pastoral</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>{d.prayer.filter((p: any) => p.status === "open").length} open requests</li>
              <li>{d.prayer.filter((p: any) => p.status === "answered").length} answered / testimonies</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium">Priorities &amp; action items</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {d.tasks.filter((t: any) => t.status !== "done").slice(0, 6).map((t: any) => (
                <li key={t.id}>{t.title} — {t.assignee_name || "unassigned"} ({t.due_date ? fmtDate(t.due_date) : "no date"})</li>
              ))}
              {d.tasks.filter((t: any) => t.status !== "done").length === 0 && <li>No open action items.</li>}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
