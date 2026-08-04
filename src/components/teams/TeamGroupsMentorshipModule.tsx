import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { fmtDate } from "@/lib/finance";
import { Field, Picker, Stat } from "@/components/teams/TeamMembersModule";
import { nice, pct, today, type TeamKey } from "@/lib/ministryTeams";

const sb = supabase as any;

type Props = { team: TeamKey; canManage: boolean; currentUserId: string; groupWord: string };

/** Small groups + mentorship pairing, cadence tracking and overdue alerts. */
export default function TeamGroupsMentorshipModule({ team, canManage, currentUserId, groupWord }: Props) {
  const [groups, setGroups] = useState<any[]>([]);
  const [pairs, setPairs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const emptyGroup = { name: "", leader_name: "", assistant_name: "", mentor_name: "", venue: "", meeting_day: "", meeting_time: "", capacity: "", focus: "", notes: "" };
  const emptyPair = { mentor_name: "", mentee_name: "", goals: "", cadence: "monthly", next_session_date: today(), progress_notes: "", prayer_notes: "" };
  const [gForm, setGForm] = useState({ ...emptyGroup });
  const [pForm, setPForm] = useState({ ...emptyPair });

  const load = async () => {
    const [{ data: g }, { data: p }, { data: m }] = await Promise.all([
      sb.from("mt_groups").select("*").eq("team", team).order("name"),
      sb.from("mt_mentorships").select("*").eq("team", team).order("next_session_date"),
      sb.from("mt_members").select("id, full_name, small_group_id, mentor_name").eq("team", team),
    ]);
    setGroups(g ?? []);
    setPairs(p ?? []);
    setMembers(m ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const saveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gForm.name.trim()) return toast.error("Name the group");
    const { error } = await sb.from("mt_groups").insert({
      ...gForm,
      team,
      capacity: gForm.capacity ? Number(gForm.capacity) : null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Small group created");
    setGForm({ ...emptyGroup });
    load();
  };

  const savePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pForm.mentor_name.trim() || !pForm.mentee_name.trim()) return toast.error("Mentor and mentee are required");
    const { error } = await sb.from("mt_mentorships").insert({
      ...pForm,
      team,
      next_session_date: pForm.next_session_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Mentorship pairing created");
    setPForm({ ...emptyPair });
    load();
  };

  const logSession = async (row: any) => {
    const next = new Date();
    next.setDate(next.getDate() + (row.cadence === "weekly" ? 7 : row.cadence === "fortnightly" ? 14 : 30));
    const { error } = await sb
      .from("mt_mentorships")
      .update({
        sessions_completed: Number(row.sessions_completed ?? 0) + 1,
        last_session_date: today(),
        next_session_date: next.toISOString().slice(0, 10),
        progress_pct: Math.min(100, Number(row.progress_pct ?? 0) + 10),
      })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Mentoring session logged — discipleship record updated");
    load();
  };

  const overdue = pairs.filter((p) => p.status === "active" && p.next_session_date && p.next_session_date < today());
  const activePairs = pairs.filter((p) => p.status === "active");
  const mentored = new Set(members.filter((m) => m.mentor_name).map((m) => m.id));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active groups" value={groups.filter((g) => g.status === "active").length} />
        <Stat label="Active mentorships" value={activePairs.length} />
        <Stat label="Overdue sessions" value={overdue.length} />
        <Stat label="Members with a mentor" value={`${pct(mentored.size, members.length || 1)}%`} />
      </div>

      <Card className="p-5">
        <h3 className="font-serif text-lg">Small groups</h3>
        {canManage && (
          <form onSubmit={saveGroup} className="mt-4 grid gap-4 md:grid-cols-4">
            <Field label={`${nice(groupWord)} name`}><Input value={gForm.name} onChange={(e) => setGForm({ ...gForm, name: e.target.value })} /></Field>
            <Field label="Leader"><Input value={gForm.leader_name} onChange={(e) => setGForm({ ...gForm, leader_name: e.target.value })} /></Field>
            <Field label="Assistant"><Input value={gForm.assistant_name} onChange={(e) => setGForm({ ...gForm, assistant_name: e.target.value })} /></Field>
            <Field label="Mentor"><Input value={gForm.mentor_name} onChange={(e) => setGForm({ ...gForm, mentor_name: e.target.value })} /></Field>
            <Field label="Venue"><Input value={gForm.venue} onChange={(e) => setGForm({ ...gForm, venue: e.target.value })} /></Field>
            <Field label="Meeting day"><Input value={gForm.meeting_day} onChange={(e) => setGForm({ ...gForm, meeting_day: e.target.value })} /></Field>
            <Field label="Time"><Input value={gForm.meeting_time} onChange={(e) => setGForm({ ...gForm, meeting_time: e.target.value })} /></Field>
            <Field label="Capacity"><Input type="number" value={gForm.capacity} onChange={(e) => setGForm({ ...gForm, capacity: e.target.value })} /></Field>
            <div className="md:col-span-3"><Field label="Focus / discussion topics"><Input value={gForm.focus} onChange={(e) => setGForm({ ...gForm, focus: e.target.value })} /></Field></div>
            <div className="flex items-end"><Button type="submit">Add group</Button></div>
          </form>
        )}
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id} className="p-4">
              <div className="flex items-start justify-between">
                <h4 className="font-medium">{g.name}</h4>
                <Badge variant="outline" className="text-[11px]">{nice(g.status)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Leader {g.leader_name || "—"} · Assistant {g.assistant_name || "—"} · Mentor {g.mentor_name || "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{g.meeting_day} {g.meeting_time} · {g.venue}</p>
              {g.focus && <p className="mt-2 text-sm">{g.focus}</p>}
            </Card>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted-foreground">No small groups yet.</p>}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Mentorship &amp; pastoral care</h3>
          {overdue.length > 0 && (
            <Badge variant="outline" className="border-red-200 bg-red-100 text-red-800">{overdue.length} overdue meeting(s)</Badge>
          )}
        </div>
        {canManage && (
          <form onSubmit={savePair} className="mt-4 grid gap-4 md:grid-cols-4">
            <Field label="Mentor"><Input value={pForm.mentor_name} onChange={(e) => setPForm({ ...pForm, mentor_name: e.target.value })} /></Field>
            <Field label="Mentee"><Input value={pForm.mentee_name} onChange={(e) => setPForm({ ...pForm, mentee_name: e.target.value })} /></Field>
            <Field label="Cadence">
              <Picker value={pForm.cadence} onChange={(v) => setPForm({ ...pForm, cadence: v })} options={[["weekly", "Weekly"], ["fortnightly", "Fortnightly"], ["monthly", "Monthly"], ["quarterly", "Quarterly"]]} />
            </Field>
            <Field label="Next session"><Input type="date" value={pForm.next_session_date} onChange={(e) => setPForm({ ...pForm, next_session_date: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Goals"><Textarea rows={2} value={pForm.goals} onChange={(e) => setPForm({ ...pForm, goals: e.target.value })} /></Field></div>
            <div className="md:col-span-2"><Field label="Prayer notes"><Textarea rows={2} value={pForm.prayer_notes} onChange={(e) => setPForm({ ...pForm, prayer_notes: e.target.value })} /></Field></div>
            <div><Button type="submit">Create pairing</Button></div>
          </form>
        )}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-2">Mentor</th><th>Mentee</th><th>Cadence</th><th>Sessions</th><th>Progress</th><th>Last</th><th>Next</th><th></th></tr>
            </thead>
            <tbody>
              {pairs.map((p) => {
                const late = p.next_session_date && p.next_session_date < today() && p.status === "active";
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 font-medium">{p.mentor_name}</td>
                    <td>{p.mentee_name}</td>
                    <td className="text-xs">{nice(p.cadence)}</td>
                    <td>{p.sessions_completed}</td>
                    <td className="w-32"><Progress value={p.progress_pct} className="h-2" /></td>
                    <td className="text-xs">{p.last_session_date ? fmtDate(p.last_session_date) : "—"}</td>
                    <td className={`text-xs ${late ? "font-medium text-red-700" : ""}`}>{p.next_session_date ? fmtDate(p.next_session_date) : "—"}</td>
                    <td>{canManage && <Button size="sm" variant="outline" onClick={() => logSession(p)}>Log session</Button>}</td>
                  </tr>
                );
              })}
              {pairs.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No mentorship pairings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
