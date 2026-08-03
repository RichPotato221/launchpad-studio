import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportRows, fmtDate } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";
import { pct, ragForScore, serviceReadiness } from "@/lib/worship";

const sb = supabase as any;

/** MODULES 13 & 14 — Worship analytics and executive reporting. */
export default function WorshipAnalytics() {
  const [services, setServices] = useState<any[]>([]);
  const [setSongs, setSetSongs] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [sv, ss, sg, as, at, mm] = await Promise.all([
        sb.from("worship_services").select("*").order("service_date", { ascending: false }),
        sb.from("worship_set_songs").select("*"),
        sb.from("songs").select("id, title, song_key, times_used, last_used_on, themes"),
        sb.from("worship_assignments").select("*"),
        sb.from("worship_rehearsal_attendance").select("*"),
        sb.from("worship_team_members").select("id, full_name, status"),
      ]);
      setServices(sv.data ?? []); setSetSongs(ss.data ?? []); setSongs(sg.data ?? []);
      setAssignments(as.data ?? []); setAttendance(at.data ?? []); setMembers(mm.data ?? []);
    })();
  }, []);

  const stats = useMemo(() => {
    const readiness = services.length ? Math.round(services.reduce((s, x) => s + serviceReadiness(x), 0) / services.length) : 0;
    const present = attendance.filter((a) => a.present).length;
    return {
      services: services.length,
      readiness,
      rehearsalAttendance: pct(present, Math.max(attendance.length, 1)),
      punctuality: pct(attendance.filter((a) => a.on_time).length, Math.max(present, 1)),
      confirmation: pct(assignments.filter((a) => a.response === "confirmed").length, Math.max(assignments.length, 1)),
      activeTeam: members.filter((m) => m.status === "active").length,
      songsUsed: new Set(setSongs.map((s) => s.song_id)).size,
    };
  }, [services, attendance, assignments, members, setSongs]);

  const topSongs = useMemo(() => {
    const counts = new Map<string, number>();
    setSongs.forEach((s) => counts.set(s.song_id, (counts.get(s.song_id) ?? 0) + 1));
    return songs
      .map((s) => ({ ...s, used: counts.get(s.id) ?? Number(s.times_used ?? 0) }))
      .sort((a, b) => b.used - a.used)
      .slice(0, 15);
  }, [songs, setSongs]);

  const staleSongs = useMemo(
    () => songs.filter((s) => !s.last_used_on).slice(0, 15),
    [songs],
  );

  const cards = [
    { label: "Services planned", value: stats.services },
    { label: "Average readiness", value: `${stats.readiness}%`, rag: ragForScore(stats.readiness) },
    { label: "Rehearsal attendance", value: `${stats.rehearsalAttendance}%`, rag: ragForScore(stats.rehearsalAttendance) },
    { label: "Punctuality", value: `${stats.punctuality}%`, rag: ragForScore(stats.punctuality) },
    { label: "Roster confirmation", value: `${stats.confirmation}%`, rag: ragForScore(stats.confirmation) },
    { label: "Active team members", value: stats.activeTeam },
    { label: "Distinct songs used", value: stats.songsUsed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Worship analytics</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportRows("worship-service-readiness", ["Service", "Date", "Type", "Status", "Readiness %"], services.map((s) => [s.title, s.service_date, s.service_type, s.status, serviceReadiness(s)]))}>Export services</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Print report</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="mt-2 flex items-center gap-2 font-serif text-2xl">
              {c.rag && <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[c.rag]}`} />}{c.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Most used songs</p>
          <div className="mt-3 divide-y rounded-md border border-border">
            {topSongs.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                <span>{s.title} <span className="text-xs text-muted-foreground">({s.song_key || "—"})</span></span>
                <span className="text-xs text-muted-foreground">{s.used}× {s.last_used_on ? `· ${fmtDate(s.last_used_on)}` : ""}</span>
              </div>
            ))}
            {topSongs.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No usage data yet.</div>}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Songs never used (repertoire gap)</p>
          <div className="mt-3 divide-y rounded-md border border-border">
            {staleSongs.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                <span>{s.title}</span>
                <Badge variant="outline">unused</Badge>
              </div>
            ))}
            {staleSongs.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Every song has been used.</div>}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Service readiness log</p>
        <div className="mt-3 divide-y rounded-md border border-border">
          {services.slice(0, 25).map((s) => {
            const r = serviceReadiness(s);
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <span>{fmtDate(s.service_date)} — {s.title}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {s.status} <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[ragForScore(r)]}`} /> {r}%
                </span>
              </div>
            );
          })}
          {services.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No services planned yet.</div>}
        </div>
      </Card>
    </div>
  );
}
