import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { WorkspaceProps } from "@/lib/workspaceRegistry";

const PLATFORMS = ["instagram", "facebook", "youtube", "website", "other"] as const;
const STATUSES = ["draft", "pending_approval", "approved", "published", "rejected"] as const;

export default function MediaWorkspace({ departmentSlug, currentUserId }: WorkspaceProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", platform: "instagram", scheduled_date: "", asset_url: "" });

  const load = async () => {
    const { data } = await supabase.from("editorial_posts").select("*").eq("department_slug", departmentSlug).order("scheduled_date", { ascending: false, nullsFirst: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [departmentSlug]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("editorial_posts").insert({
      ...form,
      department_slug: departmentSlug,
      created_by: currentUserId,
      scheduled_date: form.scheduled_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Post drafted");
    setForm({ title: "", platform: "instagram", scheduled_date: "", asset_url: "" });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "approved") patch.approved_by = currentUserId;
    const { error } = await supabase.from("editorial_posts").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Schedule a post</p>
        <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Scheduled date</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Asset URL</Label><Input value={form.asset_url} onChange={(e) => setForm({ ...form, asset_url: e.target.value })} /></div>
          <div><Button type="submit">Save draft</Button></div>
        </form>
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-serif text-lg">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.platform} · {r.scheduled_date ?? "unscheduled"}</p>
              </div>
              <div className="w-56">
                <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {r.asset_url && <a className="mt-2 inline-block text-xs underline" href={r.asset_url} target="_blank" rel="noreferrer">Open asset</a>}
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Nothing scheduled yet.</Card>}
      </div>
    </div>
  );
}
