import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate } from "@/lib/finance";
import { pct, today } from "@/lib/intercession";
import {
  USH_SERVICE_CHECKLIST,
  USH_SERVICE_STATUSES,
  USH_SERVICE_TYPES,
  USH_ZONE_TYPES,
  occupancyPct,
  ushLabel,
} from "@/lib/ushering";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Service operations: planning, readiness checklists and live seating zones. */
export default function UshServicesModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const empty = {
    title: "",
    service_type: "sunday_service",
    venue: "",
    service_date: today(),
    starts_at: "",
    expected_attendance: "0",
    seating_capacity: "0",
    service_lead: "",
    notes: "",
  };
  const [form, setForm] = useState({ ...empty });
  const [zoneForm, setZoneForm] = useState({ section: "", zone_type: "general", capacity: "0", usher_name: "" });

  const load = async () => {
    const [{ data: s }, { data: z }] = await Promise.all([
      sb.from("ush_services").select("*").order("service_date", { ascending: false }),
      sb.from("ush_seating").select("*").order("section"),
    ]);
    setRows(s ?? []);
    setZones(z ?? []);
    if (!selected && (s ?? []).length) setSelected(s[0].id);
  };
  useEffect(() => {
    load();
  }, []);

  const active = rows.find((r) => r.id === selected);
  const activeZones = useMemo(() => zones.filter((z) => z.service_id === selected), [zones, selected]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("ush_services").insert({
      title: form.title,
      service_type: form.service_type,
      venue: form.venue || null,
      service_date: form.service_date,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expected_attendance: Number(form.expected_attendance) || 0,
      seating_capacity: Number(form.seating_capacity) || 0,
      service_lead: form.service_lead || null,
      notes: form.notes || null,
      checklist: USH_SERVICE_CHECKLIST.map((t) => ({ task: t, done: false })),
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Service planned");
    setForm({ ...empty });
    load();
  };

  const toggleTask = async (idx: number) => {
    if (!active) return;
    const list = (active.checklist ?? []).map((c: any, i: number) => (i === idx ? { ...c, done: !c.done } : c));
    const { error } = await sb.from("ush_services").update({ checklist: list }).eq("id", active.id);
    if (error) return toast.error(error.message);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await sb.from("ush_services").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const addZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return toast.error("Select a service first.");
    const { error } = await sb.from("ush_seating").insert({
      service_id: selected,
      section: zoneForm.section,
      zone_type: zoneForm.zone_type,
      capacity: Number(zoneForm.capacity) || 0,
      usher_name: zoneForm.usher_name || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    setZoneForm({ section: "", zone_type: "general", capacity: "0", usher_name: "" });
    load();
  };

  const setOccupancy = async (id: string, occupied: number) => {
    const { error } = await sb.from("ush_seating").update({ occupied: Math.max(0, occupied) }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const readiness = active ? pct((active.checklist ?? []).filter((c: any) => c.done).length, (active.checklist ?? []).length) : 0;
  const totalCap = activeZones.reduce((s, z) => s + (z.capacity ?? 0), 0);
  const totalOcc = activeZones.reduce((s, z) => s + (z.occupied ?? 0), 0);

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Plan a service</p>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{USH_SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} /></div>
            <div><Label>Starts at</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div><Label>Expected attendance</Label><Input type="number" value={form.expected_attendance} onChange={(e) => setForm({ ...form, expected_attendance: e.target.value })} /></div>
            <div><Label>Seating capacity</Label><Input type="number" value={form.seating_capacity} onChange={(e) => setForm({ ...form, seating_capacity: e.target.value })} /></div>
            <div><Label>Service lead</Label><Input value={form.service_lead} onChange={(e) => setForm({ ...form, service_lead: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div><Button type="submit">Add service</Button></div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
            <SelectContent>
              {rows.map((r) => <SelectItem key={r.id} value={r.id}>{r.title} · {fmtDate(r.service_date)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "ushering-services",
              ["Title", "Type", "Date", "Venue", "Expected", "Capacity", "Status", "Lead"],
              rows.map((r) => [r.title, ushLabel(r.service_type), r.service_date, r.venue, r.expected_attendance, r.seating_capacity, r.status, r.service_lead]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      {active && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-lg">{active.title}</p>
                <p className="text-xs text-muted-foreground">
                  {ushLabel(active.service_type)} · {fmtDate(active.service_date)} · {active.venue ?? "venue TBC"}
                </p>
              </div>
              <Badge className={RAG_CLASS[readiness >= 90 ? "green" : readiness >= 60 ? "amber" : "red"]}>
                {readiness}% ready
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              {(active.checklist ?? []).map((c: any, i: number) => (
                <label key={`${c.task}-${i}`} className="flex items-start gap-3 text-sm">
                  <Checkbox checked={!!c.done} disabled={!canManage} onCheckedChange={() => toggleTask(i)} />
                  <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.task}</span>
                </label>
              ))}
            </div>
            {canManage && (
              <div className="mt-4 w-56">
                <Label>Status</Label>
                <Select value={active.status} onValueChange={(v) => setStatus(active.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{USH_SERVICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{ushLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Seating & crowd flow</p>
              <Badge className={RAG_CLASS[occupancyPct(totalOcc, totalCap) >= 95 ? "red" : occupancyPct(totalOcc, totalCap) >= 80 ? "amber" : "green"]}>
                {totalOcc}/{totalCap} seats · {occupancyPct(totalOcc, totalCap)}%
              </Badge>
            </div>
            {canManage && (
              <form onSubmit={addZone} className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2"><Label>Section</Label><Input required value={zoneForm.section} onChange={(e) => setZoneForm({ ...zoneForm, section: e.target.value })} /></div>
                <div>
                  <Label>Zone</Label>
                  <Select value={zoneForm.zone_type} onValueChange={(v) => setZoneForm({ ...zoneForm, zone_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{USH_ZONE_TYPES.map((z) => <SelectItem key={z} value={z}>{ushLabel(z)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Capacity</Label><Input type="number" value={zoneForm.capacity} onChange={(e) => setZoneForm({ ...zoneForm, capacity: e.target.value })} /></div>
                <div className="md:col-span-3"><Label>Usher on duty</Label><Input value={zoneForm.usher_name} onChange={(e) => setZoneForm({ ...zoneForm, usher_name: e.target.value })} /></div>
                <div className="flex items-end"><Button type="submit" variant="outline">Add zone</Button></div>
              </form>
            )}
            <div className="mt-4 space-y-3">
              {activeZones.map((z) => {
                const o = occupancyPct(z.occupied ?? 0, z.capacity ?? 0);
                return (
                  <div key={z.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{z.section} <span className="text-xs text-muted-foreground">· {ushLabel(z.zone_type)}</span></p>
                        <p className="text-xs text-muted-foreground">{z.usher_name ?? "unassigned"} · {z.occupied}/{z.capacity} seats</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={RAG_CLASS[o >= 95 ? "red" : o >= 80 ? "amber" : "green"]}>{o}%</Badge>
                        {canManage && (
                          <>
                            <Button type="button" size="sm" variant="outline" onClick={() => setOccupancy(z.id, (z.occupied ?? 0) - 5)}>-5</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setOccupancy(z.id, (z.occupied ?? 0) + 5)}>+5</Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded bg-muted">
                      <div className="h-1.5 rounded bg-primary" style={{ width: `${o}%` }} />
                    </div>
                  </div>
                );
              })}
              {activeZones.length === 0 && <p className="text-sm text-muted-foreground">No seating zones mapped yet.</p>}
            </div>
          </Card>
        </div>
      )}

      {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No services planned yet.</Card>}
    </div>
  );
}
