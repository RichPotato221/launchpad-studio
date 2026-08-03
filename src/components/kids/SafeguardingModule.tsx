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
import { BRANCHES, branchLabel, exportRows, titleCase } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";
import {
  INCIDENT_SEVERITIES, INCIDENT_STATUSES, INCIDENT_TYPES, clearedToServe, expiryState, labelFor, pct, ragForCount, ragForKids,
} from "@/lib/kids";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

const empty = {
  child_id: "", classroom_id: "", incident_type: "safeguarding", severity: "medium",
  occurred_at: new Date().toISOString().slice(0, 16), description: "", action_taken: "",
  assigned_to: "", status: "open", resolution: "", branch: "",
};

/** MODULE 8 — Safeguarding, incidents and child-protection compliance. */
export default function SafeguardingModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [filter, setFilter] = useState("open");

  const load = async () => {
    const [i, c, r, v, p] = await Promise.all([
      sb.from("kids_incidents").select("*").order("occurred_at", { ascending: false }),
      sb.from("children").select("id, full_name, child_code, branch"),
      sb.from("kids_classrooms").select("id, name"),
      sb.from("kids_volunteers").select("*"),
      sb.from("profiles").select("id, full_name").eq("approval_status", "approved").order("full_name"),
    ]);
    setRows(i.data ?? []); setChildren(c.data ?? []); setRooms(r.data ?? []); setVolunteers(v.data ?? []); setMembers(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      child_id: form.child_id || null,
      classroom_id: form.classroom_id || null,
      assigned_to: form.assigned_to || null,
      branch: form.branch || null,
      occurred_at: new Date(form.occurred_at).toISOString(),
      reported_by: currentUserId,
    };
    const { error } = await sb.from("kids_incidents").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Incident logged and escalated to leadership");
    setForm(empty); load();
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (["resolved", "closed"].includes(status)) patch.resolved_at = new Date().toISOString();
    const { error } = await sb.from("kids_incidents").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(() => rows.filter((r) => filter === "all" || (filter === "open" ? !["resolved", "closed"].includes(r.status) : r.status === filter)), [rows, filter]);

  const active = volunteers.filter((v) => v.status === "active");
  const cleared = active.filter((v) => clearedToServe(v).ok);
  const compliance = pct(cleared.length, Math.max(active.length, 1));
  const openCount = rows.filter((r) => !["resolved", "closed"].includes(r.status)).length;
  const critical = rows.filter((r) => r.severity === "critical" && !["resolved", "closed"].includes(r.status)).length;
  const expiring = active.filter((v) => ["amber", "red"].includes(expiryState(v.background_check_expiry).rag) || ["amber", "red"].includes(expiryState(v.safeguarding_expiry).rag));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Open incidents</p><p className="font-serif text-2xl">{openCount} <span className={`ml-1 inline-block h-2.5 w-2.5 rounded-full align-middle ${RAG_DOT[ragForCount(openCount)]}`} /></p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Critical / escalated</p><p className="font-serif text-2xl">{critical}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Safeguarding compliance</p><p className="font-serif text-2xl">{compliance}% <span className={`ml-1 inline-block h-2.5 w-2.5 rounded-full align-middle ${RAG_DOT[ragForKids(compliance)]}`} /></p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Clearances due</p><p className="font-serif text-2xl">{expiring.length}</p></Card>
      </div>

      {expiring.length > 0 && (
        <Card className="border-destructive/40 p-5">
          <p className="text-xs uppercase tracking-widest text-destructive">Clearance alerts</p>
          <div className="mt-2 space-y-1 text-sm">
            {expiring.map((v) => (
              <p key={v.id}>{v.full_name} — clearance {expiryState(v.background_check_expiry).label.toLowerCase()}, safeguarding {expiryState(v.safeguarding_expiry).label.toLowerCase()}</p>
            ))}
          </div>
        </Card>
      )}

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Log an incident</p>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <Label>Child</Label>
              <Select value={form.child_id || undefined} onValueChange={(v) => setForm({ ...form, child_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select child" /></SelectTrigger>
                <SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classroom</Label>
              <Select value={form.classroom_id || undefined} onValueChange={(v) => setForm({ ...form, classroom_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCIDENT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCIDENT_SEVERITIES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Occurred at</Label><Input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} /></div>
            <div>
              <Label>Assigned to</Label>
              <Select value={form.assigned_to || undefined} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="Leader" /></SelectTrigger>
                <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch || undefined} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4"><Label>Description *</Label><Textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="md:col-span-4"><Label>Immediate action taken</Label><Textarea rows={2} value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} /></div>
            <Button type="submit" className="md:col-span-4 md:w-fit">Log incident</Button>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {["open", "all", ...INCIDENT_STATUSES].filter((v, i, a) => a.indexOf(v) === i).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{titleCase(f)}</Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => exportRows("kids-incidents",
          ["Date", "Type", "Severity", "Child", "Classroom", "Status", "Description", "Action"],
          filtered.map((r) => [r.occurred_at, r.incident_type, r.severity, children.find((c) => c.id === r.child_id)?.full_name ?? "", rooms.find((x) => x.id === r.classroom_id)?.name ?? "", r.status, r.description, r.action_taken]))}>
          <Download className="mr-2 h-4 w-4" /> Export register
        </Button>
      </div>

      <div className="grid gap-3">
        {filtered.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{labelFor(INCIDENT_TYPES, r.incident_type)} — {children.find((c) => c.id === r.child_id)?.full_name ?? "General"}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.occurred_at).toLocaleString()} · {rooms.find((x) => x.id === r.classroom_id)?.name ?? "—"} · {branchLabel(r.branch)}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.description}</p>
                {r.action_taken && <p className="mt-1 text-sm text-muted-foreground">Action: {r.action_taken}</p>}
                <div className="mt-2 flex gap-1">
                  <Badge variant={r.severity === "critical" || r.severity === "high" ? "destructive" : "outline"}>{titleCase(r.severity)}</Badge>
                  <Badge variant="secondary">{titleCase(r.status)}</Badge>
                </div>
              </div>
              {canManage && (
                <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>{INCIDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No incidents recorded — well done.</Card>}
      </div>
    </div>
  );
}
