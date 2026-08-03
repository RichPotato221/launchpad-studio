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
  OBJECTIVE_STATUSES, PERIODS, PERSPECTIVES, PLAN_STATUSES, PLAN_TYPES,
  labelFor, ragForScore, ragForStatus, titleish, today, visionCompletion,
} from "@/lib/strategy";

const sb = supabase as any;

const EMPTY_PLAN = {
  title: "", plan_type: "annual", vision_statement: "", mission_statement: "",
  horizon_start: today(), horizon_end: "", status: "draft", owner: "",
};
const EMPTY_OBJ = {
  plan_id: "", title: "", theme: "", perspective: "kingdom_impact", description: "", owner: "",
  department_slug: "", period: "annual", start_date: today(), due_date: "", budget: "",
  progress_pct: "0", status: "on_track", dependencies: "", risks: "",
};

/** MODULES 2–4 — Strategic plans, themes and objectives / OKRs. */
export default function PlansModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [pForm, setPForm] = useState({ ...EMPTY_PLAN });
  const [oForm, setOForm] = useState({ ...EMPTY_OBJ });
  const [editingObj, setEditingObj] = useState<string | null>(null);

  const load = async () => {
    const [p, o] = await Promise.all([
      sb.from("smo_plans").select("*").order("created_at", { ascending: false }),
      sb.from("smo_objectives").select("*").order("due_date"),
    ]);
    setPlans(p.data ?? []); setObjectives(o.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const byPlan = useMemo(() => {
    const map = new Map<string, any[]>();
    objectives.forEach((o) => {
      const key = o.plan_id ?? "unassigned";
      map.set(key, [...(map.get(key) ?? []), o]);
    });
    return map;
  }, [objectives]);

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pForm.title.trim()) return toast.error("Give the plan a title");
    const { error } = await sb.from("smo_plans").insert({
      ...pForm,
      horizon_start: pForm.horizon_start || null,
      horizon_end: pForm.horizon_end || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Strategic plan created"); setPForm({ ...EMPTY_PLAN }); load();
  };

  const saveObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oForm.title.trim()) return toast.error("Give the objective a title");
    const payload: any = {
      ...oForm,
      plan_id: oForm.plan_id || null,
      budget: oForm.budget ? Number(oForm.budget) : null,
      progress_pct: Number(oForm.progress_pct || 0),
      start_date: oForm.start_date || null,
      due_date: oForm.due_date || null,
      department_slug: oForm.department_slug || null,
    };
    const { error } = editingObj
      ? await sb.from("smo_objectives").update(payload).eq("id", editingObj)
      : await sb.from("smo_objectives").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editingObj ? "Objective updated" : "Objective added");
    setOForm({ ...EMPTY_OBJ }); setEditingObj(null); load();
  };

  const setProgress = async (o: any, value: number) => {
    const { error } = await sb.from("smo_objectives").update({ progress_pct: value }).eq("id", o.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-serif text-lg">Create a strategic plan</h3>
            <form onSubmit={savePlan} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Title</Label><Input value={pForm.title} onChange={(e) => setPForm({ ...pForm, title: e.target.value })} placeholder="TRoGKC 5-Year Kingdom Expansion Plan" /></div>
              <div>
                <Label>Plan type</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={pForm.plan_type} onChange={(e) => setPForm({ ...pForm, plan_type: e.target.value })}>
                  {PLAN_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={pForm.status} onChange={(e) => setPForm({ ...pForm, status: e.target.value })}>
                  {PLAN_STATUSES.map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                </select>
              </div>
              <div><Label>From</Label><Input type="date" value={pForm.horizon_start} onChange={(e) => setPForm({ ...pForm, horizon_start: e.target.value })} /></div>
              <div><Label>To</Label><Input type="date" value={pForm.horizon_end} onChange={(e) => setPForm({ ...pForm, horizon_end: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Vision statement</Label><Textarea rows={2} value={pForm.vision_statement} onChange={(e) => setPForm({ ...pForm, vision_statement: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Mission statement</Label><Textarea rows={2} value={pForm.mission_statement} onChange={(e) => setPForm({ ...pForm, mission_statement: e.target.value })} /></div>
              <div><Label>Owner</Label><Input value={pForm.owner} onChange={(e) => setPForm({ ...pForm, owner: e.target.value })} /></div>
              <div className="flex items-end"><Button type="submit" className="w-full">Create plan</Button></div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-serif text-lg">{editingObj ? "Edit objective" : "Add strategic objective / OKR"}</h3>
            <form onSubmit={saveObjective} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Plan</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={oForm.plan_id} onChange={(e) => setOForm({ ...oForm, plan_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><Label>Objective</Label><Input value={oForm.title} onChange={(e) => setOForm({ ...oForm, title: e.target.value })} /></div>
              <div>
                <Label>Perspective</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={oForm.perspective} onChange={(e) => setOForm({ ...oForm, perspective: e.target.value })}>
                  {PERSPECTIVES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Period</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={oForm.period} onChange={(e) => setOForm({ ...oForm, period: e.target.value })}>
                  {PERIODS.map((p) => <option key={p} value={p}>{titleish(p)}</option>)}
                </select>
              </div>
              <div><Label>Owner</Label><Input value={oForm.owner} onChange={(e) => setOForm({ ...oForm, owner: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={oForm.department_slug} onChange={(e) => setOForm({ ...oForm, department_slug: e.target.value })} placeholder="finance" /></div>
              <div><Label>Start</Label><Input type="date" value={oForm.start_date} onChange={(e) => setOForm({ ...oForm, start_date: e.target.value })} /></div>
              <div><Label>Due</Label><Input type="date" value={oForm.due_date} onChange={(e) => setOForm({ ...oForm, due_date: e.target.value })} /></div>
              <div><Label>Budget</Label><Input type="number" step="0.01" value={oForm.budget} onChange={(e) => setOForm({ ...oForm, budget: e.target.value })} /></div>
              <div><Label>Progress %</Label><Input type="number" value={oForm.progress_pct} onChange={(e) => setOForm({ ...oForm, progress_pct: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={oForm.status} onChange={(e) => setOForm({ ...oForm, status: e.target.value })}>
                  {OBJECTIVE_STATUSES.map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                </select>
              </div>
              <div><Label>Theme</Label><Input value={oForm.theme} onChange={(e) => setOForm({ ...oForm, theme: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Description / key results</Label><Textarea rows={2} value={oForm.description} onChange={(e) => setOForm({ ...oForm, description: e.target.value })} /></div>
              <div><Label>Dependencies</Label><Input value={oForm.dependencies} onChange={(e) => setOForm({ ...oForm, dependencies: e.target.value })} /></div>
              <div><Label>Risks</Label><Input value={oForm.risks} onChange={(e) => setOForm({ ...oForm, risks: e.target.value })} /></div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">{editingObj ? "Save changes" : "Add objective"}</Button>
                {editingObj && <Button type="button" variant="outline" onClick={() => { setEditingObj(null); setOForm({ ...EMPTY_OBJ }); }}>Cancel</Button>}
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {plans.map((p) => {
          const objs = byPlan.get(p.id) ?? [];
          const completion = visionCompletion(objs);
          return (
            <Card key={p.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-serif text-lg">{p.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {labelFor(PLAN_TYPES, p.plan_type)} · {fmtDate(p.horizon_start)} – {fmtDate(p.horizon_end)} · {p.owner ?? "No owner"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{titleish(p.status)}</Badge>
                  <Badge variant="outline" className={RAG_CLASS[ragForScore(completion, 70, 40)]}>{completion}% complete</Badge>
                </div>
              </div>
              {p.vision_statement && <p className="mt-3 text-sm italic text-muted-foreground">{p.vision_statement}</p>}
              <Progress value={completion} className="mt-4" />
              <div className="mt-4 space-y-3">
                {objs.map((o) => (
                  <div key={o.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">{o.title}</span>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline">{labelFor(PERSPECTIVES, o.perspective)}</Badge>
                        <Badge variant="outline" className={RAG_CLASS[ragForStatus(o.status)]}>{titleish(o.status)}</Badge>
                        {canManage && <Button size="sm" variant="ghost" onClick={() => { setEditingObj(o.id); setOForm({ ...EMPTY_OBJ, ...Object.fromEntries(Object.keys(EMPTY_OBJ).map((k) => [k, o[k] ?? ""])) } as any); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>}
                      </span>
                    </div>
                    <Progress value={Number(o.progress_pct ?? 0)} className="mt-2" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.owner ?? "Unassigned"} · due {fmtDate(o.due_date)} · {o.budget ? money(o.budget) : "no budget"} · {o.progress_pct ?? 0}%
                    </p>
                    {canManage && (
                      <input type="range" min={0} max={100} value={Number(o.progress_pct ?? 0)} className="mt-2 w-full"
                        onChange={(e) => setProgress(o, Number(e.target.value))} />
                    )}
                  </div>
                ))}
                {!objs.length && <p className="text-sm text-muted-foreground">No objectives captured under this plan yet.</p>}
              </div>
            </Card>
          );
        })}
        {!plans.length && <Card className="p-8 text-center text-sm text-muted-foreground">No strategic plans yet.</Card>}

        {!!(byPlan.get("unassigned") ?? []).length && (
          <Card className="p-6">
            <h4 className="font-serif text-lg">Unassigned objectives</h4>
            <div className="mt-3 space-y-3">
              {(byPlan.get("unassigned") ?? []).map((o) => (
                <div key={o.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{o.title}</span>
                    <Badge variant="outline" className={RAG_CLASS[ragForStatus(o.status)]}>{titleish(o.status)}</Badge>
                  </div>
                  <Progress value={Number(o.progress_pct ?? 0)} className="mt-2" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
