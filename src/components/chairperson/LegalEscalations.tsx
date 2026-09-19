import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const sb = supabase as any;
const STATUSES = ["Submitted", "Acknowledged", "In Review", "Actioned", "Closed"];

export default function LegalEscalations({ canManage }: { canManage: boolean; currentUserId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const load = async () => {
    const { data, error } = await sb.from("legal_compliance_escalations").select("*").order("submitted_at", { ascending: false });
    if (error) toast.error(error.message); else setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const update = async (id: string, status: string) => {
    const { error } = await sb.from("legal_compliance_escalations").update({ status, chairperson_notes: notes[id] || null, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Escalation updated"); load();
  };
  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading escalations…</Card>;
  if (!rows.length) return <Card className="p-8 text-center text-sm text-muted-foreground">No Legal &amp; Compliance escalations have been submitted.</Card>;
  return <div className="space-y-3">{rows.map((row) => <Card key={row.id} className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{row.priority} priority · {row.branch?.replaceAll("_", " ") ?? "Church-wide"}</p>
        <h3 className="mt-1 font-serif text-xl">{row.matter}</h3>
        <p className="mt-2 text-sm">{row.reason}</p>
        <p className="mt-2 text-xs text-muted-foreground">Submitted {new Date(row.submitted_at).toLocaleString()}</p>
        {row.supporting_document_url && <a className="mt-2 inline-block text-sm underline" href={row.supporting_document_url} target="_blank" rel="noreferrer">View supporting document</a>}
      </div>
      <span className="rounded-full border px-3 py-1 text-xs uppercase tracking-wider">{row.status}</span>
    </div>
    {canManage && <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-[1fr_12rem_auto] md:items-end">
      <div><Label>Chairperson notes</Label><Textarea rows={2} value={notes[row.id] ?? row.chairperson_notes ?? ""} onChange={(e) => setNotes((v) => ({ ...v, [row.id]: e.target.value }))} /></div>
      <div><Label>Status</Label><Select defaultValue={row.status} onValueChange={(value) => setNotes((v) => ({ ...v, [`status-${row.id}`]: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
      <Button onClick={() => update(row.id, notes[`status-${row.id}`] ?? row.status)}>Save</Button>
    </div>}
  </Card>)}</div>;
}
