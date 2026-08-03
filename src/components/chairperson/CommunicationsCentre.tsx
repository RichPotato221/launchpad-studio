import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Download, Send } from "lucide-react";
import { branchLabel, exportRows, fmtDate } from "@/lib/finance";

const sb = supabase as any;

const TARGETS = [
  { key: "all", label: "All branches" },
  { key: "twatwa", label: "Etwatwa" },
  { key: "joburg_north", label: "Joburg North" },
  { key: "joburg_south", label: "Joburg South" },
];

type Props = { canManage: boolean; currentUserId: string };

export default function CommunicationsCentre({ canManage, currentUserId }: Props) {
  const [posts, setPosts] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", target_branch: "all", priority: false });
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [a, q, m] = await Promise.all([
      sb
        .from("announcements")
        .select("*, author:profiles!announcements_author_id_fkey(id, full_name), announcement_views(id)")
        .order("created_at", { ascending: false })
        .limit(50),
      sb.from("notify_queue").select("*").order("created_at", { ascending: false }).limit(30),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("approval_status", "approved"),
    ]);
    setPosts(a.data ?? []);
    setQueue(q.data ?? []);
    setMemberCount(m.count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const broadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.body.trim()) return toast.error("A message body is required.");
    setSending(true);
    const { error } = await sb.from("announcements").insert({
      author_id: currentUserId,
      title: form.title.trim() || null,
      body: form.body.trim(),
      target_branch: form.target_branch,
      priority: form.priority,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Executive communication published to the feed");
    setForm({ title: "", body: "", target_branch: "all", priority: false });
    load();
  };

  const stats = useMemo(() => {
    const now = Date.now();
    const last30 = posts.filter((p) => now - new Date(p.created_at).getTime() < 30 * 864e5);
    const totalViews = posts.reduce((s, p) => s + (p.announcement_views?.length ?? 0), 0);
    const avgReach = posts.length && memberCount
      ? Math.round((totalViews / posts.length / memberCount) * 100)
      : 0;
    return { last30: last30.length, totalViews, avgReach, pending: queue.filter((q) => !q.processed).length };
  }, [posts, queue, memberCount]);

  const exportCsv = () =>
    exportRows(
      "executive-communications-log",
      ["Date", "Title", "Author", "Target", "Priority", "Readers", "Reach %"],
      posts.map((p) => [
        fmtDate(p.created_at),
        p.title ?? "",
        p.author?.full_name ?? "",
        branchLabel(p.target_branch === "all" ? null : p.target_branch),
        p.priority ? "Yes" : "No",
        p.announcement_views?.length ?? 0,
        memberCount ? Math.round(((p.announcement_views?.length ?? 0) / memberCount) * 100) : 0,
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Communications (30 days)" value={String(stats.last30)} />
        <Stat label="Total reads logged" value={String(stats.totalViews)} />
        <Stat label="Average reach" value={`${stats.avgReach}%`} />
        <Stat label="Notifications queued" value={String(stats.pending)} />
      </div>

      {canManage && (
        <Card className="p-6 print:hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Issue an executive communication</p>
          <form onSubmit={broadcast} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label>Headline</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Council resolution on the 2026 ministry calendar"
                />
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={form.target_branch} onValueChange={(v) => setForm({ ...form, target_branch: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGETS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                required
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Write the communication as it should appear to leadership and serving members…"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.priority} onCheckedChange={(v) => setForm({ ...form, priority: v })} />
                Mark as priority (pinned and emailed)
              </label>
              <Button type="submit" disabled={sending}>
                <Send className="mr-2 h-4 w-4" /> {sending ? "Publishing…" : "Publish communication"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex items-center justify-between print:hidden">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Communication log & readership</p>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Export log
        </Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading communications…</Card>
      ) : posts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No communications issued yet.</Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const reads = p.announcement_views?.length ?? 0;
            const reach = memberCount ? Math.round((reads / memberCount) * 100) : 0;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[18rem] flex-1">
                    <p className="font-medium">{p.title ?? p.body.slice(0, 80)}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {p.author?.full_name ?? "Leadership"} · {fmtDate(p.created_at)} ·{" "}
                      {TARGETS.find((t) => t.key === p.target_branch)?.label ?? p.target_branch}
                      {p.priority ? " · Priority" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl">{reach}%</p>
                    <p className="text-xs text-muted-foreground">{reads} of {memberCount} read</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Notification dispatch queue</p>
        {queue.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing in the dispatch queue.</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            {queue.map((q) => (
              <div key={q.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span>{q.event_type} · {q.recipient_scope}</span>
                <span className="text-xs text-muted-foreground">
                  {q.processed ? "Sent" : "Pending"} · {fmtDate(q.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </Card>
  );
}
