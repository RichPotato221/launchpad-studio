import { useEffect, useMemo, useState } from "react";
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
import { BRANCHES, branchLabel, exportRows, titleCase } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";
import {
  CERT_STATUSES, CERT_TYPES, CLEARANCE_STATUSES, KIDS_VOLUNTEER_STATUSES, VOLUNTEER_ROLES,
  clearedToServe, expiryState, labelFor, pct, ragForKids,
} from "@/lib/kids";

const sb = supabase as any;
type Props = { canManage: boolean };

const empty = {
  user_id: "", full_name: "", role_title: "", classroom_id: "", branch: "", phone: "", emergency_contact: "",
  skills: "", availability: "", status: "active", background_check_status: "not_started",
  background_check_expiry: "", safeguarding_expiry: "", services_attended: "", services_missed: "", total_hours: "", notes: "",
};

/** MODULES 7 & 12 — Volunteer team, clearances and training academy. */
export default function KidsVolunteersModule({ canManage }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [cForm, setCForm] = useState<any>({ cert_type: "safeguarding", status: "completed", issued_on: "", expires_on: "", hours: "", certificate_url: "", notes: "" });

  const load = async () => {
    const [v, c, r, p] = await Promise.all([
      sb.from("kids_volunteers").select("*").order("full_name"),
      sb.from("kids_certifications").select("*"),
      sb.from("kids_classrooms").select("id, name").order("name"),
      sb.from("profiles").select("id, full_name").eq("approval_status", "approved").order("full_name"),
    ]);
    setRows(v.data ?? []); setCerts(c.data ?? []); setRooms(r.data ?? []); setMembers(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      user_id: form.user_id || null,
      classroom_id: form.classroom_id || null,
      branch: form.branch || null,
      background_check_expiry: form.background_check_expiry || null,
      safeguarding_expiry: form.safeguarding_expiry || null,
      services_attended: form.services_attended === "" ? 0 : Number(form.services_attended),
      services_missed: form.services_missed === "" ? 0 : Number(form.services_missed),
      total_hours: form.total_hours === "" ? 0 : Number(form.total_hours),
    };
    const res = editing ? await sb.from("kids_volunteers").update(payload).eq("id", editing) : await sb.from("kids_volunteers").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Volunteer updated" : "Volunteer added");
    setForm(empty); setEditing(null); load();
  };

  const addCert = async (vid: string) => {
    const { error } = await sb.from("kids_certifications").insert({
      volunteer_id: vid, ...cForm,
      issued_on: cForm.issued_on || null, expires_on: cForm.expires_on || null,
      hours: cForm.hours === "" ? null : Number(cForm.hours),
      certificate_url: cForm.certificate_url || null, notes: cForm.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Training record added"); setCForm({ ...cForm, hours: "", certificate_url: "", notes: "" }); load();
  };

  const s = useMemo(() => {
    const active = rows.filter((r) => r.status === "active");
    const cleared = active.filter((r) => clearedToServe(r).ok);
    const trainingDone = certs.filter((c) => c.status === "completed").length;
    const reliability = pct(
      rows.reduce((a, r) => a + (r.services_attended ?? 0), 0),
      rows.reduce((a, r) => a + (r.services_attended ?? 0) + (r.services_missed ?? 0), 0),
    );
    return { active: active.length, cleared: cleared.length, compliance: pct(cleared.length, Math.max(active.length, 1)), trainingDone, reliability };
  }, [rows, certs]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Active volunteers</p><p className="font-serif text-2xl">{s.active}</p></Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Cleared to serve</p>
          <p className="font-serif text-2xl">{s.cleared} <span className={`ml-1 inline-block h-2.5 w-2.5 rounded-full align-middle ${RAG_DOT[ragForKids(s.compliance)]}`} /></p>
        </Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Training completed</p><p className="font-serif text-2xl">{s.trainingDone}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Reliability</p><p className="font-serif text-2xl">{s.reliability}%</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editing ? "Edit volunteer" : "Add volunteer"}</p>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <div><Label>Full name *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div>
              <Label>Portal account</Label>
              <Select value={form.user_id || undefined} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Link member" /></SelectTrigger>
                <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role_title || undefined} onValueChange={(v) => setForm({ ...form, role_title: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{VOLUNTEER_ROLES.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classroom</Label>
              <Select value={form.classroom_id || undefined} onValueChange={(v) => setForm({ ...form, classroom_id: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch || undefined} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Emergency contact</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KIDS_VOLUNTEER_STATUSES.map((v) => <SelectItem key={v} value={v}>{titleCase(v)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Background check</Label>
              <Select value={form.background_check_status} onValueChange={(v) => setForm({ ...form, background_check_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLEARANCE_STATUSES.map((v) => <SelectItem key={v} value={v}>{titleCase(v)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Clearance expiry</Label><Input type="date" value={form.background_check_expiry} onChange={(e) => setForm({ ...form, background_check_expiry: e.target.value })} /></div>
            <div><Label>Safeguarding training expiry</Label><Input type="date" value={form.safeguarding_expiry} onChange={(e) => setForm({ ...form, safeguarding_expiry: e.target.value })} /></div>
            <div><Label>Availability</Label><Input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="1st & 3rd Sunday" /></div>
            <div><Label>Services attended</Label><Input type="number" value={form.services_attended} onChange={(e) => setForm({ ...form, services_attended: e.target.value })} /></div>
            <div><Label>Services missed</Label><Input type="number" value={form.services_missed} onChange={(e) => setForm({ ...form, services_missed: e.target.value })} /></div>
            <div><Label>Total hours</Label><Input type="number" value={form.total_hours} onChange={(e) => setForm({ ...form, total_hours: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Skills / gifting</Label><Textarea rows={2} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">{editing ? "Save" : "Add volunteer"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <Button variant="outline" size="sm" onClick={() => exportRows("kids-volunteers",
        ["Name", "Role", "Branch", "Status", "Clearance", "Clearance expiry", "Safeguarding expiry", "Cleared to serve"],
        rows.map((r) => [r.full_name, labelFor(VOLUNTEER_ROLES, r.role_title), branchLabel(r.branch), r.status, r.background_check_status, r.background_check_expiry, r.safeguarding_expiry, clearedToServe(r).ok ? "Yes" : "No"]))}>
        <Download className="mr-2 h-4 w-4" /> Export compliance register
      </Button>

      <div className="grid gap-3">
        {rows.map((v) => {
          const cl = clearedToServe(v);
          const bc = expiryState(v.background_check_expiry);
          const sg = expiryState(v.safeguarding_expiry);
          const mine = certs.filter((c) => c.volunteer_id === v.id);
          const isOpen = open === v.id;
          return (
            <Card key={v.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-lg">{v.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {labelFor(VOLUNTEER_ROLES, v.role_title)} · {rooms.find((r) => r.id === v.classroom_id)?.name ?? "Unassigned"} · {branchLabel(v.branch)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{titleCase(v.status)}</Badge>
                    <Badge variant={cl.ok ? "secondary" : "destructive"}>{cl.ok ? "Cleared to serve" : "Not cleared"}</Badge>
                    <Badge variant="outline">Clearance: {bc.label}</Badge>
                    <Badge variant="outline">Safeguarding: {sg.label}</Badge>
                    <Badge variant="outline">{v.services_attended ?? 0} services · {v.total_hours ?? 0}h</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setOpen(isOpen ? null : v.id)}>{isOpen ? "Close" : "Training record"}</Button>
                  {canManage && <Button size="sm" variant="ghost" onClick={() => { setEditing(v.id); setForm({ ...empty, ...v, background_check_expiry: v.background_check_expiry ?? "", safeguarding_expiry: v.safeguarding_expiry ?? "", user_id: v.user_id ?? "", classroom_id: v.classroom_id ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>}
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-3 border-t border-border/60 pt-4 text-sm">
                  {mine.map((c) => (
                    <p key={c.id}>{labelFor(CERT_TYPES, c.cert_type)} — {titleCase(c.status)} {c.expires_on && `· expires ${c.expires_on}`} {c.hours && `· ${c.hours}h`}</p>
                  ))}
                  {mine.length === 0 && <p className="text-muted-foreground">No training recorded.</p>}
                  {canManage && (
                    <div className="grid gap-2 md:grid-cols-6">
                      <Select value={cForm.cert_type} onValueChange={(v2) => setCForm({ ...cForm, cert_type: v2 })}>
                        <SelectTrigger className="md:col-span-2"><SelectValue /></SelectTrigger>
                        <SelectContent>{CERT_TYPES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={cForm.status} onValueChange={(v2) => setCForm({ ...cForm, status: v2 })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CERT_STATUSES.map((c) => <SelectItem key={c} value={c}>{titleCase(c)}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="date" value={cForm.issued_on} onChange={(e) => setCForm({ ...cForm, issued_on: e.target.value })} />
                      <Input type="date" value={cForm.expires_on} onChange={(e) => setCForm({ ...cForm, expires_on: e.target.value })} />
                      <Button size="sm" onClick={() => addCert(v.id)}>Add record</Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No volunteers registered.</Card>}
      </div>
    </div>
  );
}
