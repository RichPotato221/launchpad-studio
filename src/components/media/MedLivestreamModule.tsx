import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import { pct } from "@/lib/intercession";
import { MED_PLATFORMS, MED_STREAM_CHECKLIST, MED_STREAM_STATUSES, MED_STREAM_TYPES, medLabel } from "@/lib/media";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Livestream operations: readiness checklists, live status and post-stream analytics. */
export default function MedLivestreamModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const empty = { title: "", stream_type: "sunday_service", platform: "youtube", starts_at: "" };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("med_livestreams").select("*").order("starts_at", { ascending: false, nullsFirst: false });
    setRows(data ?? []);
    if (!selected && (data ?? []).length) setSelected(data[0].id);
  };
  useEffect(() => {
    load();
  }, []);

  const active = rows.find((r) => r.id === selected);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("med_livestreams").insert({
      ...form,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      checklist: MED_STREAM_CHECKLIST.map((t) => ({ task: t, done: false })),
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Stream scheduled");
    setForm({ ...empty });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("med_livestreams").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggleTask = async (idx: number) => {
    if (!active) return;
    const list = (active.checklist ?? []).map((c: any, i: number) => (i === idx ? { ...c, done: !c.done } : c));
    await patch(active.id, { checklist: list });
  };

  const readiness = active ? pct((active.checklist ?? []).filter((c: any) => c.done).length, (active.checklist ?? []).length) : 0;

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Schedule a livestream</p>
          <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-4">
            <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.stream_type} onValueChange={(v) => setForm({ ...form, stream_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MED_STREAM_TYPES.map((t) => <SelectItem key={t} value={t}>{medLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MED_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{medLabel(p)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Starts at</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Button type="submit">Schedule</Button></div>
          </form>
        </Card>
      )}

      <div className="w-80">
        <Label>Stream</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger><SelectValue placeholder="Select a stream" /></SelectTrigger>
          <SelectContent>{rows.map((r) => <SelectItem key={r.id} value={r.id}>{r.title} · {r.starts_at ? fmtDate(r.starts_at) : "TBC"}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {active && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-lg">{active.title}</p>
                <p className="text-xs text-muted-foreground">{medLabel(active.stream_type)} · {medLabel(active.platform)} · {active.starts_at ? fmtDate(active.starts_at) : "TBC"}</p>
              </div>
              <Badge className={RAG_CLASS[readiness >= 90 ? "green" : readiness >= 60 ? "amber" : "red"]}>{readiness}% pre-flight</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {(active.checklist ?? []).map((c: any, i: number) => (
                <label key={`${c.task}-${i}`} className="flex items-start gap-3 text-sm">
                  <Checkbox checked={!!c.done} disabled={!canManage} onCheckedChange={() => toggleTask(i)} />
                  <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.task}</span>
                </label>
              ))}
            </div>
            {canManage && (
              <div className="mt-4 w-52">
                <Label>Status</Label>
                <Select value={active.status} onValueChange={(v) => patch(active.id, { status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MED_STREAM_STATUSES.map((s) => <SelectItem key={s} value={s}>{medLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Post-stream report</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div><Label>Viewers</Label><Input type="number" disabled={!canManage} defaultValue={active.viewers ?? 0} onBlur={(e) => patch(active.id, { viewers: Number(e.target.value) || 0 })} /></div>
              <div><Label>Peak viewers</Label><Input type="number" disabled={!canManage} defaultValue={active.peak_viewers ?? 0} onBlur={(e) => patch(active.id, { peak_viewers: Number(e.target.value) || 0 })} /></div>
              <div><Label>Watch minutes</Label><Input type="number" disabled={!canManage} defaultValue={active.watch_minutes ?? 0} onBlur={(e) => patch(active.id, { watch_minutes: Number(e.target.value) || 0 })} /></div>
              <div><Label>Stream quality</Label><Input disabled={!canManage} defaultValue={active.stream_quality ?? ""} onBlur={(e) => patch(active.id, { stream_quality: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Technical issues</Label><Textarea rows={2} disabled={!canManage} defaultValue={active.technical_issues ?? ""} onBlur={(e) => patch(active.id, { technical_issues: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Recording URL</Label><Input disabled={!canManage} defaultValue={active.recording_url ?? ""} onBlur={(e) => patch(active.id, { recording_url: e.target.value })} /></div>
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {medLabel(r.platform)} · {r.starts_at ? fmtDate(r.starts_at) : "TBC"} · {r.viewers} viewers (peak {r.peak_viewers})
                </p>
              </div>
              <Badge className={RAG_CLASS[r.status === "completed" ? "green" : r.status === "failed" ? "red" : "amber"]}>{medLabel(r.status)}</Badge>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No streams scheduled yet.</Card>}
      </div>
    </div>
  );
}
