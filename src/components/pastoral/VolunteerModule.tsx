import { useEffect, useMemo, useState } from "react";
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
import { RISK_CLASS, RISK_LEVELS, TRAINING_STATUSES, VOLUNTEER_STATUSES, burnoutRisk, today } from "@/lib/ministry";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

/** MODULE 6 — Volunteer Management. */
export default function VolunteerModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("all");
  const [logDraft, setLogDraft] = useState<Record<string, any>>({});

  const empty = {
    user_id: "",
    full_name: "",
    department_slug: "",
    branch: "",
    role_title: "",
    availability: "",
    skills: "",
    training_status: "not_started",
    serving_since: "",
    notes: "",
  };
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    setLoading(true);
    const [v, l, p, d] = await Promise.all([
      sb.from("volunteer_profiles").select("*").order("full_name"),
      sb.from("volunteer_service_logs").select("*").order("service_date", { ascending: false }).limit(500),
      sb.from("profiles").select("id, full_name, branch, primary_department").eq("approval_status", "approved").order("full_name"),
      sb.from("departments").select("slug, name").order("name"),
    ]);
    setRows(v.data ?? []);
    setLogs(l.data ?? []);
    setMembers(p.data ?? []);
    setDepartments(d.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.full_name.trim() || members.find((m) => m.id === form.user_id)?.full_name;
    if (!name) return toast.error("Choose a member or type a name.");
    const { error } = await sb.from("volunteer_profiles").insert({
      user_id: form.user_id || null,
      full_name: name,
      department_slug: form.department_slug || null,
      branch: form.branch || null,
      role_title: form.role_title || null,
      availability: form.availability || null,
      skills: form.skills || null,
      training_status: form.training_status,
      serving_since: form.serving_since || null,
      notes: form.notes || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Volunteer added to the register");
    setForm(empty);
    load();
  };

  const update = async (row: any, patch: any) => {
    const { error } = await sb.from("volunteer_profiles").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const logService = async (row: any) => {
    const draft = logDraft[row.id] ?? {};
    const hours = Number(draft.hours ?? 0);
    const attended = (draft.attended ?? "true") === "true";
    const { error } = await sb.from("volunteer_service_logs").insert({
      volunteer_id: row.id,
      service_date: draft.service_date || today(),
      department_slug: row.department_slug,
      hours,
      attended,
      logged_by: currentUserId,
    });
    if (error) return toast.error(error.message);

    const attendedCount = row.services_attended + (attended ? 1 : 0);
    const missedCount = row.services_missed + (attended ? 0 : 1);
    const totalHours = Number(row.total_hours) + hours;
    await update(row, {
      services_attended: attendedCount,
      services_missed: missedCount,
      total_hours: totalHours,
      burnout_risk: burnoutRisk(missedCount, totalHours),
    });

    if (missedCount >= 3 || burnoutRisk(missedCount, totalHours) === "high") {
      await sb.from("notifications").insert({
        user_id: currentUserId,
        title: `Volunteer intervention recommended: ${row.full_name}`,
        message: `${row.full_name} has missed ${missedCount} services and served ${totalHours} hours. Consider mentoring, rest or workload redistribution.`,
        link: "/pastoral",
        type: "volunteer_alert",
        branch: row.branch ?? null,
      });
    }
    setLogDraft((s) => ({ ...s, [row.id]: {} }));
    toast.success("Service logged");
  };

  const filtered = useMemo(
    () => rows.filter((r) => filterDept === "all" || r.department_slug === filterDept),
    [rows, filterDept],
  );

  const exportCsv = () =>
    exportRows(
      "volunteer-register",
      ["Volunteer", "Department", "Branch", "Role", "Availability", "Skills", "Training", "Attended", "Missed", "Hours", "Burnout risk", "Status"],
      filtered.map((r) => [
        r.full_name,
        departments.find((d) => d.slug === r.department_slug)?.name ?? "",
        r.branch ? branchLabel(r.branch) : "",
        r.role_title ?? "",
        r.availability ?? "",
        r.skills ?? "",
        r.training_status,
        r.services_attended,
        r.services_missed,
        r.total_hours,
        r.burnout_risk,
        r.on_leave ? "on leave" : r.status,
      ]),
    );

  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading volunteers…</Card>;

  const active = rows.filter((r) => r.status === "active" && !r.on_leave);
  const shortages = departments
    .map((d) => ({ ...d, count: rows.filter((r) => r.department_slug === d.slug && r.status === "active" && !r.on_leave).length }))
    .filter((d) => d.count < 3)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Volunteers", rows.length],
          ["Actively serving", active.length],
          ["On leave", rows.filter((r) => r.on_leave).length],
          ["Burnout risk (high)", rows.filter((r) => r.burnout_risk === "high").length],
        ].map(([l, v]) => (
          <Card key={String(l)} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p>
            <p className="mt-1 font-serif text-2xl">{v}</p>
          </Card>
        ))}
      </div>

      {shortages.length > 0 && (
        <Card className="p-5">
          <h3 className="font-serif text-lg">Volunteer shortages</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {shortages.map((d) => (
              <Badge key={d.slug} variant="outline">{d.name} — {d.count} serving</Badge>
            ))}
          </div>
        </Card>
      )}

      {canManage && (
        <Card className="p-5">
          <h3 className="font-serif text-lg">Add a volunteer</h3>
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>Member</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Link to a portal member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Or name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Label>Serving role</Label>
              <Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} />
            </div>
            <div>
              <Label>Availability</Label>
              <Input placeholder="Sundays, Wednesdays…" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
            </div>
            <div>
              <Label>Serving since</Label>
              <Input type="date" value={form.serving_since} onChange={(e) => setForm({ ...form, serving_since: e.target.value })} />
            </div>
            <div>
              <Label>Training status</Label>
              <Select value={form.training_status} onValueChange={(v) => setForm({ ...form, training_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRAINING_STATUSES.map((t) => <SelectItem key={t} value={t}>{titleCase(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>Skills & gifts</Label>
              <Textarea rows={2} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            </div>
            <div className="md:col-span-3"><Button type="submit">Add volunteer</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Volunteer register</h3>
          <div className="flex gap-2">
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No volunteers registered yet.</p>}
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.full_name}</span>
                    {r.role_title && <Badge variant="outline">{r.role_title}</Badge>}
                    <Badge className={RISK_CLASS[r.burnout_risk]} variant="outline">Burnout: {r.burnout_risk}</Badge>
                    {r.on_leave && <Badge variant="secondary">On leave</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {departments.find((d) => d.slug === r.department_slug)?.name ?? "Unassigned"}
                    {r.branch ? ` · ${branchLabel(r.branch)}` : ""} · {r.services_attended} served / {r.services_missed} missed ·{" "}
                    {r.total_hours} hours · training {titleCase(r.training_status)}
                  </p>
                  {r.skills && <p className="mt-1 text-sm text-muted-foreground">Skills: {r.skills}</p>}
                  {r.recognition && <p className="mt-1 text-sm">Recognition: {r.recognition}</p>}
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={r.status} onValueChange={(v) => update(r, { status: v })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VOLUNTEER_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={r.burnout_risk} onValueChange={(v) => update(r, { burnout_risk: v })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => update(r, { on_leave: !r.on_leave })}>
                      {r.on_leave ? "End leave" : "Grant leave"}
                    </Button>
                  </div>
                )}
              </div>

              {canManage && (
                <div className="mt-3 grid gap-2 border-t pt-3 md:grid-cols-5">
                  <Input
                    type="date"
                    value={logDraft[r.id]?.service_date ?? today()}
                    onChange={(e) => setLogDraft((s) => ({ ...s, [r.id]: { ...s[r.id], service_date: e.target.value } }))}
                  />
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Hours"
                    value={logDraft[r.id]?.hours ?? ""}
                    onChange={(e) => setLogDraft((s) => ({ ...s, [r.id]: { ...s[r.id], hours: e.target.value } }))}
                  />
                  <Select
                    value={logDraft[r.id]?.attended ?? "true"}
                    onValueChange={(v) => setLogDraft((s) => ({ ...s, [r.id]: { ...s[r.id], attended: v } }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Served</SelectItem>
                      <SelectItem value="false">Missed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Recognition / badge"
                    defaultValue={r.recognition ?? ""}
                    onBlur={(e) => e.target.value !== (r.recognition ?? "") && update(r, { recognition: e.target.value })}
                  />
                  <Button size="sm" onClick={() => logService(r)}>Log service</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-serif text-lg">Recent serving history</h3>
        <ul className="mt-3 space-y-1 text-sm">
          {logs.slice(0, 15).map((l) => (
            <li key={l.id} className="flex justify-between border-b pb-1 last:border-0">
              <span>{rows.find((r) => r.id === l.volunteer_id)?.full_name ?? "Volunteer"}</span>
              <span className="text-muted-foreground">{l.service_date} · {l.hours}h · {l.attended ? "served" : "missed"}</span>
            </li>
          ))}
          {logs.length === 0 && <li className="text-muted-foreground">No serving history recorded yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
