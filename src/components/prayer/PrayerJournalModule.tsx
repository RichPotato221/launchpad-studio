import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Lock } from "lucide-react";
import { exportRows, fmtDate } from "@/lib/finance";
import { JOURNAL_TYPES, labelFor, today } from "@/lib/intercession";

const sb = supabase as any;

type Props = { currentUserId: string; isLeadership: boolean };

/** Module 8: private spiritual journal — entries stay private unless shared with prayer leadership. */
export default function PrayerJournalModule({ currentUserId, isLeadership }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [scope, setScope] = useState<"mine" | "shared">("mine");
  const [q, setQ] = useState("");

  const empty = {
    entry_date: today(),
    entry_type: "prayer",
    title: "",
    body: "",
    scriptures: "",
    mood: "",
    tags: "",
    shared_with_leadership: false,
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    let query = sb.from("int_journal").select("*").order("entry_date", { ascending: false });
    query = scope === "mine" ? query.eq("user_id", currentUserId) : query.eq("shared_with_leadership", true);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [scope]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.body.trim()) return toast.error("Write your entry first");
    const { error } = await sb.from("int_journal").insert({
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      user_id: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Journal entry saved");
    setForm({ ...empty });
    load();
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.title, r.body, r.scriptures, (r.tags ?? []).join(" ")].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(term)),
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <Card className="border-sky-200 bg-sky-50/50 p-4">
        <p className="flex items-center gap-2 text-sm text-sky-900">
          <Lock className="h-4 w-4" />
          Journal entries are private to you. Tick “share with prayer leadership” only when you want a leader to read it.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="font-serif text-lg">New journal entry</h3>
        <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-3">
          <div><Label>Date</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.entry_type} onChange={(e) => setForm({ ...form, entry_type: e.target.value })}>
              {JOURNAL_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div><Label>Mood / spiritual state</Label><Input value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })} /></div>
          <div className="md:col-span-3"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="md:col-span-3"><Label>Entry</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Scriptures</Label><Input value={form.scriptures} onChange={(e) => setForm({ ...form, scriptures: e.target.value })} /></div>
          <div><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          <div className="md:col-span-3 flex items-center gap-2">
            <input id="share-journal" type="checkbox" checked={form.shared_with_leadership} onChange={(e) => setForm({ ...form, shared_with_leadership: e.target.checked })} />
            <Label htmlFor="share-journal">Share with prayer leadership</Label>
          </div>
          <div className="md:col-span-3"><Button type="submit">Save entry</Button></div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Journal</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value as any)}>
              <option value="mine">My entries</option>
              {isLeadership && <option value="shared">Shared with leadership</option>}
            </select>
            <Input className="h-9 w-52" placeholder="Search entries…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportRows(
                  "prayer-journal",
                  ["Date", "Type", "Title", "Entry", "Scriptures", "Shared"],
                  filtered.map((r) => [r.entry_date, r.entry_type, r.title, r.body, r.scriptures, r.shared_with_leadership ? "Yes" : "No"]),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Excel (CSV)
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{r.title || labelFor(JOURNAL_TYPES, r.entry_type)}</p>
                <Badge variant="outline">{labelFor(JOURNAL_TYPES, r.entry_type)}</Badge>
                {r.shared_with_leadership && <Badge variant="outline">Shared</Badge>}
                <span className="text-xs text-muted-foreground">{fmtDate(r.entry_date)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
              {r.scriptures && <p className="mt-2 text-xs text-muted-foreground">Scriptures: {r.scriptures}</p>}
              {(r.tags ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.tags.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              )}
              {r.user_id === currentUserId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={async () => {
                    await sb.from("int_journal").update({ shared_with_leadership: !r.shared_with_leadership }).eq("id", r.id);
                    load();
                  }}
                >
                  {r.shared_with_leadership ? "Unshare" : "Share with leadership"}
                </Button>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No journal entries yet.</p>}
        </div>
      </Card>
    </div>
  );
}
