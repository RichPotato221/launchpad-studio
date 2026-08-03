import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportRows, fmtDate, money } from "@/lib/finance";
import {
  EQUIPMENT_CATEGORIES, EQUIPMENT_CONDITIONS, EQUIPMENT_STATUSES,
  FAULT_SEVERITIES, FAULT_STATUSES, labelFor, today,
} from "@/lib/worship";

const sb = supabase as any;

const EMPTY = {
  name: "", category: "sound", serial_number: "", location: "", condition: "good", status: "in_service",
  purchase_date: "", purchase_cost: "", warranty_expiry: "", last_serviced_on: "", next_service_due: "", notes: "",
};

/** MODULE 8 — Equipment & Technical Asset Register with fault reporting. */
export default function EquipmentModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [fault, setFault] = useState({ equipment_id: "", severity: "medium", description: "" });

  const load = async () => {
    const [e, f] = await Promise.all([
      sb.from("worship_equipment").select("*").order("name"),
      sb.from("worship_equipment_faults").select("*").order("created_at", { ascending: false }),
    ]);
    setItems(e.data ?? []); setFaults(f.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: items.length,
    faulty: items.filter((i) => i.condition === "faulty" || i.status === "maintenance").length,
    dueService: items.filter((i) => i.next_service_due && i.next_service_due <= today()).length,
    openFaults: faults.filter((f) => !["resolved", "closed"].includes(f.status)).length,
    value: items.reduce((s, i) => s + Number(i.purchase_cost ?? 0), 0),
  }), [items, faults]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : null,
      purchase_date: form.purchase_date || null,
      warranty_expiry: form.warranty_expiry || null,
      last_serviced_on: form.last_serviced_on || null,
      next_service_due: form.next_service_due || null,
    };
    const { error } = editing
      ? await sb.from("worship_equipment").update(payload).eq("id", editing)
      : await sb.from("worship_equipment").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Equipment updated" : "Equipment registered");
    setForm({ ...EMPTY }); setEditing(null); load();
  };

  const reportFault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fault.equipment_id) return toast.error("Select the equipment");
    const { error } = await sb.from("worship_equipment_faults").insert({ ...fault, reported_by: currentUserId });
    if (error) return toast.error(error.message);
    await sb.from("worship_equipment").update({ condition: "faulty", status: "maintenance" }).eq("id", fault.equipment_id);
    toast.success("Fault logged — item flagged for maintenance");
    setFault({ equipment_id: "", severity: "medium", description: "" });
    load();
  };

  const resolveFault = async (f: any, status: string) => {
    const { error } = await sb.from("worship_equipment_faults")
      .update({ status, resolved_at: ["resolved", "closed"].includes(status) ? new Date().toISOString() : null }).eq("id", f.id);
    if (error) return toast.error(error.message);
    if (["resolved", "closed"].includes(status)) {
      await sb.from("worship_equipment").update({ condition: "good", status: "in_service", last_serviced_on: today() }).eq("id", f.equipment_id);
    }
    load();
  };

  const exportRegister = () =>
    exportRows("worship-equipment-register",
      ["Item", "Category", "Serial", "Location", "Condition", "Status", "Purchased", "Cost", "Warranty", "Last serviced", "Next service"],
      items.map((i) => [i.name, labelFor(EQUIPMENT_CATEGORIES, i.category), i.serial_number, i.location, i.condition, i.status, i.purchase_date, i.purchase_cost, i.warranty_expiry, i.last_serviced_on, i.next_service_due]));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-5">
        {[
          { label: "Items", value: stats.total },
          { label: "Faulty / in maintenance", value: stats.faulty },
          { label: "Service due", value: stats.dueService },
          { label: "Open faults", value: stats.openFaults },
          { label: "Register value", value: money(stats.value) },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-serif text-2xl">{s.value}</p>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card className="p-6 print:hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editing ? "Edit equipment" : "Register equipment"}</p>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-3">
            <div><Label>Item name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EQUIPMENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div><Label>Serial number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div>
              <Label>Condition</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {EQUIPMENT_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {EQUIPMENT_STATUSES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div><Label>Purchase date</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
            <div><Label>Purchase cost (R)</Label><Input type="number" step="0.01" value={form.purchase_cost} onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} /></div>
            <div><Label>Warranty expiry</Label><Input type="date" value={form.warranty_expiry} onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })} /></div>
            <div><Label>Last serviced</Label><Input type="date" value={form.last_serviced_on} onChange={(e) => setForm({ ...form, last_serviced_on: e.target.value })} /></div>
            <div><Label>Next service due</Label><Input type="date" value={form.next_service_due} onChange={(e) => setForm({ ...form, next_service_due: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button type="submit">{editing ? "Save changes" : "Register item"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ ...EMPTY }); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Asset register</p>
          <Button variant="outline" size="sm" onClick={exportRegister}>Export</Button>
        </div>
        <div className="mt-3 divide-y rounded-md border border-border">
          {items.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium">{i.name} <span className="text-xs text-muted-foreground">· {labelFor(EQUIPMENT_CATEGORIES, i.category)}</span></p>
                <p className="text-xs text-muted-foreground">
                  {i.location || "—"} {i.serial_number ? `· S/N ${i.serial_number}` : ""} · {money(Number(i.purchase_cost ?? 0))}
                  {i.next_service_due ? ` · next service ${fmtDate(i.next_service_due)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{i.condition}</Badge>
                <Badge variant={i.status === "in_service" ? "default" : "secondary"}>{i.status.replace(/_/g, " ")}</Badge>
                {canManage && <Button size="sm" variant="outline" className="print:hidden" onClick={() => { setEditing(i.id); setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, i[k] ?? ""])) } as any); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No equipment registered yet.</div>}
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Report a fault</p>
        <form onSubmit={reportFault} className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label>Equipment</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={fault.equipment_id} onChange={(e) => setFault({ ...fault, equipment_id: e.target.value })}>
              <option value="">Select…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Severity</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={fault.severity} onChange={(e) => setFault({ ...fault, severity: e.target.value })}>
              {FAULT_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-3"><Label>Description</Label><Textarea rows={2} required value={fault.description} onChange={(e) => setFault({ ...fault, description: e.target.value })} /></div>
          <div><Button type="submit">Log fault</Button></div>
        </form>

        <div className="mt-5 space-y-3">
          {faults.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{items.find((i) => i.id === f.equipment_id)?.name ?? "—"} <Badge variant="outline" className="ml-2">{f.severity}</Badge></p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              {canManage ? (
                <select className="h-9 rounded-md border border-input bg-background px-2 text-sm print:hidden" value={f.status} onChange={(e) => resolveFault(f, e.target.value)}>
                  {FAULT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              ) : <Badge variant="secondary">{f.status.replace(/_/g, " ")}</Badge>}
            </div>
          ))}
          {faults.length === 0 && <p className="text-sm text-muted-foreground">No faults reported.</p>}
        </div>
      </Card>
    </div>
  );
}
