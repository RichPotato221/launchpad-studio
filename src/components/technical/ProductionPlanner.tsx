import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import {
  PRODUCTION_STATUSES, READINESS_FLAGS, TECH_SERVICE_TYPES,
  labelFor, productionReadiness, ragForScore, titleish, today,
} from "@/lib/technical";

const sb = supabase as any;

const EMPTY = {
  title: "", theme: "", service_date: today(), start_time: "", venue: "", service_type: "sunday_service",
  preacher: "", worship_leader: "", audio_plan: "", lighting_plan: "", camera_plan: "",
  livestream_plan: "", presentation_plan: "", technical_notes: "", status: "planning",
};

/** MODULE 2 — Service production planning & technical readiness checklist. */
export default function ProductionPlanner({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    const { data } = await sb.from("tech_productions").select("*").order("service_date", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const upcoming = useMemo(() => rows.filter((r) => r.service_date >= today()), [rows]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give the production a title");
    const payload: any = { ...form, start_time: form.start_time || null, created_by: currentUserId };
    const { error } = editing
      ? await sb.from("tech_productions").update(payload).eq("id", editing)
      : await sb.from("tech_productions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Production updated" : "Production planned");
    setForm({ ...EMPTY }); setEditing(null); load();
  };

  const toggleFlag = async (row: any, key: string) => {
    const { error } = await sb.from("tech_productions").update({ [key]: !row[key] }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const edit = (r: any) => {
    setEditing(r.id);
    setForm({
      title: r.title ?? "", theme: r.theme ?? "", service_date: r.service_date, start_time: r.start_time?.slice(0, 5) ?? "",
      venue: r.venue ?? "", service_type: r.service_type ?? "sunday_service", preacher: r.preacher ?? "",
      worship_leader: r.worship_leader ?? "", audio_plan: r.audio_plan ?? "", lighting_plan: r.lighting_plan ?? "",
      camera_plan: r.camera_plan ?? "", livestream_plan: r.livestream_plan ?? "", presentation_plan: r.presentation_plan ?? "",
      technical_notes: r.technical_notes ?? "", status: r.status ?? "planning",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">{editing ? "Edit production" : "Plan a service production"}</h3>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sunday Celebration Service" />
            </div>
            <div>
              <Label>Service type</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}>
                {TECH_SERVICE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} /></div>
            <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div><Label>Theme</Label><Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></div>
            <div><Label>Preacher</Label><Input value={form.preacher} onChange={(e) => setForm({ ...form, preacher: e.target.value })} /></div>
            <div><Label>Worship leader</Label><Input value={form.worship_leader} onChange={(e) => setForm({ ...form, worship_leader: e.target.value })} /></div>
            <div><Label>Audio plan</Label><Textarea rows={2} value={form.audio_plan} onChange={(e) => setForm({ ...form, audio_plan: e.target.value })} /></div>
            <div><Label>Lighting plan</Label><Textarea rows={2} value={form.lighting_plan} onChange={(e) => setForm({ ...form, lighting_plan: e.target.value })} /></div>
            <div><Label>Camera plan</Label><Textarea rows={2} value={form.camera_plan} onChange={(e) => setForm({ ...form, camera_plan: e.target.value })} /></div>
            <div><Label>Livestream plan</Label><Textarea rows={2} value={form.livestream_plan} onChange={(e) => setForm({ ...form, livestream_plan: e.target.value })} /></div>
            <div><Label>Presentation / slides</Label><Textarea rows={2} value={form.presentation_plan} onChange={(e) => setForm({ ...form, presentation_plan: e.target.value })} /></div>
            <div><Label>Technical notes</Label><Textarea rows={2} value={form.technical_notes} onChange={(e) => setForm({ ...form, technical_notes: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PRODUCTION_STATUSES.map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-3">
              <Button type="submit">{editing ? "Save changes" : "Add production"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ ...EMPTY }); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {upcoming.length} upcoming · {rows.length} total productions
        </p>
        {rows.map((r) => {
          const ready = productionReadiness(r);
          return (
            <Card key={r.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-serif text-lg">{r.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {labelFor(TECH_SERVICE_TYPES, r.service_type)} · {fmtDate(r.service_date)}
                    {r.start_time ? ` · ${r.start_time.slice(0, 5)}` : ""}{r.venue ? ` · ${r.venue}` : ""}
                  </p>
                  {r.theme && <p className="text-sm text-muted-foreground">Theme: {r.theme}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{titleish(r.status)}</Badge>
                  <Badge variant="outline" className={RAG_CLASS[ragForScore(ready.pct)]}>{ready.pct}% ready</Badge>
                  {canManage && <Button size="sm" variant="outline" onClick={() => edit(r)}>Edit</Button>}
                </div>
              </div>
              <Progress value={ready.pct} className="mt-4" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {READINESS_FLAGS.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={!!r[f.key]} disabled={!canManage} onCheckedChange={() => toggleFlag(r, f.key)} />
                    <span className={r[f.key] ? "" : "text-muted-foreground"}>{f.label}</span>
                  </label>
                ))}
              </div>
              {(r.audio_plan || r.livestream_plan || r.technical_notes) && (
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  {r.audio_plan && <p><span className="text-muted-foreground">Audio: </span>{r.audio_plan}</p>}
                  {r.lighting_plan && <p><span className="text-muted-foreground">Lighting: </span>{r.lighting_plan}</p>}
                  {r.camera_plan && <p><span className="text-muted-foreground">Cameras: </span>{r.camera_plan}</p>}
                  {r.livestream_plan && <p><span className="text-muted-foreground">Livestream: </span>{r.livestream_plan}</p>}
                  {r.presentation_plan && <p><span className="text-muted-foreground">Presentation: </span>{r.presentation_plan}</p>}
                  {r.technical_notes && <p><span className="text-muted-foreground">Notes: </span>{r.technical_notes}</p>}
                </div>
              )}
            </Card>
          );
        })}
        {!rows.length && <Card className="p-8 text-center text-sm text-muted-foreground">No productions planned yet.</Card>}
      </div>
    </div>
  );
}
