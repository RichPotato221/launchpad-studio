import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ACTIVITY_STATUSES,
  CLOSURE_CHECKS,
  CRITICALITIES,
  PO_DEPARTMENTS,
  PO_STATUS_FLOW,
  PO_STATUS_LABEL,
  SEVERITIES,
  computeReadiness,
  deptCode,
  deptLabel,
  departmentStatus,
  evaluateAutoStatus,
  fmtDateTime,
  isBlockedByDependency,
  logPoAudit,
  statusTone,
  type Activity,
} from "@/lib/processOrders";

type Props = { poId: string; canManage: boolean; onBack: () => void; onChanged?: () => void };

export function ProcessOrderDetail({ poId, canManage, onBack, onChanged }: Props) {
  const [po, setPo] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [checks, setChecks] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: poRow }, { data: acts }, { data: exs }, { data: dcs }, { data: aud }, { data: chk }] =
      await Promise.all([
        supabase.from("process_orders").select("*").eq("id", poId).maybeSingle(),
        supabase.from("process_order_activities").select("*").eq("process_order_id", poId).order("sort_order"),
        supabase.from("process_order_exceptions").select("*").eq("process_order_id", poId).order("created_at", { ascending: false }),
        supabase.from("process_order_documents").select("*").eq("process_order_id", poId).order("created_at", { ascending: false }),
        supabase.from("process_order_audit").select("*").eq("process_order_id", poId).order("created_at", { ascending: false }).limit(200),
        supabase.from("process_order_closure_checks").select("*").eq("process_order_id", poId).order("sort_order"),
      ]);
    setPo(poRow);
    setActivities((acts ?? []) as Activity[]);
    setExceptions(exs ?? []);
    setDocs(dcs ?? []);
    setAudit(aud ?? []);
    setChecks(chk ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const poll = setInterval(load, 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId]);

  const readiness = useMemo(() => computeReadiness(activities), [activities]);
  const openExceptions = exceptions.filter((e) => e.status !== "CLOSED" && e.status !== "RESOLVED");

  // Auto status engine (event-day automation + overdue detection).
  useEffect(() => {
    if (!po) return;
    const mandatoryDone = activities
      .filter((a) => a.criticality !== "STANDARD" && a.status !== "CANCELLED")
      .every((a) => a.status === "COMPLETED" || a.status === "WAIVED");
    const next = evaluateAutoStatus(po, readiness.criticalOutstanding, mandatoryDone);
    if (!next || next === po.status) return;
    (async () => {
      await supabase
        .from("process_orders")
        .update({ status: next, readiness_pct: readiness.pct, running_at: next === "RUNNING" ? new Date().toISOString() : po.running_at })
        .eq("id", po.id);
      await logPoAudit({
        processOrderId: po.id,
        action: "Automatic status transition",
        entity: "process_order",
        previousStatus: po.status,
        newStatus: next,
        reason: "Event clock automation",
        actorName: "System",
      });
      load();
      onChanged?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [po?.status, po?.starts_at, po?.ends_at, now, readiness.criticalOutstanding]);

  // Auto-flag overdue activities.
  useEffect(() => {
    const stale = activities.filter(
      (a) => a.due_at && new Date(a.due_at).getTime() < now && !["COMPLETED", "WAIVED", "CANCELLED", "OVERDUE"].includes(a.status),
    );
    if (!stale.length) return;
    (async () => {
      await supabase.from("process_order_activities").update({ status: "OVERDUE" }).in("id", stale.map((a) => a.id));
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, activities.length]);

  const setStatus = async (next: string, reason?: string) => {
    if (!po) return;
    if (next === "READY" && readiness.criticalOutstanding > 0) {
      return toast.error("Cannot mark READY — critical ministry activities are still outstanding.");
    }
    const patch: Record<string, any> = { status: next, readiness_pct: readiness.pct };
    const stamp = new Date().toISOString();
    const { data: u } = await getAuthUserResult();
    if (next === "APPROVED") Object.assign(patch, { approved_at: stamp, approved_by: u.user?.id });
    if (next === "RELEASED") Object.assign(patch, { released_at: stamp, released_by: u.user?.id });
    if (next === "RUNNING") patch.running_at = stamp;
    if (next === "CLOSED") Object.assign(patch, { closed_at: stamp, closed_by: u.user?.id });
    const { error } = await supabase.from("process_orders").update(patch as never).eq("id", po.id);
    if (error) return toast.error(error.message);
    await logPoAudit({
      processOrderId: po.id,
      action: `Process order moved to ${PO_STATUS_LABEL[next] ?? next}`,
      entity: "process_order",
      previousStatus: po.status,
      newStatus: next,
      reason: reason ?? null,
    });
    toast.success(`Process order ${PO_STATUS_LABEL[next] ?? next}`);
    load();
    onChanged?.();
  };

  const updateActivity = async (a: Activity, patch: Record<string, any>, note?: string) => {
    const done = patch.status === "COMPLETED";
    const { data: u } = await getAuthUserResult();
    const { error } = await supabase
      .from("process_order_activities")
      .update({
        ...patch,
        ...(patch.status
          ? {
              completion_pct: done ? 100 : patch.status === "IN_PROGRESS" ? 50 : 0,
              completed_by: done ? u.user?.id : null,
              completed_at: done ? new Date().toISOString() : null,
            }
          : {}),
      })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    if (patch.status) {
      await logPoAudit({
        processOrderId: poId,
        action: `Activity "${a.name}" updated`,
        entity: "activity",
        entityId: a.id,
        previousStatus: a.status,
        newStatus: patch.status,
        reason: note ?? null,
      });
    }
    load();
    onChanged?.();
  };

  if (loading) return <Card className="p-8 text-sm text-muted-foreground">Loading process order…</Card>;
  if (!po) return <Card className="p-8 text-sm text-muted-foreground">Process order not found.</Card>;

  const readyWarning = readiness.criticalOutstanding > 0;
  const grouped = PO_DEPARTMENTS.map((d) => ({
    ...d,
    rows: activities.filter((a) => a.department_slug === d.slug),
  })).filter((d) => d.rows.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={onBack} className="text-xs uppercase tracking-widest text-muted-foreground hover:underline">
            ← All process orders
          </button>
          <h2 className="mt-1 font-serif text-2xl">{po.po_number}</h2>
          <p className="text-sm text-muted-foreground">{po.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusTone(po.status)}>{PO_STATUS_LABEL[po.status] ?? po.status}</Badge>
          {po.status === "RUNNING" && readyWarning && <Badge className="bg-red-100 text-red-800">Running — not fully ready</Badge>}
          {po.status === "OVERDUE" && <Badge className="bg-red-100 text-red-800">🔴 Overdue process order</Badge>}
        </div>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Readiness" value={`${readiness.pct}%`} />
          <Metric label="Activities" value={`${readiness.complete} / ${readiness.total}`} />
          <Metric label="Critical outstanding" value={String(readiness.criticalOutstanding)} tone={readyWarning ? "danger" : undefined} />
          <Metric label="Open exceptions" value={String(openExceptions.length)} tone={openExceptions.length ? "danger" : undefined} />
        </div>
        <Progress value={readiness.pct} className="mt-4" />
        {readyWarning && (
          <p className="mt-3 text-sm font-medium text-red-700">⚠️ NOT READY — critical ministry activities are incomplete.</p>
        )}
        {canManage && (
          <div className="mt-4 flex flex-wrap gap-2">
            {PO_STATUS_FLOW.map((s) => (
              <Button key={s} size="sm" variant={po.status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
                {PO_STATUS_LABEL[s]}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setStatus("ON_HOLD")}>On hold</Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus("CANCELLED")}>Cancel</Button>
          </div>
        )}
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          {["overview", "activities", "departments", "timeline", "exceptions", "documents", "audit", "closure"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">{t === "audit" ? "Audit trail" : t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-5">
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <Field label="Event type" value={po.po_type === "SUN" ? "Sunday service" : "Special event"} />
              <Field label="Theme" value={po.theme} />
              <Field label="Venue" value={po.venue} />
              <Field label="Start" value={fmtDateTime(po.starts_at)} />
              <Field label="End" value={fmtDateTime(po.ends_at)} />
              <Field label="Expected attendance" value={po.expected_attendance} />
              <Field label="Preacher / speaker" value={po.preacher} />
              <Field label="Worship leader" value={po.worship_leader} />
              <Field label="Priority" value={po.priority} />
              <Field label="Created" value={fmtDateTime(po.created_at)} />
              <Field label="Approved" value={fmtDateTime(po.approved_at)} />
              <Field label="Released" value={fmtDateTime(po.released_at)} />
              <Field label="Running from" value={fmtDateTime(po.running_at)} />
              <Field label="Closed" value={fmtDateTime(po.closed_at)} />
              <Field label="Branch" value={po.branch === "etwatwa" ? "Etwatwa" : po.branch} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <ActivitiesTab
            activities={activities}
            canManage={canManage}
            poId={poId}
            onUpdate={updateActivity}
            onReload={load}
          />
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {grouped.map((d) => {
              const r = computeReadiness(d.rows);
              const st = departmentStatus(d.rows);
              return (
                <Card key={d.slug} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{d.label}</p>
                    <Badge className={statusTone(st)}>{st.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {po.po_number?.replace("TROG-PO-", "PO-")}-{deptCode(d.slug)}
                  </p>
                  <Progress value={r.pct} className="mt-3" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.complete} of {r.total} activities · {r.criticalOutstanding} critical outstanding
                  </p>
                </Card>
              );
            })}
            {!grouped.length && <Card className="p-6 text-sm text-muted-foreground">No departmental workstreams yet.</Card>}
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="p-5">
            <div className="space-y-2">
              {[...activities]
                .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""))
                .map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-2 text-sm last:border-0">
                    <span className="w-40 shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.due_at)}</span>
                    <span className="flex-1">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{deptLabel(a.department_slug)}</span>
                    <Badge className={statusTone(a.status)}>{a.status.replace("_", " ")}</Badge>
                  </div>
                ))}
              {!activities.length && <p className="text-sm text-muted-foreground">No activities scheduled.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions">
          <ExceptionsTab poId={poId} rows={exceptions} onReload={load} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab poId={poId} rows={docs} onReload={load} />
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-5">
            <div className="space-y-3">
              {audit.map((a) => (
                <div key={a.id} className="border-b border-border pb-2 text-sm last:border-0">
                  <p>{a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.actor_name ?? "Member"} · {fmtDateTime(a.created_at)}
                    {a.previous_status && ` · ${a.previous_status} → ${a.new_status}`}
                    {a.reason && ` · ${a.reason}`}
                  </p>
                </div>
              ))}
              {!audit.length && <p className="text-sm text-muted-foreground">No audit records yet.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="closure">
          <ClosureTab
            poId={poId}
            po={po}
            checks={checks}
            canManage={canManage}
            readiness={readiness}
            openExceptions={openExceptions.length}
            onReload={load}
            onClose={() => setStatus("CLOSED", "Formal closure workflow completed")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-2xl ${tone === "danger" ? "text-red-700" : ""}`}>{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1">{value === null || value === undefined || value === "" ? "—" : String(value)}</p>
    </div>
  );
}

function ActivitiesTab({
  activities,
  canManage,
  poId,
  onUpdate,
  onReload,
}: {
  activities: Activity[];
  canManage: boolean;
  poId: string;
  onUpdate: (a: Activity, patch: Record<string, any>) => void;
  onReload: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ name: "", department_slug: "", criticality: "STANDARD", due_at: "" });

  const rows = activities.filter((a) => filter === "all" || a.department_slug === filter);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("process_order_activities").insert({
      process_order_id: poId,
      name: form.name,
      department_slug: form.department_slug || null,
      criticality: form.criticality,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      sort_order: activities.length + 1,
    });
    if (error) return toast.error(error.message);
    await logPoAudit({ processOrderId: poId, action: `Activity "${form.name}" added`, entity: "activity" });
    setForm({ name: "", department_slug: "", criticality: "STANDARD", due_at: "" });
    onReload();
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Bill of ministry activities</p>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {PO_DEPARTMENTS.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {canManage && (
        <form onSubmit={add} className="mt-4 grid gap-3 md:grid-cols-5">
          <Input required placeholder="Activity name" className="md:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>{PO_DEPARTMENTS.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.criticality} onValueChange={(v) => setForm({ ...form, criticality: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CRITICALITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
            <Button type="submit" size="sm">Add</Button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {rows.map((a) => {
          const blocked = isBlockedByDependency(a, activities);
          return (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {deptLabel(a.department_slug)} · {a.criticality} · due {fmtDateTime(a.due_at)}
                </p>
                {blocked && <p className="mt-1 text-xs font-medium text-red-700">BLOCKED BY DEPENDENCY</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusTone(a.status)}>{a.status.replace("_", " ")}</Badge>
                <Select value={a.status} onValueChange={(v) => onUpdate(a, { status: v })}>
                  <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIVITY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
        {!rows.length && <p className="text-sm text-muted-foreground">No activities for this filter.</p>}
      </div>
    </Card>
  );
}

function ExceptionsTab({ poId, rows, onReload }: { poId: string; rows: any[]; onReload: () => void }) {
  const [form, setForm] = useState({ description: "", severity: "MEDIUM", department_slug: "", impact: "", immediate_action: "", escalated_to: "" });

  const raise = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: u } = await getAuthUserResult();
    const { error } = await supabase.from("process_order_exceptions").insert({
      process_order_id: poId,
      description: form.description,
      severity: form.severity,
      department_slug: form.department_slug || null,
      impact: form.impact || null,
      immediate_action: form.immediate_action || null,
      escalated_to:
        form.escalated_to ||
        (form.severity === "CRITICAL" ? "associate_pastor" : form.severity === "HIGH" ? "po_coordinator" : "department_lead"),
      raised_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    await logPoAudit({ processOrderId: poId, action: `Exception raised (${form.severity})`, entity: "exception", reason: form.description });
    setForm({ description: "", severity: "MEDIUM", department_slug: "", impact: "", immediate_action: "", escalated_to: "" });
    toast.success("Exception raised and escalated");
    onReload();
  };

  const setStatus = async (row: any, status: string) => {
    const { data: u } = await getAuthUserResult();
    const { error } = await supabase
      .from("process_order_exceptions")
      .update({
        status,
        resolved_by: status === "RESOLVED" || status === "CLOSED" ? u.user?.id : null,
        resolved_at: status === "RESOLVED" || status === "CLOSED" ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    await logPoAudit({ processOrderId: poId, action: "Exception status changed", entity: "exception", entityId: row.id, previousStatus: row.status, newStatus: status });
    onReload();
  };

  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Exceptions & escalation</p>
      <form onSubmit={raise} className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2"><Label>Description</Label><Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div>
          <Label>Severity</Label>
          <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Department</Label>
          <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{PO_DEPARTMENTS.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Impact</Label><Input value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} /></div>
        <div><Label>Immediate action</Label><Input value={form.immediate_action} onChange={(e) => setForm({ ...form, immediate_action: e.target.value })} /></div>
        <div className="md:col-span-3"><Button type="submit" size="sm">Raise exception</Button></div>
      </form>

      <div className="mt-5 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.description}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {r.severity} · {deptLabel(r.department_slug)} · escalated to {r.escalated_to ?? "—"} · {fmtDateTime(r.created_at)}
              </p>
            </div>
            <Select value={r.status} onValueChange={(v) => setStatus(r, v)}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground">No exceptions raised.</p>}
      </div>
    </Card>
  );
}

function DocumentsTab({ poId, rows, onReload }: { poId: string; rows: any[]; onReload: () => void }) {
  const [form, setForm] = useState({ title: "", doc_type: "", file_url: "" });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: u } = await getAuthUserResult();
    const { error } = await supabase.from("process_order_documents").insert({
      process_order_id: poId,
      title: form.title,
      doc_type: form.doc_type || null,
      file_url: form.file_url,
      uploaded_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    await logPoAudit({ processOrderId: poId, action: `Document "${form.title}" attached`, entity: "document" });
    setForm({ title: "", doc_type: "", file_url: "" });
    onReload();
  };

  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Process order documents</p>
      <form onSubmit={add} className="mt-4 grid gap-3 md:grid-cols-4">
        <Input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Type (programme, budget…)" value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} />
        <Input required placeholder="Link" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
        <Button type="submit" size="sm">Attach</Button>
      </form>
      <div className="mt-4 space-y-2">
        {rows.map((d) => (
          <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer" className="block rounded border border-border px-3 py-2 text-sm hover:bg-muted">
            {d.title} <span className="text-xs text-muted-foreground">· {d.doc_type ?? "document"} · {fmtDateTime(d.created_at)}</span>
          </a>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground">No documents attached.</p>}
      </div>
    </Card>
  );
}

function ClosureTab({
  poId,
  po,
  checks,
  canManage,
  readiness,
  openExceptions,
  onReload,
  onClose,
}: {
  poId: string;
  po: any;
  checks: any[];
  canManage: boolean;
  readiness: { pct: number; criticalOutstanding: number };
  openExceptions: number;
  onReload: () => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(po.closure_notes ?? "");

  const seed = async () => {
    const { error } = await supabase.from("process_order_closure_checks").insert(
      CLOSURE_CHECKS.map((c, i) => ({ process_order_id: poId, category: c.category, label: c.label, sort_order: i })),
    );
    if (error) return toast.error(error.message);
    onReload();
  };

  const toggle = async (row: any) => {
    const { data: u } = await getAuthUserResult();
    const { error } = await supabase
      .from("process_order_closure_checks")
      .update({ is_done: !row.is_done, checked_by: u.user?.id, checked_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    onReload();
  };

  const allDone = checks.length > 0 && checks.every((c) => c.is_done);
  const categories = Array.from(new Set(checks.map((c) => c.category)));

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Closure workflow</p>
        {!checks.length && canManage && <Button size="sm" variant="outline" onClick={seed}>Generate closure checklist</Button>}
      </div>

      {po.status === "OVERDUE" && (
        <div className="mt-4 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">🔴 OVERDUE PROCESS ORDER</p>
          <p className="mt-1">
            {po.po_number} · ended {fmtDateTime(po.ends_at)} · readiness {readiness.pct}% ·{" "}
            {readiness.criticalOutstanding} critical activities outstanding · {openExceptions} open exceptions.
            Corrective action and authorised closure are required.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{cat}</p>
            <div className="mt-2 space-y-1">
              {checks.filter((c) => c.category === cat).map((c) => (
                <label key={c.id} className="flex items-center gap-3 rounded border border-border px-3 py-2 text-sm">
                  <input type="checkbox" checked={c.is_done} onChange={() => toggle(c)} disabled={!canManage} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {!checks.length && <p className="text-sm text-muted-foreground">No closure checklist generated yet.</p>}
      </div>

      {canManage && (
        <div className="mt-5 space-y-3">
          <div>
            <Label>Lessons learned / closure notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            disabled={!allDone || po.status === "CLOSED"}
            onClick={async () => {
              await supabase.from("process_orders").update({ closure_notes: notes }).eq("id", poId);
              onClose();
            }}
          >
            {po.status === "CLOSED" ? "Process order closed" : "Close process order"}
          </Button>
          {!allDone && <p className="text-xs text-muted-foreground">Complete every closure check before closing.</p>}
        </div>
      )}
    </Card>
  );
}
