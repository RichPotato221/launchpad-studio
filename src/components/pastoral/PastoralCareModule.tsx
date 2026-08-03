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
import { Download, Lock } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, titleCase } from "@/lib/finance";
import { CASE_STATUSES, CASE_TYPES, CARE_OPEN, NOTE_TYPES, PRIORITIES, PRAYER_STATUSES, URGENCIES, labelOf, today } from "@/lib/ministry";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

/** MODULE 7 — Pastoral Care Management (plus the prayer-request register). */
export default function PastoralCareModule({ canManage, currentUserId }: Props) {
  const [cases, setCases] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, any[]>>({});
  const [prayers, setPrayers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCase, setOpenCase] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, any>>({});
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("open_only");

  const empty = {
    case_type: "home_visit",
    subject_name: "",
    member_id: "",
    contact: "",
    location: "",
    branch: "",
    department_slug: "",
    summary: "",
    care_plan: "",
    priority: "normal",
    assigned_to: "",
    scheduled_for: "",
    follow_up_date: "",
  };
  const [form, setForm] = useState<any>(empty);
  const [prayerForm, setPrayerForm] = useState<any>({ request: "", requester_name: "", urgency: "normal", confidential: "false", branch: "" });

  const load = async () => {
    setLoading(true);
    const [c, n, pr, p, d] = await Promise.all([
      sb.from("pastoral_cases").select("*").order("created_at", { ascending: false }),
      sb.from("pastoral_case_notes").select("*").order("visit_date", { ascending: false }),
      sb.from("prayer_requests").select("*").order("created_at", { ascending: false }).limit(200),
      sb.from("profiles").select("id, full_name").eq("approval_status", "approved").order("full_name"),
      sb.from("departments").select("slug, name").order("name"),
    ]);
    setCases(c.data ?? []);
    const grouped: Record<string, any[]> = {};
    (n.data ?? []).forEach((row: any) => {
      (grouped[row.case_id] ??= []).push(row);
    });
    setNotes(grouped);
    setPrayers(pr.data ?? []);
    setMembers(p.data ?? []);
    setDepartments(d.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject_name.trim()) return toast.error("Who is this case for?");
    const { error } = await sb.from("pastoral_cases").insert({
      case_type: form.case_type,
      subject_name: form.subject_name.trim(),
      member_id: form.member_id || null,
      contact: form.contact || null,
      location: form.location || null,
      branch: form.branch || null,
      department_slug: form.department_slug || null,
      summary: form.summary || null,
      care_plan: form.care_plan || null,
      priority: form.priority,
      assigned_to: form.assigned_to || currentUserId,
      scheduled_for: form.scheduled_for || null,
      follow_up_date: form.follow_up_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    if (form.assigned_to) {
      await sb.from("notifications").insert({
        user_id: form.assigned_to,
        title: `Pastoral care case assigned: ${labelOf(CASE_TYPES, form.case_type)}`,
        message: `${form.subject_name.trim()} — follow up by ${form.follow_up_date || "as soon as possible"}`,
        link: "/pastoral",
        type: "pastoral_care",
        branch: form.branch || null,
      });
    }
    toast.success("Pastoral care case opened");
    setForm(empty);
    load();
  };

  const update = async (row: any, patch: any) => {
    const { error } = await sb.from("pastoral_cases").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const closeCase = async (row: any) => {
    await update(row, { status: "closed", closed_at: new Date().toISOString(), closed_by: currentUserId });
    toast.success("Case closed — pastoral care completed");
  };

  const addNote = async (caseId: string) => {
    const draft = noteDraft[caseId] ?? {};
    if (!draft.note?.trim()) return toast.error("Write the note first.");
    const { error } = await sb.from("pastoral_case_notes").insert({
      case_id: caseId,
      note: draft.note.trim(),
      note_type: draft.note_type ?? "visit",
      visit_date: draft.visit_date || today(),
      confidential: true,
      author_id: currentUserId,
    });
    if (error) return toast.error(error.message);
    setNoteDraft((s) => ({ ...s, [caseId]: {} }));
    toast.success("Confidential note recorded");
    load();
  };

  const addPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerForm.request.trim()) return toast.error("Enter the prayer request.");
    const { error } = await sb.from("prayer_requests").insert({
      request: prayerForm.request.trim(),
      requester_name: prayerForm.requester_name || null,
      requester_id: currentUserId,
      urgency: prayerForm.urgency,
      confidential: prayerForm.confidential === "true",
      branch: prayerForm.branch || null,
    });
    if (error) return toast.error(error.message);
    setPrayerForm({ request: "", requester_name: "", urgency: "normal", confidential: "false", branch: "" });
    toast.success("Prayer request logged");
    load();
  };

  const filtered = useMemo(
    () =>
      cases.filter((c) => {
        if (filterType !== "all" && c.case_type !== filterType) return false;
        if (filterStatus === "open_only" && !CARE_OPEN.includes(c.status)) return false;
        if (!["all", "open_only"].includes(filterStatus) && c.status !== filterStatus) return false;
        return true;
      }),
    [cases, filterType, filterStatus],
  );

  const exportCsv = () =>
    exportRows(
      "pastoral-care-register",
      ["Type", "Person", "Branch", "Priority", "Assigned to", "Opened", "Follow-up", "Status", "Outcome"],
      filtered.map((c) => [
        labelOf(CASE_TYPES, c.case_type),
        c.subject_name,
        c.branch ? branchLabel(c.branch) : "",
        c.priority,
        members.find((m) => m.id === c.assigned_to)?.full_name ?? "",
        c.opened_on,
        c.follow_up_date ?? "",
        c.status,
        c.outcome ?? "",
      ]),
    );

  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading pastoral care…</Card>;

  const open = cases.filter((c) => CARE_OPEN.includes(c.status));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Open cases", open.length],
          ["Follow-ups due", open.filter((c) => c.follow_up_date && c.follow_up_date <= today()).length],
          ["Urgent", open.filter((c) => ["high", "urgent"].includes(c.priority)).length],
          ["Closed", cases.filter((c) => c.status === "closed").length],
        ].map(([l, v]) => (
          <Card key={String(l)} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p>
            <p className="mt-1 font-serif text-2xl">{v}</p>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card className="p-5">
          <h3 className="font-serif text-lg">Open a pastoral care case</h3>
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>Case type</Label>
              <Select value={form.case_type} onValueChange={(v) => setForm({ ...form, case_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Person / family</Label>
              <Input value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })} />
            </div>
            <div>
              <Label>Contact</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div>
              <Label>Location / hospital</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign to</Label>
              <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="Pastoral team member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled visit</Label>
              <Input type="date" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
            </div>
            <div>
              <Label>Follow-up date</Label>
              <Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Situation summary</Label>
              <Textarea rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Care plan</Label>
              <Textarea rows={2} value={form.care_plan} onChange={(e) => setForm({ ...form, care_plan: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Open case</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Care register</h3>
          <div className="flex flex-wrap gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All case types</SelectItem>
                {CASE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open_only">Open only</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
                {CASE_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No cases match this filter.</p>}
          {filtered.map((c) => (
            <div key={c.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{labelOf(CASE_TYPES, c.case_type)}</Badge>
                    <span className="font-medium">{c.subject_name}</span>
                    {c.confidential && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    <Badge variant="secondary">{titleCase(c.priority)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opened {c.opened_on}
                    {c.branch ? ` · ${branchLabel(c.branch)}` : ""}
                    {c.follow_up_date ? ` · follow-up ${c.follow_up_date}` : ""}
                    {c.location ? ` · ${c.location}` : ""}
                  </p>
                  {c.summary && <p className="mt-2 text-sm">{c.summary}</p>}
                  {c.care_plan && <p className="mt-1 text-sm text-muted-foreground">Care plan: {c.care_plan}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={c.status} onValueChange={(v) => update(c, { status: v })} disabled={!canManage}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CASE_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {canManage && c.status !== "closed" && (
                    <Button size="sm" variant="outline" onClick={() => closeCase(c)}>Close case</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setOpenCase(openCase === c.id ? null : c.id)}>
                    Notes ({notes[c.id]?.length ?? 0})
                  </Button>
                </div>
              </div>

              {openCase === c.id && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  {(notes[c.id] ?? []).map((n) => (
                    <div key={n.id} className="rounded-md bg-muted/50 p-3 text-sm">
                      <p className="text-xs text-muted-foreground">{titleCase(n.note_type)} · {n.visit_date}</p>
                      <p className="mt-1">{n.note}</p>
                    </div>
                  ))}
                  {canManage && (
                    <div className="grid gap-2 md:grid-cols-4">
                      <Select
                        value={noteDraft[c.id]?.note_type ?? "visit"}
                        onValueChange={(v) => setNoteDraft((s) => ({ ...s, [c.id]: { ...s[c.id], note_type: v } }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {NOTE_TYPES.map((t) => <SelectItem key={t} value={t}>{titleCase(t)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={noteDraft[c.id]?.visit_date ?? today()}
                        onChange={(e) => setNoteDraft((s) => ({ ...s, [c.id]: { ...s[c.id], visit_date: e.target.value } }))}
                      />
                      <Input
                        className="md:col-span-2"
                        placeholder="Confidential note…"
                        value={noteDraft[c.id]?.note ?? ""}
                        onChange={(e) => setNoteDraft((s) => ({ ...s, [c.id]: { ...s[c.id], note: e.target.value } }))}
                      />
                      <div className="md:col-span-4">
                        <Button size="sm" onClick={() => addNote(c.id)}>Add note</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-serif text-lg">Prayer requests</h3>
        <form onSubmit={addPrayer} className="mt-4 grid gap-3 md:grid-cols-4">
          <Input
            className="md:col-span-2"
            placeholder="Prayer request"
            value={prayerForm.request}
            onChange={(e) => setPrayerForm({ ...prayerForm, request: e.target.value })}
          />
          <Input
            placeholder="On behalf of"
            value={prayerForm.requester_name}
            onChange={(e) => setPrayerForm({ ...prayerForm, requester_name: e.target.value })}
          />
          <Select value={prayerForm.urgency} onValueChange={(v) => setPrayerForm({ ...prayerForm, urgency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {URGENCIES.map((u) => <SelectItem key={u} value={u}>{titleCase(u)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={prayerForm.confidential} onValueChange={(v) => setPrayerForm({ ...prayerForm, confidential: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Shareable with members</SelectItem>
              <SelectItem value="true">Confidential — pastoral team only</SelectItem>
            </SelectContent>
          </Select>
          <div className="md:col-span-3"><Button type="submit">Log request</Button></div>
        </form>

        <div className="mt-4 space-y-2">
          {prayers.length === 0 && <p className="text-sm text-muted-foreground">No prayer requests yet.</p>}
          {prayers.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 text-sm last:border-0">
              <div>
                <p>{p.request}</p>
                <p className="text-xs text-muted-foreground">
                  {titleCase(p.urgency)}{p.confidential ? " · confidential" : ""}{p.requester_name ? ` · ${p.requester_name}` : ""}
                </p>
              </div>
              <Select
                value={p.status}
                onValueChange={async (v) => {
                  await sb.from("prayer_requests").update({ status: v }).eq("id", p.id);
                  load();
                }}
                disabled={!canManage}
              >
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRAYER_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
