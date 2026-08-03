import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { exportRows, fmtDate } from "@/lib/finance";
import { pct, today } from "@/lib/worship";

const sb = supabase as any;

/** MODULE 6 — Rehearsal Management (schedule, attendance, readiness). */
export default function RehearsalsModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [rehearsals, setRehearsals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [form, setForm] = useState({
    rehearsal_date: today(), start_time: "18:00", venue: "", service_id: "", objectives: "",
    practice_notes: "", technical_runthrough: false, prayer_session: true, recording_url: "", readiness_score: "",
  });

  const load = async () => {
    const [r, s, m, a] = await Promise.all([
      sb.from("worship_rehearsals").select("*").order("rehearsal_date", { ascending: false }),
      sb.from("worship_services").select("id, title, service_date").order("service_date", { ascending: false }),
      sb.from("worship_team_members").select("*").order("full_name"),
      sb.from("worship_rehearsal_attendance").select("*"),
    ]);
    setRehearsals(r.data ?? []); setServices(s.data ?? []); setMembers(m.data ?? []); setAttendance(a.data ?? []);
    if (!selected && r.data?.length) setSelected(r.data[0].id);
  };
  useEffect(() => { load(); }, []);

  const rehearsal = useMemo(() => rehearsals.find((r) => r.id === selected) ?? null, [rehearsals, selected]);
  const rows = useMemo(() => attendance.filter((a) => a.rehearsal_id === selected), [attendance, selected]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await sb.from("worship_rehearsals").insert({
      ...form,
      service_id: form.service_id || null,
      readiness_score: form.readiness_score ? Number(form.readiness_score) : null,
      created_by: currentUserId,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Rehearsal scheduled — team members can now be marked present");
    setForm({ ...form, objectives: "", practice_notes: "", recording_url: "", readiness_score: "" });
    await load(); setSelected(data.id);
  };

  const mark = async (memberId: string, patch: Record<string, boolean>) => {
    const existing = rows.find((r) => r.member_id === memberId);
    if (existing) {
      const { error } = await sb.from("worship_rehearsal_attendance").update(patch).eq("id", existing.id);
      if (error) return toast.error(error.message);
      setAttendance((prev) => prev.map((a) => (a.id === existing.id ? { ...a, ...patch } : a)));
    } else {
      const { data, error } = await sb.from("worship_rehearsal_attendance")
        .insert({ rehearsal_id: selected, member_id: memberId, present: true, on_time: true, prepared: true, ...patch })
        .select().single();
      if (error) return toast.error(error.message);
      setAttendance((prev) => [...prev, data]);
    }
  };

  const patchRehearsal = async (patch: Record<string, any>) => {
    const { error } = await sb.from("worship_rehearsals").update(patch).eq("id", selected);
    if (error) return toast.error(error.message);
    setRehearsals((prev) => prev.map((r) => (r.id === selected ? { ...r, ...patch } : r)));
  };

  const present = rows.filter((r) => r.present).length;
  const onTime = rows.filter((r) => r.on_time).length;
  const prepared = rows.filter((r) => r.prepared).length;

  const exportAttendance = () =>
    exportRows(`rehearsal-attendance-${rehearsal?.rehearsal_date ?? today()}`,
      ["Member", "Present", "On time", "Prepared", "Notes"],
      members.map((m) => {
        const a = rows.find((r) => r.member_id === m.id);
        return [m.full_name, a?.present ? "Yes" : "No", a?.on_time ? "Yes" : "No", a?.prepared ? "Yes" : "No", a?.notes ?? ""];
      }));

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6 print:hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Schedule a rehearsal</p>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-3">
            <div><Label>Date</Label><Input type="date" required value={form.rehearsal_date} onChange={(e) => setForm({ ...form, rehearsal_date: e.target.value })} /></div>
            <div><Label>Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div className="md:col-span-2">
              <Label>For service</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
                <option value="">Not linked</option>
                {services.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.service_date)} — {s.title}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.technical_runthrough} onCheckedChange={(v) => setForm({ ...form, technical_runthrough: !!v })} /> Technical run-through</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.prayer_session} onCheckedChange={(v) => setForm({ ...form, prayer_session: !!v })} /> Prayer</label>
            </div>
            <div className="md:col-span-3"><Label>Objectives</Label><Textarea rows={2} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} /></div>
            <div><Button type="submit">Schedule rehearsal</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-64 flex-1">
            <Label>Rehearsal</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Select…</option>
              {rehearsals.map((r) => <option key={r.id} value={r.id}>{fmtDate(r.rehearsal_date)} {r.venue ? `— ${r.venue}` : ""}</option>)}
            </select>
          </div>
          {rehearsal && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Attendance {pct(present, Math.max(members.length, 1))}%</Badge>
              <Badge variant="outline">Punctuality {pct(onTime, Math.max(present, 1))}%</Badge>
              <Badge variant="outline">Preparation {pct(prepared, Math.max(present, 1))}%</Badge>
              <Button variant="outline" size="sm" onClick={exportAttendance}>Export attendance</Button>
            </div>
          )}
        </div>
        {rehearsal && canManage && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div><Label>Readiness score (%)</Label><Input type="number" defaultValue={rehearsal.readiness_score ?? ""} onBlur={(e) => patchRehearsal({ readiness_score: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><Label>Recording URL</Label><Input defaultValue={rehearsal.recording_url ?? ""} onBlur={(e) => patchRehearsal({ recording_url: e.target.value || null })} /></div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={rehearsal.status} onChange={(e) => patchRehearsal({ status: e.target.value })}>
                {["scheduled", "in_progress", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="md:col-span-3"><Label>Practice notes</Label><Textarea rows={3} defaultValue={rehearsal.practice_notes ?? ""} onBlur={(e) => patchRehearsal({ practice_notes: e.target.value })} /></div>
          </div>
        )}
      </Card>

      {rehearsal && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Attendance register</p>
          <div className="mt-3 divide-y rounded-md border border-border">
            {members.map((m) => {
              const a = rows.find((r) => r.member_id === m.id);
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <span>{m.full_name} <span className="text-xs text-muted-foreground">· {m.role_title?.replace(/_/g, " ")}</span></span>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2"><Checkbox disabled={!canManage} checked={!!a?.present} onCheckedChange={(v) => mark(m.id, { present: !!v })} /> Present</label>
                    <label className="flex items-center gap-2"><Checkbox disabled={!canManage} checked={!!a?.on_time} onCheckedChange={(v) => mark(m.id, { on_time: !!v })} /> On time</label>
                    <label className="flex items-center gap-2"><Checkbox disabled={!canManage} checked={!!a?.prepared} onCheckedChange={(v) => mark(m.id, { prepared: !!v })} /> Prepared</label>
                  </div>
                </div>
              );
            })}
            {members.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Add team members first.</div>}
          </div>
        </Card>
      )}
    </div>
  );
}
