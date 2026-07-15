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

const STATUSES = ["new", "contacted", "baptized", "discipled", "joined_church", "lost_contact"] as const;

export default function OutreachWorkspace({ departmentSlug, currentUserId }: WorkspaceProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", contact: "", date_won: new Date().toISOString().slice(0, 10), notes: "" });

  const load = async () => {
    const { data } = await supabase.from("souls_won").select("*").eq("department_slug", departmentSlug).order("date_won", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [departmentSlug]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("souls_won").insert({ ...form, department_slug: departmentSlug, won_by: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setForm({ name: "", contact: "", date_won: new Date().toISOString().slice(0, 10), notes: "" });
    load();
  };

  const setStatus = async (id: string, follow_up_status: string) => {
    const { error } = await supabase.from("souls_won").update({ follow_up_status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Register a soul won</p>
        <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-2">
          <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Contact</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div><Label>Date won</Label><Input type="date" value={form.date_won} onChange={(e) => setForm({ ...form, date_won: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div><Button type="submit">Add to register</Button></div>
        </form>
      </Card>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Follow-up pipeline</p>
        <div className="mt-3 space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-lg">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.date_won} · {r.contact || "—"}</p>
                </div>
                <div className="w-56">
                  <Select value={r.follow_up_status} onValueChange={(v) => setStatus(r.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {r.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{r.notes}</p>}
            </Card>
          ))}
          {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No entries yet.</Card>}
        </div>
      </div>
    </div>
  );
}
