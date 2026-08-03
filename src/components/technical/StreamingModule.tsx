import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import { STREAM_HEALTH, STREAM_PLATFORMS, STREAM_STATUSES, ragForScore, streamHealthScore, titleish, today } from "@/lib/technical";

const sb = supabase as any;

const EMPTY = {
  production_id: "", stream_date: today(), platform: "youtube", status: "scheduled", health: "good",
  bitrate_kbps: "", resolution: "1080p", internet_mbps: "", encoder: "", camera_status: "",
  audio_feed_ok: true, peak_viewers: "", total_views: "", uptime_pct: "", recording_url: "", incident_notes: "",
};

/** MODULE 7 — Livestream & broadcast operations. */
export default function StreamingModule({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [productions, setProductions] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    const [s, p] = await Promise.all([
      sb.from("tech_streams").select("*").order("stream_date", { ascending: false }),
      sb.from("tech_productions").select("id, title, service_date").order("service_date", { ascending: false }).limit(50),
    ]);
    setRows(s.data ?? []); setProductions(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!rows.length) return { uptime: 100, health: 100, viewers: 0, failures: 0 };
    return {
      uptime: Math.round(rows.reduce((s, r) => s + Number(r.uptime_pct ?? 100), 0) / rows.length),
      health: Math.round(rows.reduce((s, r) => s + streamHealthScore(r), 0) / rows.length),
      viewers: rows.reduce((s, r) => s + Number(r.peak_viewers ?? 0), 0),
      failures: rows.filter((r) => r.status === "failed").length,
    };
  }, [rows]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      production_id: form.production_id || null,
      bitrate_kbps: form.bitrate_kbps ? Number(form.bitrate_kbps) : null,
      internet_mbps: form.internet_mbps ? Number(form.internet_mbps) : null,
      peak_viewers: form.peak_viewers ? Number(form.peak_viewers) : null,
      total_views: form.total_views ? Number(form.total_views) : null,
      uptime_pct: form.uptime_pct ? Number(form.uptime_pct) : null,
    };
    const { error } = await sb.from("tech_streams").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Stream logged"); setForm({ ...EMPTY }); load();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Average uptime</p>
          <p className="font-serif text-2xl">{stats.uptime}%</p>
          <Progress value={stats.uptime} className="mt-2" />
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Stream health score</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-serif text-2xl">{stats.health}</p>
            <Badge variant="outline" className={RAG_CLASS[ragForScore(stats.health, 80, 60)]}>{ragForScore(stats.health, 80, 60).toUpperCase()}</Badge>
          </div>
        </Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Peak viewers (total)</p><p className="font-serif text-2xl">{stats.viewers.toLocaleString()}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Failed broadcasts</p><p className="font-serif text-2xl">{stats.failures}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Log a broadcast</h3>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Linked production</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.production_id} onChange={(e) => setForm({ ...form, production_id: e.target.value })}>
                <option value="">Not linked</option>
                {productions.map((p) => <option key={p.id} value={p.id}>{p.title} — {fmtDate(p.service_date)}</option>)}
              </select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.stream_date} onChange={(e) => setForm({ ...form, stream_date: e.target.value })} /></div>
            <div>
              <Label>Platform</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {STREAM_PLATFORMS.map((p) => <option key={p} value={p}>{titleish(p)}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STREAM_STATUSES.map((p) => <option key={p} value={p}>{titleish(p)}</option>)}
              </select>
            </div>
            <div>
              <Label>Health</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.health} onChange={(e) => setForm({ ...form, health: e.target.value })}>
                {STREAM_HEALTH.map((p) => <option key={p} value={p}>{titleish(p)}</option>)}
              </select>
            </div>
            <div><Label>Bitrate (kbps)</Label><Input type="number" value={form.bitrate_kbps} onChange={(e) => setForm({ ...form, bitrate_kbps: e.target.value })} /></div>
            <div><Label>Resolution</Label><Input value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} /></div>
            <div><Label>Internet (Mbps)</Label><Input type="number" step="0.1" value={form.internet_mbps} onChange={(e) => setForm({ ...form, internet_mbps: e.target.value })} /></div>
            <div><Label>Encoder</Label><Input value={form.encoder} onChange={(e) => setForm({ ...form, encoder: e.target.value })} placeholder="OBS / hardware" /></div>
            <div><Label>Camera status</Label><Input value={form.camera_status} onChange={(e) => setForm({ ...form, camera_status: e.target.value })} /></div>
            <div><Label>Peak viewers</Label><Input type="number" value={form.peak_viewers} onChange={(e) => setForm({ ...form, peak_viewers: e.target.value })} /></div>
            <div><Label>Total views</Label><Input type="number" value={form.total_views} onChange={(e) => setForm({ ...form, total_views: e.target.value })} /></div>
            <div><Label>Uptime %</Label><Input type="number" value={form.uptime_pct} onChange={(e) => setForm({ ...form, uptime_pct: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Recording URL</Label><Input value={form.recording_url} onChange={(e) => setForm({ ...form, recording_url: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={form.audio_feed_ok} onChange={(e) => setForm({ ...form, audio_feed_ok: e.target.checked })} />
              Audio feed was clean
            </label>
            <div className="md:col-span-4"><Label>Incident notes</Label><Textarea rows={2} value={form.incident_notes} onChange={(e) => setForm({ ...form, incident_notes: e.target.value })} /></div>
            <div className="md:col-span-4"><Button type="submit">Log broadcast</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-serif text-lg">Broadcast log</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Date</th><th>Platform</th><th>Status</th><th>Health</th><th>Bitrate</th><th>Uptime</th><th>Peak</th><th>Score</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const score = streamHealthScore(r);
                return (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="py-2">{fmtDate(r.stream_date)}</td>
                    <td>{titleish(r.platform)}</td>
                    <td>{titleish(r.status)}</td>
                    <td>{titleish(r.health)}</td>
                    <td>{r.bitrate_kbps ? `${r.bitrate_kbps} kbps` : "—"}</td>
                    <td>{r.uptime_pct != null ? `${r.uptime_pct}%` : "—"}</td>
                    <td>{r.peak_viewers ?? "—"}</td>
                    <td><Badge variant="outline" className={RAG_CLASS[ragForScore(score, 80, 60)]}>{score}</Badge></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No broadcasts logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
