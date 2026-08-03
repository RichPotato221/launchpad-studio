import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RAG_DOT } from "@/lib/governance";
import { branchLabel, exportRows, BRANCHES, type Rag } from "@/lib/finance";
import { burnoutRisk, labelFor, pct, TEAM_ROLES, TEAM_STATUSES } from "@/lib/worship";

const sb = supabase as any;

const EMPTY = {
  full_name: "", role_title: "vocalist", instruments: "", vocal_range: "", skills: "", availability: "",
  mentor: "", experience_years: "", email: "", phone: "", emergency_contact_name: "", emergency_contact_phone: "",
  status: "active", branch: "", notes: "",
};

/** MODULE 5 — Worship Team Management. */
export default function TeamModule({ canManage }: { canManage: boolean }) {
  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    const [m, a, r] = await Promise.all([
      sb.from("worship_team_members").select("*").order("full_name"),
      sb.from("worship_assignments").select("*"),
      sb.from("worship_rehearsal_attendance").select("*"),
    ]);
    setMembers(m.data ?? []); setAssignments(a.data ?? []); setAttendance(r.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return members
      .map((m) => {
        const mine = assignments.filter((a) => a.member_id === m.id);
        const att = attendance.filter((a) => a.member_id === m.id);
        const present = att.filter((a) => a.present).length;
        return {
          ...m,
          assignmentCount: mine.length,
          attendancePct: pct(present, Math.max(att.length, 1)),
          punctualityPct: pct(att.filter((a) => a.on_time).length, Math.max(att.length, 1)),
          burnout: burnoutRisk(mine.length),
        };
      })
      .filter((m) => !term || [m.full_name, m.role_title, m.skills, (m.instruments ?? []).join(" ")].filter(Boolean).join(" ").toLowerCase().includes(term));
  }, [members, assignments, attendance, q]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      branch: form.branch || null,
      experience_years: form.experience_years ? Number(form.experience_years) : null,
      instruments: form.instruments ? form.instruments.split(",").map((s) => s.trim()).filter(Boolean) : null,
    };
    const { error } = editing
      ? await sb.from("worship_team_members").update(payload).eq("id", editing)
      : await sb.from("worship_team_members").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Team member updated" : "Team member added");
    setForm({ ...EMPTY }); setEditing(null); load();
  };

  const edit = (m: any) => {
    setEditing(m.id);
    setForm({
      ...EMPTY,
      ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, m[k] ?? ""])),
      instruments: (m.instruments ?? []).join(", "),
      experience_years: m.experience_years ?? "",
    } as any);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportTeam = () =>
    exportRows("worship-team", ["Name", "Role", "Instruments", "Vocal range", "Status", "Branch", "Availability", "Assignments", "Attendance %", "Punctuality %", "Phone", "Emergency contact"],
      rows.map((m) => [m.full_name, labelFor(TEAM_ROLES, m.role_title), (m.instruments ?? []).join(" / "), m.vocal_range, m.status, branchLabel(m.branch), m.availability, m.assignmentCount, m.attendancePct, m.punctualityPct, m.phone, `${m.emergency_contact_name ?? ""} ${m.emergency_contact_phone ?? ""}`.trim()]));

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6 print:hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editing ? "Edit team member" : "Add a team member"}</p>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-3">
            <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })}>
                {TEAM_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {TEAM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><Label>Instruments (comma separated)</Label><Input value={form.instruments} onChange={(e) => setForm({ ...form, instruments: e.target.value })} /></div>
            <div><Label>Vocal range</Label><Input value={form.vocal_range} onChange={(e) => setForm({ ...form, vocal_range: e.target.value })} placeholder="Soprano / Tenor…" /></div>
            <div>
              <Label>Branch</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                <option value="">—</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
              </select>
            </div>
            <div><Label>Skills</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
            <div><Label>Availability</Label><Input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="Sundays, Thursday rehearsals…" /></div>
            <div><Label>Spiritual mentor</Label><Input value={form.mentor} onChange={(e) => setForm({ ...form, mentor: e.target.value })} /></div>
            <div><Label>Ministry experience (years)</Label><Input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Emergency contact</Label><Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
            <div><Label>Emergency phone</Label><Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button type="submit">{editing ? "Save changes" : "Add member"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ ...EMPTY }); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1"><Label>Search team</Label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, role, instrument, skill…" /></div>
          <Button variant="outline" onClick={exportTeam}>Export (Excel/CSV)</Button>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-lg">{m.full_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {labelFor(TEAM_ROLES, m.role_title)} · {(m.instruments ?? []).join(" / ") || "—"} · {m.vocal_range || "—"} · {branchLabel(m.branch)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Availability: {m.availability || "—"} · Mentor: {m.mentor || "—"} · {m.experience_years ?? 0} yrs
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attendance {m.attendancePct}% · Punctuality {m.punctualityPct}% · {m.assignmentCount} assignment(s)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.phone || "—"} {m.emergency_contact_name ? `· ICE: ${m.emergency_contact_name} ${m.emergency_contact_phone ?? ""}` : ""}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline">{m.status}</Badge>
                <p className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[m.burnout as Rag]}`} /> burnout
                </p>
                {canManage && <Button size="sm" variant="outline" className="mt-2 print:hidden" onClick={() => edit(m)}>Edit</Button>}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground lg:col-span-2">No team members captured yet.</Card>}
      </div>
    </div>
  );
}
