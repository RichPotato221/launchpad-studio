import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate } from "@/lib/finance";
import { pct } from "@/lib/intercession";
import { USH_DUTIES, USH_ROSTER_STATUSES, ushLabel } from "@/lib/ushering";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Duty roster: assignments, acceptance, swaps, backup cover and check-in. */
export default function UshRosterModule({ canManage, currentUserId }: Props) {
  const [services, setServices] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [form, setForm] = useState({ volunteer_id: "", duty: "entrance", section: "", is_backup: "no" });

  const load = async () => {
    const [{ data: s }, { data: v }, { data: r }] = await Promise.all([
      sb.from("ush_services").select("*").order("service_date", { ascending: false }),
      sb.from("ush_volunteers").select("*").eq("active", true).order("full_name"),
      sb.from("ush_roster").select("*").order("created_at", { ascending: false }),
    ]);
    setServices(s ?? []);
    setVolunteers(v ?? []);
    setRoster(r ?? []);
    if (!serviceId && (s ?? []).length) setServiceId(s[0].id);
  };
  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => roster.filter((r) => r.service_id === serviceId), [roster, serviceId]);
  const uncovered = USH_DUTIES.filter((d) => !rows.some((r) => r.duty === d && r.status !== "declined" && !r.is_backup));
  const accepted = rows.filter((r) => r.status === "accepted").length;

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) return toast.error("Select a service first.");
    const vol = volunteers.find((v) => v.id === form.volunteer_id);
    const { error } = await sb.from("ush_roster").insert({
      service_id: serviceId,
      volunteer_id: form.volunteer_id || null,
      volunteer_name: vol?.full_name ?? null,
      duty: form.duty,
      section: form.section || null,
      is_backup: form.is_backup === "yes",
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Duty assigned");
    setForm({ volunteer_id: "", duty: "entrance", section: "", is_backup: "no" });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("ush_roster").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const serviceCounts = useMemo(() => {
    const m: Record<string, number> = {};
    roster.forEach((r) => {
      if (!r.volunteer_name) return;
      m[r.volunteer_name] = (m[r.volunteer_name] ?? 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [roster]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Assignments</p><p className="mt-1 font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Accepted</p><p className="mt-1 font-serif text-2xl">{pct(accepted, rows.length)}%</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Backup cover</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.is_backup).length}</p></Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Uncovered duties</p>
          <p className="mt-1 font-serif text-2xl">{uncovered.length}</p>
        </Card>
      </div>

      <div className="w-80">
        <Label>Service</Label>
        <Select value={serviceId} onValueChange={setServiceId}>
          <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
          <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.title} · {fmtDate(s.service_date)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {uncovered.length > 0 && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Coverage gaps</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {uncovered.map((d) => <Badge key={d} className={RAG_CLASS.red}>{ushLabel(d)}</Badge>)}
          </div>
        </Card>
      )}

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Assign a duty</p>
          <form onSubmit={assign} className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <Label>Volunteer</Label>
              <Select value={form.volunteer_id} onValueChange={(v) => setForm({ ...form, volunteer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{volunteers.map((v) => <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duty</Label>
              <Select value={form.duty} onValueChange={(v) => setForm({ ...form, duty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{USH_DUTIES.map((d) => <SelectItem key={d} value={d}>{ushLabel(d)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Section</Label><Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></div>
            <div>
              <Label>Backup cover</Label>
              <Select value={form.is_backup} onValueChange={(v) => setForm({ ...form, is_backup: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Button type="submit">Assign</Button></div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "ushering-roster",
              ["Volunteer", "Duty", "Section", "Status", "Backup", "Checked in"],
              rows.map((r) => [r.volunteer_name, r.duty, r.section, r.status, r.is_backup ? "yes" : "no", r.checked_in_at]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export roster
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.volunteer_name ?? "Unassigned"}{r.is_backup && <span className="ml-2 text-xs text-muted-foreground">(backup)</span>}</p>
                <p className="text-xs text-muted-foreground">{ushLabel(r.duty)}{r.section ? ` · ${r.section}` : ""}{r.checked_in_at ? ` · checked in ${fmtDate(r.checked_in_at)}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={RAG_CLASS[r.status === "accepted" ? "green" : r.status === "declined" || r.status === "no_show" ? "red" : "amber"]}>{ushLabel(r.status)}</Badge>
                {canManage && (
                  <>
                    <div className="w-40">
                      <Select value={r.status} onValueChange={(v) => patch(r.id, { status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{USH_ROSTER_STATUSES.map((s) => <SelectItem key={s} value={s}>{ushLabel(s)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => patch(r.id, { checked_in_at: new Date().toISOString() })}>Check in</Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Nothing rostered for this service yet.</Card>}
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Rotation fairness — most assigned</p>
        <div className="mt-3 space-y-2">
          {serviceCounts.map(([name, count]) => (
            <div key={name} className="flex items-center gap-3 text-sm">
              <span className="w-48 truncate">{name}</span>
              <div className="h-2 flex-1 rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${pct(count, serviceCounts[0]?.[1] ?? 1)}%` }} />
              </div>
              <span className="w-8 text-right text-xs text-muted-foreground">{count}</span>
            </div>
          ))}
          {serviceCounts.length === 0 && <p className="text-sm text-muted-foreground">No assignment history yet.</p>}
        </div>
      </Card>
    </div>
  );
}
