import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RAG_CLASS, exportRows } from "@/lib/finance";
import { KPI_GROUPS, PERIODS, PERSPECTIVES, achievement, labelFor, ragForScore, titleish } from "@/lib/strategy";

const sb = supabase as any;

const EMPTY = {
  objective_id: "", name: "", kpi_group: "vision", department_slug: "", period: "quarterly",
  period_label: "", target: "", actual: "0", forecast: "", unit: "",
};

/** MODULES 8–9 — Balanced scorecard & strategic KPI tracking. */
export default function ScorecardModule({ canManage }: { canManage: boolean }) {
  const [kpis, setKpis] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    const [k, o] = await Promise.all([
      sb.from("smo_kpis").select("*").order("created_at", { ascending: false }),
      sb.from("smo_objectives").select("id, title, perspective, progress_pct, status"),
    ]);
    setKpis(k.data ?? []); setObjectives(o.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const byPerspective = useMemo(
    () => PERSPECTIVES.map((p) => {
      const objs = objectives.filter((o) => o.perspective === p.key);
      const avg = objs.length ? Math.round(objs.reduce((s, o) => s + Number(o.progress_pct ?? 0), 0) / objs.length) : 0;
      return { ...p, count: objs.length, avg };
    }),
    [objectives],
  );

  const overall = kpis.length
    ? Math.round(kpis.reduce((s, k) => s + Math.min(150, achievement(k.actual, k.target)), 0) / kpis.length)
    : 0;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name the KPI");
    const { error } = await sb.from("smo_kpis").insert({
      ...form,
      objective_id: form.objective_id || null,
      department_slug: form.department_slug || null,
      target: Number(form.target || 0),
      actual: Number(form.actual || 0),
      forecast: form.forecast ? Number(form.forecast) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("KPI added"); setForm({ ...EMPTY }); load();
  };

  const updateActual = async (k: any, value: number) => {
    const { error } = await sb.from("smo_kpis").update({ actual: value }).eq("id", k.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg">Strategy map — balanced scorecard</h3>
            <p className="text-sm text-muted-foreground">Objective progress by strategic perspective.</p>
          </div>
          <Badge variant="outline" className={RAG_CLASS[ragForScore(overall, 85, 60)]}>{overall}% KPI achievement</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {byPerspective.map((p) => (
            <div key={p.key} className="rounded-md border border-border p-4">
              <p className="text-sm font-medium">{p.label}</p>
              <p className="mt-1 font-serif text-xl">{p.avg}%</p>
              <Progress value={p.avg} className="mt-2" />
              <p className="mt-1 text-xs text-muted-foreground">{p.count} objective(s)</p>
            </div>
          ))}
        </div>
      </Card>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Add a strategic KPI</h3>
          <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>KPI name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Group</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.kpi_group} onChange={(e) => setForm({ ...form, kpi_group: e.target.value })}>
                {KPI_GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Objective</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.objective_id} onChange={(e) => setForm({ ...form, objective_id: e.target.value })}>
                <option value="">Not linked</option>
                {objectives.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
            </div>
            <div>
              <Label>Period</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                {PERIODS.map((p) => <option key={p} value={p}>{titleish(p)}</option>)}
              </select>
            </div>
            <div><Label>Period label</Label><Input value={form.period_label} onChange={(e) => setForm({ ...form, period_label: e.target.value })} placeholder="Q1 2026" /></div>
            <div><Label>Target</Label><Input type="number" step="0.01" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
            <div><Label>Actual</Label><Input type="number" step="0.01" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} /></div>
            <div><Label>Forecast</Label><Input type="number" step="0.01" value={form.forecast} onChange={(e) => setForm({ ...form, forecast: e.target.value })} /></div>
            <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="souls / R / %" /></div>
            <div><Label>Department</Label><Input value={form.department_slug} onChange={(e) => setForm({ ...form, department_slug: e.target.value })} /></div>
            <div className="md:col-span-4"><Button type="submit">Add KPI</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Strategic KPI register</h3>
          <Button variant="outline" onClick={() => exportRows(
            "strategic-kpis",
            ["KPI", "Group", "Period", "Target", "Actual", "Forecast", "Achievement %"],
            kpis.map((k) => [k.name, k.kpi_group, k.period_label ?? k.period, k.target, k.actual, k.forecast, achievement(k.actual, k.target)]),
          )}>Export CSV</Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">KPI</th><th>Group</th><th>Period</th><th>Target</th><th>Actual</th><th>Forecast</th><th>Achievement</th></tr>
            </thead>
            <tbody>
              {kpis.map((k) => {
                const a = achievement(k.actual, k.target);
                return (
                  <tr key={k.id} className="border-t border-border/60">
                    <td className="py-2 font-medium">{k.name}</td>
                    <td>{labelFor(KPI_GROUPS, k.kpi_group)}</td>
                    <td>{k.period_label ?? titleish(k.period)}</td>
                    <td>{k.target} {k.unit ?? ""}</td>
                    <td>
                      {canManage ? (
                        <Input className="h-8 w-24" type="number" defaultValue={k.actual}
                          onBlur={(e) => Number(e.target.value) !== Number(k.actual) && updateActual(k, Number(e.target.value))} />
                      ) : `${k.actual} ${k.unit ?? ""}`}
                    </td>
                    <td>{k.forecast ?? "—"}</td>
                    <td><Badge variant="outline" className={RAG_CLASS[ragForScore(a, 85, 60)]}>{a}%</Badge></td>
                  </tr>
                );
              })}
              {!kpis.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No strategic KPIs captured yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
