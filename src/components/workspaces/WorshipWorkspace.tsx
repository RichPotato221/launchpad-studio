import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { WorkspaceProps } from "@/lib/workspaceRegistry";

export default function WorshipWorkspace({ departmentSlug }: WorkspaceProps) {
  const [songs, setSongs] = useState<any[]>([]);
  const [setlists, setSetlists] = useState<any[]>([]);
  const [song, setSong] = useState({ title: "", song_key: "", tempo: "", ccli_number: "", chord_chart_url: "", youtube_url: "" });
  const [setlist, setSetlist] = useState<{ service_date: string; songIds: string[] }>({ service_date: "", songIds: [] });

  const load = async () => {
    const [{ data: s }, { data: sl }] = await Promise.all([
      supabase.from("songs").select("*").eq("department_slug", departmentSlug).order("title"),
      supabase.from("setlists").select("*, setlist_songs(order_index, songs(title, song_key))").eq("department_slug", departmentSlug).order("service_date", { ascending: false }),
    ]);
    setSongs(s ?? []);
    setSetlists(sl ?? []);
  };
  useEffect(() => { load(); }, [departmentSlug]);

  const addSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("songs").insert({
      ...song, tempo: song.tempo ? Number(song.tempo) : null, department_slug: departmentSlug,
    });
    if (error) return toast.error(error.message);
    toast.success("Song added");
    setSong({ title: "", song_key: "", tempo: "", ccli_number: "", chord_chart_url: "", youtube_url: "" });
    load();
  };

  const createSetlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setlist.service_date) return toast.error("Service date required");
    const { data: created, error } = await supabase.from("setlists")
      .insert({ department_slug: departmentSlug, service_date: setlist.service_date })
      .select().single();
    if (error || !created) return toast.error(error?.message ?? "Failed");
    if (setlist.songIds.length) {
      const rows = setlist.songIds.map((song_id, i) => ({ setlist_id: created.id, song_id, order_index: i + 1 }));
      const ins = await supabase.from("setlist_songs").insert(rows);
      if (ins.error) return toast.error(ins.error.message);
    }
    toast.success("Set-list saved");
    setSetlist({ service_date: "", songIds: [] });
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Build a set-list</p>
        <form onSubmit={createSetlist} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Service date</Label>
            <Input type="date" value={setlist.service_date} onChange={(e) => setSetlist({ ...setlist, service_date: e.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <Label>Songs (Ctrl / Cmd + click for multi-select)</Label>
            <select
              multiple
              value={setlist.songIds}
              onChange={(e) => setSetlist({ ...setlist, songIds: Array.from(e.target.selectedOptions, (o) => o.value) })}
              className="mt-1 w-full min-h-32 rounded-md border border-input bg-background p-2 text-sm"
            >
              {songs.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.song_key || "no key"})</option>)}
            </select>
          </div>
          <div><Button type="submit">Save set-list</Button></div>
        </form>
      </Card>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent set-lists</p>
        <div className="mt-3 space-y-3">
          {setlists.map((sl) => (
            <Card key={sl.id} className="p-5">
              <p className="font-serif text-lg">{sl.service_date}</p>
              <ol className="mt-2 list-decimal pl-6 text-sm space-y-1">
                {(sl.setlist_songs ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index).map((ss: any, i: number) => (
                  <li key={i}>{ss.songs?.title} — {ss.songs?.song_key || "—"}</li>
                ))}
              </ol>
            </Card>
          ))}
          {setlists.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No set-lists yet.</Card>}
        </div>
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Add a song</p>
        <form onSubmit={addSong} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><Label>Title</Label><Input required value={song.title} onChange={(e) => setSong({ ...song, title: e.target.value })} /></div>
          <div><Label>Key</Label><Input value={song.song_key} onChange={(e) => setSong({ ...song, song_key: e.target.value })} /></div>
          <div><Label>Tempo (bpm)</Label><Input type="number" value={song.tempo} onChange={(e) => setSong({ ...song, tempo: e.target.value })} /></div>
          <div><Label>CCLI #</Label><Input value={song.ccli_number} onChange={(e) => setSong({ ...song, ccli_number: e.target.value })} /></div>
          <div><Label>Chord chart URL</Label><Input value={song.chord_chart_url} onChange={(e) => setSong({ ...song, chord_chart_url: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>YouTube URL</Label><Input value={song.youtube_url} onChange={(e) => setSong({ ...song, youtube_url: e.target.value })} /></div>
          <div><Button type="submit">Add song</Button></div>
        </form>
      </Card>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Song library</p>
        <div className="mt-3 divide-y rounded-md border border-border">
          {songs.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 text-sm">
              <span>{s.title} <span className="text-muted-foreground">({s.song_key || "—"}, {s.tempo || "—"} bpm)</span></span>
              <span className="space-x-3 text-xs">
                {s.chord_chart_url && <a className="underline" href={s.chord_chart_url} target="_blank" rel="noreferrer">Chart</a>}
                {s.youtube_url && <a className="underline" href={s.youtube_url} target="_blank" rel="noreferrer">YouTube</a>}
              </span>
            </div>
          ))}
          {songs.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No songs yet.</div>}
        </div>
      </div>
    </div>
  );
}
