import { useEffect, useState } from "react";
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
import { USH_CARE_GROUPS, USH_COMM_TYPES, ushLabel } from "@/lib/ushering";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Congregational care records and ministry communications. */
export default function UshCareModule({ canManage, currentUserId }: Props) {
  const [care, setCare] = useState<any[]>([]);
  const [comms, setComms] = useState<any[]>([]);
  const careEmpty = {
    member_name: "",
    care_group: "elderly",
    assistance_requested: "",
    assistance_provided: "",
    assigned_volunteer: "",
    followup_notes: "",
  };
  const commEmpty = { title: "", message: "", comm_type: "duty_reminder", audience: "all_volunteers", priority: "normal", send_at: "" };
  const [careForm, setCareForm] = useState({ ...careEmpty });
  const [commForm, setCommForm] = useState({ ...commEmpty });

  const load = async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      sb.from("ush_care").select("*").order("created_at", { ascending: false }),
      sb.from("ush_comms").select("*").order("created_at", { ascending: false }),
    ]);
    setCare(c ?? []);
    setComms(m ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const addCare = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("ush_care").insert({ ...careForm, created_by: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Care record saved");
    setCareForm({ ...careEmpty });
    load();
  };

  const addComm = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("ush_comms").insert({
      ...commForm,
      send_at: commForm.send_at ? new Date(commForm.send_at).toISOString() : null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Communication queued");
    setCommForm({ ...commEmpty });
    load();
  };

  const patchCare = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("ush_care").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg">Congregational care</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              exportRows(
                "ushering-care",
                ["Member", "Group", "Requested", "Provided", "Volunteer", "Status"],
                care.map((r) => [r.member_name, r.care_group, r.assistance_requested, r.assistance_provided, r.assigned_volunteer, r.status]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>

        <Card className="p-6">
          <form onSubmit={addCare} className="grid gap-4 md:grid-cols-3">
            <div><Label>Member</Label><Input required value={careForm.member_name} onChange={(e) => setCareForm({ ...careForm, member_name: e.target.value })} /></div>
            <div>
              <Label>Care group</Label>
              <Select value={careForm.care_group} onValueChange={(v) => setCareForm({ ...careForm, care_group: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{USH_CARE_GROUPS.map((g) => <SelectItem key={g} value={g}>{ushLabel(g)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assigned volunteer</Label><Input value={careForm.assigned_volunteer} onChange={(e) => setCareForm({ ...careForm, assigned_volunteer: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Assistance requested</Label><Textarea rows={2} value={careForm.assistance_requested} onChange={(e) => setCareForm({ ...careForm, assistance_requested: e.target.value })} /></div>
            <div><Label>Assistance provided</Label><Textarea rows={2} value={careForm.assistance_provided} onChange={(e) => setCareForm({ ...careForm, assistance_provided: e.target.value })} /></div>
            <div><Button type="submit">Save care record</Button></div>
          </form>
        </Card>

        <div className="space-y-3">
          {care.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.member_name} <span className="text-xs text-muted-foreground">· {ushLabel(r.care_group)}</span></p>
                  <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)} · {r.assigned_volunteer ?? "unassigned"}</p>
                  {r.assistance_requested && <p className="mt-2 text-sm">{r.assistance_requested}</p>}
                  {r.assistance_provided && <p className="mt-1 text-xs text-muted-foreground">Provided: {r.assistance_provided}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={RAG_CLASS[r.status === "closed" ? "green" : "amber"]}>{ushLabel(r.status)}</Badge>
                  {canManage && r.status !== "closed" && (
                    <Button type="button" size="sm" variant="outline" onClick={() => patchCare(r.id, { status: "closed" })}>Close</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {care.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No care records yet.</Card>}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-serif text-lg">Ministry communications</h3>
        {canManage && (
          <Card className="p-6">
            <form onSubmit={addComm} className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2"><Label>Title</Label><Input required value={commForm.title} onChange={(e) => setCommForm({ ...commForm, title: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={commForm.comm_type} onValueChange={(v) => setCommForm({ ...commForm, comm_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{USH_COMM_TYPES.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3"><Label>Message</Label><Textarea required rows={3} value={commForm.message} onChange={(e) => setCommForm({ ...commForm, message: e.target.value })} /></div>
              <div><Label>Audience</Label><Input value={commForm.audience} onChange={(e) => setCommForm({ ...commForm, audience: e.target.value })} /></div>
              <div>
                <Label>Priority</Label>
                <Select value={commForm.priority} onValueChange={(v) => setCommForm({ ...commForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Send at</Label><Input type="datetime-local" value={commForm.send_at} onChange={(e) => setCommForm({ ...commForm, send_at: e.target.value })} /></div>
              <div><Button type="submit">Queue message</Button></div>
            </form>
          </Card>
        )}

        <div className="space-y-3">
          {comms.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{ushLabel(c.comm_type)} · {c.audience} · {c.send_at ? fmtDate(c.send_at) : "send immediately"}</p>
                  <p className="mt-2 text-sm">{c.message}</p>
                </div>
                <Badge className={RAG_CLASS[c.sent ? "green" : "amber"]}>{c.sent ? "Sent" : "Queued"}</Badge>
              </div>
            </Card>
          ))}
          {comms.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No communications yet.</Card>}
        </div>
      </section>
    </div>
  );
}
