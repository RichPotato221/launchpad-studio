import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RAG_DOT } from "@/lib/governance";
import { fmtDate } from "@/lib/finance";
import {
  daysUntil,
  labelFor,
  pct,
  ragForCount,
  ragForScore,
  serviceReadiness,
  SERVICE_TYPES,
  today,
} from "@/lib/worship";

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

/** MODULE 1 — Worship Executive Dashboard (ministry health, spiritual, service readiness). */
export default function WorshipDashboard() {
  const [services, setServices] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [rehearsals, setRehearsals] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [spiritual, setSpiritual] = useState<any[]>([]);
  const [tech, setTech] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, so, m, r, a, asg, e, f, sp, t] = await Promise.all([
        sb.from("worship_services").select("*").order("service_date", { ascending: true }),
        sb.from("songs").select("id, title, is_favourite, times_used, ccli_number"),
        sb.from("worship_team_members").select("*"),
        sb.from("worship_rehearsals").select("*").order("rehearsal_date", { ascending: false }).limit(50),
        sb.from("worship_rehearsal_attendance").select("*").limit(2000),
        sb.from("worship_assignments").select("*").limit(2000),
        sb.from("worship_equipment").select("*"),
        sb.from("worship_equipment_faults").select("*"),
        sb.from("worship_spiritual_log").select("*").limit(1000),
        sb.from("worship_tech_items").select("*").limit(1000),
      ]);
      setServices(s.data ?? []); setSongs(so.data ?? []); setMembers(m.data ?? []);
      setRehearsals(r.data ?? []); setAttendance(a.data ?? []); setAssignments(asg.data ?? []);
      setEquipment(e.data ?? []); setFaults(f.data ?? []); setSpiritual(sp.data ?? []); setTech(t.data ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const t = today();
    const upcoming = services.filter((s) => s.service_date >= t && s.status !== "cancelled");
    const next = upcoming[0] ?? null;
    const activeMembers = members.filter((m) => m.status === "active");
    const openFaults = faults.filter((f) => !["resolved", "closed"].includes(f.status));
    const readyEquip = equipment.filter((e) => e.status === "in_service" && e.condition !== "faulty").length;

    const nextAssignments = next ? assignments.filter((a) => a.service_id === next.id) : [];
    const confirmed = nextAssignments.filter((a) => a.response === "confirmed").length;
    const coverage = pct(confirmed, Math.max(nextAssignments.length, 1));

    const attPresent = attendance.filter((a) => a.present).length;
    const rehearsalAttendance = pct(attPresent, Math.max(attendance.length, 1));
    const readinessScores = rehearsals.map((r) => Number(r.readiness_score ?? 0)).filter((n) => n > 0);
    const rehearsalReadiness = readinessScores.length
      ? Math.round(readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length)
      : 0;

    const spiritualBy = (k: string) => spiritual.filter((s) => s.activity_type === k).length;
    const unity = ragForScore(rehearsalAttendance);

    const health = Math.round(
      (pct(readyEquip, Math.max(equipment.length, 1)) +
        rehearsalAttendance +
        coverage +
        (next ? serviceReadiness(next).pct : 0)) / 4,
    );

    const nextTech = next ? tech.filter((i) => i.service_id === next.id) : [];

    return {
      upcoming, next, activeMembers, openFaults, readyEquip, coverage, rehearsalAttendance,
      rehearsalReadiness, spiritualBy, unity, health, nextTech, nextAssignments,
    };
  }, [services, members, faults, equipment, assignments, attendance, rehearsals, spiritual, tech]);

  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading worship dashboard…</Card>;

  const next = stats.next;
  const countdown = next ? daysUntil(next.service_date) : null;
  const readiness = next ? serviceReadiness(next) : null;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Ministry health</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Worship health score" value={`${stats.health}%`} rag={ragForScore(stats.health)} hint="Equipment, rehearsals, coverage & readiness" />
          <Stat label="Upcoming services" value={stats.upcoming.length} hint="Planned and not cancelled" />
          <Stat label="Teams scheduled" value={stats.nextAssignments.length} rag={ragForScore(stats.coverage)} hint={`${stats.coverage}% confirmed for next service`} />
          <Stat label="Rehearsal readiness" value={stats.rehearsalReadiness ? `${stats.rehearsalReadiness}%` : "—"} rag={ragForScore(stats.rehearsalReadiness || 0)} hint="Average readiness score" />
          <Stat label="Team availability" value={stats.activeMembers.length} hint={`${members.length} total members on the roll`} />
          <Stat label="Volunteer coverage" value={`${stats.coverage}%`} rag={ragForScore(stats.coverage)} hint="Confirmed vs assigned" />
          <Stat label="Music library" value={songs.length} hint={`${songs.filter((s) => s.is_favourite).length} favourites`} />
          <Stat label="Equipment readiness" value={`${pct(stats.readyEquip, Math.max(equipment.length, 1))}%`} rag={ragForCount(stats.openFaults.length)} hint={`${stats.openFaults.length} open fault report(s)`} />
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Spiritual dashboard</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Team prayer" value={stats.spiritualBy("prayer")} hint="Logged prayer participations" />
          <Stat label="Devotions" value={stats.spiritualBy("devotion")} />
          <Stat label="Bible studies" value={stats.spiritualBy("bible_study")} />
          <Stat label="Mentorship sessions" value={stats.spiritualBy("mentorship")} />
          <Stat label="Worship leaders developing" value={members.filter((m) => m.role_title === "worship_leader" || m.status === "training").length} />
          <Stat label="Spiritual activities" value={spiritual.length} hint="All formation activity logged" />
          <Stat label="Team unity score" value={`${stats.rehearsalAttendance}%`} rag={stats.unity} hint="Gathering together consistently" />
          <Stat label="Rehearsal attendance" value={`${stats.rehearsalAttendance}%`} rag={ragForScore(stats.rehearsalAttendance)} />
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Service readiness</p>
        {!next ? (
          <Card className="mt-3 p-8 text-center text-sm text-muted-foreground">No upcoming service planned yet.</Card>
        ) : (
          <Card className="mt-3 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-serif text-2xl">{next.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fmtDate(next.service_date)} · {labelFor(SERVICE_TYPES, next.service_type)}
                  {next.theme ? ` · Theme: ${next.theme}` : ""}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sermon: {next.sermon_title || "—"} · Preacher: {next.preacher || "—"} · Worship leader: {next.worship_leader || "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Countdown</p>
                <p className="font-serif text-3xl">{countdown === 0 ? "Today" : `${countdown} day${countdown === 1 ? "" : "s"}`}</p>
                <Badge variant="outline" className="mt-2">{readiness?.pct}% ready</Badge>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Worship set approved", next.set_approved],
                ["Sermon theme linked", !!next.sermon_title],
                ["Scriptures loaded", next.scriptures_loaded],
                ["Stage layout ready", next.stage_layout_ready],
                ["Technical team confirmed", next.tech_team_confirmed],
                ["Livestream ready", next.livestream_ready],
                ["Backup plan available", !!next.backup_plan],
                ["Technical checklist complete", stats.nextTech.length > 0 && stats.nextTech.every((i: any) => i.done)],
              ].map(([label, ok]) => (
                <div key={String(label)} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${ok ? RAG_DOT.green : RAG_DOT.red}`} />
                  {String(label)}
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
