import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/identity";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import { USH_PROTOCOL_AREAS, USH_PROTOCOL_STATUSES, ushLabel } from "@/lib/ushering";

const sb = supabase as any;

export default function UshProtocolModule({
  canManage,
  currentUserId,
  initialArea = "all",
}: {
  canManage: boolean;
  currentUserId: string;
  initialArea?: string;
}) {
  const identity = useIdentity();
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [areaFilter, setAreaFilter] = useState(initialArea);
  const empty = { area: initialArea === "all" ? "leadership_protocol" : initialArea, title: "", description: "", assigned_person: "", service_id: "", service_date: "", status: "planned", notes: "" };
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [{ data: plans }, { data: serviceRows }] = await Promise.all([
      sb.from("ush_protocol_plans").select("*").order("service_date", { ascending: true }),
      sb.from("ush_services").select("id,title,service_date").order("service_date", { ascending: false }),
    ]);
    setRows(plans ?? []);
    setServices(serviceRows ?? []);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(
    () => areaFilter === "all" ? rows : rows.filter((row) => row.area === areaFilter),
    [areaFilter, rows],
  );

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const { error } = await sb.from("ush_protocol_plans").insert({
      ...form,
      service_id: form.service_id || null,
      service_date: form.service_date || null,
      description: form.description.trim() || null,
      assigned_person: form.assigned_person.trim() || null,
      notes: form.notes.trim() || null,
      branch: identity.data?.branch ?? null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Protocol plan added");
    setForm(empty);
    load();
  };

  const patch = async (id: string, status: string) => {
    const { error } = await sb.from("ush_protocol_plans").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Protocol</p>
        <h3 className="mt-1 font-serif text-2xl">Leadership, guests, services and special events</h3>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Coordinate arrival, reception, briefing, seating, movement, service positioning, departure, special requirements and orderly execution.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {USH_PROTOCOL_AREAS.map((area) => (
          <Card key={area} className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{ushLabel(area)}</p>
            <p className="mt-2 font-serif text-2xl">{rows.filter((row) => row.area === area && row.status !== "completed").length}</p>
            <p className="text-xs text-muted-foreground">open assignments</p>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Create a protocol assignment</p>
          <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-3">
            <div><Label>Area</Label><Select value={form.area} onValueChange={(area) => setForm({ ...form, area })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{USH_PROTOCOL_AREAS.map((area) => <SelectItem key={area} value={area}>{ushLabel(area)}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-2"><Label>Assignment / requirement</Label><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Guest minister arrival and briefing" /></div>
            <div><Label>Assigned person</Label><Input value={form.assigned_person} onChange={(event) => setForm({ ...form, assigned_person: event.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={form.service_date} onChange={(event) => setForm({ ...form, service_date: event.target.value })} /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{USH_PROTOCOL_STATUSES.map((status) => <SelectItem key={status} value={status}>{ushLabel(status)}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-3"><Label>Related service</Label><Select value={form.service_id} onValueChange={(service_id) => setForm({ ...form, service_id })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{services.map((service) => <SelectItem key={service.id} value={service.id}>{service.title} · {fmtDate(service.service_date)}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-3"><Label>Preparation details</Label><Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
            <div className="md:col-span-3"><Label>Notes / reporting</Label><Textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
            <div><Button type="submit">Add assignment</Button></div>
          </form>
        </Card>
      )}

      <div className="w-full max-w-sm">
        <Label>View protocol area</Label>
        <Select value={areaFilter} onValueChange={setAreaFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All protocol areas</SelectItem>{USH_PROTOCOL_AREAS.map((area) => <SelectItem key={area} value={area}>{ushLabel(area)}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="space-y-3">
        {visible.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ushLabel(row.area)} · {row.assigned_person || "Unassigned"} · {row.service_date ? fmtDate(row.service_date) : "Date not set"}</p>
                {row.description && <p className="mt-2 text-sm">{row.description}</p>}
                {row.notes && <p className="mt-2 text-xs text-muted-foreground">{row.notes}</p>}
              </div>
              <div className="w-full sm:w-44">
                {canManage ? <Select value={row.status} onValueChange={(status) => patch(row.id, status)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{USH_PROTOCOL_STATUSES.map((status) => <SelectItem key={status} value={status}>{ushLabel(status)}</SelectItem>)}</SelectContent></Select> : <Badge className={RAG_CLASS[row.status === "completed" ? "green" : row.status === "blocked" ? "red" : "amber"]}>{ushLabel(row.status)}</Badge>}
              </div>
            </div>
          </Card>
        ))}
        {visible.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No protocol assignments recorded for this view.</Card>}
      </div>
    </div>
  );
}