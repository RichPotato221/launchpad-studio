import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate } from "@/lib/finance";
import { MED_ASSET_CATEGORIES, MED_ASSET_TYPES, medLabel } from "@/lib/media";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Media archive & brand asset library with tagging, credits and brand approval. */
export default function MedArchiveModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const empty = {
    title: "",
    asset_type: "photo",
    category: "archive",
    event_name: "",
    ministry: "",
    speaker: "",
    captured_on: "",
    credited_to: "",
    file_url: "",
    thumbnail_url: "",
    tags: "",
    version_note: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("med_assets").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("med_assets").insert({
      ...form,
      captured_on: form.captured_on || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Asset archived");
    setForm({ ...empty });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("med_assets").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (category === "all" || r.category === category) &&
        (!t || [r.title, r.event_name, r.ministry, r.speaker, r.tags].some((v) => (v ?? "").toLowerCase().includes(t))),
    );
  }, [rows, q, category]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Assets</p><p className="mt-1 font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Brand assets</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.category === "brand").length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Brand approved</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.brand_approved).length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Sermon media</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.category === "sermon").length}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Archive an asset</p>
          <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MED_ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{medLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MED_ASSET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{medLabel(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Event</Label><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} /></div>
            <div><Label>Ministry</Label><Input value={form.ministry} onChange={(e) => setForm({ ...form, ministry: e.target.value })} /></div>
            <div><Label>Speaker</Label><Input value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} /></div>
            <div><Label>Captured on</Label><Input type="date" value={form.captured_on} onChange={(e) => setForm({ ...form, captured_on: e.target.value })} /></div>
            <div><Label>Credited to</Label><Input value={form.credited_to} onChange={(e) => setForm({ ...form, credited_to: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>File URL</Label><Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} /></div>
            <div><Label>Thumbnail URL</Label><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Tags</Label><Input placeholder="comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <div><Label>Version note</Label><Input value={form.version_note} onChange={(e) => setForm({ ...form, version_note: e.target.value })} /></div>
            <div><Button type="submit">Archive asset</Button></div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" placeholder="Search the archive…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="w-48">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {MED_ASSET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{medLabel(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "media-archive",
              ["Title", "Type", "Category", "Event", "Ministry", "Speaker", "Captured", "Credit", "URL"],
              filtered.map((r) => [r.title, r.asset_type, r.category, r.event_name, r.ministry, r.speaker, r.captured_on, r.credited_to, r.file_url]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <Card key={r.id} className="overflow-hidden">
            {r.thumbnail_url && <img src={r.thumbnail_url} alt={r.title} className="h-36 w-full object-cover" />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{medLabel(r.asset_type)} · {medLabel(r.category)}{r.captured_on ? ` · ${fmtDate(r.captured_on)}` : ""}</p>
                </div>
                <Badge className={RAG_CLASS[r.brand_approved ? "green" : "amber"]}>{r.brand_approved ? "Approved" : "Unreviewed"}</Badge>
              </div>
              {r.tags && <p className="mt-2 text-xs text-muted-foreground">{r.tags}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.file_url && <a className="text-xs underline" href={r.file_url} target="_blank" rel="noreferrer">Open file</a>}
                {canManage && !r.brand_approved && (
                  <Button type="button" size="sm" variant="outline" onClick={() => patch(r.id, { brand_approved: true })}>Approve for brand use</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-3">Nothing in the archive.</Card>}
      </div>
    </div>
  );
}
