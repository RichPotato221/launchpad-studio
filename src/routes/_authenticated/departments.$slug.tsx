import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchDepartment,
  fetchDepartmentKpis,
  KPI_CATEGORIES,
  MANUALS,
  type KpiCategory,
} from "@/lib/portal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/departments/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — TRoGKC Portal` }] }),
  component: DepartmentPortal,
});

function DepartmentPortal() {
  const { slug } = Route.useParams();
  const dept = useQuery({ queryKey: ["department", slug], queryFn: () => fetchDepartment(slug) });
  const kpis = useQuery({ queryKey: ["kpis", slug], queryFn: () => fetchDepartmentKpis(slug) });

  if (dept.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!dept.data) throw notFound();
  const d = dept.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <Link to="/departments" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← All departments</Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{d.kind.replace("_", " ")} · {d.scripture}</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">{d.name}</h1>
        </div>
        {d.chair_name && <p className="text-sm text-muted-foreground">Chair: <strong className="text-foreground">{d.chair_name}</strong></p>}
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kpis">KPI Dashboard</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Vision</p>
            <p className="mt-2 text-sm leading-relaxed">{d.vision ?? "Not yet set."}</p>
          </Card>
          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Mission</p>
            <p className="mt-2 text-sm leading-relaxed">{d.mission ?? "Not yet set."}</p>
          </Card>
          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Purpose</p>
            <p className="mt-2 text-sm leading-relaxed">{d.purpose ?? "Not yet set."}</p>
          </Card>
          {d.functions && d.functions.length > 0 && (
            <Card className="p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Functions</p>
              <ul className="mt-3 space-y-2">
                {d.functions.map((f, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="kpis" className="mt-6">
          <KpiDashboard slug={slug} kpis={kpis.data ?? []} onChange={() => kpis.refetch()} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card className="p-6 text-sm text-muted-foreground">
            Team rosters are managed from the Admin area. Users are attached to this department by role.
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card className="p-6 text-sm text-muted-foreground">
            Monthly narrative reports will appear here. For roll-up KPI reporting, see the <Link to="/reports" className="underline">Reports</Link> page (admin only).
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Manuals &amp; SOPs</p>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {MANUALS.map((m) => (
                <li key={m.key}>
                  <a href={m.href} className="block rounded border border-border p-4 transition hover:border-foreground">
                    <p className="font-serif text-lg">{m.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Download .docx</p>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function statusColor(actual: number | null, target: number | null) {
  if (actual == null || target == null || target === 0) return "bg-muted-foreground";
  const pct = (actual / target) * 100;
  if (pct >= 90) return "bg-emerald-600";
  if (pct >= 60) return "bg-amber-500";
  return "bg-rose-600";
}

function KpiDashboard({ slug, kpis, onChange }: { slug: string; kpis: any[]; onChange: () => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    kpi_name: "",
    category: "spiritual_impact" as KpiCategory,
    baseline: "",
    target: "",
    actual: "",
    period_type: "monthly" as "weekly" | "monthly" | "quarterly" | "annual",
    period_date: new Date().toISOString().slice(0, 10),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("kpis").insert({
      department_slug: slug,
      kpi_name: form.kpi_name,
      category: form.category,
      baseline: form.baseline ? Number(form.baseline) : null,
      target: form.target ? Number(form.target) : null,
      actual: form.actual ? Number(form.actual) : null,
      period_type: form.period_type,
      period_date: form.period_date,
      entered_by: user.user?.id,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success("KPI added");
    setForm({ ...form, kpi_name: "", baseline: "", target: "", actual: "" });
    onChange();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Log a KPI entry</p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label>KPI name</Label>
            <Input required value={form.kpi_name} onChange={(e) => setForm({ ...form, kpi_name: e.target.value })} placeholder="e.g. Salvations this month" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as KpiCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KPI_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Period type</Label>
            <Select value={form.period_type} onValueChange={(v) => setForm({ ...form, period_type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Baseline</Label><Input type="number" step="any" value={form.baseline} onChange={(e) => setForm({ ...form, baseline: e.target.value })} /></div>
          <div><Label>Target</Label><Input type="number" step="any" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
          <div><Label>Actual</Label><Input type="number" step="any" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} /></div>
          <div><Label>Period date</Label><Input type="date" value={form.period_date} onChange={(e) => setForm({ ...form, period_date: e.target.value })} /></div>
          <div className="lg:col-span-4">
            <Button type="submit" disabled={adding}>{adding ? "Saving…" : "Add KPI"}</Button>
          </div>
        </form>
      </Card>

      {kpis.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No KPIs logged yet.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {kpis.map((k) => {
            const pct = k.target && k.actual != null ? Math.min(100, Math.round((k.actual / k.target) * 100)) : 0;
            return (
              <Card key={k.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{k.category.replace("_", " ")} · {k.period_type}</p>
                    <p className="mt-1 font-serif text-lg">{k.kpi_name}</p>
                  </div>
                  <span className={`h-3 w-3 rounded-full ${statusColor(k.actual, k.target)}`} />
                </div>
                <div className="mt-4 flex items-baseline justify-between text-sm">
                  <span><strong className="text-xl">{k.actual ?? "—"}</strong> <span className="text-muted-foreground">/ {k.target ?? "—"}</span></span>
                  <span className="text-xs text-muted-foreground">{k.period_date}</span>
                </div>
                <Progress value={pct} className="mt-3" />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
