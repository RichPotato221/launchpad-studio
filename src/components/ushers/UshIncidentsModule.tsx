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
import { Download } from "lucide-react";
import { exportRows, fmtDate } from "@/lib/finance";
import { USH_INCIDENT_TYPES, USH_SEVERITIES, USH_SEVERITY_CLASS, ushLabel } from "@/lib/ushering";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Safety & incident management with escalation and resolution tracking. */
export default function UshIncidentsModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const empty = {
    incident_type: "medical",
    severity: "medium",
    location: "",
    description: "",
    witnesses: "",
    actions_taken: "",
    responsible_leader: "",
    escalated_to: "",
    response_minutes: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("ush_incidents").select("*").order("occurred_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("ush_incidents").insert({
      ...form,
      response_minutes: form.response_minutes ? Number(form.response_minutes) : null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Incident logged");
    setForm({ ...empty });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("ush_incidents").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => (m[r.incident_type] = (m[r.incident_type] ?? 0) + 1));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const open = rows.filter((r) => r.followup_status === "open").length;
  const critical = rows.filter((r) => r.severity === "critical").length;
  const avgResponse = (() => {
    const list = rows.map((r) => r.response_minutes).filter((n): n is number => typeof n === "number");
    return list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Incidents</p><p className="mt-1 font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Open</p><p className="mt-1 font-serif text-2xl">{open}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Critical</p><p className="mt-1 font-serif text-2xl">{critical}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Avg response</p><p className="mt-1 font-serif text-2xl">{avgResponse} min</p></Card>
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Log an incident</p>
        <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label>Type</Label>
            <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{USH_INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{USH_SEVERITIES.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div className="md:col-span-3"><Label>What happened</Label><Textarea required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Actions taken</Label><Textarea rows={2} value={form.actions_taken} onChange={(e) => setForm({ ...form, actions_taken: e.target.value })} /></div>
          <div><Label>Witnesses</Label><Input value={form.witnesses} onChange={(e) => setForm({ ...form, witnesses: e.target.value })} /></div>
          <div><Label>Responsible leader</Label><Input value={form.responsible_leader} onChange={(e) => setForm({ ...form, responsible_leader: e.target.value })} /></div>
          <div><Label>Escalated to</Label><Input value={form.escalated_to} onChange={(e) => setForm({ ...form, escalated_to: e.target.value })} /></div>
          <div><Label>Response time (min)</Label><Input type="number" value={form.response_minutes} onChange={(e) => setForm({ ...form, response_minutes: e.target.value })} /></div>
          <div><Button type="submit">Log incident</Button></div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Incident trends</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              exportRows(
                "ushering-incidents",
                ["Type", "Severity", "Occurred", "Location", "Description", "Actions", "Status", "Leader"],
                rows.map((r) => [r.incident_type, r.severity, r.occurred_at, r.location, r.description, r.actions_taken, r.followup_status, r.responsible_leader]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {byType.map(([t, n]) => (
            <div key={t} className="flex items-center gap-3 text-sm">
              <span className="w-40">{ushLabel(t)}</span>
              <div className="h-2 flex-1 rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${Math.round((n / (byType[0]?.[1] ?? 1)) * 100)}%` }} />
              </div>
              <span className="w-8 text-right text-xs text-muted-foreground">{n}</span>
            </div>
          ))}
          {byType.length === 0 && <p className="text-sm text-muted-foreground">No incidents logged — praise God.</p>}
        </div>
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{ushLabel(r.incident_type)} · {r.location ?? "location not recorded"}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(r.occurred_at)} · {r.responsible_leader ?? "no leader assigned"}</p>
                <p className="mt-2 text-sm">{r.description}</p>
                {r.actions_taken && <p className="mt-1 text-xs text-muted-foreground">Actions: {r.actions_taken}</p>}
                {r.resolution && <p className="mt-1 text-xs text-muted-foreground">Resolution: {r.resolution}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={USH_SEVERITY_CLASS[r.severity]}>{ushLabel(r.severity)}</Badge>
                {canManage && (
                  <div className="w-40">
                    <Select value={r.followup_status} onValueChange={(v) => patch(r.id, { followup_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
