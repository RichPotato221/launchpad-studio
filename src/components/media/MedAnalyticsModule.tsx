import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import { exportRows, fmtDate } from "@/lib/finance";
import { today } from "@/lib/intercession";
import { MED_PLATFORMS, engagementRate, medLabel } from "@/lib/media";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Platform analytics, KPI tracking and reporting. */
export default function MedAnalyticsModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const empty = {
    platform: "facebook",
    period_label: "",
    followers: "0",
    reach: "0",
    impressions: "0",
    views: "0",
    watch_minutes: "0",
    website_visits: "0",
    engagement_rate: "0",
    captured_on: today(),
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const [{ data: a }, { data: p }, { data: s }] = await Promise.all([
      sb.from("med_analytics").select("*").order("captured_on", { ascending: false }),
      sb.from("med_posts").select("*"),
      sb.from("med_livestreams").select("*"),
    ]);
    setRows(a ?? []);
    setPosts(p ?? []);
    setStreams(s ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("med_analytics").insert({
      platform: form.platform,
      period_label: form.period_label,
      followers: Number(form.followers) || 0,
      reach: Number(form.reach) || 0,
      impressions: Number(form.impressions) || 0,
      views: Number(form.views) || 0,
      watch_minutes: Number(form.watch_minutes) || 0,
      website_visits: Number(form.website_visits) || 0,
      engagement_rate: Number(form.engagement_rate) || 0,
      captured_on: form.captured_on,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Snapshot captured");
    setForm({ ...empty });
    load();
  };

  const totals = useMemo(() => {
    const reach = posts.reduce((s, r) => s + (r.reach ?? 0), 0);
    const eng = posts.reduce((s, r) => s + (r.engagements ?? 0), 0);
    const viewers = streams.reduce((s, r) => s + (r.viewers ?? 0), 0);
    const minutes = streams.reduce((s, r) => s + (r.watch_minutes ?? 0), 0);
    return { reach, eng, viewers, minutes };
  }, [posts, streams]);

  const byPlatform = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => (m[r.platform] = Math.max(m[r.platform] ?? 0, r.followers ?? 0)));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Post reach</p><p className="mt-1 font-serif text-2xl">{totals.reach.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Engagement rate</p><p className="mt-1 font-serif text-2xl">{engagementRate(totals.eng, totals.reach)}%</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Stream viewers</p><p className="mt-1 font-serif text-2xl">{totals.viewers.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Watch minutes</p><p className="mt-1 font-serif text-2xl">{totals.minutes.toLocaleString()}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Capture a platform snapshot</p>
          <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MED_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{medLabel(p)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Period</Label><Input required placeholder="Aug 2026" value={form.period_label} onChange={(e) => setForm({ ...form, period_label: e.target.value })} /></div>
            <div><Label>Captured on</Label><Input type="date" value={form.captured_on} onChange={(e) => setForm({ ...form, captured_on: e.target.value })} /></div>
            <div><Label>Followers</Label><Input type="number" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} /></div>
            <div><Label>Reach</Label><Input type="number" value={form.reach} onChange={(e) => setForm({ ...form, reach: e.target.value })} /></div>
            <div><Label>Impressions</Label><Input type="number" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} /></div>
            <div><Label>Views</Label><Input type="number" value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} /></div>
            <div><Label>Watch minutes</Label><Input type="number" value={form.watch_minutes} onChange={(e) => setForm({ ...form, watch_minutes: e.target.value })} /></div>
            <div><Label>Website visits</Label><Input type="number" value={form.website_visits} onChange={(e) => setForm({ ...form, website_visits: e.target.value })} /></div>
            <div><Label>Engagement rate %</Label><Input type="number" step="0.1" value={form.engagement_rate} onChange={(e) => setForm({ ...form, engagement_rate: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit">Save snapshot</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Followers by platform</p>
          <div className="flex gap-2 print:hidden">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                exportRows(
                  "media-analytics",
                  ["Platform", "Period", "Captured", "Followers", "Reach", "Impressions", "Views", "Watch minutes", "Engagement %"],
                  rows.map((r) => [r.platform, r.period_label, r.captured_on, r.followers, r.reach, r.impressions, r.views, r.watch_minutes, r.engagement_rate]),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {byPlatform.map(([p, n]) => (
            <div key={p} className="flex items-center gap-3 text-sm">
              <span className="w-28">{medLabel(p)}</span>
              <div className="h-2 flex-1 rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${Math.round((n / (byPlatform[0]?.[1] || 1)) * 100)}%` }} />
              </div>
              <span className="w-16 text-right text-xs text-muted-foreground">{n.toLocaleString()}</span>
            </div>
          ))}
          {byPlatform.length === 0 && <p className="text-sm text-muted-foreground">No snapshots captured yet.</p>}
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Snapshot history</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left">Platform</th>
                <th className="py-2 text-left">Period</th>
                <th className="py-2 text-left">Captured</th>
                <th className="py-2 text-right">Followers</th>
                <th className="py-2 text-right">Reach</th>
                <th className="py-2 text-right">Views</th>
                <th className="py-2 text-right">Eng %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">{medLabel(r.platform)}</td>
                  <td className="py-2">{r.period_label}</td>
                  <td className="py-2">{fmtDate(r.captured_on)}</td>
                  <td className="py-2 text-right">{(r.followers ?? 0).toLocaleString()}</td>
                  <td className="py-2 text-right">{(r.reach ?? 0).toLocaleString()}</td>
                  <td className="py-2 text-right">{(r.views ?? 0).toLocaleString()}</td>
                  <td className="py-2 text-right">{r.engagement_rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
