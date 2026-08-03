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
import { money, fmtDate, exportRows, BRANCHES, branchLabel } from "@/lib/finance";
import {
  FAULT_TYPES, MAINTENANCE_KINDS, MAINTENANCE_FREQUENCIES, MAINTENANCE_TRIGGERS,
  TICKET_PRIORITIES, TICKET_STATUSES, labelFor, titleish, daysUntil,
} from "@/lib/resources";

const sb = supabase as any;

const EMPTY_T = {
  title: "", fault_type: "equipment", maintenance_kind: "corrective", description: "",
  asset_id: "", facility_id: "", department_slug: "", branch: "", priority: "medium",
  technician: "", assigned_to: "", estimated_cost: "", due_date: "",
};

const EMPTY_S = {
  title: "", asset_id: "", facility_id: "", trigger_type: "time", frequency: "quarterly",
  usage_hours_interval: "", instructions: "", last_done_on: "", next_due_on: "", responsible: "",
};

/** MODULE 6 — Maintenance Management (fault reporting, tickets, preventive schedules). */
export default function MaintenanceModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [t, setT] = useState({ ...EMPTY_T });
  const [s, setS] = useState({ ...EMPTY_S });
  const [statusFilter, setStatusFilter] = useState("open");

  const load = async () => {
    const [ti, sc, as, fa, de, pr] = await Promise.all([
      sb.from("res_maintenance_tickets").select("*").order("created_at", { ascending: false }),
      sb.from("res_maintenance_schedules").select("*").order("next_due_on"),
      sb.from("assets").select("id, name").order("name"),
      sb.from("res_facilities").select("id, name").order("name"),
      sb.from("departments").select("slug, name").order("name"),
      sb.from("profiles").select("id, full_name").order("full_name"),
    ]);
    setTickets(ti.data ?? []); setSchedules(sc.data ?? []); setAssets(as.data ?? []);
    setFacilities(fa.data ?? []); setDepts(de.data ?? []); setMembers(pr.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    if (statusFilter === "all") return tickets;
    if (statusFilter === "open") return tickets.filter((x) => !["completed", "closed"].includes(x.status));
    return tickets.filter((x) => x.status === statusFilter);
  }, [tickets, statusFilter]);

  const mttr = useMemo(() => {
    const done = tickets.filter((x) => x.completed_at);
    if (!done.length) return null;
    const hrs = done.reduce((sum, x) => sum + (new Date(x.completed_at).getTime() - new Date(x.created_at).getTime()) / 3_600_000, 0);
    return Math.round(hrs / done.length);
  }, [tickets]);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("res_maintenance_tickets").insert({
      title: t.title, fault_type: t.fault_type, maintenance_kind: t.maintenance_kind,
      description: t.description || null, asset_id: t.asset_id || null, facility_id: t.facility_id || null,
      department_slug: t.department_slug || null, branch: t.branch || null, priority: t.priority,
      technician: t.technician || null, assigned_to: t.assigned_to || null,
      estimated_cost: t.estimated_cost === "" ? null : Number(t.estimated_cost),
      due_date: t.due_date || null, reported_by: currentUserId, status: "open",
    });
    if (error) return toast.error(error.message);
    setT({ ...EMPTY_T }); toast.success("Fault reported"); load();
  };

  const setStatus = async (row: any, status: string) => {
    const patch: any = { status };
    if (status === "completed") {
      patch.completed_at = new Date().toISOString();
      if (row.asset_id) {
        await sb.from("assets").update({ last_maintenance_date: new Date().toISOString().slice(0, 10) }).eq("id", row.asset_id);
      }
    }
    const { error } = await sb.from("res_maintenance_tickets").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const saveCosts = async (id: string, actual: string, hours: string, cause: string) => {
    const { error } = await sb.from("res_maintenance_tickets").update({
      actual_cost: actual === "" ? null : Number(actual),
      labour_hours: hours === "" ? null : Number(hours),
      root_cause: cause || null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ticket updated"); load();
  };

  const submitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("res_maintenance_schedules").insert({
      title: s.title, asset_id: s.asset_id || null, facility_id: s.facility_id || null,
      trigger_type: s.trigger_type, frequency: s.frequency,
      usage_hours_interval: s.usage_hours_interval === "" ? null : Number(s.usage_hours_interval),
      instructions: s.instructions || null, last_done_on: s.last_done_on || null,
      next_due_on: s.next_due_on || null, responsible: s.responsible || null,
      active: true, created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    setS({ ...EMPTY_S }); toast.success("Preventive schedule created"); load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Report a fault</p>
        <p className="mt-1 text-sm text-muted-foreground">Any member may log a fault; the Resource Administrator triages and assigns it.</p>
        <form onSubmit={submitTicket} className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2"><Label>Fault title</Label><Input required value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} /></div>
          <div>
            <Label>Fault type</Label>
            <Select value={t.fault_type} onValueChange={(v) => setT({ ...t, fault_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FAULT_TYPES.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kind</Label>
            <Select value={t.maintenance_kind} onValueChange={(v) => setT({ ...t, maintenance_kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MAINTENANCE_KINDS.map((x) => <SelectItem key={x} value={x}>{titleish(x)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Asset</Label>
            <Select value={t.asset_id} onValueChange={(v) => setT({ ...t, asset_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Facility</Label>
            <Select value={t.facility_id} onValueChange={(v) => setT({ ...t, facility_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{facilities.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={t.department_slug} onValueChange={(v) => setT({ ...t, department_slug: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={t.branch} onValueChange={(v) => setT({ ...t, branch: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{BRANCHES.map((x) => <SelectItem key={x} value={x}>{branchLabel(x)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={t.priority} onValueChange={(v) => setT({ ...t, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TICKET_PRIORITIES.map((x) => <SelectItem key={x} value={x}>{titleish(x)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {canManage && (
            <>
              <div>
                <Label>Assign to</Label>
                <Select value={t.assigned_to} onValueChange={(v) => setT({ ...t, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>External technician</Label><Input value={t.technician} onChange={(e) => setT({ ...t, technician: e.target.value })} /></div>
              <div><Label>Estimated cost (R)</Label><Input type="number" step="0.01" value={t.estimated_cost} onChange={(e) => setT({ ...t, estimated_cost: e.target.value })} /></div>
            </>
          )}
          <div><Label>Due date</Label><Input type="date" value={t.due_date} onChange={(e) => setT({ ...t, due_date: e.target.value })} /></div>
          <div className="md:col-span-4"><Label>Description</Label><Textarea rows={2} value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} /></div>
          <div><Button type="submit">Log fault</Button></div>
        </form>
      </Card>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="w-52">
          <Label>Ticket filter</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="all">All</SelectItem>
              {TICKET_STATUSES.map((x) => <SelectItem key={x} value={x}>{titleish(x)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          Mean repair time: <strong>{mttr == null ? "—" : `${mttr}h`}</strong> · open tickets:{" "}
          <strong>{tickets.filter((x) => !["completed", "closed"].includes(x.status)).length}</strong>
        </p>
        <Button variant="outline" onClick={() => exportRows("maintenance-tickets",
          ["Ticket", "Title", "Type", "Priority", "Status", "Asset", "Facility", "Due", "Estimated", "Actual"],
          visible.map((x) => [x.ticket_number, x.title, x.fault_type, x.priority, x.status,
            assets.find((a) => a.id === x.asset_id)?.name, facilities.find((f) => f.id === x.facility_id)?.name,
            x.due_date, x.estimated_cost, x.actual_cost]))}>Export</Button>
      </Card>

      <div className="space-y-3">
        {visible.map((x) => (
          <TicketRow
            key={x.id} row={x} canManage={canManage}
            assetName={assets.find((a) => a.id === x.asset_id)?.name}
            facilityName={facilities.find((f) => f.id === x.facility_id)?.name}
            onStatus={setStatus} onSave={saveCosts}
          />
        ))}
        {visible.length === 0 && <p className="text-sm text-muted-foreground">No tickets match.</p>}
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Preventive maintenance schedules</p>
        {canManage && (
          <form onSubmit={submitSchedule} className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Schedule title</Label><Input required value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} /></div>
            <div>
              <Label>Asset</Label>
              <Select value={s.asset_id} onValueChange={(v) => setS({ ...s, asset_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Facility</Label>
              <Select value={s.facility_id} onValueChange={(v) => setS({ ...s, facility_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trigger</Label>
              <Select value={s.trigger_type} onValueChange={(v) => setS({ ...s, trigger_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MAINTENANCE_TRIGGERS.map((x) => <SelectItem key={x} value={x}>{titleish(x)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={s.frequency} onValueChange={(v) => setS({ ...s, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MAINTENANCE_FREQUENCIES.map((x) => <SelectItem key={x} value={x}>{titleish(x)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Last done</Label><Input type="date" value={s.last_done_on} onChange={(e) => setS({ ...s, last_done_on: e.target.value })} /></div>
            <div><Label>Next due</Label><Input type="date" value={s.next_due_on} onChange={(e) => setS({ ...s, next_due_on: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Instructions</Label><Input value={s.instructions} onChange={(e) => setS({ ...s, instructions: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit" className="w-full">Add schedule</Button></div>
          </form>
        )}
        <table className="mt-4 w-full text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2">Task</th><th className="p-2">Target</th><th className="p-2">Frequency</th><th className="p-2">Next due</th><th className="p-2">Status</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {schedules.map((x) => {
              const d = daysUntil(x.next_due_on);
              return (
                <tr key={x.id} className="border-b last:border-0">
                  <td className="p-2">{x.title}</td>
                  <td className="p-2">{assets.find((a) => a.id === x.asset_id)?.name ?? facilities.find((f) => f.id === x.facility_id)?.name ?? "—"}</td>
                  <td className="p-2">{titleish(x.frequency)}</td>
                  <td className="p-2">{fmtDate(x.next_due_on)}</td>
                  <td className="p-2">
                    <Badge variant={d != null && d < 0 ? "destructive" : "secondary"}>
                      {d == null ? "Not scheduled" : d < 0 ? `${Math.abs(d)}d overdue` : `in ${d}d`}
                    </Badge>
                  </td>
                  <td className="p-2 text-right">
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await sb.from("res_maintenance_schedules").delete().eq("id", x.id); load();
                      }}>Remove</Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {schedules.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={6}>No preventive schedules.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function TicketRow({ row, canManage, assetName, facilityName, onStatus, onSave }: any) {
  const [actual, setActual] = useState(row.actual_cost ?? "");
  const [hours, setHours] = useState(row.labour_hours ?? "");
  const [cause, setCause] = useState(row.root_cause ?? "");
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{row.ticket_number} — {row.title}</p>
          <p className="text-xs text-muted-foreground">
            {labelFor(FAULT_TYPES, row.fault_type)} · {titleish(row.maintenance_kind)} · {titleish(row.priority)} priority
            {assetName ? ` · ${assetName}` : ""}{facilityName ? ` · ${facilityName}` : ""}
            {row.due_date ? ` · due ${fmtDate(row.due_date)}` : ""}
          </p>
          {row.description && <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {row.technician ? `Technician: ${row.technician} · ` : ""}
            Estimated {money(row.estimated_cost)}{row.actual_cost ? ` · actual ${money(row.actual_cost)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{titleish(row.status)}</Badge>
          {canManage && (
            <Select value={row.status} onValueChange={(v) => onStatus(row, v)}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{TICKET_STATUSES.map((x) => <SelectItem key={x} value={x}>{titleish(x)}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      </div>
      {canManage && (
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input placeholder="Actual cost" type="number" step="0.01" value={actual} onChange={(e) => setActual(e.target.value)} />
          <Input placeholder="Labour hours" type="number" step="0.1" value={hours} onChange={(e) => setHours(e.target.value)} />
          <Input placeholder="Root cause" value={cause} onChange={(e) => setCause(e.target.value)} />
          <Button variant="outline" onClick={() => onSave(row.id, String(actual), String(hours), cause)}>Save</Button>
        </div>
      )}
    </Card>
  );
}
