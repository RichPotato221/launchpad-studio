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
import { BRANCHES, branchLabel, fmtDate } from "@/lib/finance";
import { ENGAGEMENT_TYPES, labelFor } from "@/lib/kids";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

const empty = { child_id: "", family_name: "", engagement_type: "parent_meeting", engaged_on: new Date().toISOString().slice(0, 10), summary: "", feedback: "", participation_score: "7", branch: "" };

/** MODULES 10 & 11 — Family engagement, parent communication and feedback. */
export default function FamilyEngagementModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    const [e, c] = await Promise.all([
      sb.from("kids_family_engagement").select("*").order("engaged_on", { ascending: false }),
      sb.from("children").select("id, full_name, branch").order("full_name"),
    ]);
    setRows(e.data ?? []); setChildren(c.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("kids_family_engagement").insert({
      ...form,
      child_id: form.child_id || null,
      branch: form.branch || null,
      participation_score: form.participation_score === "" ? null : Number(form.participation_score),
      recorded_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Family engagement recorded");
    setForm({ ...empty }); load();
  };

  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + (r.participation_score ?? 0), 0) / rows.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Engagements logged</p><p className="font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Families reached</p><p className="font-serif text-2xl">{new Set(rows.map((r) => r.child_id ?? r.family_name)).size}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Average participation</p><p className="font-serif text-2xl">{avg}/10</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Record family engagement</p>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <Label>Child</Label>
              <Select value={form.child_id || undefined} onValueChange={(v) => setForm({ ...form, child_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select child" /></SelectTrigger>
                <SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Family name</Label><Input value={form.family_name} onChange={(e) => setForm({ ...form, family_name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.engagement_type} onValueChange={(v) => setForm({ ...form, engagement_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENGAGEMENT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.engaged_on} onChange={(e) => setForm({ ...form, engaged_on: e.target.value })} /></div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch || undefined} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Participation score (1–10)</Label><Input type="number" min={1} max={10} value={form.participation_score} onChange={(e) => setForm({ ...form, participation_score: e.target.value })} /></div>
            <div className="md:col-span-4"><Label>Summary</Label><Textarea rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
            <div className="md:col-span-4"><Label>Parent feedback</Label><Textarea rows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} /></div>
            <Button type="submit" className="md:w-fit">Save engagement</Button>
          </form>
        </Card>
      )}

      <div className="grid gap-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{children.find((c) => c.id === r.child_id)?.full_name ?? r.family_name ?? "Family"}</p>
                <p className="text-xs text-muted-foreground">{labelFor(ENGAGEMENT_TYPES, r.engagement_type)} · {fmtDate(r.engaged_on)} · {branchLabel(r.branch)}</p>
                {r.summary && <p className="mt-2 text-sm">{r.summary}</p>}
                {r.feedback && <p className="mt-1 text-sm text-muted-foreground">Feedback: {r.feedback}</p>}
              </div>
              <Badge variant="outline">{r.participation_score ?? "—"}/10</Badge>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No family engagement recorded yet.</Card>}
      </div>
    </div>
  );
}
