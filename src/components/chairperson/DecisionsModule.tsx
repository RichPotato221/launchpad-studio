import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import { BRANCHES, STATUS_CLASS, branchLabel, exportRows, fmtDate, titleCase } from "@/lib/finance";
import { DECISION_CATEGORIES, DECISION_STATUSES } from "@/lib/governance";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

export default function DecisionsModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  const empty = {
    title: "",
    detail: "",
    category: "leadership",
    meeting_id: "",
    decision_date: new Date().toISOString().slice(0, 10),
    owner_id: "",
    department_slug: "",
    branch: "",
    priority: "normal",
    due_date: "",
  };
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const [d, p, dep, m] = await Promise.all([
      sb.from("governance_decisions")
        .select("*, owner:profiles!governance_decisions_owner_id_fkey(id, full_name, email)")
        .order("decision_date", { ascending: false }),
      sb.from("profiles").select("id, full_name, email").eq("approval_status", "approved").order("full_name"),
      sb.from("departments").select("slug, name").order("name"),
      sb.from("meetings").select("id, title, meeting_date").order("meeting_date", { ascending: false }).limit(50),
    ]);
    setRows(d.data ?? []);
    setMembers(p.data ?? []);
    setDepartments(dep.data ?? []);
    setMeetings(m.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("A decision title is required.");
    const { error } = await sb.from("governance_decisions").insert({
      title: form.title.trim(),
      detail: form.detail.trim() || null,
      category: form.category,
      meeting_id: form.meeting_id || null,
      decision_date: form.decision_date,
      owner_id: form.owner_id || null,
      department_slug: form.department_slug || null,
      branch: form.branch || null,
      priority: form.priority,
      due_date: form.due_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);

    if (form.owner_id) {
      await sb.from("notifications").insert({
        user_id: form.owner_id,
        title: "Executive decision assigned to you",
        message: form.title.trim(),
        link: "/departments/chairperson",
        type: "governance_decision",
        branch: form.branch || null,
      });
    }
    toast.success("Decision recorded");
    setForm(empty);
    load();
  };

  const update = async (row: any, patch: any) => {
    const { error } = await sb.from("governance_decisions").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        if (filterCategory !== "all" && r.category !== filterCategory) return false;
        if (search.trim()) {
          const hay = `${r.decision_number} ${r.title} ${r.detail ?? ""}`.toLowerCase();
          if (!hay.includes(search.toLowerCase())) return false;
        }
        return true;
      }),
    [rows, filterStatus, filterCategory, search],
  );

  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => ({
    total: rows.length,
    open: rows.filter((r) => ["open", "in_progress", "overdue"].includes(r.status)).length,
    overdue: rows.filter((r) => ["open", "in_progress", "overdue"].includes(r.status) && r.due_date && r.due_date < today).length,
    implemented: rows.filter((r) => r.status === "implemented").length,
  }), [rows, today]);

  const exportCsv = () =>
    exportRows(
      "executive-decisions",
      ["Decision", "Category", "Title", "Date", "Owner", "Department", "Branch", "Priority", "Due", "Status", "Implementation %", "Completed"],
      filtered.map((r) => [
        r.decision_number, titleCase(r.category), r.title, fmtDate(r.decision_date),
        r.owner?.full_name ?? "", r.department_slug ?? "", branchLabel(r.branch),
        titleCase(r.priority), fmtDate(r.due_date), titleCase(r.status), r.implementation_pct, fmtDate(r.completion_date),
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Decisions on register" value={String(stats.total)} />
        <Stat label="Outstanding" value={String(stats.open)} />
        <Stat label="Overdue" value={String(stats.overdue)} />
        <Stat label="Implemented" value={`${stats.implemented} (${stats.total ? Math.round((stats.implemented / stats.total) * 100) : 0}%)`} />
      </div>

      {canManage && (
        <Card className="p-6 print:hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Record an executive decision</p>
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Decision</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Approve 2027 ministry budget framework" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DECISION_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meeting</Label>
              <Select value={form.meeting_id} onValueChange={(v) => setForm({ ...form, meeting_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional — source meeting" /></SelectTrigger>
                <SelectContent>
                  {meetings.map((m) => <SelectItem key={m.id} value={m.id}>{m.title} · {fmtDate(m.meeting_date)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Decision date</Label>
              <Input type="date" value={form.decision_date} onChange={(e) => setForm({ ...form, decision_date: e.target.value })} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Responsible leader</Label>
              <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                <SelectTrigger><SelectValue placeholder="Assign owner" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>)}
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
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low", "normal", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>Detail / resolution wording</Label>
              <Textarea rows={2} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
            </div>
            <div><Button type="submit">Record decision</Button></div>
          </form>
        </Card>
      )}

      <Card className="flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div className="min-w-[200px] flex-1">
          <Label className="text-xs">Search</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Decision number or wording…" />
        </div>
        <div className="w-48">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {DECISION_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Label className="text-xs">Category</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {DECISION_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
      </Card>

      <div className="space-y-3">
        {loading && <Card className="p-8 text-center text-sm text-muted-foreground">Loading decision register…</Card>}
        {!loading && filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No decisions match these filters.</Card>}
        {filtered.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[260px] flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {r.decision_number} · {titleCase(r.category)} · {titleCase(r.priority)} priority
                </p>
                <p className="font-serif text-lg">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  Decided {fmtDate(r.decision_date)} · owner {r.owner?.full_name ?? "unassigned"} ·{" "}
                  {r.department_slug ?? "church-wide"} · {branchLabel(r.branch)} · due {fmtDate(r.due_date)}
                </p>
                {r.detail && <p className="mt-2 whitespace-pre-wrap text-sm">{r.detail}</p>}
                <div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${r.implementation_pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.implementation_pct}% implemented</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-widest ${STATUS_CLASS[r.status] ?? ""}`}>
                  {titleCase(r.status)}
                </span>
                {(canManage || r.owner_id === currentUserId) && (
                  <div className="flex flex-wrap justify-end gap-2 print:hidden">
                    <Select value={r.status} onValueChange={(v) => update(r, { status: v, completion_date: v === "implemented" ? new Date().toISOString().slice(0, 10) : null, implementation_pct: v === "implemented" ? 100 : r.implementation_pct })}>
                      <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DECISION_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={r.implementation_pct}
                      className="h-9 w-24"
                      onBlur={(e) => {
                        const v = Math.max(0, Math.min(100, Number(e.target.value)));
                        if (v !== r.implementation_pct) update(r, { implementation_pct: v });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </Card>
  );
}
