import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useBranchScope, filterByBranch } from "@/lib/useBranchScope";


export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance — TRoGKC Portal" }] }),
  component: AttendancePage,
});

const BRANCHES = [
  { value: "etwatwa", label: "Etwatwa" },
  { value: "joburg_north", label: "Joburg North" },
  { value: "joburg_south", label: "Joburg South" },
] as const;

function AttendancePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [form, setForm] = useState({
    service_date: new Date().toISOString().slice(0, 10),
    branch: "",
    department_slug: "",
    event_id: "",
    full_name: "",
    visitor: false,
    is_new_member: false,
    present: true,
    notes: "",
  });
  const [bulk, setBulk] = useState("");

  const load = async () => {
    const { data } = await supabase.from("attendance").select("*").order("service_date", { ascending: false }).limit(200);
    setRows(data ?? []);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""));
    supabase.from("departments").select("slug, name").order("name").then(({ data }) => setDepts(data ?? []));
    supabase.from("events").select("id, title, event_date").order("event_date", { ascending: false }).limit(50).then(({ data }) => setEvents(data ?? []));
    load();
  }, []);

  const capture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const { error } = await supabase.from("attendance").insert({
      service_date: form.service_date,
      branch: (form.branch || null) as any,
      department_slug: form.department_slug || null,
      event_id: form.event_id || null,
      full_name: form.full_name,
      visitor: form.visitor,
      is_new_member: form.is_new_member,
      present: form.present,
      notes: form.notes || null,
      recorded_by: userId,
    });
    if (error) return toast.error(error.message);
    toast.success("Attendance captured");
    setForm({ ...form, full_name: "", visitor: false, notes: "" });
    load();
  };

  const captureBulk = async () => {
    if (!userId) return;
    const names = bulk.split(/\r?\n/).map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    const payload = names.map((n) => ({
      service_date: form.service_date,
      branch: (form.branch || null) as any,
      department_slug: form.department_slug || null,
      event_id: form.event_id || null,
      full_name: n,
      visitor: form.visitor,
      present: true,
      recorded_by: userId,
    }));
    const { error } = await supabase.from("attendance").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(`${names.length} recorded`);
    setBulk("");
    load();
  };

  const visibleRows = filterByBranch(rows, scope.data);

  const stats = useMemo(() => {
    const byDate: Record<string, { total: number; visitors: number }> = {};
    visibleRows.forEach((r) => {
      if (!r.present) return;
      byDate[r.service_date] ||= { total: 0, visitors: 0 };
      byDate[r.service_date].total += 1;
      if (r.visitor) byDate[r.service_date].visitors += 1;
    });
    return Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, scope.data]);

  return (
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Foundation module</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">Attendance</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Capture attendance per service or department meeting. Numbers roll straight into KPI dashboards.
          </p>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <SundayRsvpWidget />
          <HospitalityWatch />
        </div>

        <div className="mb-8">
          <RsvpRoster />
        </div>


        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Single capture</p>
            <form onSubmit={capture} className="mt-4 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Service date</Label><Input required type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} /></div>
                <div>
                  <Label>Branch</Label>
                  <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
                    <SelectTrigger><SelectValue placeholder="Whole church" /></SelectTrigger>
                    <SelectContent>{depts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Event (optional)</Label>
                  <Select value={form.event_id} onValueChange={(v) => setForm({ ...form, event_id: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{events.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.event_date} · {ev.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.visitor} onCheckedChange={(v) => setForm({ ...form, visitor: !!v })} /> Visitor</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_new_member} onCheckedChange={(v) => setForm({ ...form, is_new_member: !!v })} /> New member (opens 24h hospitality check-up)</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.present} onCheckedChange={(v) => setForm({ ...form, present: !!v })} /> Present</label>
              </div>
              <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button type="submit">Record</Button>
            </form>
          </Card>

          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Bulk capture</p>
            <p className="mt-2 text-xs text-muted-foreground">Paste one name per line — uses the date, branch, department, event, and visitor toggle from the left form.</p>
            <textarea
              rows={10}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={"Jane Doe\nJohn Smith\n..."}
              className="mt-3 w-full rounded-md border border-input bg-background p-2 text-sm"
            />
            <Button className="mt-3" onClick={captureBulk} type="button">Record all</Button>
          </Card>
        </div>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent attendance</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {stats.map(([date, s]) => (
              <Card key={date} className="p-4">
                <p className="font-serif text-2xl">{s.total}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{date}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.visitors} visitor{s.visitors === 1 ? "" : "s"}</p>
              </Card>
            ))}
            {stats.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground md:col-span-3">No attendance recorded yet.</Card>}
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Latest 50 entries</p>
          <Card className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="p-3">Date</th><th className="p-3">Name</th><th className="p-3">Branch</th>
                  <th className="p-3">Dept</th><th className="p-3">Visitor</th><th className="p-3">Present</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, 50).map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="p-3">{r.service_date}</td>
                    <td className="p-3">{r.full_name}</td>
                    <td className="p-3">{r.branch ?? "—"}</td>
                    <td className="p-3">{r.department_slug ?? "—"}</td>
                    <td className="p-3">{r.visitor ? "Yes" : "—"}</td>
                    <td className="p-3">{r.present ? "✓" : "✗"}</td>
                  </tr>
                ))}
                {visibleRows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nothing yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
  );
}

