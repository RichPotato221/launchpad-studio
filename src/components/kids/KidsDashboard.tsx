import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RAG_DOT } from "@/lib/governance";
import { branchLabel } from "@/lib/finance";
import { clearedToServe, pct, ragForCount, ragForKids, today } from "@/lib/kids";

const sb = supabase as any;

function Stat({ label, value, hint, rag }: { label: string; value: string | number; hint?: string; rag?: "green" | "amber" | "red" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        {rag && <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[rag]}`} />}
      </div>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

/** MODULE 1 — Children's Ministry Executive Dashboard. */
export default function KidsDashboard() {
  const [children, setChildren] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, k, r, v, i, m, g, e] = await Promise.all([
        sb.from("children").select("*"),
        sb.from("kids_checkins").select("*").order("service_date", { ascending: false }).limit(3000),
        sb.from("kids_classrooms").select("*"),
        sb.from("kids_volunteers").select("*"),
        sb.from("kids_incidents").select("*").order("occurred_at", { ascending: false }).limit(300),
        sb.from("kids_milestones").select("*").limit(2000),
        sb.from("child_guardians").select("child_id, is_emergency, phone"),
        sb.from("events").select("id, title, event_date, department_slug").gte("event_date", today()).order("event_date").limit(6),
      ]);
      setChildren(c.data ?? []);
      setCheckins(k.data ?? []);
      setClassrooms(r.data ?? []);
      setVolunteers(v.data ?? []);
      setIncidents(i.data ?? []);
      setMilestones(m.data ?? []);
      setGuardians(g.data ?? []);
      setEvents(e.data ?? []);
      setLoading(false);
    })();
  }, []);

  const s = useMemo(() => {
    const day = today();
    const todays = checkins.filter((c) => c.service_date === day);
    const present = todays.length;
    const firstTimers = todays.filter((c) => c.is_first_time).length;
    const missingOut = todays.filter((c) => !c.checked_out_at).length;

    const dates = Array.from(new Set(checkins.map((c) => c.service_date))).sort().reverse().slice(0, 8);
    const trend = dates.map((d) => ({ date: d, count: checkins.filter((c) => c.service_date === d).length })).reverse();

    const last4 = new Set(dates.slice(0, 4));
    const prev4 = new Set(dates.slice(4, 8));
    const inLast4 = new Set(checkins.filter((c) => last4.has(c.service_date)).map((c) => c.child_id));
    const inPrev4 = new Set(checkins.filter((c) => prev4.has(c.service_date)).map((c) => c.child_id));
    const retained = [...inPrev4].filter((id) => inLast4.has(id)).length;
    const retention = pct(retained, inPrev4.size);

    const capacity = classrooms.reduce((a, r) => a + (r.capacity ?? 0), 0);
    const capUse = pct(present, capacity);
    const cleared = volunteers.filter((v) => v.status === "active" && clearedToServe(v).ok).length;
    const coverage = pct(cleared, Math.max(classrooms.filter((r) => r.active).length * 2, 1));

    const withEmergency = new Set(guardians.filter((g) => g.is_emergency || g.phone).map((g) => g.child_id));
    const missingEmergency = children.filter((c) => !withEmergency.has(c.id)).length;

    const mCount = (t: string) => milestones.filter((x) => x.milestone_type === t).length;
    const compliance = pct(cleared, Math.max(volunteers.filter((v) => v.status === "active").length, 1));

    return {
      present, firstTimers, missingOut, trend, retention, capacity, capUse, coverage, cleared,
      missingEmergency, compliance,
      totalChildren: children.length,
      newFamilies: children.filter((c) => new Date(c.created_at).getTime() > Date.now() - 30 * 86400000).length,
      allergies: children.filter((c) => (c.allergies ?? "").trim()).length,
      medical: children.filter((c) => (c.medical_conditions ?? "").trim()).length,
      special: children.filter((c) => (c.special_needs ?? "").trim()).length,
      openIncidents: incidents.filter((i) => !["resolved", "closed"].includes(i.status)).length,
      checkedOut: todays.filter((c) => c.checked_out_at).length,
      saved: mCount("saved"),
      baptised: mCount("baptised"),
      verses: mCount("memory_verse"),
      lessons: mCount("lesson_completed"),
      prayer: mCount("prayer"),
      worship: mCount("worship"),
      discipleship: mCount("discipleship_level"),
      familyLinked: pct(new Set(guardians.map((g) => g.child_id)).size, Math.max(children.length, 1)),
    };
  }, [children, checkins, classrooms, volunteers, incidents, milestones, guardians]);

  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading ministry health…</Card>;

  const max = Math.max(1, ...s.trend.map((t) => t.count));

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Ministry health</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Registered children" value={s.totalChildren} hint={`${s.newFamilies} new in 30 days`} />
          <Stat label="Present today" value={s.present} rag={ragForKids(s.capUse)} hint={`${s.capUse}% of capacity`} />
          <Stat label="First-time visitors" value={s.firstTimers} hint="Today" />
          <Stat label="Retention" value={`${s.retention}%`} rag={ragForKids(s.retention)} hint="Last 4 vs previous 4 services" />
          <Stat label="Volunteer coverage" value={`${s.coverage}%`} rag={ragForKids(s.coverage)} hint={`${s.cleared} cleared volunteers`} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active classes" value={classrooms.filter((c) => c.active).length} hint={`Capacity ${s.capacity}`} />
          <Stat label="Classroom capacity used" value={`${s.capUse}%`} rag={ragForKids(100 - Math.max(0, s.capUse - 85))} />
          <Stat label="Upcoming events" value={events.length} hint={events[0]?.title ?? "None scheduled"} />
          <Stat label="Family linkage" value={`${s.familyLinked}%`} rag={ragForKids(s.familyLinked)} hint="Children with a guardian on file" />
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Attendance trend</p>
        <Card className="mt-3 p-6">
          {s.trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins captured yet.</p>
          ) : (
            <div className="flex h-40 items-end gap-3">
              {s.trend.map((t) => (
                <div key={t.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t bg-primary/70" style={{ height: `${(t.count / max) * 100}%` }} />
                  <span className="text-[0.65rem] text-muted-foreground">{t.date.slice(5)}</span>
                  <span className="text-xs font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Spiritual growth</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Children saved" value={s.saved} />
          <Stat label="Children baptised" value={s.baptised} />
          <Stat label="Memory verses" value={s.verses} />
          <Stat label="Bible lessons completed" value={s.lessons} />
          <Stat label="Prayer participation" value={s.prayer} />
          <Stat label="Worship participation" value={s.worship} />
          <Stat label="Discipleship progress" value={s.discipleship} />
          <Stat label="Family participation" value={`${s.familyLinked}%`} />
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Safety dashboard</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Checked in" value={s.present} />
          <Stat label="Checked out" value={s.checkedOut} />
          <Stat label="Missing check-out" value={s.missingOut} rag={ragForCount(s.missingOut)} hint="Children still on register" />
          <Stat label="Open incidents" value={s.openIncidents} rag={ragForCount(s.openIncidents)} />
          <Stat label="Cleared volunteers" value={s.cleared} rag={ragForKids(s.compliance)} />
          <Stat label="Emergency contacts missing" value={s.missingEmergency} rag={ragForCount(s.missingEmergency, 1, 5)} />
          <Stat label="Medical alerts / allergies" value={`${s.medical} / ${s.allergies}`} />
          <Stat label="Safeguarding compliance" value={`${s.compliance}%`} rag={ragForKids(s.compliance)} />
        </div>
      </section>

      {events.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Upcoming ministry calendar</p>
          <div className="mt-3 space-y-2">
            {events.map((e) => (
              <Card key={e.id} className="flex items-center justify-between gap-3 p-4">
                <span className="text-sm">{e.title}</span>
                <Badge variant="outline">{e.event_date}</Badge>
              </Card>
            ))}
          </div>
        </section>
      )}

      {children.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Branches represented: {Array.from(new Set(children.map((c) => c.branch).filter(Boolean))).map((b) => branchLabel(b as string)).join(", ") || "—"}
        </p>
      )}
    </div>
  );
}
