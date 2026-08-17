import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PO_STATUS_LABEL, fmtDateTime, logPoAudit, statusTone } from "@/lib/processOrders";
import { ProcessOrderDetail } from "./ProcessOrderDetail";
import { Trash2 } from "lucide-react";
import { useCurrentRole } from "@/lib/useCurrentRole";

type Props = { canManage: boolean; branch?: string | null };

/** Only the Secretariat, Chairpersons and Senior Pastors may delete a process order. */
const PO_DELETE_ROLES = ["secretary", "chairperson", "senior_apostle"];

export function ProcessOrdersModule({ canManage }: Props) {
  const roleInfo = useCurrentRole();
  const canDelete = (roleInfo.data?.roles ?? []).some((r) => PO_DELETE_ROLES.includes(r));
  const [rows, setRows] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ event_id: "", template_id: "", theme: "", venue: "", preacher: "", worship_leader: "", expected_attendance: "" });

  const load = async () => {
    const [{ data: pos }, { data: evs }, { data: tpls }] = await Promise.all([
      supabase.from("process_orders").select("*").order("starts_at", { ascending: false }),
      supabase.from("events").select("id, title, event_date, start_time, end_time, location, branch, event_type").order("event_date", { ascending: false }).limit(200),
      supabase.from("process_order_templates").select("*").order("name"),
    ]);
    setRows(pos ?? []);
    setEvents(evs ?? []);
    setTemplates(tpls ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.status === s).length;
    return {
      total: rows.length,
      running: by("RUNNING"),
      ready: by("READY"),
      prep: by("IN_PREPARATION"),
      overdue: by("OVERDUE"),
      closed: by("CLOSED"),
      avgReadiness: rows.length
        ? Math.round(rows.reduce((s, r) => s + Number(r.readiness_pct ?? 0), 0) / rows.length)
        : 0,
    };
  }, [rows]);

  const visible = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!search ||
        `${r.po_number ?? ""} ${r.title ?? ""} ${r.venue ?? ""}`.toLowerCase().includes(search.toLowerCase())),
  );

  const nextPoNumber = (poType: string, year: number) => {
    const prefix = `TROG-PO-${year}-${poType}-`;
    const seq =
      rows.filter((r) => (r.po_number ?? "").startsWith(prefix)).length + 1;
    return `${prefix}${String(seq).padStart(4, "0")}`;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = events.find((x) => x.id === form.event_id);
    if (!ev) return toast.error("Select an event.");
    setCreating(true);
    const { data: u } = await supabase.auth.getUser();
    const startsAt = new Date(`${ev.event_date}T${ev.start_time ?? "09:00"}`).toISOString();
    const endsAt = ev.end_time ? new Date(`${ev.event_date}T${ev.end_time}`).toISOString() : null;
    const template = templates.find((t) => t.id === form.template_id);
    const poType = template?.po_type ?? (ev.event_type === "service" ? "SUN" : "SPEC");
    const year = new Date(ev.event_date).getFullYear();

    const { data: po, error } = await supabase
      .from("process_orders")
      .insert({
        event_id: ev.id,
        po_number: nextPoNumber(poType, year),
        title: ev.title,
        po_type: poType,
        status: "DRAFT",
        branch: ev.branch ?? null,
        venue: form.venue || ev.location || null,
        theme: form.theme || null,
        preacher: form.preacher || null,
        worship_leader: form.worship_leader || null,
        expected_attendance: form.expected_attendance ? Number(form.expected_attendance) : null,
        starts_at: startsAt,
        ends_at: endsAt,
        created_by: u.user?.id,
        owner_id: u.user?.id,
      })
      .select()
      .maybeSingle();
    if (error || !po) {
      setCreating(false);
      return toast.error(error?.message ?? "Could not create the process order.");
    }

    if (template) {
      const { data: acts } = await supabase
        .from("process_order_template_activities")
        .select("*")
        .eq("template_id", template.id)
        .order("sort_order");
      if (acts?.length) {
        await supabase.from("process_order_activities").insert(
          acts.map((a) => ({
            process_order_id: po.id,
            name: a.name,
            department_slug: a.department_slug,
            criticality: a.criticality,
            sort_order: a.sort_order,
            due_at: new Date(new Date(startsAt).getTime() + Number(a.offset_hours ?? 0) * 3600_000).toISOString(),
          })),
        );
      }
    }

    await logPoAudit({
      processOrderId: po.id,
      action: `Process order ${po.po_number} created${template ? ` from template ${template.name}` : ""}`,
      entity: "process_order",
      newStatus: "DRAFT",
    });
    setCreating(false);
    setForm({ event_id: "", template_id: "", theme: "", venue: "", preacher: "", worship_leader: "", expected_attendance: "" });
    toast.success(`${po.po_number} created`);
    await load();
    setSelected(po.id);
  };

  if (selected) {
    return (
      <ProcessOrderDetail
        poId={selected}
        canManage={canManage}
        onBack={() => {
          setSelected(null);
          load();
        }}
        onChanged={load}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Process orders" value={stats.total} />
        <Stat label="In preparation" value={stats.prep} />
        <Stat label="Ready" value={stats.ready} />
        <Stat label="Running" value={stats.running} />
        <Stat label="Overdue" value={stats.overdue} tone={stats.overdue ? "danger" : undefined} />
        <Stat label="Avg readiness" value={`${stats.avgReadiness}%`} />
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Create a process order</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every service or special event runs as a manufacturing-style process order — a bill of ministry
            activities per department, a readiness gate, exceptions, and a formal closure.
          </p>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Event</Label>
              <Select value={form.event_id} onValueChange={(v) => setForm({ ...form, event_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a scheduled event" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.event_date} · {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template</Label>
              <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                <SelectTrigger><SelectValue placeholder="Standard template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Theme</Label><Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div><Label>Expected attendance</Label><Input type="number" value={form.expected_attendance} onChange={(e) => setForm({ ...form, expected_attendance: e.target.value })} /></div>
            <div><Label>Preacher</Label><Input value={form.preacher} onChange={(e) => setForm({ ...form, preacher: e.target.value })} /></div>
            <div><Label>Worship leader</Label><Input value={form.worship_leader} onChange={(e) => setForm({ ...form, worship_leader: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create process order"}</Button></div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search PO number, title, venue" className="max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(PO_STATUS_LABEL).map((s) => <SelectItem key={s} value={s}>{PO_STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {visible.map((r) => (
          <Card key={r.id} className="cursor-pointer p-4 transition hover:bg-muted/40" onClick={() => setSelected(r.id)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{r.po_number}</p>
                <p className="font-serif text-lg">{r.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fmtDateTime(r.starts_at)} → {fmtDateTime(r.ends_at)} · {r.venue ?? "Venue TBC"}
                </p>
              </div>
              <div className="w-44">
                <Badge className={statusTone(r.status)}>{PO_STATUS_LABEL[r.status] ?? r.status}</Badge>
                <Progress value={Number(r.readiness_pct ?? 0)} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">{Number(r.readiness_pct ?? 0)}% ready</p>
              </div>
            </div>
          </Card>
        ))}
        {!visible.length && <Card className="p-8 text-center text-sm text-muted-foreground">No process orders yet.</Card>}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "danger" }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-2xl ${tone === "danger" ? "text-red-700" : ""}`}>{value}</p>
    </Card>
  );
}
