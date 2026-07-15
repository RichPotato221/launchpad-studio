import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { WorkspaceProps } from "@/lib/workspaceRegistry";

export default function ChildrensWorkspace({ departmentSlug, currentUserId }: WorkspaceProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ child_name: "", guardian_name: "", guardian_contact: "", classroom: "", allergies: "" });

  const load = async () => {
    const { data } = await supabase.from("child_checkins").select("*").eq("department_slug", departmentSlug).order("checked_in_at", { ascending: false }).limit(100);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [departmentSlug]);

  const checkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("child_checkins").insert({ ...form, department_slug: departmentSlug, checked_in_by: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Checked in");
    setForm({ child_name: "", guardian_name: "", guardian_contact: "", classroom: "", allergies: "" });
    load();
  };

  const checkOut = async (id: string) => {
    const { error } = await supabase.from("child_checkins").update({ checked_out_at: new Date().toISOString(), checked_out_by: currentUserId }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Check a child in</p>
        <form onSubmit={checkIn} className="mt-4 grid gap-4 md:grid-cols-2">
          <div><Label>Child name</Label><Input required value={form.child_name} onChange={(e) => setForm({ ...form, child_name: e.target.value })} /></div>
          <div><Label>Guardian</Label><Input required value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} /></div>
          <div><Label>Guardian contact</Label><Input required value={form.guardian_contact} onChange={(e) => setForm({ ...form, guardian_contact: e.target.value })} /></div>
          <div><Label>Classroom</Label><Input value={form.classroom} onChange={(e) => setForm({ ...form, classroom: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Allergies</Label><Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
          <div><Button type="submit">Check in</Button></div>
        </form>
      </Card>

      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Register</p>
        <div className="mt-3 space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-serif text-lg">{r.child_name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.guardian_name} · {r.guardian_contact} · in {r.classroom || "—"}
                  {r.allergies && <> · ⚠ {r.allergies}</>}
                </p>
                <p className="text-xs text-muted-foreground">In: {new Date(r.checked_in_at).toLocaleString()} {r.checked_out_at && `· Out: ${new Date(r.checked_out_at).toLocaleString()}`}</p>
              </div>
              {!r.checked_out_at && <Button size="sm" onClick={() => checkOut(r.id)}>Check out</Button>}
            </Card>
          ))}
          {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No check-ins yet.</Card>}
        </div>
      </div>
    </div>
  );
}
