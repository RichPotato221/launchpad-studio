import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtDate, exportRows, BRANCHES, branchLabel, RAG_CLASS } from "@/lib/finance";
import {
  FACILITY_TYPES, FACILITY_STATUSES, SAFETY_STATUSES, BOOKING_STATUSES,
  daysUntil, labelFor, titleish,
} from "@/lib/resources";

const sb = supabase as any;

const EMPTY_F = {
  name: "", facility_type: "room", branch: "", building: "", floor: "", room_number: "",
  capacity: "", description: "", status: "available", cleaning_schedule: "", maintenance_schedule: "",
  last_safety_inspection: "", next_safety_inspection: "", safety_status: "compliant", access_notes: "",
};

const EMPTY_B = {
  facility_id: "", asset_id: "", title: "", purpose: "", department_slug: "", branch: "",
  starts_at: "", ends_at: "",
};

/** MODULES 5 & 10 — Facilities Management and the Booking System. */
export default function FacilitiesModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [f, setF] = useState({ ...EMPTY_F });
  const [b, setB] = useState({ ...EMPTY_B });
  const [editingF, setEditingF] = useState<string | null>(null);

  const load = async () => {
    const [fa, bo, as, ti, de] = await Promise.all([
      sb.from("res_facilities").select("*").order("name"),
      sb.from("res_bookings").select("*").order("starts_at", { ascending: false }).limit(300),
      sb.from("assets").select("id, name, is_bookable").order("name"),
      sb.from("res_maintenance_tickets").select("*"),
      sb.from("departments").select("slug, name").order("name"),
    ]);
    setFacilities(fa.data ?? []); setBookings(bo.data ?? []); setAssets(as.data ?? []);
    setTickets(ti.data ?? []); setDepts(de.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openTicketsFor = (id: string) =>
    tickets.filter((t) => t.facility_id === id && !["completed", "closed"].includes(t.status)).length;

  const submitFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...f, capacity: f.capacity === "" ? null : Number(f.capacity),
      branch: f.branch || null, last_safety_inspection: f.last_safety_inspection || null,
      next_safety_inspection: f.next_safety_inspection || null,
    };
    const { error } = editingF
      ? await sb.from("res_facilities").update(payload).eq("id", editingF)
      : await sb.from("res_facilities").insert({ ...payload, created_by: currentUserId });
    if (error) return toast.error(error.message);
    setF({ ...EMPTY_F }); setEditingF(null); toast.success("Facility saved"); load();
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!b.facility_id && !b.asset_id) return toast.error("Choose a facility or an item of equipment.");
    const start = new Date(b.starts_at), end = new Date(b.ends_at);
    if (!(start < end)) return toast.error("The end time must be after the start time.");
    const clash = bookings.find(
      (x) => !["cancelled", "returned"].includes(x.status) &&
        ((b.facility_id && x.facility_id === b.facility_id) || (b.asset_id && x.asset_id === b.asset_id)) &&
        new Date(x.starts_at) < end && new Date(x.ends_at) > start,
    );
    const { error } = await sb.from("res_bookings").insert({
      facility_id: b.facility_id || null, asset_id: b.asset_id || null, title: b.title,
      purpose: b.purpose || null, department_slug: b.department_slug || null, branch: b.branch || null,
      requested_by: currentUserId, starts_at: start.toISOString(), ends_at: end.toISOString(),
      status: clash ? "waitlisted" : "requested", waitlisted: !!clash,
    });
    if (error) return toast.error(error.message);
    toast[clash ? "warning" : "success"](clash ? "Slot already taken — added to the waitlist." : "Booking requested");
    setB({ ...EMPTY_B }); load();
  };

  const setBookingStatus = async (id: string, status: string) => {
    const { error } = await sb.from("res_bookings").update({ status, waitlisted: status === "waitlisted" }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const upcoming = useMemo(
    () => [...bookings].filter((x) => new Date(x.ends_at) >= new Date()).sort((a, c) => +new Date(a.starts_at) - +new Date(c.starts_at)),
    [bookings],
  );

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editingF ? "Edit facility" : "Add facility"}</p>
          <form onSubmit={submitFacility} className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={f.facility_type} onValueChange={(v) => setF({ ...f, facility_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FACILITY_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={f.branch} onValueChange={(v) => setF({ ...f, branch: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((x) => <SelectItem key={x} value={x}>{branchLabel(x)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Building</Label><Input value={f.building} onChange={(e) => setF({ ...f, building: e.target.value })} /></div>
            <div><Label>Floor</Label><Input value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} /></div>
            <div><Label>Room number</Label><Input value={f.room_number} onChange={(e) => setF({ ...f, room_number: e.target.value })} /></div>
            <div><Label>Capacity</Label><Input type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FACILITY_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleish(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Safety status</Label>
              <Select value={f.safety_status} onValueChange={(v) => setF({ ...f, safety_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SAFETY_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleish(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Last safety inspection</Label><Input type="date" value={f.last_safety_inspection} onChange={(e) => setF({ ...f, last_safety_inspection: e.target.value })} /></div>
            <div><Label>Next safety inspection</Label><Input type="date" value={f.next_safety_inspection} onChange={(e) => setF({ ...f, next_safety_inspection: e.target.value })} /></div>
            <div><Label>Cleaning schedule</Label><Input value={f.cleaning_schedule} onChange={(e) => setF({ ...f, cleaning_schedule: e.target.value })} placeholder="e.g. Weekly Saturday" /></div>
            <div><Label>Maintenance schedule</Label><Input value={f.maintenance_schedule} onChange={(e) => setF({ ...f, maintenance_schedule: e.target.value })} /></div>
            <div className="md:col-span-4"><Label>Access notes</Label><Textarea rows={2} value={f.access_notes} onChange={(e) => setF({ ...f, access_notes: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button type="submit">{editingF ? "Save" : "Add facility"}</Button>
              {editingF && <Button type="button" variant="outline" onClick={() => { setF({ ...EMPTY_F }); setEditingF(null); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {facilities.map((x) => {
          const dueDays = daysUntil(x.next_safety_inspection);
          const rag = x.safety_status !== "compliant" || (dueDays != null && dueDays < 0)
            ? "red" : openTicketsFor(x.id) || (dueDays != null && dueDays < 30) ? "amber" : "green";
          return (
            <Card key={x.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{x.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {labelFor(FACILITY_TYPES, x.facility_type)}{x.branch ? ` · ${branchLabel(x.branch)}` : ""}
                    {x.capacity ? ` · seats ${x.capacity}` : ""}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-[0.65rem] uppercase ${RAG_CLASS[rag as "green"]}`}>{x.status}</span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>Safety: {titleish(x.safety_status)}{x.next_safety_inspection ? ` · next ${fmtDate(x.next_safety_inspection)}` : ""}</li>
                <li>Cleaning: {x.cleaning_schedule || "—"}</li>
                <li>Open faults: {openTicketsFor(x.id)}</li>
                <li>Location: {[x.building, x.floor, x.room_number].filter(Boolean).join(" · ") || "—"}</li>
              </ul>
              {canManage && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditingF(x.id);
                    setF({ ...EMPTY_F, ...Object.fromEntries(Object.keys(EMPTY_F).map((k) => [k, x[k] == null ? "" : String(x[k])])) } as any);
                  }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!window.confirm("Delete this facility?")) return;
                    await sb.from("res_facilities").delete().eq("id", x.id); load();
                  }}>Delete</Button>
                </div>
              )}
            </Card>
          );
        })}
        {facilities.length === 0 && <p className="text-sm text-muted-foreground">No facilities captured yet.</p>}
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Book a room or equipment</p>
        <form onSubmit={submitBooking} className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2"><Label>Booking title</Label><Input required value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} /></div>
          <div>
            <Label>Facility</Label>
            <Select value={b.facility_id} onValueChange={(v) => setB({ ...b, facility_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{facilities.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Equipment</Label>
            <Select value={b.asset_id} onValueChange={(v) => setB({ ...b, asset_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{assets.filter((a) => a.is_bookable).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={b.department_slug} onValueChange={(v) => setB({ ...b, department_slug: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Start</Label><Input required type="datetime-local" value={b.starts_at} onChange={(e) => setB({ ...b, starts_at: e.target.value })} /></div>
          <div><Label>End</Label><Input required type="datetime-local" value={b.ends_at} onChange={(e) => setB({ ...b, ends_at: e.target.value })} /></div>
          <div className="flex items-end"><Button type="submit" className="w-full">Request booking</Button></div>
          <div className="md:col-span-4"><Label>Purpose</Label><Input value={b.purpose} onChange={(e) => setB({ ...b, purpose: e.target.value })} /></div>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Booking calendar</p>
          <Button variant="outline" size="sm" onClick={() => exportRows("bookings", ["Title", "Facility", "Equipment", "Department", "Start", "End", "Status"],
            upcoming.map((x) => [x.title, facilities.find((y) => y.id === x.facility_id)?.name, assets.find((a) => a.id === x.asset_id)?.name, x.department_slug, x.starts_at, x.ends_at, x.status]))}>Export</Button>
        </div>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Booking</th><th className="p-3">Resource</th><th className="p-3">Department</th><th className="p-3">When</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {upcoming.map((x) => (
              <tr key={x.id} className="border-b last:border-0">
                <td className="p-3">{x.title}<p className="text-xs text-muted-foreground">{x.purpose}</p></td>
                <td className="p-3">{facilities.find((y) => y.id === x.facility_id)?.name ?? assets.find((a) => a.id === x.asset_id)?.name ?? "—"}</td>
                <td className="p-3">{depts.find((d) => d.slug === x.department_slug)?.name ?? "—"}</td>
                <td className="p-3">{fmtDate(x.starts_at)} → {fmtDate(x.ends_at)}</td>
                <td className="p-3"><Badge variant={x.waitlisted ? "outline" : "secondary"}>{titleish(x.status)}</Badge></td>
                <td className="p-3">
                  {canManage && (
                    <Select value={x.status} onValueChange={(v) => setBookingStatus(x.id, v)}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{BOOKING_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleish(s)}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </td>
              </tr>
            ))}
            {upcoming.length === 0 && <tr><td className="p-6 text-center text-muted-foreground" colSpan={6}>No upcoming bookings.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
