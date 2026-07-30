import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Plus, Printer } from "lucide-react";
import {
  CORRESPONDENCE_TYPES,
  BRANCHES,
  branchLabel,
  fmtDate,
  exportRows,
  exportPdf,
  nextCorrespondenceRef,
  logAudit,
} from "@/lib/secretariat";

export default function CorrespondenceModule({
  currentUserId,
  canManage,
}: {
  currentUserId: string;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    corr_type: "Letter",
    direction: "incoming",
    sender: "",
    recipient: "",
    subject: "",
    category: "",
    priority: "normal",
    due_date: "",
    branch: "",
  });

  const q = useQuery({
    queryKey: ["correspondence"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("correspondence")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = async () => {
    if (!form.subject) return toast.error("A subject is required.");
    const reference_number = await nextCorrespondenceRef();
    const { data, error } = await supabase
      .from("correspondence")
      .insert({
        reference_number,
        corr_type: form.corr_type,
        direction: form.direction,
        sender: form.sender || null,
        recipient: form.recipient || null,
        subject: form.subject,
        category: form.category || null,
        priority: form.priority,
        due_date: form.due_date || null,
        branch: (form.branch || null) as never,
        department_slug: "secretary",
        status: "open",
        created_by: currentUserId,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    await logAudit("create", "correspondence", data.id, { reference_number });
    toast.success(`Registered as ${reference_number}.`);
    setCreating(false);
    setForm({ corr_type: "Letter", direction: "incoming", sender: "", recipient: "", subject: "", category: "", priority: "normal", due_date: "", branch: "" });
    qc.invalidateQueries({ queryKey: ["correspondence"] });
    qc.invalidateQueries({ queryKey: ["secretariat-cockpit"] });
  };

  const respond = async (row: any) => {
    const text = window.prompt(`Response to ${row.reference_number}:`);
    if (!text) return;
    await supabase.from("correspondence_responses").insert({
      correspondence_id: row.id,
      response_text: text,
      responded_by: currentUserId,
    });
    await supabase
      .from("correspondence")
      .update({ status: "responded", responded_at: new Date().toISOString() } as never)
      .eq("id", row.id);
    await logAudit("respond", "correspondence", row.id, {});
    toast.success("Response recorded.");
    qc.invalidateQueries({ queryKey: ["correspondence"] });
    qc.invalidateQueries({ queryKey: ["secretariat-cockpit"] });
  };

  const rows = (q.data ?? []).filter((r: any) => {
    const matchesSearch =
      !search ||
      [r.reference_number, r.subject, r.sender, r.recipient, r.category]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Input className="max-w-xs" placeholder="Search reference, subject, sender…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "open", "in_progress", "responded", "closed"].map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "correspondence-register",
                ["Reference", "Type", "Direction", "Subject", "Sender", "Recipient", "Priority", "Due", "Status"],
                rows.map((r: any) => [r.reference_number, r.corr_type, r.direction, r.subject, r.sender, r.recipient, r.priority, r.due_date, r.status]),
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf}><Printer className="mr-1.5 h-4 w-4" /> PDF</Button>
          {canManage && <Button size="sm" onClick={() => setCreating((c) => !c)}><Plus className="mr-1.5 h-4 w-4" /> Register</Button>}
        </div>
      </div>

      {creating && (
        <Card className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Type</Label>
              <Select value={form.corr_type} onValueChange={(v) => setForm({ ...form, corr_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CORRESPONDENCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low", "normal", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>Subject</Label>
              <Textarea rows={2} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div><Label>Sender</Label><Input value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} /></div>
            <div><Label>Recipient</Label><Input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Response due</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch || "all"} onValueChange={(v) => setForm({ ...form, branch: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={create}>Register correspondence</Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card className="divide-y divide-border/60">
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nothing on the register yet.</p>}
        {rows.map((r: any) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-medium">{r.reference_number} — {r.subject}</p>
              <p className="text-xs text-muted-foreground">
                {r.corr_type} · {r.direction} · {r.sender || "—"} → {r.recipient || "—"} · due {fmtDate(r.due_date)} · {branchLabel(r.branch)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{r.priority}</Badge>
              <Badge variant={r.status === "closed" || r.status === "responded" ? "secondary" : "outline"} className="capitalize">{r.status}</Badge>
              {canManage && r.status !== "closed" && (
                <Button size="sm" variant="ghost" onClick={() => respond(r)}>Respond</Button>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
