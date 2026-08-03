import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { fmtDate, exportRows } from "@/lib/finance";
import {
  DEFAULT_SERVICE_FLOW,
  DEFAULT_TECH_CHECKLIST,
  FLOW_ITEM_TYPES,
  labelFor,
  mmss,
  SERVICE_STATUSES,
  SERVICE_TYPES,
  SET_SEGMENTS,
  serviceReadiness,
  TECH_CATEGORIES,
  today,
} from "@/lib/worship";

const sb = supabase as any;

/** MODULES 2, 3 & 11 — Service Planner, Worship Set Builder and Technical checklist. */
export default function ServicePlanner({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [services, setServices] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [setSongs, setSetSongs] = useState<any[]>([]);
  const [tech, setTech] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "Sunday Service", service_date: today(), start_time: "09:00", service_type: "sunday",
    theme: "", sermon_title: "", sermon_scriptures: "", preacher: "", worship_leader: "", venue: "",
  });
  const [newItem, setNewItem] = useState({ item_type: "worship_set", title: "", detail: "", duration_min: 10, responsible: "" });
  const [newSong, setNewSong] = useState({ song_id: "", segment: "worship", song_key: "", transition_note: "" });
  const [newTech, setNewTech] = useState({ category: "sound", label: "", detail: "", assigned_to: "" });

  const loadServices = async () => {
    const { data } = await sb.from("worship_services").select("*").order("service_date", { ascending: false });
    setServices(data ?? []);
    if (!selectedId && data?.length) setSelectedId(data[0].id);
  };

  const loadDetail = async (id: string) => {
    if (!id) return;
    const [i, s, t] = await Promise.all([
      sb.from("worship_service_items").select("*").eq("service_id", id).order("order_index"),
      sb.from("worship_set_songs").select("*, songs(title, artist, song_key, tempo, duration_seconds, ccli_number)").eq("service_id", id).order("order_index"),
      sb.from("worship_tech_items").select("*").eq("service_id", id).order("category"),
    ]);
    setItems(i.data ?? []); setSetSongs(s.data ?? []); setTech(t.data ?? []);
  };

  useEffect(() => {
    loadServices();
    sb.from("songs").select("*").order("title").then(({ data }: any) => setLibrary(data ?? []));
  }, []);
  useEffect(() => { loadDetail(selectedId); }, [selectedId]);

  const service = useMemo(() => services.find((s) => s.id === selectedId) ?? null, [services, selectedId]);
  const totalMinutes = items.reduce((a, i) => a + Number(i.duration_min ?? 0), 0);
  const setSeconds = setSongs.reduce((a, s) => a + Number(s.duration_seconds ?? s.songs?.duration_seconds ?? 0), 0);

  const createService = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { data, error } = await sb.from("worship_services").insert({ ...form, created_by: currentUserId }).select().single();
    setCreating(false);
    if (error) return toast.error(error.message);
    // seed the standard running order + technical checklist
    const flow = DEFAULT_SERVICE_FLOW.map((key, idx) => {
      const meta = FLOW_ITEM_TYPES.find((f) => f.key === key)!;
      return { service_id: data.id, order_index: idx + 1, item_type: key, title: meta.label, duration_min: meta.minutes };
    });
    await sb.from("worship_service_items").insert(flow);
    await sb.from("worship_tech_items").insert(DEFAULT_TECH_CHECKLIST.map((c) => ({ ...c, service_id: data.id })));
    toast.success("Service plan created with the standard running order");
    setForm({ ...form, title: "Sunday Service", theme: "", sermon_title: "", sermon_scriptures: "", preacher: "" });
    await loadServices();
    setSelectedId(data.id);
    loadDetail(data.id);
  };

  const patchService = async (patch: Record<string, any>) => {
    const { error } = await sb.from("worship_services").update(patch).eq("id", selectedId);
    if (error) return toast.error(error.message);
    setServices((prev) => prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)));
  };

  const move = async (list: any[], setList: (v: any[]) => void, table: string, index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((r, i) => ({ ...r, order_index: i + 1 }));
    setList(renumbered);
    await Promise.all(renumbered.map((r) => sb.from(table).update({ order_index: r.order_index }).eq("id", r.id)));
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const meta = FLOW_ITEM_TYPES.find((f) => f.key === newItem.item_type);
    const { error } = await sb.from("worship_service_items").insert({
      service_id: selectedId, order_index: items.length + 1, item_type: newItem.item_type,
      title: newItem.title || meta?.label || "Item", detail: newItem.detail || null,
      duration_min: Number(newItem.duration_min) || 5, responsible: newItem.responsible || null,
    });
    if (error) return toast.error(error.message);
    setNewItem({ item_type: "worship_set", title: "", detail: "", duration_min: 10, responsible: "" });
    loadDetail(selectedId);
  };

  const addSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.song_id) return toast.error("Choose a song");
    const song = library.find((s) => s.id === newSong.song_id);
    const { error } = await sb.from("worship_set_songs").insert({
      service_id: selectedId, song_id: newSong.song_id, order_index: setSongs.length + 1,
      segment: newSong.segment, song_key: newSong.song_key || song?.song_key || null,
      duration_seconds: song?.duration_seconds ?? null, transition_note: newSong.transition_note || null,
    });
    if (error) return toast.error(error.message);
    await sb.from("songs").update({ times_used: Number(song?.times_used ?? 0) + 1, last_used_on: service?.service_date ?? today() }).eq("id", newSong.song_id);
    setNewSong({ song_id: "", segment: "worship", song_key: "", transition_note: "" });
    loadDetail(selectedId);
  };

  const removeRow = async (table: string, id: string) => {
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadDetail(selectedId);
  };

  const addTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTech.label.trim()) return toast.error("Describe the technical item");
    const { error } = await sb.from("worship_tech_items").insert({ ...newTech, service_id: selectedId });
    if (error) return toast.error(error.message);
    setNewTech({ category: "sound", label: "", detail: "", assigned_to: "" });
    loadDetail(selectedId);
  };

  const toggleTech = async (row: any) => {
    await sb.from("worship_tech_items").update({ done: !row.done }).eq("id", row.id);
    setTech((prev) => prev.map((t) => (t.id === row.id ? { ...t, done: !row.done } : t)));
  };

  const exportPlan = () => {
    if (!service) return;
    exportRows(
      `worship-service-plan-${service.service_date}`,
      ["Order", "Type", "Item", "Detail", "Minutes", "Responsible"],
      items.map((i) => [i.order_index, labelFor(FLOW_ITEM_TYPES, i.item_type), i.title, i.detail, i.duration_min, i.responsible]),
    );
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6 print:hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Plan a service</p>
          <form onSubmit={createService} className="mt-4 grid gap-4 md:grid-cols-3">
            <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" required value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} /></div>
            <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div>
              <Label>Service type</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}>
                {SERVICE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div><Label>Theme</Label><Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div><Label>Sermon title</Label><Input value={form.sermon_title} onChange={(e) => setForm({ ...form, sermon_title: e.target.value })} /></div>
            <div><Label>Preacher</Label><Input value={form.preacher} onChange={(e) => setForm({ ...form, preacher: e.target.value })} /></div>
            <div><Label>Worship leader</Label><Input value={form.worship_leader} onChange={(e) => setForm({ ...form, worship_leader: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Sermon scriptures</Label><Input value={form.sermon_scriptures} onChange={(e) => setForm({ ...form, sermon_scriptures: e.target.value })} placeholder="e.g. Hebrews 11:1–6; Romans 10:17" /></div>
            <div><Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create service plan"}</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-64 flex-1">
            <Label>Service</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">Select a service…</option>
              {services.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.service_date)} — {s.title}</option>)}
            </select>
          </div>
          {service && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{serviceReadiness(service).pct}% ready</Badge>
              <Badge variant="outline">Run time {totalMinutes} min</Badge>
              <Badge variant="outline">Set {mmss(setSeconds)}</Badge>
              <Button variant="outline" size="sm" onClick={exportPlan}>Export plan (CSV)</Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>Print / PDF</Button>
            </div>
          )}
        </div>

        {service && canManage && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div>
              <Label>Status</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={service.status} onChange={(e) => patchService({ status: e.target.value })}>
                {SERVICE_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 grid gap-2 sm:grid-cols-2">
              {[
                ["set_approved", "Worship set approved"],
                ["scriptures_loaded", "Scriptures loaded"],
                ["stage_layout_ready", "Stage layout ready"],
                ["tech_team_confirmed", "Technical team confirmed"],
                ["livestream_ready", "Livestream ready"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <Checkbox checked={!!service[key]} onCheckedChange={(v) => patchService({ [key]: !!v })} />
                  {label}
                </label>
              ))}
            </div>
            <div className="md:col-span-3">
              <Label>Backup plan</Label>
              <Textarea rows={2} defaultValue={service.backup_plan ?? ""} onBlur={(e) => patchService({ backup_plan: e.target.value })} placeholder="Power failure, missing musician, livestream failure…" />
            </div>
          </div>
        )}
      </Card>

      {service && (
        <>
          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Service flow ({totalMinutes} min)</p>
            <div className="mt-3 divide-y rounded-md border border-border">
              {items.map((i, idx) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-medium">{i.order_index}. {i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelFor(FLOW_ITEM_TYPES, i.item_type)} · {i.duration_min} min{i.responsible ? ` · ${i.responsible}` : ""}
                      {i.detail ? ` · ${i.detail}` : ""}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 print:hidden">
                      <Button size="icon" variant="ghost" onClick={() => move(items, setItems, "worship_service_items", idx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => move(items, setItems, "worship_service_items", idx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => removeRow("worship_service_items", i.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No flow items yet.</div>}
            </div>
            {canManage && (
              <form onSubmit={addItem} className="mt-4 grid gap-3 md:grid-cols-5 print:hidden">
                <div>
                  <Label>Type</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newItem.item_type} onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })}>
                    {FLOW_ITEM_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div><Label>Title</Label><Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} /></div>
                <div><Label>Minutes</Label><Input type="number" value={newItem.duration_min} onChange={(e) => setNewItem({ ...newItem, duration_min: Number(e.target.value) })} /></div>
                <div><Label>Responsible</Label><Input value={newItem.responsible} onChange={(e) => setNewItem({ ...newItem, responsible: e.target.value })} /></div>
                <div className="flex items-end"><Button type="submit">Add item</Button></div>
              </form>
            )}
          </Card>

          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Worship set builder ({mmss(setSeconds)})</p>
            <div className="mt-3 divide-y rounded-md border border-border">
              {setSongs.map((s, idx) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-medium">{s.order_index}. {s.songs?.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelFor(SET_SEGMENTS, s.segment)} · key {s.song_key || s.songs?.song_key || "—"} · {s.songs?.tempo ?? "—"} bpm
                      {s.songs?.ccli_number ? ` · CCLI ${s.songs.ccli_number}` : ""}
                      {s.transition_note ? ` · ${s.transition_note}` : ""}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 print:hidden">
                      <Button size="icon" variant="ghost" onClick={() => move(setSongs, setSetSongs, "worship_set_songs", idx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => move(setSongs, setSetSongs, "worship_set_songs", idx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => removeRow("worship_set_songs", s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              ))}
              {setSongs.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No songs in this set yet.</div>}
            </div>
            {canManage && (
              <form onSubmit={addSong} className="mt-4 grid gap-3 md:grid-cols-5 print:hidden">
                <div className="md:col-span-2">
                  <Label>Song</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newSong.song_id} onChange={(e) => setNewSong({ ...newSong, song_id: e.target.value })}>
                    <option value="">Choose…</option>
                    {library.map((s) => <option key={s.id} value={s.id}>{s.title}{s.song_key ? ` (${s.song_key})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Segment</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newSong.segment} onChange={(e) => setNewSong({ ...newSong, segment: e.target.value })}>
                    {SET_SEGMENTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div><Label>Key</Label><Input value={newSong.song_key} onChange={(e) => setNewSong({ ...newSong, song_key: e.target.value })} /></div>
                <div className="flex items-end"><Button type="submit">Add to set</Button></div>
                <div className="md:col-span-5"><Label>Transition note</Label><Input value={newSong.transition_note} onChange={(e) => setNewSong({ ...newSong, transition_note: e.target.value })} placeholder="e.g. modulate to A, hold pad under scripture reading" /></div>
              </form>
            )}
          </Card>

          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Sound &amp; technical checklist</p>
            <div className="mt-3 divide-y rounded-md border border-border">
              {tech.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <label className="flex items-center gap-3">
                    <Checkbox checked={t.done} disabled={!canManage} onCheckedChange={() => toggleTech(t)} />
                    <span>
                      <span className="font-medium">{t.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {labelFor(TECH_CATEGORIES, t.category)}{t.assigned_to ? ` · ${t.assigned_to}` : ""}{t.detail ? ` · ${t.detail}` : ""}
                      </span>
                    </span>
                  </label>
                  {canManage && <Button size="icon" variant="ghost" className="print:hidden" onClick={() => removeRow("worship_tech_items", t.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              {tech.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No technical items yet.</div>}
            </div>
            {canManage && (
              <form onSubmit={addTech} className="mt-4 grid gap-3 md:grid-cols-4 print:hidden">
                <div>
                  <Label>Category</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={newTech.category} onChange={(e) => setNewTech({ ...newTech, category: e.target.value })}>
                    {TECH_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div><Label>Item</Label><Input value={newTech.label} onChange={(e) => setNewTech({ ...newTech, label: e.target.value })} /></div>
                <div><Label>Assigned to</Label><Input value={newTech.assigned_to} onChange={(e) => setNewTech({ ...newTech, assigned_to: e.target.value })} /></div>
                <div className="flex items-end"><Button type="submit">Add check</Button></div>
              </form>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
