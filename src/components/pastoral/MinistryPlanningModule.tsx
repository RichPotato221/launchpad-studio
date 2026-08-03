import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, money, titleCase } from "@/lib/finance";
import { PLAN_HORIZONS, PLAN_STATUSES } from "@/lib/ministry";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

/** MODULE 5 — Ministry Planning Centre. */
export default function MinistryPlanningModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHorizon, setFilterHorizon] = useState("all");

  const empty = {
    title: "",
    department_slug: "",
    branch: "",
    horizon: "quarterly",
    period_label: "",
    start_date: "",
    end_date: "",
    objectives: "",
    milestones: "",
    dependencies: "",
    budget_amount: "0",
    expected_outcomes: "",
    risk_assessment: "",
    owner_id: "",
  };
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    setLoading(true);
    const [p, d, m] = await Promise.all([
      sb.from("ministry_plans").select("*").order("created_at", { ascending: false }),
      sb.from("departments").select("slug, name").order("name"),
      sb.from("profiles").select("id, full_name").eq("approval_status", "approved").order("full_name"),
    ]);
    setRows(p.data ?? []);
    setDepartments(d.data ?? []);
    setMembers(m.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give the plan a title.");
    const { error } = await sb.from("ministry_plans").insert({
      title: form.title.trim(),
      department_slug: form.department_slug || null,
      branch: form.branch || null,
      horizon: form.horizon,
      period_label: form.period_label || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      objectives: form.objectives || null,
      milestones: form.milestones || null,
      dependencies: form.dependencies || null,
      budget_amount: Number(form.budget_amount || 0),
      expected_outcomes: form.expected_outcomes || null,
      risk_assessment: form.risk_assessment || null,
      owner_id: form.owner_id || currentUserId,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Ministry plan created");
    setForm(empty);
    load();
  };

  const update = async (row: any, patch: any) => {
    const { error } = await sb.from("ministry_plans").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const approve = async (row: any) => {
    await update(row, { status: "approved", approved_by: currentUserId, approved_at: new Date().toISOString() });
    if (row.owner_id) {
      await sb.from("notifications").insert({
        user_id: row.owner_id,
        title: "Ministry plan approved",
        message: row.title,
        link: "/pastoral",
        type: "ministry_plan",
        branch: row.branch ?? null,
      });
    }
    toast.success("Plan approved");
  };

  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading ministry plans…</Card>;

  const filtered = rows.filter((r) => filterHorizon === "all" || r.horizon === filterHorizon);

  const exportCsv = () =>
    exportRows(
      "ministry-plans",
      ["Title", "Department", "Branch", "Horizon", "Period", "Start", "End", "Budget", "Progress", "Status"],
      filtered.map((r) => [
        r.title,
        departments.find((d) => d.slug === r.department_slug)?.name ?? "",
        r.branch ? branchLabel(r.branch) : "",
        r.horizon,
        r.period_label ?? "",
        r.start_date ?? "",
        r.end_date ?? "",
        r.budget_amount,
        `${r.progress_pct}%`,
        r.status,
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {PLAN_HORIZONS.map((h) => (
          <Card key={h} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{titleCase(h)} plans</p>
            <p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.horizon === h).length}</p>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card className="p-5">
          <h3 className="font-serif text-lg">Create a ministry plan</h3>
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Plan title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Horizon</Label>
              <Select value={form.horizon} onValueChange={(v) => setForm({ ...form, horizon: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_HORIZONS.map((h) => <SelectItem key={h} value={h}>{titleCase(h)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner</Label>
              <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                <SelectTrigger><SelectValue placeholder="Defaults to you" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Period label</Label>
              <Input placeholder="Q1 2026" value={form.period_label} onChange={(e) => setForm({ ...form, period_label: e.target.value })} />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div>
              <Label>Budget (R)</Label>
              <Input type="number" step="0.01" value={form.budget_amount} onChange={(e) => setForm({ ...form, budget_amount: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Objectives</Label>
              <Textarea rows={2} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Milestones & dependencies</Label>
              <Textarea rows={2} value={form.milestones} onChange={(e) => setForm({ ...form, milestones: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Expected outcomes</Label>
              <Textarea rows={2} value={form.expected_outcomes} onChange={(e) => setForm({ ...form, expected_outcomes: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Risk assessment</Label>
              <Textarea rows={2} value={form.risk_assessment} onChange={(e) => setForm({ ...form, risk_assessment: e.target.value })} />
            </div>
            <div className="md:col-span-3"><Button type="submit">Create plan</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Plan register</h3>
          <div className="flex gap-2">
            <Select value={filterHorizon} onValueChange={setFilterHorizon}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All horizons</SelectItem>
                {PLAN_HORIZONS.map((h) => <SelectItem key={h} value={h}>{titleCase(h)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No plans captured yet.</p>}
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge variant="outline">{titleCase(r.horizon)}</Badge>
                    <Badge variant="secondary">{titleCase(r.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {departments.find((d) => d.slug === r.department_slug)?.name ?? "Church-wide"}
                    {r.branch ? ` · ${branchLabel(r.branch)}` : ""}
                    {r.period_label ? ` · ${r.period_label}` : ""} · budget {money(r.budget_amount)}
                  </p>
                  {r.objectives && <p className="mt-1 text-sm">Objectives: {r.objectives}</p>}
                  {r.milestones && <p className="text-sm text-muted-foreground">Milestones: {r.milestones}</p>}
                  {r.expected_outcomes && <p className="text-sm text-muted-foreground">Outcomes: {r.expected_outcomes}</p>}
                  {r.risk_assessment && <p className="text-sm text-muted-foreground">Risks: {r.risk_assessment}</p>}
                  <div className="mt-2 max-w-sm">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span><span>{r.progress_pct}%</span>
                    </div>
                    <Progress className="mt-1" value={r.progress_pct} />
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={r.status} onValueChange={(v) => update(r, { status: v })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLAN_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-28"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={r.progress_pct}
                      onBlur={(e) => Number(e.target.value) !== r.progress_pct && update(r, { progress_pct: Number(e.target.value) })}
                    />
                    {r.status !== "approved" && <Button size="sm" variant="outline" onClick={() => approve(r)}>Approve</Button>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
