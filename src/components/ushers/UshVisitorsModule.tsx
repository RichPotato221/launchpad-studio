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
import { RAG_CLASS, exportRows, fmtDate } from "@/lib/finance";
import { daysSince, pct } from "@/lib/intercession";
import { USH_FOLLOWUP_STATUSES, USH_VISITOR_TYPES, ushLabel } from "@/lib/ushering";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Visitor experience: capture, welcome, follow-up and assimilation pathway. */
export default function UshVisitorsModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const empty = {
    full_name: "",
    phone: "",
    email: "",
    service_id: "",
    visitor_type: "first_time",
    family_members: "0",
    children: "0",
    invited_by: "",
    prayer_request: "",
    interests: "",
    followup_owner: "",
    assigned_pathway: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const [{ data: v }, { data: s }] = await Promise.all([
      sb.from("ush_visitors").select("*").order("created_at", { ascending: false }),
      sb.from("ush_services").select("id,title,service_date").order("service_date", { ascending: false }),
    ]);
    setRows(v ?? []);
    setServices(s ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("ush_visitors").insert({
      ...form,
      service_id: form.service_id || null,
      family_members: Number(form.family_members) || 0,
      children: Number(form.children) || 0,
      badge_code: `V-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Visitor captured");
    setForm({ ...empty });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("ush_visitors").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.followup_status === filter)),
    [rows, filter],
  );

  const firstTimers = rows.filter((r) => r.visitor_type === "first_time").length;
  const connected = rows.filter((r) => ["connected", "joined"].includes(r.followup_status)).length;
  const overdue = rows.filter((r) => r.followup_status === "pending" && daysSince(r.created_at) > 7).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Visitors</p><p className="mt-1 font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">First-timers</p><p className="mt-1 font-serif text-2xl">{firstTimers}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Conversion to connected</p><p className="mt-1 font-serif text-2xl">{pct(connected, rows.length)}%</p></Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Follow-up overdue</p>
          <p className="mt-1 font-serif text-2xl">{overdue}</p>
        </Card>
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Welcome a visitor</p>
        <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-3">
          <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <Label>Service</Label>
            <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.title} · {fmtDate(s.service_date)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Visitor type</Label>
            <Select value={form.visitor_type} onValueChange={(v) => setForm({ ...form, visitor_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{USH_VISITOR_TYPES.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Invited by</Label><Input value={form.invited_by} onChange={(e) => setForm({ ...form, invited_by: e.target.value })} /></div>
          <div><Label>Family members</Label><Input type="number" value={form.family_members} onChange={(e) => setForm({ ...form, family_members: e.target.value })} /></div>
          <div><Label>Children</Label><Input type="number" value={form.children} onChange={(e) => setForm({ ...form, children: e.target.value })} /></div>
          <div><Label>Follow-up owner</Label><Input value={form.followup_owner} onChange={(e) => setForm({ ...form, followup_owner: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Prayer request</Label><Textarea rows={2} value={form.prayer_request} onChange={(e) => setForm({ ...form, prayer_request: e.target.value })} /></div>
          <div><Label>Interests / ministry</Label><Input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} /></div>
          <div><Button type="submit">Capture visitor</Button></div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All follow-up states</SelectItem>
              {USH_FOLLOWUP_STATUSES.map((s) => <SelectItem key={s} value={s}>{ushLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "ushering-visitors",
              ["Name", "Type", "Phone", "Email", "Invited by", "Follow-up", "Owner", "Captured"],
              filtered.map((r) => [r.full_name, r.visitor_type, r.phone, r.email, r.invited_by, r.followup_status, r.followup_owner, r.created_at]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => {
          const age = daysSince(r.created_at);
          return (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.full_name} <span className="text-xs text-muted-foreground">· {r.badge_code}</span></p>
                  <p className="text-xs text-muted-foreground">
                    {ushLabel(r.visitor_type)} · {r.phone ?? "no phone"} · {r.family_members} family, {r.children} children · {age}d ago
                  </p>
                  {r.prayer_request && <p className="mt-2 text-sm">“{r.prayer_request}”</p>}
                  {r.interests && <p className="mt-1 text-xs text-muted-foreground">Interests: {r.interests}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={RAG_CLASS[["connected", "joined"].includes(r.followup_status) ? "green" : r.followup_status === "pending" && age > 7 ? "red" : "amber"]}>
                    {ushLabel(r.followup_status)}
                  </Badge>
                  {canManage && (
                    <div className="w-44">
                      <Select value={r.followup_status} onValueChange={(v) => patch(r.id, { followup_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{USH_FOLLOWUP_STATUSES.map((s) => <SelectItem key={s} value={s}>{ushLabel(s)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!r.welcome_sms_sent && <Button type="button" size="sm" variant="outline" onClick={() => patch(r.id, { welcome_sms_sent: true })}>Mark welcome SMS sent</Button>}
                  {!r.welcome_email_sent && <Button type="button" size="sm" variant="outline" onClick={() => patch(r.id, { welcome_email_sent: true })}>Mark welcome email sent</Button>}
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No visitors recorded.</Card>}
      </div>
    </div>
  );
}
