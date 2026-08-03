import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { money, fmtDate, exportRows, BRANCHES, branchLabel } from "@/lib/finance";
import { PROJECT_TYPES, PROJECT_STATUSES, labelFor, titleish, daysUntil } from "@/lib/resources";

const sb = supabase as any;

const EMPTY = {
  name: "", project_type: "renovation", description: "", branch: "", facility_id: "",
  department_slug: "", contractor: "", budget: "", spent: "", start_date: "", target_end_date: "",
  completion_pct: "0", status: "planning", risks: "", approvals: "", resource_usage: "",
};

/** MODULE 7 — Church Development & Infrastructure Projects. */
export default function ProjectsModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const [p, f, d] = await Promise.all([
      sb.from("res_projects").select("*").order("created_at", { ascending: false }),
      sb.from("res_facilities").select("id, name").order("name"),
      sb.from("departments").select("slug, name").order("name"),
    ]);
    setRows(p.data ?? []); setFacilities(f.data ?? []); setDepts(d.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = (v: string) => (v === "" ? null : Number(v));
    const payload: any = {
      name: form.name, project_type: form.project_type, description: form.description || null,
      branch: form.branch || null, facility_id: form.facility_id || null,
      department_slug: form.department_slug || null, contractor: form.contractor || null,
      budget: num(form.budget), spent: num(form.spent) ?? 0,
      start_date: form.start_date || null, target_end_date: form.target_end_date || null,
      completion_pct: Number(form.completion_pct || 0), status: form.status,
      risks: form.risks || null, approvals: form.approvals || null, resource_usage: form.resource_usage || null,
    };
    if (form.status === "completed") payload.actual_end_date = new Date().toISOString().slice(0, 10);
    const { error } = editingId
      ? await sb.from("res_projects").update(payload).eq("id", editingId)
      : await sb.from("res_projects").insert({ ...payload, owner_id: currentUserId });
    if (error) return toast.error(error.message);
    setForm({ ...EMPTY }); setEditingId(null); toast.success("Project saved"); load();
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editingId ? "Edit project" : "New development project"}</p>
          <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Project name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.project_type} onValueChange={(v) => setForm({ ...form, project_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_TYPES.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_STATUSES.map((x) => <SelectItem key={x} value={x}>{titleish(x)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((x) => <SelectItem key={x} value={x}>{branchLabel(x)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Facility</Label>
              <Select value={form.facility_id} onValueChange={(v) => setForm({ ...form, facility_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{facilities.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Requesting department</Label>
              <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Contractor</Label><Input value={form.contractor} onChange={(e) => setForm({ ...form, contractor: e.target.value })} /></div>
            <div><Label>Budget (R)</Label><Input type="number" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            <div><Label>Spent (R)</Label><Input type="number" step="0.01" value={form.spent} onChange={(e) => setForm({ ...form, spent: e.target.value })} /></div>
            <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Target completion</Label><Input type="date" value={form.target_end_date} onChange={(e) => setForm({ ...form, target_end_date: e.target.value })} /></div>
            <div><Label>Completion %</Label><Input type="number" min="0" max="100" value={form.completion_pct} onChange={(e) => setForm({ ...form, completion_pct: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Risks</Label><Textarea rows={2} value={form.risks} onChange={(e) => setForm({ ...form, risks: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Approvals obtained</Label><Input value={form.approvals} onChange={(e) => setForm({ ...form, approvals: e.target.value })} placeholder="e.g. Council resolution 2026/04" /></div>
            <div className="md:col-span-2"><Label>Resource usage</Label><Input value={form.resource_usage} onChange={(e) => setForm({ ...form, resource_usage: e.target.value })} placeholder="Assets, materials and labour committed" /></div>
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Save" : "Create project"}</Button>
              {editingId && <Button type="button" variant="outline" onClick={() => { setForm({ ...EMPTY }); setEditingId(null); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportRows("development-projects",
          ["Name", "Type", "Branch", "Contractor", "Budget", "Spent", "Start", "Target", "Completion %", "Status"],
          rows.map((r) => [r.name, r.project_type, r.branch, r.contractor, r.budget, r.spent, r.start_date, r.target_end_date, r.completion_pct, r.status]))}>Export</Button>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const overdue = r.target_end_date && r.status !== "completed" && (daysUntil(r.target_end_date) ?? 0) < 0;
          const overBudget = Number(r.spent ?? 0) > Number(r.budget ?? 0) && Number(r.budget ?? 0) > 0;
          return (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {labelFor(PROJECT_TYPES, r.project_type)}{r.branch ? ` · ${branchLabel(r.branch)}` : ""}
                    {r.contractor ? ` · ${r.contractor}` : ""} · {fmtDate(r.start_date)} → {fmtDate(r.target_end_date)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {overdue && <Badge variant="destructive">Behind schedule</Badge>}
                  {overBudget && <Badge variant="destructive">Over budget</Badge>}
                  <Badge variant="secondary">{titleish(r.status)}</Badge>
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingId(r.id);
                      setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k] == null ? "" : String(r[k])])) } as any);
                    }}>Edit</Button>
                  )}
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!window.confirm("Delete this project?")) return;
                      await sb.from("res_projects").delete().eq("id", r.id); load();
                    }}>Delete</Button>
                  )}
                </div>
              </div>
              <Progress value={Number(r.completion_pct ?? 0)} className="mt-3 h-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                {Number(r.completion_pct ?? 0)}% complete · budget {money(r.budget)} · spent {money(r.spent)}
              </p>
              {r.description && <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>}
              {r.risks && <p className="mt-1 text-xs text-muted-foreground">Risks: {r.risks}</p>}
              {r.resource_usage && <p className="text-xs text-muted-foreground">Resources: {r.resource_usage}</p>}
            </Card>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No development projects yet.</p>}
      </div>
    </div>
  );
}
