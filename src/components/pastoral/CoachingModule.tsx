import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, titleCase } from "@/lib/finance";
import { SESSION_STATUSES, SESSION_TYPES, labelOf, today } from "@/lib/ministry";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

/** MODULE 4 — Coaching & Mentorship workspace. */
export default function CoachingModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const empty = {
    leader_id: "",
    coach_id: "",
    session_type: "monthly_coaching",
    session_date: today(),
    department_slug: "",
    branch: "",
    topics: "",
    notes: "",
    action_plan: "",
    growth_plan: "",
    follow_up_date: "",
  };
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    setLoading(true);
    const [c, p, d] = await Promise.all([
      sb.from("coaching_sessions").select("*").order("session_date", { ascending: false }),
      sb.from("profiles").select("id, full_name").eq("approval_status", "approved").order("full_name"),
      sb.from("departments").select("slug, name").order("name"),
    ]);
    setRows(c.data ?? []);
    setMembers(p.data ?? []);
    setDepartments(d.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.full_name ?? "—";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leader_id) return toast.error("Who is being coached?");
    const { error } = await sb.from("coaching_sessions").insert({
      leader_id: form.leader_id,
      coach_id: form.coach_id || currentUserId,
      session_type: form.session_type,
      session_date: form.session_date,
      department_slug: form.department_slug || null,
      branch: form.branch || null,
      topics: form.topics || null,
      notes: form.notes || null,
      action_plan: form.action_plan || null,
      growth_plan: form.growth_plan || null,
      follow_up_date: form.follow_up_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    await sb.from("notifications").insert({
      user_id: form.leader_id,
      title: `${labelOf(SESSION_TYPES, form.session_type)} scheduled`,
      message: `With ${nameOf(form.coach_id || currentUserId)} on ${form.session_date}`,
      link: "/pastoral",
      type: "coaching",
      branch: form.branch || null,
    });
    await sb.from("leader_profiles").update({ last_coached_on: form.session_date }).eq("user_id", form.leader_id);
    toast.success("Coaching session scheduled");
    setForm(empty);
    load();
  };

  const update = async (row: any, patch: any) => {
    const { error } = await sb.from("coaching_sessions").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading coaching workspace…</Card>;

  const filtered = rows.filter((r) => filter === "all" || r.session_type === filter);
  const upcoming = rows.filter((r) => r.status === "scheduled" && r.session_date >= today());
  const followUps = rows.filter((r) => r.follow_up_date && r.follow_up_date <= today() && r.status !== "cancelled");

  const exportCsv = () =>
    exportRows(
      "coaching-and-mentorship",
      ["Date", "Type", "Leader", "Coach", "Topics", "Action plan", "Follow-up", "Status"],
      filtered.map((r) => [
        r.session_date,
        labelOf(SESSION_TYPES, r.session_type),
        nameOf(r.leader_id),
        nameOf(r.coach_id),
        r.topics ?? "",
        r.action_plan ?? "",
        r.follow_up_date ?? "",
        r.status,
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Sessions logged", rows.length],
          ["Upcoming", upcoming.length],
          ["Completed", rows.filter((r) => r.status === "completed").length],
          ["Follow-ups due", followUps.length],
        ].map(([l, v]) => (
          <Card key={String(l)} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p>
            <p className="mt-1 font-serif text-2xl">{v}</p>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card className="p-5">
          <h3 className="font-serif text-lg">Schedule coaching</h3>
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>Leader</Label>
              <Select value={form.leader_id} onValueChange={(v) => setForm({ ...form, leader_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coach</Label>
              <Select value={form.coach_id} onValueChange={(v) => setForm({ ...form, coach_id: v })}>
                <SelectTrigger><SelectValue placeholder="Defaults to you" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session type</Label>
              <Select value={form.session_type} onValueChange={(v) => setForm({ ...form, session_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session date</Label>
              <Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
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
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Follow-up date</Label>
              <Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Topics</Label>
              <Input value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Action plan</Label>
              <Textarea rows={2} value={form.action_plan} onChange={(e) => setForm({ ...form, action_plan: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Growth plan</Label>
              <Textarea rows={2} value={form.growth_plan} onChange={(e) => setForm({ ...form, growth_plan: e.target.value })} />
            </div>
            <div className="md:col-span-3"><Button type="submit">Schedule session</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Coaching journal</h3>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All session types</SelectItem>
                {SESSION_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No coaching sessions yet.</p>}
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{labelOf(SESSION_TYPES, r.session_type)}</Badge>
                    <span className="font-medium">{nameOf(r.leader_id)}</span>
                    <span className="text-sm text-muted-foreground">with {nameOf(r.coach_id)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.session_date}
                    {r.branch ? ` · ${branchLabel(r.branch)}` : ""}
                    {r.follow_up_date ? ` · follow-up ${r.follow_up_date}` : ""}
                  </p>
                  {r.topics && <p className="mt-1 text-sm">Topics: {r.topics}</p>}
                  {r.action_plan && <p className="text-sm text-muted-foreground">Action plan: {r.action_plan}</p>}
                  {r.growth_plan && <p className="text-sm text-muted-foreground">Growth plan: {r.growth_plan}</p>}
                  {r.notes && <p className="mt-1 text-sm">{r.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={r.status} onValueChange={(v) => update(r, { status: v })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SESSION_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-64"
                      placeholder="Coaching note…"
                      defaultValue={r.notes ?? ""}
                      onBlur={(e) => e.target.value !== (r.notes ?? "") && update(r, { notes: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
