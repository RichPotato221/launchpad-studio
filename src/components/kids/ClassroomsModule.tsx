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
import { BRANCHES, branchLabel } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";
import { pct, ragForKids, today } from "@/lib/kids";

const sb = supabase as any;
type Props = { canManage: boolean };

const empty = { name: "", age_min: "", age_max: "", capacity: "", teacher_id: "", assistant_id: "", branch: "", room: "", notes: "", active: true };

/** MODULE 4 — Classroom & age-group management. */
export default function ClassroomsModule({ canManage }: Props) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    const [r, c, k, p] = await Promise.all([
      sb.from("kids_classrooms").select("*").order("age_min"),
      sb.from("children").select("id, full_name, classroom_id, age_group, allergies, medical_conditions, special_needs"),
      sb.from("kids_checkins").select("*").eq("service_date", today()),
      sb.from("profiles").select("id, full_name").eq("approval_status", "approved").order("full_name"),
    ]);
    setRooms(r.data ?? []); setChildren(c.data ?? []); setCheckins(k.data ?? []); setMembers(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      age_min: form.age_min === "" ? null : Number(form.age_min),
      age_max: form.age_max === "" ? null : Number(form.age_max),
      capacity: form.capacity === "" ? null : Number(form.capacity),
      teacher_id: form.teacher_id || null,
      assistant_id: form.assistant_id || null,
      branch: form.branch || null,
      room: form.room || null,
      notes: form.notes || null,
      active: form.active,
    };
    const res = editing ? await sb.from("kids_classrooms").update(payload).eq("id", editing) : await sb.from("kids_classrooms").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Classroom updated" : "Classroom created");
    setForm(empty); setEditing(null); load();
  };

  const stats = useMemo(() => rooms.map((r) => {
    const enrolled = children.filter((c) => c.classroom_id === r.id);
    const present = checkins.filter((k) => k.classroom_id === r.id && !k.checked_out_at);
    const ratio = present.length > 0 ? Math.ceil(present.length / Math.max(1, [r.teacher_id, r.assistant_id].filter(Boolean).length)) : 0;
    return { ...r, enrolled, present, use: pct(present.length, r.capacity ?? 0), ratio };
  }), [rooms, children, checkins]);

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editing ? "Edit classroom" : "Create classroom"}</p>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Beginners A" /></div>
            <div><Label>Min age</Label><Input type="number" value={form.age_min} onChange={(e) => setForm({ ...form, age_min: e.target.value })} /></div>
            <div><Label>Max age</Label><Input type="number" value={form.age_max} onChange={(e) => setForm({ ...form, age_max: e.target.value })} /></div>
            <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            <div>
              <Label>Teacher</Label>
              <Select value={form.teacher_id || undefined} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assistant</Label>
              <Select value={form.assistant_id || undefined} onValueChange={(v) => setForm({ ...form, assistant_id: v })}>
                <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
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
            <div><Label>Room / venue</Label><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></div>
            <div className="md:col-span-4"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">{editing ? "Save" : "Create classroom"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {stats.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-lg">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  Ages {r.age_min ?? "?"}–{r.age_max ?? "?"} · {branchLabel(r.branch)} {r.room && `· ${r.room}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[ragForKids(100 - Math.max(0, r.use - 90))]}`} />
                {!r.active && <Badge variant="outline">Inactive</Badge>}
                {canManage && <Button size="sm" variant="ghost" onClick={() => { setEditing(r.id); setForm({ ...empty, ...r, age_min: r.age_min ?? "", age_max: r.age_max ?? "", capacity: r.capacity ?? "", teacher_id: r.teacher_id ?? "", assistant_id: r.assistant_id ?? "" }); }}>Edit</Button>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Enrolled</p><p className="font-serif text-xl">{r.enrolled.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Present now</p><p className="font-serif text-xl">{r.present.length}/{r.capacity ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Child : adult</p><p className="font-serif text-xl">{r.ratio || 0}:1</p></div>
            </div>
            <div className="mt-3 h-2 w-full rounded bg-muted">
              <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, r.use)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{r.use}% of capacity in use</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {r.enrolled.filter((c: any) => c.allergies || c.medical_conditions || c.special_needs).map((c: any) => (
                <Badge key={c.id} variant="destructive">{c.full_name}: care alert</Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Teacher: {members.find((m) => m.id === r.teacher_id)?.full_name ?? "Unassigned"} · Assistant: {members.find((m) => m.id === r.assistant_id)?.full_name ?? "Unassigned"}
            </p>
          </Card>
        ))}
        {rooms.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No classrooms yet.</Card>}
      </div>
    </div>
  );
}
