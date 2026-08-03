import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import { TECH_ROLES, labelFor, pct, ragForScore, titleish, today } from "@/lib/technical";

const sb = supabase as any;

const EMPTY_MEMBER = {
  full_name: "", role_title: "sound_engineer", skills: "", certifications: "", availability: "",
  email: "", phone: "", emergency_contact_name: "", emergency_contact_phone: "",
  status: "active", attendance_pct: "", performance_score: "", notes: "",
};
const EMPTY_COURSE = { title: "", category: "audio", description: "", duration_hours: "", certification: false, validity_months: "" };
const EMPTY_RECORD = { member_id: "", course_id: "", status: "enrolled", score: "", completed_on: "", expires_on: "" };

/** MODULES 8–10 — Technical crew register, competency matrix and training academy. */
export default function TechTeamModule({ canManage }: { canManage: boolean }) {
  const [members, setMembers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [mForm, setMForm] = useState({ ...EMPTY_MEMBER });
  const [editing, setEditing] = useState<string | null>(null);
  const [cForm, setCForm] = useState({ ...EMPTY_COURSE });
  const [rForm, setRForm] = useState({ ...EMPTY_RECORD });

  const load = async () => {
    const [m, c, r] = await Promise.all([
      sb.from("tech_team_members").select("*").order("full_name"),
      sb.from("tech_courses").select("*").order("title"),
      sb.from("tech_training_records").select("*"),
    ]);
    setMembers(m.data ?? []); setCourses(c.data ?? []); setRecords(r.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const coverage = useMemo(() => {
    const active = members.filter((m) => m.status === "active");
    return TECH_ROLES.map((role) => ({
      role,
      count: active.filter((m) => m.role_title === role.key).length,
    }));
  }, [members]);

  const completion = pct(records.filter((r) => r.status === "completed").length, records.length || 1);
  const expiring = records.filter((r) => r.expires_on && r.expires_on <= new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10));

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mForm.full_name.trim()) return toast.error("Name is required");
    const payload: any = {
      ...mForm,
      attendance_pct: mForm.attendance_pct ? Number(mForm.attendance_pct) : null,
      performance_score: mForm.performance_score ? Number(mForm.performance_score) : null,
    };
    const { error } = editing
      ? await sb.from("tech_team_members").update(payload).eq("id", editing)
      : await sb.from("tech_team_members").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Crew member updated" : "Crew member added");
    setMForm({ ...EMPTY_MEMBER }); setEditing(null); load();
  };

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cForm.title.trim()) return toast.error("Course title is required");
    const { error } = await sb.from("tech_courses").insert({
      ...cForm,
      duration_hours: cForm.duration_hours ? Number(cForm.duration_hours) : null,
      validity_months: cForm.validity_months ? Number(cForm.validity_months) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Course added"); setCForm({ ...EMPTY_COURSE }); load();
  };

  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rForm.member_id || !rForm.course_id) return toast.error("Select a crew member and a course");
    const { error } = await sb.from("tech_training_records").insert({
      ...rForm,
      score: rForm.score ? Number(rForm.score) : null,
      completed_on: rForm.completed_on || null,
      expires_on: rForm.expires_on || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Training record saved"); setRForm({ ...EMPTY_RECORD }); load();
  };

  const nameOf = (id: string) => members.find((m) => m.id === id)?.full_name ?? "—";
  const courseOf = (id: string) => courses.find((c) => c.id === id)?.title ?? "—";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Active crew</p><p className="font-serif text-2xl">{members.filter((m) => m.status === "active").length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Roles uncovered</p><p className="font-serif text-2xl">{coverage.filter((c) => !c.count).length}</p></Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Training completion</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-serif text-2xl">{completion}%</p>
            <Badge variant="outline" className={RAG_CLASS[ragForScore(completion)]}>{ragForScore(completion).toUpperCase()}</Badge>
          </div>
        </Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Certifications expiring (60d)</p><p className="font-serif text-2xl">{expiring.length}</p></Card>
      </div>

      <Card className="p-6">
        <h3 className="font-serif text-lg">Role coverage matrix</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {coverage.map(({ role, count }) => (
            <div key={role.key} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">{role.label}</p>
              <Badge variant="outline" className={`mt-1 ${RAG_CLASS[count === 0 ? "red" : count === 1 ? "amber" : "green"]}`}>{count} trained</Badge>
            </div>
          ))}
        </div>
      </Card>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">{editing ? "Edit crew member" : "Add crew member"}</h3>
          <form onSubmit={saveMember} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Full name</Label><Input value={mForm.full_name} onChange={(e) => setMForm({ ...mForm, full_name: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={mForm.role_title} onChange={(e) => setMForm({ ...mForm, role_title: e.target.value })}>
                {TECH_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={mForm.status} onChange={(e) => setMForm({ ...mForm, status: e.target.value })}>
                {["active", "on_leave", "training", "inactive"].map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label>Skills</Label><Input value={mForm.skills} onChange={(e) => setMForm({ ...mForm, skills: e.target.value })} placeholder="FOH mixing, ProPresenter, OBS" /></div>
            <div className="md:col-span-2"><Label>Certifications</Label><Input value={mForm.certifications} onChange={(e) => setMForm({ ...mForm, certifications: e.target.value })} /></div>
            <div><Label>Availability</Label><Input value={mForm.availability} onChange={(e) => setMForm({ ...mForm, availability: e.target.value })} placeholder="Sundays, Wed pm" /></div>
            <div><Label>Email</Label><Input value={mForm.email} onChange={(e) => setMForm({ ...mForm, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={mForm.phone} onChange={(e) => setMForm({ ...mForm, phone: e.target.value })} /></div>
            <div><Label>Attendance %</Label><Input type="number" value={mForm.attendance_pct} onChange={(e) => setMForm({ ...mForm, attendance_pct: e.target.value })} /></div>
            <div><Label>Emergency contact</Label><Input value={mForm.emergency_contact_name} onChange={(e) => setMForm({ ...mForm, emergency_contact_name: e.target.value })} /></div>
            <div><Label>Emergency phone</Label><Input value={mForm.emergency_contact_phone} onChange={(e) => setMForm({ ...mForm, emergency_contact_phone: e.target.value })} /></div>
            <div><Label>Performance score</Label><Input type="number" value={mForm.performance_score} onChange={(e) => setMForm({ ...mForm, performance_score: e.target.value })} /></div>
            <div className="md:col-span-4"><Label>Notes</Label><Textarea rows={2} value={mForm.notes} onChange={(e) => setMForm({ ...mForm, notes: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">{editing ? "Save changes" : "Add member"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setMForm({ ...EMPTY_MEMBER }); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-serif text-lg">Technical crew register</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Name</th><th>Role</th><th>Skills</th><th>Availability</th><th>Attendance</th><th>Status</th>{canManage && <th />}</tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border/60">
                  <td className="py-2 font-medium">{m.full_name}</td>
                  <td>{labelFor(TECH_ROLES, m.role_title)}</td>
                  <td className="text-xs">{m.skills ?? "—"}</td>
                  <td className="text-xs">{m.availability ?? "—"}</td>
                  <td>{m.attendance_pct != null ? `${m.attendance_pct}%` : "—"}</td>
                  <td><Badge variant="outline">{titleish(m.status)}</Badge></td>
                  {canManage && <td className="text-right"><Button size="sm" variant="ghost" onClick={() => { setEditing(m.id); setMForm({ ...EMPTY_MEMBER, ...Object.fromEntries(Object.keys(EMPTY_MEMBER).map((k) => [k, m[k] ?? ""])) } as any); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button></td>}
                </tr>
              ))}
              {!members.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No crew registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-serif text-lg">Technical academy — courses</h3>
          {canManage && (
            <form onSubmit={saveCourse} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Title</Label><Input value={cForm.title} onChange={(e) => setCForm({ ...cForm, title: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={cForm.category} onChange={(e) => setCForm({ ...cForm, category: e.target.value })}>
                  {["audio", "video", "lighting", "streaming", "it_network", "safety", "leadership"].map((c) => <option key={c} value={c}>{titleish(c)}</option>)}
                </select>
              </div>
              <div><Label>Hours</Label><Input type="number" step="0.5" value={cForm.duration_hours} onChange={(e) => setCForm({ ...cForm, duration_hours: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={cForm.description} onChange={(e) => setCForm({ ...cForm, description: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cForm.certification} onChange={(e) => setCForm({ ...cForm, certification: e.target.checked })} /> Issues certification
              </label>
              <div><Label>Validity (months)</Label><Input type="number" value={cForm.validity_months} onChange={(e) => setCForm({ ...cForm, validity_months: e.target.value })} /></div>
              <div className="sm:col-span-2"><Button type="submit">Add course</Button></div>
            </form>
          )}
          <ul className="mt-4 space-y-2 text-sm">
            {courses.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <span><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{titleish(c.category)} · {c.duration_hours ?? "—"}h</span></span>
                {c.certification && <Badge variant="outline">Certified</Badge>}
              </li>
            ))}
            {!courses.length && <li className="text-muted-foreground">No courses yet.</li>}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-serif text-lg">Training records</h3>
          {canManage && (
            <form onSubmit={saveRecord} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Crew member</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={rForm.member_id} onChange={(e) => setRForm({ ...rForm, member_id: e.target.value })}>
                  <option value="">Select…</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Course</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={rForm.course_id} onChange={(e) => setRForm({ ...rForm, course_id: e.target.value })}>
                  <option value="">Select…</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={rForm.status} onChange={(e) => setRForm({ ...rForm, status: e.target.value })}>
                  {["enrolled", "in_progress", "completed", "failed"].map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                </select>
              </div>
              <div><Label>Score</Label><Input type="number" value={rForm.score} onChange={(e) => setRForm({ ...rForm, score: e.target.value })} /></div>
              <div><Label>Completed on</Label><Input type="date" value={rForm.completed_on} onChange={(e) => setRForm({ ...rForm, completed_on: e.target.value })} /></div>
              <div><Label>Expires on</Label><Input type="date" value={rForm.expires_on} onChange={(e) => setRForm({ ...rForm, expires_on: e.target.value })} /></div>
              <div className="sm:col-span-2"><Button type="submit">Save record</Button></div>
            </form>
          )}
          <ul className="mt-4 space-y-2 text-sm">
            {records.map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <span>
                  <span className="font-medium">{nameOf(r.member_id)}</span>
                  <span className="block text-xs text-muted-foreground">{courseOf(r.course_id)} · {titleish(r.status)}{r.expires_on ? ` · expires ${fmtDate(r.expires_on)}` : ""}</span>
                </span>
                <Badge variant="outline" className={RAG_CLASS[r.status === "completed" ? "green" : r.status === "failed" ? "red" : "amber"]}>
                  {r.score != null ? `${r.score}%` : titleish(r.status)}
                </Badge>
              </li>
            ))}
            {!records.length && <li className="text-muted-foreground">No training records yet.</li>}
          </ul>
          {!!expiring.length && (
            <p className="mt-3 text-xs text-muted-foreground">
              {expiring.length} certification(s) expire within 60 days — schedule refreshers before {fmtDate(today())}.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
