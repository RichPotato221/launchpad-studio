import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RAG_CLASS, fmtDate, money } from "@/lib/finance";
import {
  APPROVAL_STATUSES, PROJECT_STAGES, PROJECT_STATUSES, PROJECT_TYPES,
  labelFor, ragForStatus, scheduleVariance, titleish, today,
} from "@/lib/strategy";

const sb = supabase as any;

const EMPTY_PROJECT = {
  objective_id: "", name: "", project_type: "kingdom_expansion", scope: "", business_case: "", objectives: "",
  department_slug: "", sponsor: "", manager: "", stakeholders: "", budget_requested: "", budget_approved: "",
  spent: "0", funding_source: "", start_date: today(), end_date: "", progress_pct: "0",
  stage: "proposed", status: "on_track", risks: "", approval_status: "pending", photo_url: "", document_url: "",
};
const EMPTY_MILESTONE = { project_id: "", title: "", due_date: "", deliverable: "", owner: "" };

/** MODULES 5–7 — Project portfolio management, appraisal and milestone tracking. */
export default function PortfolioModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY_PROJECT });
  const [editing, setEditing] = useState<string | null>(null);
  const [mForm, setMForm] = useState({ ...EMPTY_MILESTONE });

  const load = async () => {
    const [p, m, o] = await Promise.all([
      sb.from("smo_projects").select("*").order("created_at", { ascending: false }),
      sb.from("smo_milestones").select("*").order("due_date"),
      sb.from("smo_objectives").select("id, title"),
    ]);
    setProjects(p.data ?? []); setMilestones(m.data ?? []); setObjectives(o.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    active: projects.filter((p) => !["closed", "cancelled"].includes(p.stage)).length,
    budget: projects.reduce((s, p) => s + Number(p.budget_approved ?? 0), 0),
    spent: projects.reduce((s, p) => s + Number(p.spent ?? 0), 0),
    pending: projects.filter((p) => p.approval_status === "pending").length,
    delayed: projects.filter((p) => { const v = scheduleVariance(p); return v !== null && v < -10; }).length,
  }), [projects]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Give the project a name");
    const payload: any = {
      ...form,
      objective_id: form.objective_id || null,
      department_slug: form.department_slug || null,
      budget_requested: form.budget_requested ? Number(form.budget_requested) : null,
      budget_approved: form.budget_approved ? Number(form.budget_approved) : null,
      spent: Number(form.spent || 0),
      progress_pct: Number(form.progress_pct || 0),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: currentUserId,
    };
    const { error } = editing
      ? await sb.from("smo_projects").update(payload).eq("id", editing)
      : await sb.from("smo_projects").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Project updated" : "Project added to the portfolio");
    setForm({ ...EMPTY_PROJECT }); setEditing(null); load();
  };

  const saveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mForm.project_id || !mForm.title.trim()) return toast.error("Select a project and name the milestone");
    const { error } = await sb.from("smo_milestones").insert({ ...mForm, due_date: mForm.due_date || null });
    if (error) return toast.error(error.message);
    toast.success("Milestone added"); setMForm({ ...EMPTY_MILESTONE }); load();
  };

  const completeMilestone = async (m: any) => {
    const { error } = await sb.from("smo_milestones").update({ status: "completed", completed_on: today() }).eq("id", m.id);
    if (error) return toast.error(error.message);
    load();
  };

  const setApproval = async (p: any, approval_status: string) => {
    const { error } = await sb.from("smo_projects").update({ approval_status }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Active projects</p><p className="font-serif text-xl">{stats.active}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Approved budget</p><p className="font-serif text-xl">{money(stats.budget)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Spent</p><p className="font-serif text-xl">{money(stats.spent)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Awaiting approval</p><p className="font-serif text-xl">{stats.pending}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Behind schedule</p><p className="font-serif text-xl">{stats.delayed}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">{editing ? "Edit project" : "Add a church development project"}</h3>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Project name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })}>
                {PROJECT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Linked objective</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.objective_id} onChange={(e) => setForm({ ...form, objective_id: e.target.value })}>
                <option value="">Not linked</option>
                {objectives.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
            </div>
            <div><Label>Sponsor</Label><Input value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} /></div>
            <div><Label>Project manager</Label><Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></div>
            <div><Label>Department</Label><Input value={form.department_slug} onChange={(e) => setForm({ ...form, department_slug: e.target.value })} /></div>
            <div><Label>Funding source</Label><Input value={form.funding_source} onChange={(e) => setForm({ ...form, funding_source: e.target.value })} /></div>
            <div><Label>Budget requested</Label><Input type="number" step="0.01" value={form.budget_requested} onChange={(e) => setForm({ ...form, budget_requested: e.target.value })} /></div>
            <div><Label>Budget approved</Label><Input type="number" step="0.01" value={form.budget_approved} onChange={(e) => setForm({ ...form, budget_approved: e.target.value })} /></div>
            <div><Label>Spent to date</Label><Input type="number" step="0.01" value={form.spent} onChange={(e) => setForm({ ...form, spent: e.target.value })} /></div>
            <div><Label>Progress %</Label><Input type="number" value={form.progress_pct} onChange={(e) => setForm({ ...form, progress_pct: e.target.value })} /></div>
            <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div>
              <Label>Stage</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {PROJECT_STAGES.map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label>Scope</Label><Textarea rows={2} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Business case</Label><Textarea rows={2} value={form.business_case} onChange={(e) => setForm({ ...form, business_case: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Stakeholders</Label><Textarea rows={2} value={form.stakeholders} onChange={(e) => setForm({ ...form, stakeholders: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Key risks</Label><Textarea rows={2} value={form.risks} onChange={(e) => setForm({ ...form, risks: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">{editing ? "Save changes" : "Add project"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ ...EMPTY_PROJECT }); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {projects.map((p) => {
          const variance = scheduleVariance(p);
          const ms = milestones.filter((m) => m.project_id === p.id);
          return (
            <Card key={p.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-serif text-lg">{p.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {labelFor(PROJECT_TYPES, p.project_type)} · {titleish(p.stage)} · {fmtDate(p.start_date)} – {fmtDate(p.end_date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sponsor {p.sponsor ?? "—"} · Manager {p.manager ?? "—"} · {money(p.budget_approved)} approved, {money(p.spent)} spent
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={RAG_CLASS[ragForStatus(p.status)]}>{titleish(p.status)}</Badge>
                  {variance !== null && (
                    <Badge variant="outline" className={RAG_CLASS[variance < -10 ? "red" : variance < 0 ? "amber" : "green"]}>
                      {variance >= 0 ? `+${variance}` : variance} vs schedule
                    </Badge>
                  )}
                  {canManage ? (
                    <select className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={p.approval_status} onChange={(e) => setApproval(p, e.target.value)}>
                      {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                    </select>
                  ) : <Badge variant="outline">{titleish(p.approval_status)}</Badge>}
                  {canManage && <Button size="sm" variant="outline" onClick={() => { setEditing(p.id); setForm({ ...EMPTY_PROJECT, ...Object.fromEntries(Object.keys(EMPTY_PROJECT).map((k) => [k, p[k] ?? ""])) } as any); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>}
                </div>
              </div>
              <Progress value={Number(p.progress_pct ?? 0)} className="mt-4" />
              {p.business_case && <p className="mt-3 text-sm"><span className="text-muted-foreground">Business case: </span>{p.business_case}</p>}
              {!!ms.length && (
                <ul className="mt-4 space-y-2 text-sm">
                  {ms.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                      <span>{m.title}<span className="block text-xs text-muted-foreground">Due {fmtDate(m.due_date)} · {m.owner ?? "—"}</span></span>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className={RAG_CLASS[m.status === "completed" ? "green" : m.due_date && m.due_date < today() ? "red" : "amber"]}>{titleish(m.status)}</Badge>
                        {canManage && m.status !== "completed" && <Button size="sm" variant="outline" onClick={() => completeMilestone(m)}>Complete</Button>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
        {!projects.length && <Card className="p-8 text-center text-sm text-muted-foreground">No projects in the portfolio yet.</Card>}
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Add a milestone</h3>
          <form onSubmit={saveMilestone} className="mt-4 grid gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label>Project</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={mForm.project_id} onChange={(e) => setMForm({ ...mForm, project_id: e.target.value })}>
                <option value="">Select…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><Label>Milestone</Label><Input value={mForm.title} onChange={(e) => setMForm({ ...mForm, title: e.target.value })} /></div>
            <div><Label>Due</Label><Input type="date" value={mForm.due_date} onChange={(e) => setMForm({ ...mForm, due_date: e.target.value })} /></div>
            <div><Label>Owner</Label><Input value={mForm.owner} onChange={(e) => setMForm({ ...mForm, owner: e.target.value })} /></div>
            <div className="md:col-span-5"><Button type="submit">Add milestone</Button></div>
          </form>
        </Card>
      )}
    </div>
  );
}