function nextSunday(): string {
  const d = new Date();
  const day = d.getDay();
  const add = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

function SundayRsvpWidget() {
  const [uid, setUid] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [my, setMy] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [counts, setCounts] = useState<{ yes: number; no: number; maybe: number }>({ yes: 0, no: 0, maybe: 0 });
  const date = nextSunday();

  const load = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const u = userRes.user?.id ?? "";
    setUid(u);
    if (!u) return;
    const { data: prof } = await supabase.from("profiles").select("branch").eq("id", u).maybeSingle();
    setBranch((prof as any)?.branch ?? "");
    const { data: mine } = await supabase.from("sunday_rsvps").select("*")
      .eq("user_id", u).eq("service_date", date).maybeSingle();
    setMy(mine);
    if (mine?.decline_reason) setReason(mine.decline_reason);
    const { data: all } = await supabase.from("sunday_rsvps").select("response").eq("service_date", date);
    const c = { yes: 0, no: 0, maybe: 0 };
    (all ?? []).forEach((r: any) => { c[r.response as "yes" | "no" | "maybe"] = (c[r.response as "yes" | "no" | "maybe"] ?? 0) + 1; });
    setCounts(c);
  };

  useEffect(() => { load(); }, []);

  const respond = async (response: "yes" | "no" | "maybe") => {
    if (!uid) return;
    const payload: any = {
      user_id: uid, service_date: date, response,
      branch: (branch || null) as any,
      decline_reason: response === "no" ? (reason || null) : null,
    };
    const { error } = await supabase.from("sunday_rsvps").upsert(payload, { onConflict: "user_id,service_date" });
    if (error) return toast.error(error.message);
    toast.success("RSVP saved");
    load();
  };

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">This Sunday · {date}</p>
      <p className="mt-1 text-sm text-muted-foreground">Let your leaders know whether to expect you.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant={my?.response === "yes" ? "default" : "outline"} onClick={() => respond("yes")}>I'll be there</Button>
        <Button size="sm" variant={my?.response === "maybe" ? "default" : "outline"} onClick={() => respond("maybe")}>Maybe</Button>
        <Button size="sm" variant={my?.response === "no" ? "default" : "outline"} onClick={() => respond("no")}>Can't make it</Button>
      </div>
      {my?.response === "no" && (
        <div className="mt-3">
          <Input placeholder="Reason (visible to leadership)" value={reason} onChange={(e) => setReason(e.target.value)}
            onBlur={() => respond("no")} />
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded bg-emerald-50 p-2 text-emerald-700"><p className="font-serif text-lg">{counts.yes}</p>Yes</div>
        <div className="rounded bg-amber-50 p-2 text-amber-700"><p className="font-serif text-lg">{counts.maybe}</p>Maybe</div>
        <div className="rounded bg-red-50 p-2 text-red-700"><p className="font-serif text-lg">{counts.no}</p>No</div>
      </div>
    </Card>
  );
}

function HospitalityWatch() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("hospitality_checkups").select("*")
      .eq("checked", false)
      .order("window_start", { ascending: true }).limit(20);
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const mark = async (id: string, feedback: string) => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("hospitality_checkups").update({
      checked: true, checked_by: userRes.user?.id, checked_at: new Date().toISOString(),
      feedback: feedback || null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Check-up logged");
    load();
  };

  if (items.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Hospitality Check-up Watch</p>
        <p className="mt-3 text-sm text-muted-foreground">No new members awaiting a follow-up right now.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Hospitality Check-up Watch</p>
      <p className="mt-1 text-xs text-muted-foreground">New members to reach out to within 24h of first visit.</p>
      <div className="mt-3 space-y-3">
        {items.map((h) => (
          <HospitalityItem key={h.id} item={h} onMark={mark} />
        ))}
      </div>
    </Card>
  );
}

function HospitalityItem({ item, onMark }: { item: any; onMark: (id: string, feedback: string) => void }) {
  const [feedback, setFeedback] = useState("");
  const overdue = new Date(item.window_end) < new Date();
  return (
    <div className="rounded border border-border/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{item.member_name}</p>
          <p className="text-xs text-muted-foreground">
            {item.branch} · window {new Date(item.window_start).toLocaleString()} — {new Date(item.window_end).toLocaleString()}
          </p>
        </div>
        {overdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Overdue</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <Input placeholder="Feedback from the call" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <Button size="sm" onClick={() => onMark(item.id, feedback)}>Mark done</Button>
      </div>
    </div>
  );
}

function RsvpRoster() {
  const [rows, setRows] = useState<any[]>([]);
  const [canSeeReasons, setCanSeeReasons] = useState(false);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState<Record<string, string>>({});
  const date = nextSunday();

  const load = async () => {
    const { data, error } = await supabase.rpc("get_sunday_rsvp_status", { _service_date: date });
    if (error) return toast.error(error.message);
    setRows(data ?? []);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const pastoral = new Set(["senior_apostle", "lead_pastor", "associate_pastor", "chairperson"]);
      setCanSeeReasons((roles ?? []).some((r: any) => pastoral.has(r.role)));
    }
  };

  useEffect(() => { load(); }, []);

  const reveal = async (row: any) => {
    if (openFor === row.user_id) { setOpenFor(null); return; }
    const { data, error } = await supabase.from("sunday_rsvps").select("decline_reason")
      .eq("service_date", date).eq("user_id", row.user_id).maybeSingle();
    if (error) return toast.error(error.message);
    setReasonText((prev) => ({ ...prev, [row.user_id]: data?.decline_reason?.trim() || "No reason given." }));
    setOpenFor(row.user_id);
  };

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Who's coming · {date}</p>
      <div className="mt-3 divide-y divide-border/50">
        {rows.map((row) => (
          <div key={row.user_id} className="py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{row.full_name}</p>
                <p className="text-xs capitalize text-muted-foreground">{row.branch}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={
                  row.response === "yes" ? "text-emerald-700" :
                  row.response === "maybe" ? "text-amber-700" : "text-red-700"
                }>
                  {row.response === "yes" ? "Yes" : row.response === "maybe" ? "Maybe" : "No"}
                </span>
                {row.response === "no" && canSeeReasons && (
                  <button type="button" className="text-xs text-muted-foreground underline" onClick={() => reveal(row)}>
                    {openFor === row.user_id ? "Hide" : "Reason"}
                  </button>
                )}
              </div>
            </div>
            {openFor === row.user_id && reasonText[row.user_id] && (
              <p className="mt-1 text-sm italic text-muted-foreground">"{reasonText[row.user_id]}"</p>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="py-2 text-sm text-muted-foreground">No responses yet.</p>}
      </div>
    </Card>
  );
}
