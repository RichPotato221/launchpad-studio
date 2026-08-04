import { useEffect, useState } from "react";
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
import { RAG_CLASS, exportRows } from "@/lib/finance";
import { MED_TEAM_ROLES, medLabel } from "@/lib/media";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Media volunteer management: skills, availability, performance and growth. */
export default function MedTeamModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const empty = {
    full_name: "",
    role: "volunteer",
    skills: "",
    availability: "available",
    equipment_experience: "",
    mentor_name: "",
    ministry_experience: "",
    growth_notes: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("med_volunteers").select("*").order("full_name");
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("med_volunteers").insert({ ...form, created_by: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Team member added");
    setForm({ ...empty });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("med_volunteers").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Team members</p><p className="mt-1 font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Available</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.availability === "available").length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Projects completed</p><p className="mt-1 font-serif text-2xl">{rows.reduce((s, r) => s + (r.projects_completed ?? 0), 0)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Leadership potential</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => (r.leadership_potential ?? "").toLowerCase() === "high").length}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Add a team member</p>
          <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-3">
            <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MED_TEAM_ROLES.map((r) => <SelectItem key={r} value={r}>{medLabel(r)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Availability</Label>
              <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="on_leave">On leave</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Skills</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
            <div><Label>Mentor</Label><Input value={form.mentor_name} onChange={(e) => setForm({ ...form, mentor_name: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Equipment experience</Label><Input value={form.equipment_experience} onChange={(e) => setForm({ ...form, equipment_experience: e.target.value })} /></div>
            <div><Label>Ministry experience</Label><Input value={form.ministry_experience} onChange={(e) => setForm({ ...form, ministry_experience: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Growth notes</Label><Textarea rows={2} value={form.growth_notes} onChange={(e) => setForm({ ...form, growth_notes: e.target.value })} /></div>
            <div><Button type="submit">Add member</Button></div>
          </form>
        </Card>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "media-team",
              ["Name", "Role", "Skills", "Availability", "Projects", "Attendance %", "Performance"],
              rows.map((r) => [r.full_name, r.role, r.skills, r.availability, r.projects_completed, r.attendance_pct, r.performance_score]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{r.full_name}</p>
                <p className="text-xs text-muted-foreground">{medLabel(r.role)} · {r.skills ?? "no skills listed"}</p>
                <p className="text-xs text-muted-foreground">{r.projects_completed} projects · {r.attendance_pct}% attendance</p>
                {r.growth_notes && <p className="mt-2 text-sm">{r.growth_notes}</p>}
              </div>
              <Badge className={RAG_CLASS[r.availability === "available" ? "green" : r.availability === "limited" ? "amber" : "red"]}>
                {medLabel(r.availability)}
              </Badge>
            </div>
            {canManage && (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <Input type="number" placeholder="Projects" defaultValue={r.projects_completed ?? 0} onBlur={(e) => patch(r.id, { projects_completed: Number(e.target.value) || 0 })} />
                <Input type="number" placeholder="Attendance %" defaultValue={r.attendance_pct ?? 0} onBlur={(e) => patch(r.id, { attendance_pct: Number(e.target.value) || 0 })} />
                <Select value={String(r.performance_score ?? 3)} onValueChange={(v) => patch(r.id, { performance_score: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2">No team members yet.</Card>}
      </div>
    </div>
  );
}
