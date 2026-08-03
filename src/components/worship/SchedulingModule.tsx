import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportRows, fmtDate } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";
import { burnoutRisk, labelFor, pct, RESPONSES, TEAM_ROLES } from "@/lib/worship";

const sb = supabase as any;

/** MODULE 7 — Scheduling & Rostering (assignments, conflicts, rotation fairness). */
export default function SchedulingModule({ canManage }: { canManage: boolean }) {
  const [services, setServices] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [pick, setPick] = useState({ member_id: "", role_title: "vocalist", notes: "" });

  const load = async () => {
    const [s, m, a] = await Promise.all([
      sb.from("worship_services").select("*").order("service_date", { ascending: false }),
      sb.from("worship_team_members").select("*").order("full_name"),
      sb.from("worship_assignments").select("*"),
    ]);
    setServices(s.data ?? []); setMembers(m.data ?? []); setAssignments(a.data ?? []);
    if (!serviceId && s.data?.length) setServiceId(s.data[0].id);
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => assignments.filter((a) => a.service_id === serviceId), [assignments, serviceId]);
  const service = services.find((s) => s.id === serviceId);

  const loadPerMember = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach((a) => map.set(a.member_id, (map.get(a.member_id) ?? 0) + 1));
    return map;
  }, [assignments]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !pick.member_id) return toast.error("Pick a service and a team member");
    if (rows.some((r) => r.member_id === pick.member_id)) return toast.error("This member is already rostered for this service");
    const { error } = await sb.from("worship_assignments").insert({ service_id: serviceId, ...pick });
    if (error) return toast.error(error.message);
    toast.success("Assignment added");
    setPick({ member_id: "", role_title: "vocalist", notes: "" });
    load();
  };

  const setResponse = async (id: string, response: string) => {
    const { error } = await sb.from("worship_assignments").update({ response, responded_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, response } : a)));
  };

  const remove = async (id: string) => {
    const { error } = await sb.from("worship_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.full_name ?? "—";

  const exportRoster = () =>
    exportRows(`worship-roster-${service?.service_date ?? ""}`, ["Service", "Date", "Member", "Role", "Response", "Notes"],
      rows.map((r) => [service?.title, service?.service_date, memberName(r.member_id), labelFor(TEAM_ROLES, r.role_title), r.response, r.notes]));

  const confirmed = rows.filter((r) => r.response === "confirmed").length;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-72 flex-1">
            <Label>Service</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Select…</option>
              {services.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.service_date)} — {s.title}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{rows.length} rostered</Badge>
            <Badge variant="outline">Confirmed {pct(confirmed, Math.max(rows.length, 1))}%</Badge>
            <Button variant="outline" size="sm" onClick={exportRoster}>Export roster</Button>
          </div>
        </div>

        {canManage && serviceId && (
          <form onSubmit={add} className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Team member</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={pick.member_id} onChange={(e) => setPick({ ...pick, member_id: e.target.value })}>
                <option value="">Select…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name} — {loadPerMember.get(m.id) ?? 0} assignment(s)</option>)}
              </select>
            </div>
            <div>
              <Label>Role for this service</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={pick.role_title} onChange={(e) => setPick({ ...pick, role_title: e.target.value })}>
                {TEAM_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div><Label>Notes</Label><Input value={pick.notes} onChange={(e) => setPick({ ...pick, notes: e.target.value })} /></div>
            <div><Button type="submit">Add to roster</Button></div>
          </form>
        )}
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-serif text-lg">{memberName(r.member_id)}</p>
              <p className="text-xs text-muted-foreground">{labelFor(TEAM_ROLES, r.role_title)} {r.notes ? `· ${r.notes}` : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <Badge variant={r.response === "confirmed" ? "default" : "outline"}>{r.response}</Badge>
              {canManage && (
                <>
                  <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={r.response} onChange={(e) => setResponse(r.id, e.target.value)}>
                    {RESPONSES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => remove(r.id)}>Remove</Button>
                </>
              )}
            </div>
          </Card>
        ))}
        {serviceId && rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Nobody rostered for this service yet.</Card>}
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Rotation fairness &amp; burnout watch</p>
        <div className="mt-3 divide-y rounded-md border border-border">
          {members.map((m) => {
            const count = loadPerMember.get(m.id) ?? 0;
            return (
              <div key={m.id} className="flex items-center justify-between p-3 text-sm">
                <span>{m.full_name} <span className="text-xs text-muted-foreground">· {labelFor(TEAM_ROLES, m.role_title)}</span></span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {count} assignment(s) <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[burnoutRisk(count)]}`} />
                </span>
              </div>
            );
          })}
          {members.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No team members yet.</div>}
        </div>
      </Card>
    </div>
  );
}
