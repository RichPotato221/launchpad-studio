import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { branchLabel, exportRows } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";
import { AGE_GROUPS, MILESTONE_TYPES, labelFor, pct, ragForKids } from "@/lib/kids";

const sb = supabase as any;

/** MODULES 9 & 17 — Attendance analytics, growth reporting and KPI heat maps. */
export default function KidsAnalytics() {
  const [checkins, setCheckins] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [delivery, setDelivery] = useState<any[]>([]);
  const [engagement, setEngagement] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [k, c, r, m, d, e] = await Promise.all([
        sb.from("kids_checkins").select("*").order("service_date", { ascending: false }).limit(5000),
        sb.from("children").select("*"),
        sb.from("kids_classrooms").select("id, name, capacity"),
        sb.from("kids_milestones").select("*"),
        sb.from("kids_lesson_delivery").select("*"),
        sb.from("kids_family_engagement").select("*"),
      ]);
      setCheckins(k.data ?? []); setChildren(c.data ?? []); setRooms(r.data ?? []);
      setMilestones(m.data ?? []); setDelivery(d.data ?? []); setEngagement(e.data ?? []);
    })();
  }, []);

  const dates = useMemo(() => Array.from(new Set(checkins.map((c) => c.service_date))).sort().reverse().slice(0, 12).reverse(), [checkins]);

  const byRoom = useMemo(() => rooms.map((r) => ({
    room: r,
    series: dates.map((d) => checkins.filter((k) => k.service_date === d && k.classroom_id === r.id).length),
  })), [rooms, dates, checkins]);

  const byAge = useMemo(() => AGE_GROUPS.map((a) => {
    const ids = new Set(children.filter((c) => c.age_group === a.key).map((c) => c.id));
    return { label: a.label, enrolled: ids.size, visits: checkins.filter((k) => ids.has(k.child_id)).length };
  }), [children, checkins]);

  const byBranch = useMemo(() => {
    const list = Array.from(new Set(checkins.map((c) => c.branch).filter(Boolean)));
    return list.map((b) => ({ branch: b as string, visits: checkins.filter((c) => c.branch === b).length }));
  }, [checkins]);

  const atRisk = useMemo(() => {
    const recent = new Set(dates.slice(-4));
    return children.filter((c) => c.status === "active" && !checkins.some((k) => k.child_id === c.id && recent.has(k.service_date)));
  }, [children, checkins, dates]);

  const maxVal = Math.max(1, ...byRoom.flatMap((r) => r.series));
  const heat = (n: number) => {
    const p = pct(n, maxVal);
    if (p === 0) return "bg-muted";
    if (p < 34) return "bg-primary/25";
    if (p < 67) return "bg-primary/55";
    return "bg-primary";
  };

  const totalVisits = checkins.length;
  const uniqueKids = new Set(checkins.map((c) => c.child_id)).size;
  const avgPerService = dates.length ? Math.round(checkins.filter((c) => dates.includes(c.service_date)).length / dates.length) : 0;
  const capacity = rooms.reduce((a, r) => a + (r.capacity ?? 0), 0);
  const verses = delivery.reduce((a, d) => a + (d.memory_verses_completed ?? 0), 0);
  const engagementScore = engagement.length ? Math.round(engagement.reduce((a, e) => a + (e.participation_score ?? 0), 0) / engagement.length) : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        {[["Total check-ins", totalVisits], ["Unique children", uniqueKids], ["Average per service", avgPerService], ["Capacity", capacity],
          ["Memory verses completed", verses], ["Milestones recorded", milestones.length], ["Lessons delivered", delivery.length], ["Family engagement score", `${engagementScore}/10`]].map(([l, v]) => (
          <Card key={l as string} className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{l as string}</p>
            <p className="font-serif text-2xl">{v as any}</p>
          </Card>
        ))}
      </div>

      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Attendance heat map by classroom</p>
        <Card className="mt-3 overflow-x-auto p-5">
          <table className="w-full text-xs">
            <thead>
              <tr><th className="p-2 text-left">Classroom</th>{dates.map((d) => <th key={d} className="p-2 text-center font-normal text-muted-foreground">{d.slice(5)}</th>)}</tr>
            </thead>
            <tbody>
              {byRoom.map(({ room, series }) => (
                <tr key={room.id}>
                  <td className="p-2 text-left">{room.name}</td>
                  {series.map((n, i) => (
                    <td key={i} className="p-1">
                      <div className={`flex h-8 items-center justify-center rounded ${heat(n)} ${n > 0 ? "text-primary-foreground" : "text-muted-foreground"}`}>{n}</div>
                    </td>
                  ))}
                </tr>
              ))}
              {byRoom.length === 0 && <tr><td className="p-4 text-muted-foreground">No classroom data yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Age-group distribution</p>
          <Card className="mt-3 p-5">
            {byAge.map((a) => (
              <div key={a.label} className="mb-3">
                <div className="flex justify-between text-sm"><span>{a.label}</span><span className="text-muted-foreground">{a.enrolled} enrolled · {a.visits} visits</span></div>
                <div className="mt-1 h-2 rounded bg-muted">
                  <div className="h-2 rounded bg-primary" style={{ width: `${pct(a.enrolled, Math.max(1, children.length))}%` }} />
                </div>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Branch comparison</p>
          <Card className="mt-3 p-5">
            {byBranch.map((b) => (
              <div key={b.branch} className="mb-3">
                <div className="flex justify-between text-sm"><span>{branchLabel(b.branch)}</span><span className="text-muted-foreground">{b.visits} visits</span></div>
                <div className="mt-1 h-2 rounded bg-muted">
                  <div className="h-2 rounded bg-primary" style={{ width: `${pct(b.visits, Math.max(1, totalVisits))}%` }} />
                </div>
              </div>
            ))}
            {byBranch.length === 0 && <p className="text-sm text-muted-foreground">No branch data yet.</p>}
          </Card>
        </section>
      </div>

      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Spiritual growth mix</p>
        <Card className="mt-3 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {MILESTONE_TYPES.map((m) => {
            const n = milestones.filter((x) => x.milestone_type === m.key).length;
            return (
              <div key={m.key} className="rounded border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="font-serif text-xl">{n}</p>
              </div>
            );
          })}
        </Card>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Retention watch — children absent for the last 4 services
            <span className={`ml-2 inline-block h-2.5 w-2.5 rounded-full align-middle ${RAG_DOT[ragForKids(100 - pct(atRisk.length, Math.max(1, children.length)))]}`} />
          </p>
          <Button size="sm" variant="outline" onClick={() => exportRows("kids-retention-watch", ["Child", "Age group", "Branch"], atRisk.map((c) => [c.full_name, labelFor(AGE_GROUPS, c.age_group), branchLabel(c.branch)]))}>
            <Download className="mr-2 h-4 w-4" /> Export follow-up list
          </Button>
        </div>
        <Card className="mt-3 p-5 text-sm">
          {atRisk.length === 0 ? <p className="text-muted-foreground">Every active child attended recently.</p> : (
            <div className="grid gap-2 md:grid-cols-3">
              {atRisk.map((c) => <p key={c.id}>{c.full_name} <span className="text-xs text-muted-foreground">· {labelFor(AGE_GROUPS, c.age_group)}</span></p>)}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
