import { useEffect, useMemo, useState } from "react";
import PhotoField from "@/components/common/PhotoField";
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
import {
  USH_AVAILABILITY,
  USH_ROLES,
  USH_TEAMS,
  USH_TRAINING_STATUSES,
  ushLabel,
} from "@/lib/ushering";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Volunteer management: profiles, skills, availability and performance. */
export default function UshVolunteersModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const empty = {
    full_name: "",
    phone: "",
    email: "",
    team: "auditorium",
    role: "usher",
    section: "",
    availability: "available",
    training_status: "in_progress",
    emergency_contact: "",
    emergency_phone: "",
    mentor_name: "",
    ministry_experience: "",
    photo_url: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("ush_volunteers").select("*").order("full_name");
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("ush_volunteers").insert({ ...form, created_by: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Volunteer added");
    setForm({ ...empty });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("ush_volunteers").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.full_name, r.team, r.role, r.section, r.availability].some((v) => (v ?? "").toLowerCase().includes(t)),
    );
  }, [rows, q]);

  const certified = rows.filter((r) => r.training_status === "certified").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Volunteers</p><p className="mt-1 font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Active</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.active).length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Certified</p><p className="mt-1 font-serif text-2xl">{certified}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">On leave</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.availability === "on_leave").length}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Register a volunteer</p>
          <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-3">
            <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label>Team</Label>
              <Select value={form.team} onValueChange={(v) => setForm({ ...form, team: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{USH_TEAMS.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{USH_ROLES.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Section</Label><Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></div>
            <div>
              <Label>Availability</Label>
              <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{USH_AVAILABILITY.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Training status</Label>
              <Select value={form.training_status} onValueChange={(v) => setForm({ ...form, training_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{USH_TRAINING_STATUSES.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><PhotoField label="Photo" folder="volunteers" value={form.photo_url} onChange={(url) => setForm({ ...form, photo_url: url })} /></div>
            <div><Label>Emergency contact</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></div>
            <div><Label>Emergency phone</Label><Input value={form.emergency_phone} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} /></div>
            <div><Label>Mentor</Label><Input value={form.mentor_name} onChange={(e) => setForm({ ...form, mentor_name: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Ministry experience</Label><Textarea rows={2} value={form.ministry_experience} onChange={(e) => setForm({ ...form, ministry_experience: e.target.value })} /></div>
            <div><Button type="submit">Add volunteer</Button></div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" placeholder="Search volunteers…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "ushering-volunteers",
              ["Name", "Team", "Role", "Section", "Availability", "Training", "Services", "Rating", "Phone"],
              filtered.map((r) => [r.full_name, r.team, r.role, r.section, r.availability, r.training_status, r.services_served, r.performance_rating, r.phone]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {r.photo_url ? (
                  <img src={r.photo_url} alt={r.full_name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm">{r.full_name?.[0] ?? "?"}</div>
                )}
                <div>
                  <p className="font-medium">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{ushLabel(r.role)} · {ushLabel(r.team)}{r.section ? ` · ${r.section}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{r.phone ?? "no phone"} · {r.services_served} services served</p>
                </div>
              </div>
              <Badge className={RAG_CLASS[r.training_status === "certified" ? "green" : r.training_status === "refresher_due" ? "red" : "amber"]}>
                {ushLabel(r.training_status)}
              </Badge>
            </div>
            {canManage && (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <Select value={r.availability} onValueChange={(v) => patch(r.id, { availability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{USH_AVAILABILITY.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={r.training_status} onValueChange={(v) => patch(r.id, { training_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{USH_TRAINING_STATUSES.map((t) => <SelectItem key={t} value={t}>{ushLabel(t)}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(r.performance_rating ?? 3)} onValueChange={(v) => patch(r.id, { performance_rating: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2">No volunteers found.</Card>}
      </div>
    </div>
  );
}
