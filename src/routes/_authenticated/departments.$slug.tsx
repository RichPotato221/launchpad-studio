import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { getWorkspaceFor } from "@/lib/workspaceRegistry";
import { useIsDepartmentMember } from "@/lib/useIsDepartmentMember";
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { DEPARTMENT_HERO, DEPARTMENT_GALLERY } from "@/lib/portalImages";


export const Route = createFileRoute("/_authenticated/departments/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — TRoGKC Portal` }] }),
  component: DepartmentPortal,
});

function DepartmentPortal() {
  const { slug } = Route.useParams();
  const dept = useQuery({ queryKey: ["department", slug], queryFn: () => fetchDepartment(slug) });
  const kpis = useQuery({ queryKey: ["kpis", slug], queryFn: () => fetchDepartmentKpis(slug) });
  const membership = useIsDepartmentMember(slug);

  if (dept.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!dept.data) throw notFound();
  const d = dept.data;
  const hero = DEPARTMENT_HERO[slug];
  const gallery = DEPARTMENT_GALLERY[slug] ?? [];
  const workspace = membership.data?.isMember ? getWorkspaceFor(slug) : null;
  const WorkspaceComponent = workspace?.component;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <Link to="/departments" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← All departments</Link>
      {hero && (
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted">
          <img src={hero.src} alt={hero.alt} className="mx-auto h-96 w-full object-cover object-top md:h-[32rem]" />
        </div>
      )}

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
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="kpis">KPI Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          {workspace && <TabsTrigger value="workspace" className="font-semibold">{workspace.label}</TabsTrigger>}
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
          {gallery.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {gallery.map((g) => (
                <div key={g.src} className="flex h-72 w-full items-center justify-center rounded-lg border border-border bg-muted">
                  <img src={g.src} alt={g.alt} className="h-full w-full object-cover object-top" />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card className="p-6 text-sm text-muted-foreground">
            Team rosters are managed from the Admin area. Users are attached to this department by role.
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="mt-6">
          <KpiDashboard slug={slug} kpis={kpis.data ?? []} onChange={() => kpis.refetch()} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <DepartmentReports slug={slug} deptName={d.name} />
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
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Log a new KPI entry</p>
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
          {kpis.map((k) => (
            <KpiCard key={k.id} kpi={k} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ kpi, onChange }: { kpi: any; onChange: () => void }) {
  const [actual, setActual] = useState(kpi.actual != null ? String(kpi.actual) : "");
  const [date, setDate] = useState(kpi.period_date ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("kpis")
      .update({
        actual: actual === "" ? null : Number(actual),
        period_date: date,
      })
      .eq("id", kpi.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("KPI updated");
    onChange();
  };

  const pct = kpi.target && kpi.actual != null ? Math.min(100, Math.round((kpi.actual / kpi.target) * 100)) : 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">{kpi.category.replace("_", " ").toUpperCase()} · {kpi.period_type.toUpperCase()}</p>
          <p className="mt-1 font-serif text-lg">{kpi.kpi_name}</p>
        </div>
        <span className={`h-3 w-3 rounded-full ${statusColor(kpi.actual, kpi.target)}`} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="flex-1">
          <Label className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Actual / Target</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              step="any"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="—"
              className="h-9 w-24 text-right"
            />
            <span className="text-sm text-muted-foreground">/ {kpi.target ?? "—"}</span>
          </div>
        </div>
        <div className="text-right">
          <Label className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Period</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-9 w-36 text-right text-xs"
          />
        </div>
      </div>
      <Progress value={pct} className="mt-4" />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{pct}% of target</span>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save live value"}</Button>
      </div>
    </Card>
  );
}

function DepartmentReports({ slug, deptName }: { slug: string; deptName: string }) {
  const entries = useQuery({
    queryKey: ["report-entries", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_entries")
        .select("*")
        .eq("department_slug", slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in");

      let file_url: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const path = `${slug}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabase.storage.from("department-reports").upload(path, file);
        if (up.error) throw up.error;
        const signed = await supabase.storage
          .from("department-reports")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed.error) throw signed.error;
        file_url = signed.data.signedUrl;
        file_name = file.name;
      }

      const { error } = await supabase.from("report_entries").insert({
        department_slug: slug,
        title: title.trim(),
        body: body.trim() || null,
        file_url,
        file_name,
        created_by: userRes.user.id,
      });
      if (error) throw error;
      toast.success("Saved to department storage");
      setTitle(""); setBody(""); setFile(null);
      entries.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{deptName} · Document storage</p>
        <h3 className="mt-1 font-serif text-2xl">Add a document or comment</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Saved to this department's storage. Admin, Chairperson, and Senior Pastor can review all submissions.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. October finance report" />
          </div>
          <div className="md:col-span-2">
            <Label>Comment / notes (optional)</Label>
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Attach a document (optional)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="mt-1 text-xs text-muted-foreground">PDF, Word, Excel, images — any file.</p>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save to storage"}</Button>
          </div>
        </form>
      </Card>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Stored items</p>
        <div className="mt-3 space-y-3">
          {(entries.data ?? []).map((e: any) => (
            <Card key={e.id} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-serif text-lg">{e.title}</p>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              {e.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{e.body}</p>}
              {e.file_url && (
                <a href={e.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm underline">
                  📎 {e.file_name ?? "Attached document"}
                </a>
              )}
            </Card>
          ))}
          {(entries.data ?? []).length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nothing saved yet.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
