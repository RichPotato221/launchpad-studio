import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { exportRows, fmtDate } from "@/lib/finance";
import { mmss } from "@/lib/worship";

const sb = supabase as any;

const EMPTY = {
  title: "", artist: "", composer: "", ccli_number: "", song_key: "", tempo: "", time_signature: "4/4",
  arrangement: "", duration_seconds: "", language: "English", scripture_theme: "", themes: "", tags: "",
  lyrics: "", chord_chart_url: "", sheet_music_url: "", mp3_url: "", multitrack_url: "", practice_url: "",
  youtube_url: "", licence_notes: "", notes: "",
};

/** MODULE 4 — Music Library (songs, charts, tracks, licensing, versions). */
export default function MusicLibrary({ canManage, departmentSlug }: { canManage: boolean; departmentSlug: string }) {
  const [songs, setSongs] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "favourites" | "recent">("all");
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    const { data } = await sb.from("songs").select("*").order("title");
    setSongs(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return songs.filter((s) => {
      if (filter === "favourites" && !s.is_favourite) return false;
      if (filter === "recent" && !s.last_used_on) return false;
      if (!term) return true;
      return [s.title, s.artist, s.composer, s.scripture_theme, s.song_key, s.language, (s.themes ?? []).join(" "), (s.tags ?? []).join(" ")]
        .filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [songs, q, filter]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      department_slug: departmentSlug || "worship",
      tempo: form.tempo ? Number(form.tempo) : null,
      duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
      themes: form.themes ? form.themes.split(",").map((t) => t.trim()).filter(Boolean) : null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
    };
    if (editing) {
      const current = songs.find((s) => s.id === editing);
      payload.version = Number(current?.version ?? 1) + 1;
      const { error } = await sb.from("songs").update(payload).eq("id", editing);
      if (error) return toast.error(error.message);
      toast.success(`Song updated (v${payload.version})`);
    } else {
      const { error } = await sb.from("songs").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Song added to the library");
    }
    setForm({ ...EMPTY }); setEditing(null); load();
  };

  const edit = (s: any) => {
    setEditing(s.id);
    setForm({
      ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] ?? ""])),
      tempo: s.tempo ?? "", duration_seconds: s.duration_seconds ?? "",
      themes: (s.themes ?? []).join(", "), tags: (s.tags ?? []).join(", "),
    } as any);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleFav = async (s: any) => {
    await sb.from("songs").update({ is_favourite: !s.is_favourite }).eq("id", s.id);
    setSongs((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_favourite: !s.is_favourite } : x)));
  };

  const exportLibrary = () =>
    exportRows("worship-music-library",
      ["Title", "Artist", "Key", "BPM", "Time", "Duration", "CCLI", "Language", "Scripture theme", "Times used", "Last used", "Version"],
      filtered.map((s) => [s.title, s.artist, s.song_key, s.tempo, s.time_signature, mmss(s.duration_seconds), s.ccli_number, s.language, s.scripture_theme, s.times_used, s.last_used_on, s.version]));

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6 print:hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editing ? "Edit song" : "Add a song"}</p>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Artist</Label><Input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} /></div>
            <div><Label>Composer</Label><Input value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} /></div>
            <div><Label>CCLI number</Label><Input value={form.ccli_number} onChange={(e) => setForm({ ...form, ccli_number: e.target.value })} /></div>
            <div><Label>Key</Label><Input value={form.song_key} onChange={(e) => setForm({ ...form, song_key: e.target.value })} /></div>
            <div><Label>BPM</Label><Input type="number" value={form.tempo} onChange={(e) => setForm({ ...form, tempo: e.target.value })} /></div>
            <div><Label>Time signature</Label><Input value={form.time_signature} onChange={(e) => setForm({ ...form, time_signature: e.target.value })} /></div>
            <div><Label>Duration (seconds)</Label><Input type="number" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} /></div>
            <div><Label>Arrangement</Label><Input value={form.arrangement} onChange={(e) => setForm({ ...form, arrangement: e.target.value })} placeholder="V1 C V2 C B C C" /></div>
            <div><Label>Language</Label><Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
            <div><Label>Scripture theme</Label><Input value={form.scripture_theme} onChange={(e) => setForm({ ...form, scripture_theme: e.target.value })} /></div>
            <div><Label>Themes (comma separated)</Label><Input value={form.themes} onChange={(e) => setForm({ ...form, themes: e.target.value })} /></div>
            <div><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <div><Label>Chord chart URL</Label><Input value={form.chord_chart_url} onChange={(e) => setForm({ ...form, chord_chart_url: e.target.value })} /></div>
            <div><Label>Sheet music URL</Label><Input value={form.sheet_music_url} onChange={(e) => setForm({ ...form, sheet_music_url: e.target.value })} /></div>
            <div><Label>MP3 demo URL</Label><Input value={form.mp3_url} onChange={(e) => setForm({ ...form, mp3_url: e.target.value })} /></div>
            <div><Label>Multitracks URL</Label><Input value={form.multitrack_url} onChange={(e) => setForm({ ...form, multitrack_url: e.target.value })} /></div>
            <div><Label>Practice recording URL</Label><Input value={form.practice_url} onChange={(e) => setForm({ ...form, practice_url: e.target.value })} /></div>
            <div><Label>YouTube URL</Label><Input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Licensing information</Label><Input value={form.licence_notes} onChange={(e) => setForm({ ...form, licence_notes: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Lyrics</Label><Textarea rows={5} value={form.lyrics} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button type="submit">{editing ? "Save new version" : "Add song"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm({ ...EMPTY }); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1"><Label>Search</Label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, artist, theme, key, tag…" /></div>
          <div>
            <Label>Filter</Label>
            <select className="mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="all">All songs</option>
              <option value="favourites">Favourites</option>
              <option value="recent">Recently used</option>
            </select>
          </div>
          <Button variant="outline" onClick={exportLibrary}>Export (Excel/CSV)</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{filtered.length} of {songs.length} songs</p>
      </Card>

      <div className="space-y-3">
        {filtered.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-lg">{s.title} <span className="text-sm text-muted-foreground">{s.artist ? `· ${s.artist}` : ""}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Key {s.song_key || "—"} · {s.tempo || "—"} bpm · {s.time_signature || "—"} · {mmss(s.duration_seconds)} · {s.language || "—"}
                  {s.ccli_number ? ` · CCLI ${s.ccli_number}` : ""} · v{s.version ?? 1}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used {s.times_used ?? 0}× {s.last_used_on ? `· last ${fmtDate(s.last_used_on)}` : ""}
                  {s.scripture_theme ? ` · ${s.scripture_theme}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(s.themes ?? []).map((t: string) => <Badge key={t} variant="outline">{t}</Badge>)}
                  {(s.tags ?? []).map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs print:hidden">
                {canManage && (
                  <Button size="icon" variant="ghost" onClick={() => toggleFav(s)} aria-label="Toggle favourite">
                    <Star className={`h-4 w-4 ${s.is_favourite ? "fill-current" : ""}`} />
                  </Button>
                )}
                {s.chord_chart_url && <a className="underline" href={s.chord_chart_url} target="_blank" rel="noreferrer">Chart</a>}
                {s.sheet_music_url && <a className="underline" href={s.sheet_music_url} target="_blank" rel="noreferrer">Sheet</a>}
                {s.mp3_url && <a className="underline" href={s.mp3_url} target="_blank" rel="noreferrer">MP3</a>}
                {s.multitrack_url && <a className="underline" href={s.multitrack_url} target="_blank" rel="noreferrer">Multitracks</a>}
                {s.practice_url && <a className="underline" href={s.practice_url} target="_blank" rel="noreferrer">Practice</a>}
                {s.youtube_url && <a className="underline" href={s.youtube_url} target="_blank" rel="noreferrer">Video</a>}
                <Button size="sm" variant="outline" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "Hide" : "Lyrics"}</Button>
                {canManage && <Button size="sm" variant="outline" onClick={() => edit(s)}>Edit</Button>}
              </div>
            </div>
            {open === s.id && (
              <pre className="mt-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">{s.lyrics || "No lyrics captured yet."}</pre>
            )}
            {s.licence_notes && <p className="mt-2 text-xs text-muted-foreground">Licensing: {s.licence_notes}</p>}
          </Card>
        ))}
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No songs match your search.</Card>}
      </div>
    </div>
  );
}
