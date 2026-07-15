import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { WorkspaceProps } from "@/lib/workspaceRegistry";

const STAGES = ["idea", "planning", "active", "paused", "completed", "archived"] as const;

export default function SevenMountainsWorkspace({ departmentSlug, currentUserId }: WorkspaceProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", target_date: "" });

  const load = async () => {
    const { data } = await supabase.from("kingdom_projects").select("*").eq("department_slug", departmentSlug).order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [departmentSlug]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("kingdom_projects").insert({
      ...form,
      department_slug: departmentSlug,
      owner_id: currentUserId,
      target_date: form.target_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Project added");
    setForm({ title: "", description: "", target_date: "" });
    load();
  };

  const setStage = async (id: string, stage: string) => {
    const { error } = await supabase.from("kingdom_projects").update({ stage }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">New Kingdom project</p>
        <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-2">
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Target date</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Button type="submit">Add project</Button></div>
        </form>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-serif text-lg">{r.title}</p>
              <div className="w-40">
                <Select value={r.stage} onValueChange={(v) => setStage(r.id, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {r.description && <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>}
            {r.target_date && <p className="mt-2 text-xs text-muted-foreground">Target: {r.target_date}</p>}
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2">No projects yet.</Card>}
      </div>
    </div>
  );
}
