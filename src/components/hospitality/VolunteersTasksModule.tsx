import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { BRANCHES, RAG_CLASS, branchLabel, exportRows, fmtDate, titleCase } from "@/lib/finance";
import { HOS_PRIORITIES, HOS_TASK_STATUSES, HOS_TASK_TYPES, HOS_VOLUNTEER_ROLES, labelFor, ragForScore } from "@/lib/hospitality";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string; onChanged?: () => void };

/** Volunteer roster and hospitality task board (duty allocation, progress and recognition). */
export default function VolunteersTasksModule({ canManage, currentUserId, onChanged }: Props) {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const vEmpty = {
    full_name: "", role: "volunteer", branch: "etwatwa", phone: "", email: "",
    availability: "", skills: "", food_handling_certificate: false, emergency_contact: "", serving_since: "",
  };
  const tEmpty = {
    title: "", task_type: "refreshments", description: "", event_id: "", assignee_name: "",
    priority: "medium", due_date: new Date().toISOString().slice(0, 10),
  };
  const [vForm, setVForm] = useState<Record<string, any>>({ ...vEmpty });
  const [tForm, setTForm] = useState({ ...tEmpty });

  const load = async () => {
    const [{ data: v }, { data: t }, { data: e }] = await Promise.all([
      sb.from("hos_volunteers").select("*").order("full_name"),
      sb.from("hos_tasks").select("*").order("due_date"),
      sb.from("hos_events").select("id, title").order("starts_at", { ascending: false }).limit(50),
    ]);
    setVolunteers(v ?? []);
    setTasks(t ?? []);
    setEvents(e ?? []);
  };
  useEffect(() => { load(); }, []);

  const addVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vForm.full_name.trim()) return toast.error("Volunteer name is required");
    const { error } = await sb.from("hos_volunteers").insert({ ...vForm, serving_since: vForm.serving_since || null });
    if (error) return toast.error(error.message);
    toast.success("Volunteer added");
    setVForm({ ...vEmpty });
    load();
    onChanged?.();
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tForm.title.trim()) return toast.error("Describe the task");
    const { error } = await sb.from("hos_tasks").insert({
      ...tForm,
      event_id: tForm.event_id || null,
      due_date: tForm.due_date || null,
      progress_pct: 0,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Task assigned");
    setTForm({ ...tEmpty });
    load();
  };

  const patchTask = async (row: any, values: Record<string, any>) => {
    const { error } = await sb.from("hos_tasks").update(values).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };
  const patchVolunteer = async (row: any, values: Record<string, any>) => {
    const { error } = await sb.from("hos_volunteers").update(values).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
    onChanged?.();
  };

  const active = volunteers.filter((v) => v.active !== false);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const overdue = openTasks.filter((t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Active volunteers</p><p className="font-serif text-2xl">{active.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Food-handling certified</p><p className="font-serif text-2xl">{active.filter((v) => v.food_handling_certificate).length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Open tasks</p><p className="font-serif text-2xl">{openTasks.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Overdue tasks</p><p className="font-serif text-2xl">{overdue.length}</p></Card>
      </div>

      {canManage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-serif text-lg">Add a volunteer</h3>
            <form onSubmit={addVolunteer} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><Label>Full name</Label><Input value={vForm.full_name} onChange={(e) => setVForm({ ...vForm, full_name: e.target.value })} /></div>
              <div>
                <Label>Role</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={vForm.role} onChange={(e) => setVForm({ ...vForm, role: e.target.value })}>
                  {HOS_VOLUNTEER_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Branch</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={vForm.branch} onChange={(e) => setVForm({ ...vForm, branch: e.target.value })}>
                  {BRANCHES.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
                </select>
              </div>
              <div><Label>Phone</Label><Input value={vForm.phone} onChange={(e) => setVForm({ ...vForm, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={vForm.email} onChange={(e) => setVForm({ ...vForm, email: e.target.value })} /></div>
              <div><Label>Serving since</Label><Input type="date" value={vForm.serving_since} onChange={(e) => setVForm({ ...vForm, serving_since: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Availability & skills</Label><Textarea rows={2} value={vForm.skills} onChange={(e) => setVForm({ ...vForm, skills: e.target.value })} /></div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input id="fh" type="checkbox" checked={vForm.food_handling_certificate} onChange={(e) => setVForm({ ...vForm, food_handling_certificate: e.target.checked })} />
                <Label htmlFor="fh">Food-handling certificate on file</Label>
              </div>
              <div className="sm:col-span-2"><Button type="submit" size="sm">Add volunteer</Button></div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-serif text-lg">Assign a task</h3>
            <form onSubmit={addTask} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Task</Label><Input value={tForm.title} onChange={(e) => setTForm({ ...tForm, title: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={tForm.task_type} onChange={(e) => setTForm({ ...tForm, task_type: e.target.value })}>
                  {HOS_TASK_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Event</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={tForm.event_id} onChange={(e) => setTForm({ ...tForm, event_id: e.target.value })}>
                  <option value="">Not event specific</option>
                  {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <Label>Assign to</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={tForm.assignee_name} onChange={(e) => setTForm({ ...tForm, assignee_name: e.target.value })}>
                  <option value="">Unassigned</option>
                  {active.map((v) => <option key={v.id} value={v.full_name}>{v.full_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={tForm.priority} onChange={(e) => setTForm({ ...tForm, priority: e.target.value })}>
                  {HOS_PRIORITIES.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
                </select>
              </div>
              <div><Label>Due date</Label><Input type="date" value={tForm.due_date} onChange={(e) => setTForm({ ...tForm, due_date: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Details</Label><Textarea rows={2} value={tForm.description} onChange={(e) => setTForm({ ...tForm, description: e.target.value })} /></div>
              <div className="sm:col-span-2"><Button type="submit" size="sm">Assign task</Button></div>
            </form>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Task board</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "hospitality-tasks",
                ["Task", "Type", "Assignee", "Priority", "Due", "Progress %", "Status"],
                tasks.map((t) => [t.title, t.task_type, t.assignee_name, t.priority, t.due_date, t.progress_pct, t.status]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Task</th><th>Assignee</th><th>Priority</th><th>Due</th><th>Progress</th><th>Status</th></tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-t align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{labelFor(HOS_TASK_TYPES, t.task_type)}</p>
                  </td>
                  <td className="pr-3">{t.assignee_name ?? "Unassigned"}</td>
                  <td className="pr-3">{titleCase(t.priority)}</td>
                  <td className="pr-3">{fmtDate(t.due_date)}</td>
                  <td className="pr-3 w-28">
                    {canManage ? (
                      <Input type="number" className="h-9" defaultValue={t.progress_pct ?? 0} onBlur={(e) => patchTask(t, { progress_pct: Number(e.target.value) || 0 })} />
                    ) : (
                      <Badge variant="outline" className={RAG_CLASS[ragForScore(t.progress_pct ?? 0)]}>{t.progress_pct ?? 0}%</Badge>
                    )}
                  </td>
                  <td className="pr-3">
                    {canManage ? (
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={t.status ?? "todo"} onChange={(e) => patchTask(t, { status: e.target.value })}>
                        {HOS_TASK_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                      </select>
                    ) : titleCase(t.status ?? "todo")}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No hospitality tasks yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Volunteer roster</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "hospitality-volunteers",
                ["Name", "Role", "Branch", "Phone", "Email", "Food handling", "Attendance %", "Recognition points", "Active"],
                volunteers.map((v) => [v.full_name, v.role, branchLabel(v.branch), v.phone, v.email, v.food_handling_certificate ? "Yes" : "No", v.attendance_pct, v.recognition_points, v.active === false ? "No" : "Yes"]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Volunteer</th><th>Role</th><th>Branch</th><th>Food handling</th><th>Attendance</th><th>Recognition</th>{canManage && <th />}</tr>
            </thead>
            <tbody>
              {volunteers.map((v) => (
                <tr key={v.id} className="border-t align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium">{v.full_name}</p>
                    <p className="text-xs text-muted-foreground">{v.email ?? v.phone ?? "—"}</p>
                  </td>
                  <td className="pr-3">{labelFor(HOS_VOLUNTEER_ROLES, v.role)}</td>
                  <td className="pr-3">{branchLabel(v.branch)}</td>
                  <td className="pr-3">
                    <Badge variant="outline" className={v.food_handling_certificate ? RAG_CLASS.green : RAG_CLASS.amber}>
                      {v.food_handling_certificate ? "Certified" : "Outstanding"}
                    </Badge>
                  </td>
                  <td className="pr-3 w-28">
                    {canManage ? (
                      <Input type="number" className="h-9" defaultValue={v.attendance_pct ?? 0} onBlur={(e) => patchVolunteer(v, { attendance_pct: Number(e.target.value) || 0 })} />
                    ) : `${v.attendance_pct ?? 0}%`}
                  </td>
                  <td className="pr-3 w-28">
                    {canManage ? (
                      <Input type="number" className="h-9" defaultValue={v.recognition_points ?? 0} onBlur={(e) => patchVolunteer(v, { recognition_points: Number(e.target.value) || 0 })} />
                    ) : (v.recognition_points ?? 0)}
                  </td>
                  {canManage && (
                    <td className="pr-1">
                      <Button size="sm" variant="outline" onClick={() => patchVolunteer(v, { active: v.active === false })}>
                        {v.active === false ? "Reactivate" : "Deactivate"}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {volunteers.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No volunteers registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
