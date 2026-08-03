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
import { Printer } from "lucide-react";
import { fmtDate, titleCase } from "@/lib/finance";
import { AGE_GROUPS, LESSON_STATUSES, labelFor } from "@/lib/kids";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

const empty = {
  title: "", scripture: "", theme: "", age_group: "", objectives: "", memory_verse: "", teaching_notes: "",
  activities: "", games: "", crafts: "", video_url: "", songs: "", discussion_questions: "", homework: "",
  assessment: "", resources_url: "", scheduled_date: "", status: "draft",
};

/** MODULES 5 & 6 — Curriculum, lesson planning and delivery tracking. */
export default function CurriculumModule({ canManage, currentUserId }: Props) {
  const [lessons, setLessons] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [delivery, setDelivery] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [dForm, setDForm] = useState<any>({ classroom_id: "", delivered_on: new Date().toISOString().slice(0, 10), attendance_count: "", memory_verses_completed: "", parent_summary_sent: false, notes: "" });

  const load = async () => {
    const [l, r, d] = await Promise.all([
      sb.from("kids_lessons").select("*").order("scheduled_date", { ascending: false, nullsFirst: false }),
      sb.from("kids_classrooms").select("id, name").order("name"),
      sb.from("kids_lesson_delivery").select("*").order("delivered_on", { ascending: false }),
    ]);
    setLessons(l.data ?? []); setRooms(r.data ?? []); setDelivery(d.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form, scheduled_date: form.scheduled_date || null, age_group: form.age_group || null };
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    const res = editing
      ? await sb.from("kids_lessons").update(payload).eq("id", editing)
      : await sb.from("kids_lessons").insert({ ...payload, created_by: currentUserId });
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Lesson updated" : "Lesson added to curriculum");
    setForm(empty); setEditing(null); load();
  };

  const logDelivery = async (lessonId: string) => {
    const { error } = await sb.from("kids_lesson_delivery").insert({
      lesson_id: lessonId,
      classroom_id: dForm.classroom_id || null,
      delivered_on: dForm.delivered_on,
      taught_by: currentUserId,
      attendance_count: dForm.attendance_count === "" ? null : Number(dForm.attendance_count),
      memory_verses_completed: dForm.memory_verses_completed === "" ? null : Number(dForm.memory_verses_completed),
      parent_summary_sent: dForm.parent_summary_sent,
      notes: dForm.notes || null,
    });
    if (error) return toast.error(error.message);
    await sb.from("kids_lessons").update({ status: "taught" }).eq("id", lessonId);
    toast.success("Lesson delivery recorded");
    setDForm({ ...dForm, attendance_count: "", memory_verses_completed: "", notes: "" });
    load();
  };

  const field = (k: string, label: string, rows = 2) => (
    <div className="md:col-span-2"><Label>{label}</Label><Textarea rows={rows} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
  );

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editing ? "Edit lesson" : "Build a lesson"}</p>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Scripture</Label><Input value={form.scripture ?? ""} onChange={(e) => setForm({ ...form, scripture: e.target.value })} placeholder="Proverbs 22:6" /></div>
            <div><Label>Theme</Label><Input value={form.theme ?? ""} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></div>
            <div>
              <Label>Age group</Label>
              <Select value={form.age_group || undefined} onValueChange={(v) => setForm({ ...form, age_group: v })}>
                <SelectTrigger><SelectValue placeholder="All ages" /></SelectTrigger>
                <SelectContent>{AGE_GROUPS.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Scheduled date</Label><Input type="date" value={form.scheduled_date ?? ""} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LESSON_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Memory verse</Label><Input value={form.memory_verse ?? ""} onChange={(e) => setForm({ ...form, memory_verse: e.target.value })} /></div>
            {field("objectives", "Learning objectives")}
            {field("teaching_notes", "Teaching notes / lesson plan", 4)}
            {field("activities", "Activities")}
            {field("games", "Games")}
            {field("crafts", "Crafts")}
            {field("songs", "Songs & worship")}
            {field("discussion_questions", "Discussion questions")}
            {field("homework", "Home / family devotion")}
            {field("assessment", "Assessment & memory verse check")}
            <div><Label>Video URL</Label><Input value={form.video_url ?? ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
            <div><Label>Resource pack URL</Label><Input value={form.resources_url ?? ""} onChange={(e) => setForm({ ...form, resources_url: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">{editing ? "Save lesson" : "Add lesson"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3">
        {lessons.map((l) => {
          const ds = delivery.filter((d) => d.lesson_id === l.id);
          const isOpen = open === l.id;
          return (
            <Card key={l.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-lg">{l.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.scripture} {l.theme && `· ${l.theme}`} · {labelFor(AGE_GROUPS, l.age_group)} {l.scheduled_date && `· ${fmtDate(l.scheduled_date)}`}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <Badge variant="outline">{titleCase(l.status)}</Badge>
                    {ds.length > 0 && <Badge variant="secondary">Taught {ds.length}×</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpen(isOpen ? null : l.id)}>{isOpen ? "Close" : "Open lesson"}</Button>
                  {canManage && <Button size="sm" variant="ghost" onClick={() => { setEditing(l.id); setForm({ ...empty, ...l, scheduled_date: l.scheduled_date ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>}
                </div>
              </div>

              {isOpen && (
                <div className="mt-5 space-y-4 border-t border-border/60 pt-5 text-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[["Objectives", l.objectives], ["Memory verse", l.memory_verse], ["Teaching notes", l.teaching_notes], ["Activities", l.activities],
                      ["Games", l.games], ["Crafts", l.crafts], ["Songs", l.songs], ["Discussion questions", l.discussion_questions],
                      ["Home devotion", l.homework], ["Assessment", l.assessment]].map(([k, v]) => v ? (
                      <div key={k as string}>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">{k}</p>
                        <p className="whitespace-pre-wrap">{v as string}</p>
                      </div>
                    ) : null)}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {l.video_url && <a className="text-sm underline" href={l.video_url} target="_blank" rel="noreferrer">Teaching video</a>}
                    {l.resources_url && <a className="text-sm underline" href={l.resources_url} target="_blank" rel="noreferrer">Resource pack</a>}
                    <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print lesson</Button>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Delivery log</p>
                    {ds.map((d) => (
                      <p key={d.id} className="text-muted-foreground">
                        {fmtDate(d.delivered_on)} · {rooms.find((r) => r.id === d.classroom_id)?.name ?? "—"} · {d.attendance_count ?? 0} present · {d.memory_verses_completed ?? 0} verses {d.parent_summary_sent && "· parent summary sent"}
                      </p>
                    ))}
                    {ds.length === 0 && <p className="text-muted-foreground">Not yet taught.</p>}
                  </div>

                  {canManage && (
                    <div className="grid gap-2 md:grid-cols-5">
                      <Select value={dForm.classroom_id || undefined} onValueChange={(v) => setDForm({ ...dForm, classroom_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Classroom" /></SelectTrigger>
                        <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="date" value={dForm.delivered_on} onChange={(e) => setDForm({ ...dForm, delivered_on: e.target.value })} />
                      <Input type="number" placeholder="Attendance" value={dForm.attendance_count} onChange={(e) => setDForm({ ...dForm, attendance_count: e.target.value })} />
                      <Input type="number" placeholder="Verses done" value={dForm.memory_verses_completed} onChange={(e) => setDForm({ ...dForm, memory_verses_completed: e.target.value })} />
                      <Button size="sm" onClick={() => logDelivery(l.id)}>Log delivery</Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {lessons.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No lessons in the curriculum yet.</Card>}
      </div>
    </div>
  );
}
