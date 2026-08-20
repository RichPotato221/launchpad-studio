import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, fmtDate, titleCase } from "@/lib/finance";
import {
  AGE_GROUPS, CHILD_STATUSES, GENDERS, MILESTONE_TYPES, ageFrom, childQrValue, labelFor, qrImageUrl, suggestAgeGroup,
} from "@/lib/kids";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

const emptyChild = {
  full_name: "", nickname: "", date_of_birth: "", gender: "", age_group: "", branch: "", photo_url: "",
  address: "", medical_conditions: "", allergies: "", medication: "", special_needs: "", notes: "",
  classroom_id: "", status: "active", pin: "", consent_media: false, consent_medical: false, consent_signed_by: "",
};
const emptyGuardian = { full_name: "", relationship: "", phone: "", email: "", is_primary: true, can_pickup: true, is_emergency: true, profile_id: "" };

/** MODULE 2 — Child Registration System. */
export default function ChildrenRegister({ canManage, currentUserId }: Props) {
  const [children, setChildren] = useState<any[]>([]);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyChild);
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [gForm, setGForm] = useState<any>(emptyGuardian);
  const [mForm, setMForm] = useState<any>({ milestone_type: "saved", detail: "", achieved_on: new Date().toISOString().slice(0, 10) });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [c, g, r, m, k, p] = await Promise.all([
      sb.from("children").select("*").order("full_name"),
      sb.from("child_guardians").select("*"),
      sb.from("kids_classrooms").select("id, name").order("name"),
      sb.from("kids_milestones").select("*").order("achieved_on", { ascending: false }),
      sb.from("kids_checkins").select("child_id, service_date, checked_out_at").order("service_date", { ascending: false }).limit(2000),
      sb.from("profiles").select("id, full_name").eq("approval_status", "approved").order("full_name"),
    ]);
    setChildren(c.data ?? []); setGuardians(g.data ?? []); setClassrooms(r.data ?? []);
    setMilestones(m.data ?? []); setCheckins(k.data ?? []); setMembers(p.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return children;
    return children.filter((c) =>
      [c.full_name, c.nickname, c.child_code, c.age_group, c.branch].filter(Boolean).some((v: string) => v.toLowerCase().includes(t)),
    );
  }, [children, q]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      date_of_birth: form.date_of_birth || null,
      branch: form.branch || null,
      classroom_id: form.classroom_id || null,
      age_group: form.age_group || suggestAgeGroup(ageFrom(form.date_of_birth)) || null,
      consent_signed_at: form.consent_signed_by ? new Date().toISOString() : null,
    };
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    const res = editing
      ? await sb.from("children").update(payload).eq("id", editing)
      : await sb.from("children").insert({ ...payload, created_by: currentUserId });
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Child profile updated" : "Child registered");
    setForm(emptyChild); setEditing(null); load();
  };

  const addGuardian = async (childId: string) => {
    if (!gForm.full_name.trim()) return toast.error("Guardian name is required.");
    const { error } = await sb.from("child_guardians").insert({
      ...gForm, child_id: childId, profile_id: gForm.profile_id || null,
    });
    if (error) return toast.error(error.message);
    setGForm(emptyGuardian); toast.success("Guardian added"); load();
  };

  const addMilestone = async (childId: string) => {
    const { error } = await sb.from("kids_milestones").insert({ ...mForm, child_id: childId, recorded_by: currentUserId });
    if (error) return toast.error(error.message);
    setMForm({ ...mForm, detail: "" }); toast.success("Milestone recorded"); load();
  };

  const child = children.find((c) => c.id === selected);

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editing ? "Edit child profile" : "Register a child"}</p>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-3">
            <div><Label>Full name *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Nickname</Label><Input value={form.nickname ?? ""} onChange={(e) => setForm({ ...form, nickname: e.target.value })} /></div>
            <div><Label>Date of birth</Label><Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value, age_group: suggestAgeGroup(ageFrom(e.target.value)) })} /></div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender || undefined} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{titleCase(g)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Age group</Label>
              <Select value={form.age_group || undefined} onValueChange={(v) => setForm({ ...form, age_group: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{AGE_GROUPS.map((a) => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch || undefined} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classroom</Label>
              <Select value={form.classroom_id || undefined} onValueChange={(v) => setForm({ ...form, classroom_id: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>{classrooms.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHILD_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Secure PIN (check-out)</Label><Input value={form.pin ?? ""} onChange={(e) => setForm({ ...form, pin: e.target.value })} placeholder="4–6 digits" /></div>
            <div className="md:col-span-3"><PhotoField label="Photo" folder="children" value={form.photo_url ?? ""} onChange={(url) => setForm({ ...form, photo_url: url })} /></div>
            <div className="md:col-span-3"><Label>Address</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Medical conditions</Label><Textarea rows={2} value={form.medical_conditions ?? ""} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} /></div>
            <div><Label>Allergies</Label><Textarea rows={2} value={form.allergies ?? ""} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
            <div><Label>Medication</Label><Textarea rows={2} value={form.medication ?? ""} onChange={(e) => setForm({ ...form, medication: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Special needs</Label><Textarea rows={2} value={form.special_needs ?? ""} onChange={(e) => setForm({ ...form, special_needs: e.target.value })} /></div>
            <div><Label>Volunteer notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.consent_media} onCheckedChange={(v) => setForm({ ...form, consent_media: !!v })} /> Media / photography consent
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.consent_medical} onCheckedChange={(v) => setForm({ ...form, consent_medical: !!v })} /> Emergency medical consent
            </label>
            <div><Label>Digital signature (parent name)</Label><Input value={form.consent_signed_by ?? ""} onChange={(e) => setForm({ ...form, consent_signed_by: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit">{editing ? "Save changes" : "Register child"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(emptyChild); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" placeholder="Search by name, nickname or child ID…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" size="sm" onClick={() => exportRows("children-register",
          ["Child ID", "Name", "Age", "Age group", "Branch", "Classroom", "Allergies", "Medical", "Status"],
          filtered.map((c) => [c.child_code, c.full_name, ageFrom(c.date_of_birth) ?? "", c.age_group, branchLabel(c.branch), classrooms.find((r) => r.id === c.classroom_id)?.name ?? "", c.allergies, c.medical_conditions, c.status]))}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
        <span className="text-xs text-muted-foreground">{filtered.length} of {children.length} children</span>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading register…</Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const gs = guardians.filter((g) => g.child_id === c.id);
            const open = selected === c.id;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    {c.photo_url
                      ? <img src={c.photo_url} alt={c.full_name} className="h-14 w-14 rounded-full object-cover" />
                      : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted font-serif text-lg">{c.full_name.charAt(0)}</div>}
                    <div>
                      <p className="font-serif text-lg">{c.full_name}{c.nickname && <span className="text-muted-foreground"> “{c.nickname}”</span>}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.child_code} · {ageFrom(c.date_of_birth) ?? "—"} yrs · {labelFor(AGE_GROUPS, c.age_group)} · {branchLabel(c.branch)}
                        {c.classroom_id && <> · {classrooms.find((r) => r.id === c.classroom_id)?.name}</>}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline">{titleCase(c.status)}</Badge>
                        {c.allergies && <Badge variant="destructive">Allergy</Badge>}
                        {c.medical_conditions && <Badge variant="destructive">Medical</Badge>}
                        {c.special_needs && <Badge variant="secondary">Special needs</Badge>}
                        {gs.length === 0 && <Badge variant="destructive">No guardian</Badge>}
                        {c.consent_signed_at && <Badge variant="secondary">Consent signed</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src={qrImageUrl(childQrValue(c.child_code), 72)} alt={`QR for ${c.full_name}`} className="h-16 w-16" />
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelected(open ? null : c.id)}>{open ? "Close" : "Open profile"}</Button>
                      {canManage && <Button size="sm" variant="ghost" onClick={() => { setEditing(c.id); setForm({ ...emptyChild, ...c, date_of_birth: c.date_of_birth ?? "", classroom_id: c.classroom_id ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>}
                    </div>
                  </div>
                </div>

                {open && (
                  <div className="mt-5 grid gap-6 border-t border-border/60 pt-5 lg:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Guardians &amp; pick-up</p>
                      <div className="mt-2 space-y-2">
                        {gs.map((g) => (
                          <div key={g.id} className="rounded border border-border/60 p-3 text-sm">
                            <p className="font-medium">{g.full_name} <span className="text-xs text-muted-foreground">({g.relationship || "guardian"})</span></p>
                            <p className="text-xs text-muted-foreground">{g.phone} {g.email && `· ${g.email}`}</p>
                            <div className="mt-1 flex gap-1">
                              {g.is_primary && <Badge variant="secondary">Primary</Badge>}
                              {g.can_pickup && <Badge variant="outline">Authorised pick-up</Badge>}
                              {g.is_emergency && <Badge variant="outline">Emergency</Badge>}
                            </div>
                          </div>
                        ))}
                        {gs.length === 0 && <p className="text-sm text-muted-foreground">No guardians captured.</p>}
                      </div>
                      {canManage && (
                        <div className="mt-3 space-y-2">
                          <Input placeholder="Guardian name" value={gForm.full_name} onChange={(e) => setGForm({ ...gForm, full_name: e.target.value })} />
                          <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Relationship" value={gForm.relationship} onChange={(e) => setGForm({ ...gForm, relationship: e.target.value })} />
                            <Input placeholder="Phone" value={gForm.phone} onChange={(e) => setGForm({ ...gForm, phone: e.target.value })} />
                          </div>
                          <Input placeholder="Email" value={gForm.email} onChange={(e) => setGForm({ ...gForm, email: e.target.value })} />
                          <Select value={gForm.profile_id || undefined} onValueChange={(v) => setGForm({ ...gForm, profile_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Link to a portal account (parent portal access)" /></SelectTrigger>
                            <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                          </Select>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <label className="flex items-center gap-1"><Checkbox checked={gForm.is_primary} onCheckedChange={(v) => setGForm({ ...gForm, is_primary: !!v })} /> Primary</label>
                            <label className="flex items-center gap-1"><Checkbox checked={gForm.can_pickup} onCheckedChange={(v) => setGForm({ ...gForm, can_pickup: !!v })} /> Can collect</label>
                            <label className="flex items-center gap-1"><Checkbox checked={gForm.is_emergency} onCheckedChange={(v) => setGForm({ ...gForm, is_emergency: !!v })} /> Emergency</label>
                          </div>
                          <Button size="sm" onClick={() => addGuardian(c.id)}>Add guardian</Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Attendance history</p>
                      <div className="mt-2 space-y-1 text-sm">
                        {checkins.filter((k) => k.child_id === c.id).slice(0, 10).map((k, i) => (
                          <p key={i} className="text-muted-foreground">{k.service_date} · {k.checked_out_at ? "checked out" : "still checked in"}</p>
                        ))}
                        {checkins.filter((k) => k.child_id === c.id).length === 0 && <p className="text-muted-foreground">No attendance yet.</p>}
                      </div>
                      <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Care notes</p>
                      <p className="mt-1 text-sm text-muted-foreground">{c.notes || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Discipleship journey</p>
                      <div className="mt-2 space-y-1 text-sm">
                        {milestones.filter((m) => m.child_id === c.id).map((m) => (
                          <p key={m.id}>{labelFor(MILESTONE_TYPES, m.milestone_type)} <span className="text-xs text-muted-foreground">· {fmtDate(m.achieved_on)} {m.detail && `· ${m.detail}`}</span></p>
                        ))}
                        {milestones.filter((m) => m.child_id === c.id).length === 0 && <p className="text-muted-foreground">No milestones yet.</p>}
                      </div>
                      {canManage && (
                        <div className="mt-3 space-y-2">
                          <Select value={mForm.milestone_type} onValueChange={(v) => setMForm({ ...mForm, milestone_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{MILESTONE_TYPES.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input placeholder="Detail (e.g. verse reference)" value={mForm.detail} onChange={(e) => setMForm({ ...mForm, detail: e.target.value })} />
                          <Input type="date" value={mForm.achieved_on} onChange={(e) => setMForm({ ...mForm, achieved_on: e.target.value })} />
                          <Button size="sm" onClick={() => addMilestone(c.id)}>Record milestone</Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No children found.</Card>}
        </div>
      )}
    </div>
  );
}
