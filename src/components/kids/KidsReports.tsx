import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer } from "lucide-react";
import { branchLabel, exportRows, fmtDate } from "@/lib/finance";
import { AGE_GROUPS, MILESTONE_TYPES, clearedToServe, labelFor, pct, today } from "@/lib/kids";

const sb = supabase as any;

/** MODULE 11 — Executive & board reporting pack for Children's Ministry. */
export default function KidsReports() {
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [children, checkins, rooms, volunteers, incidents, milestones, delivery, engagement] = await Promise.all([
        sb.from("children").select("*"),
        sb.from("kids_checkins").select("*").order("service_date", { ascending: false }).limit(5000),
        sb.from("kids_classrooms").select("*"),
        sb.from("kids_volunteers").select("*"),
        sb.from("kids_incidents").select("*"),
        sb.from("kids_milestones").select("*"),
        sb.from("kids_lesson_delivery").select("*"),
        sb.from("kids_family_engagement").select("*"),
      ]);
      setD({
        children: children.data ?? [], checkins: checkins.data ?? [], rooms: rooms.data ?? [],
        volunteers: volunteers.data ?? [], incidents: incidents.data ?? [], milestones: milestones.data ?? [],
        delivery: delivery.data ?? [], engagement: engagement.data ?? [],
      });
    })();
  }, []);

  const r = useMemo(() => {
    if (!d) return null;
    const dates = Array.from(new Set(d.checkins.map((c: any) => c.service_date))).sort().reverse() as string[];
    const month = new Date().toISOString().slice(0, 7);
    const monthly = d.checkins.filter((c: any) => (c.service_date ?? "").startsWith(month));
    const active = d.volunteers.filter((v: any) => v.status === "active");
    const cleared = active.filter((v: any) => clearedToServe(v).ok);
    return {
      dates,
      total: d.children.length,
      monthlyVisits: monthly.length,
      avg: dates.length ? Math.round(d.checkins.length / dates.length) : 0,
      firstTimers: d.checkins.filter((c: any) => c.is_first_time).length,
      saved: d.milestones.filter((m: any) => m.milestone_type === "saved").length,
      baptised: d.milestones.filter((m: any) => m.milestone_type === "baptised").length,
      verses: d.milestones.filter((m: any) => m.milestone_type === "memory_verse").length,
      lessons: d.delivery.length,
      incidentsOpen: d.incidents.filter((i: any) => !["resolved", "closed"].includes(i.status)).length,
      incidentsTotal: d.incidents.length,
      compliance: pct(cleared.length, Math.max(active.length, 1)),
      volunteers: active.length,
      engagement: d.engagement.length,
      capacity: pct(monthly.length / Math.max(1, new Set(monthly.map((m: any) => m.service_date)).size), d.rooms.reduce((a: number, x: any) => a + (x.capacity ?? 0), 0)),
    };
  }, [d]);

  if (!r) return <Card className="p-8 text-center text-sm text-muted-foreground">Compiling report pack…</Card>;

  const rows: [string, string | number][] = [
    ["Registered children", r.total],
    ["Average attendance per service", r.avg],
    ["Check-ins this month", r.monthlyVisits],
    ["Capacity utilisation", `${r.capacity}%`],
    ["First-time visitors (all time)", r.firstTimers],
    ["Children who gave their lives to Christ", r.saved],
    ["Children baptised", r.baptised],
    ["Memory verses completed", r.verses],
    ["Lessons delivered", r.lessons],
    ["Active volunteers", r.volunteers],
    ["Safeguarding compliance", `${r.compliance}%`],
    ["Incidents (open / total)", `${r.incidentsOpen} / ${r.incidentsTotal}`],
    ["Family engagements logged", r.engagement],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" onClick={() => exportRows("kids-executive-report", ["Metric", "Value"], rows.map(([a, b]) => [a, String(b)]))}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print / PDF</Button>
      </div>

      <Card className="p-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">TRoGKC Children's Ministry</p>
        <h2 className="font-serif text-2xl">Executive Report Pack</h2>
        <p className="text-sm text-muted-foreground">Generated {fmtDate(today())}</p>

        <table className="mt-6 w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-border/60">
                <td className="py-2 text-muted-foreground">{k}</td>
                <td className="py-2 text-right font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Enrolment by age group</p>
            {AGE_GROUPS.map((a) => (
              <p key={a.key} className="text-sm">{a.label}: {d.children.filter((c: any) => c.age_group === a.key).length}</p>
            ))}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Spiritual milestones</p>
            {MILESTONE_TYPES.map((m) => (
              <p key={m.key} className="text-sm">{m.label}: {d.milestones.filter((x: any) => x.milestone_type === m.key).length}</p>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Classroom summary</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {d.rooms.map((room: any) => (
              <div key={room.id} className="flex items-center justify-between rounded border border-border/60 p-3 text-sm">
                <span>{room.name} <span className="text-xs text-muted-foreground">({branchLabel(room.branch)})</span></span>
                <Badge variant="outline">{d.children.filter((c: any) => c.classroom_id === room.id).length} enrolled / {room.capacity ?? "—"}</Badge>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Prepared for the Senior Pastors, Chairperson and Children's Ministry leadership. Safeguarding compliance below 100% requires immediate remediation before the next service.
        </p>
      </Card>
    </div>
  );
}
