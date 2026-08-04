import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate } from "@/lib/finance";
import {
  BAPTISM_STATUSES,
  DISCIPLESHIP_STAGES,
  LEADERSHIP_LEVELS,
  MEMBERSHIP_STATUSES,
  SAFEGUARDING_STATUSES,
  age,
  labelFor,
  nextStage,
  nice,
  pct,
  ragForScore,
  stageProgress,
  today,
  type TeamKey,
} from "@/lib/ministryTeams";

const sb = supabase as any;

type Props = { team: TeamKey; canManage: boolean; currentUserId: string; memberWord: string };

/** Member database + discipleship pathway for a ministry team. */
export default function TeamMembersModule({ team, canManage, currentUserId, memberWord }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const empty = {
    full_name: "",
    gender: "",
    date_of_birth: "",
    phone: "",
    email: "",
    address: "",
    marital_status: "",
    occupation: "",
    school: "",
    guardian_name: "",
    guardian_phone: "",
    emergency_contact: "",
    emergency_phone: "",
    mentor_name: "",
    ministry_involvement: "",
    spiritual_gifts: "",
    talents: "",
    baptism_status: "not_baptised",
    salvation_date: "",
    membership_status: "active",
    stage: "first_time_visitor",
    leadership_level: "member",
    safeguarding_status: "pending",
    notes: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const [{ data: m }, { data: g }] = await Promise.all([
      sb.from("mt_members").select("*").eq("team", team).order("full_name"),
      sb.from("mt_groups").select("id, name").eq("team", team).order("name"),
    ]);
    setRows(m ?? []);
    setGroups(g ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("A name is required");
    const payload: any = { ...form, team, created_by: currentUserId };
    for (const k of ["date_of_birth", "salvation_date"]) if (!payload[k]) payload[k] = null;
    const { error } = await sb.from("mt_members").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(`${form.full_name} added to the register`);
    setForm({ ...empty });
    setOpen(false);
    load();
  };

  const advance = async (row: any) => {
    const next = nextStage(row.stage);
    const { error } = await sb.from("mt_members").update({ stage: next.key }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(`${row.full_name} advanced to ${next.label}`);
    load();
  };

  const setField = async (row: any, patch: Record<string, any>) => {
    const { error } = await sb.from("mt_members").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (stageFilter === "all" || r.stage === stageFilter) &&
          (!q.trim() || `${r.full_name} ${r.email ?? ""} ${r.phone ?? ""} ${r.mentor_name ?? ""}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [rows, q, stageFilter],
  );

  const active = rows.filter((r) => r.membership_status === "active");
  const baptised = rows.filter((r) => r.baptism_status === "baptised");
  const cleared = rows.filter((r) => r.safeguarding_status === "cleared");
  const avgProgress = rows.length
    ? Math.round(rows.reduce((s, r) => s + stageProgress(r.stage), 0) / rows.length)
    : 0;

  const stageCounts = DISCIPLESHIP_STAGES.map((s) => ({ ...s, count: rows.filter((r) => r.stage === s.key).length }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Registered" value={rows.length} />
        <Stat label="Active" value={active.length} />
        <Stat label="Baptised" value={baptised.length} />
        <Stat label="Safeguarding cleared" value={`${pct(cleared.length, rows.length || 1)}%`} />
        <Stat label="Discipleship progress" value={`${avgProgress}%`} rag={ragForScore(avgProgress, 60, 35)} />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Discipleship pathway</h3>
          <p className="text-xs text-muted-foreground">Advance a {memberWord} as each milestone is completed.</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stageCounts.map((s) => (
            <button
              key={s.key}
              onClick={() => setStageFilter(stageFilter === s.key ? "all" : s.key)}
              className={`rounded-md border p-3 text-left text-sm transition ${
                stageFilter === s.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              }`}
            >
              <div className="font-medium">{s.label}</div>
              <div className="text-2xl font-semibold">{s.count}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search name, phone, email, mentor…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Badge variant="outline">{filtered.length} shown</Badge>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportRows(
                  `${team}-members`,
                  ["Name", "Age", "Phone", "Email", "Stage", "Mentor", "Baptism", "Status", "Safeguarding"],
                  filtered.map((r) => [
                    r.full_name,
                    age(r.date_of_birth) ?? "",
                    r.phone,
                    r.email,
                    labelFor(DISCIPLESHIP_STAGES, r.stage),
                    r.mentor_name,
                    nice(r.baptism_status),
                    nice(r.membership_status),
                    nice(r.safeguarding_status),
                  ]),
                )
              }
            >
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
            {canManage && <Button size="sm" onClick={() => setOpen((o) => !o)}>{open ? "Close" : `Add ${memberWord}`}</Button>}
          </div>
        </div>

        {open && canManage && (
          <form onSubmit={save} className="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-3">
            <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Gender"><Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} /></Field>
            <Field label="Date of birth"><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Marital status"><Input value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })} /></Field>
            <Field label="Occupation"><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></Field>
            <Field label="School / university"><Input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} /></Field>
            <Field label="Parent / guardian"><Input value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} /></Field>
            <Field label="Guardian phone"><Input value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} /></Field>
            <Field label="Emergency contact"><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></Field>
            <Field label="Emergency phone"><Input value={form.emergency_phone} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} /></Field>
            <Field label="Mentor"><Input value={form.mentor_name} onChange={(e) => setForm({ ...form, mentor_name: e.target.value })} /></Field>
            <Field label="Ministry involvement"><Input value={form.ministry_involvement} onChange={(e) => setForm({ ...form, ministry_involvement: e.target.value })} /></Field>
            <Field label="Spiritual gifts"><Input value={form.spiritual_gifts} onChange={(e) => setForm({ ...form, spiritual_gifts: e.target.value })} /></Field>
            <Field label="Talents"><Input value={form.talents} onChange={(e) => setForm({ ...form, talents: e.target.value })} /></Field>
            <Field label="Salvation date"><Input type="date" value={form.salvation_date} onChange={(e) => setForm({ ...form, salvation_date: e.target.value })} /></Field>
            <Field label="Discipleship stage">
              <Picker value={form.stage} onChange={(v) => setForm({ ...form, stage: v })} options={DISCIPLESHIP_STAGES.map((s) => [s.key, s.label])} />
            </Field>
            <Field label="Baptism status">
              <Picker value={form.baptism_status} onChange={(v) => setForm({ ...form, baptism_status: v })} options={BAPTISM_STATUSES.map((s) => [s, nice(s)])} />
            </Field>
            <Field label="Membership status">
              <Picker value={form.membership_status} onChange={(v) => setForm({ ...form, membership_status: v })} options={MEMBERSHIP_STATUSES.map((s) => [s, nice(s)])} />
            </Field>
            <Field label="Leadership level">
              <Picker value={form.leadership_level} onChange={(v) => setForm({ ...form, leadership_level: v })} options={LEADERSHIP_LEVELS.map((s) => [s, nice(s)])} />
            </Field>
            <Field label="Safeguarding">
              <Picker value={form.safeguarding_status} onChange={(v) => setForm({ ...form, safeguarding_status: v })} options={SAFEGUARDING_STATUSES.map((s) => [s, nice(s)])} />
            </Field>
            <div className="md:col-span-3">
              <Field label="Pastoral notes (kept inside the department)">
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th>Age</th>
                <th>Contact</th>
                <th>Stage</th>
                <th>Journey</th>
                <th>Mentor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="py-2 font-medium">
                    {r.full_name}
                    {r.guardian_name && <div className="text-xs text-muted-foreground">Guardian: {r.guardian_name} {r.guardian_phone}</div>}
                  </td>
                  <td>{age(r.date_of_birth) ?? "—"}</td>
                  <td className="text-xs">{r.phone || "—"}<br />{r.email || ""}</td>
                  <td className="text-xs">{labelFor(DISCIPLESHIP_STAGES, r.stage)}</td>
                  <td className="w-40">
                    <Progress value={stageProgress(r.stage)} className="h-2" />
                    <span className="text-[11px] text-muted-foreground">{stageProgress(r.stage)}%</span>
                  </td>
                  <td className="text-xs">{r.mentor_name || "—"}</td>
                  <td>
                    <Badge variant="outline" className="text-[11px]">{nice(r.membership_status)}</Badge>
                    {r.safeguarding_status !== "cleared" && (
                      <Badge variant="outline" className="ml-1 border-amber-200 bg-amber-100 text-[11px] text-amber-800">safeguarding</Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {canManage && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => advance(r)}>Advance</Button>
                        {r.safeguarding_status !== "cleared" && (
                          <Button size="sm" variant="ghost" onClick={() => setField(r, { safeguarding_status: "cleared" })}>Clear</Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {groups.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">Small groups available: {groups.map((g) => g.name).join(", ")}</p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">Register last refreshed {fmtDate(today())}</p>
      </Card>
    </div>
  );
}

export function Stat({ label, value, rag }: { label: string; value: string | number; rag?: "green" | "amber" | "red" }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {rag && <Badge variant="outline" className={`mt-2 ${RAG_CLASS[rag]}`}>{rag}</Badge>}
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function Picker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}
