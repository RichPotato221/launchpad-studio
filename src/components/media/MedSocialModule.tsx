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
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate } from "@/lib/finance";
import { MED_PLATFORMS, MED_POST_STATUSES, engagementRate, medLabel } from "@/lib/media";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Social media content calendar, campaigns and post performance. */
export default function MedSocialModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [platform, setPlatform] = useState("all");
  const empty = { title: "", platform: "facebook", campaign: "", caption: "", hashtags: "", asset_url: "", scheduled_at: "" };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("med_posts").select("*").order("scheduled_at", { ascending: false, nullsFirst: false });
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("med_posts").insert({
      ...form,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      status: form.scheduled_at ? "scheduled" : "draft",
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Post added to the calendar");
    setForm({ ...empty });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("med_posts").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(() => (platform === "all" ? rows : rows.filter((r) => r.platform === platform)), [rows, platform]);
  const reach = rows.reduce((s, r) => s + (r.reach ?? 0), 0);
  const eng = rows.reduce((s, r) => s + (r.engagements ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Posts</p><p className="mt-1 font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Scheduled</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.status === "scheduled").length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Total reach</p><p className="mt-1 font-serif text-2xl">{reach.toLocaleString()}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Engagement rate</p><p className="mt-1 font-serif text-2xl">{engagementRate(eng, reach)}%</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Schedule content</p>
          <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MED_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{medLabel(p)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Campaign</Label><Input value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} /></div>
            <div><Label>Scheduled at</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
            <div><Label>Asset URL</Label><Input value={form.asset_url} onChange={(e) => setForm({ ...form, asset_url: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Caption</Label><Textarea rows={3} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} /></div>
            <div><Label>Hashtags</Label><Textarea rows={3} value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} /></div>
            <div><Button type="submit">Add to calendar</Button></div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {MED_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{medLabel(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "media-posts",
              ["Title", "Platform", "Campaign", "Scheduled", "Status", "Reach", "Engagements", "Shares"],
              filtered.map((r) => [r.title, r.platform, r.campaign, r.scheduled_at, r.status, r.reach, r.engagements, r.shares]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {medLabel(r.platform)}{r.campaign ? ` · ${r.campaign}` : ""} · {r.scheduled_at ? fmtDate(r.scheduled_at) : "unscheduled"}
                </p>
                {r.caption && <p className="mt-2 whitespace-pre-wrap text-sm">{r.caption}</p>}
                {r.hashtags && <p className="mt-1 text-xs text-muted-foreground">{r.hashtags}</p>}
                {r.asset_url && <a className="mt-1 inline-block text-xs underline" href={r.asset_url} target="_blank" rel="noreferrer">Open asset</a>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={RAG_CLASS[r.status === "published" || r.status === "boosted" ? "green" : r.status === "scheduled" ? "amber" : "red"]}>
                  {medLabel(r.status)}
                </Badge>
                <p className="text-xs text-muted-foreground">{(r.reach ?? 0).toLocaleString()} reach · {engagementRate(r.engagements ?? 0, r.reach ?? 0)}% eng.</p>
                {canManage && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="w-36">
                      <Select value={r.status} onValueChange={(v) => patch(r.id, { status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MED_POST_STATUSES.map((s) => <SelectItem key={s} value={s}>{medLabel(s)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input className="w-24" type="number" placeholder="reach" defaultValue={r.reach ?? 0} onBlur={(e) => patch(r.id, { reach: Number(e.target.value) || 0 })} />
                    <Input className="w-28" type="number" placeholder="engagements" defaultValue={r.engagements ?? 0} onBlur={(e) => patch(r.id, { engagements: Number(e.target.value) || 0 })} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Nothing on the calendar.</Card>}
      </div>
    </div>
  );
}
