import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, fmtDate, titleCase } from "@/lib/finance";
import { COMPLIANCE_CATEGORIES, COMPLIANCE_STATUSES, complianceRag } from "@/lib/governance";
import { RAG_DOT, RAG_LABEL } from "@/lib/governance";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

const today = () => new Date().toISOString().slice(0, 10);

export default function ComplianceCentre({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("open_only");
  const [filterCategory, setFilterCategory] = useState("all");

  const empty = {
    title: "",
    category: COMPLIANCE_CATEGORIES[0],
    due_date: "",
    owner_id: "",
    department_slug: "",
    branch: "",
    risk_score: "3",
  };
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    setLoading(true);
    const [c, p, d] = await Promise.all([
      sb
        .from("compliance_items")
        .select("*, owner:profiles!compliance_items_owner_id_fkey(id, full_name, email)")
        .order("due_date", { ascending: true, nullsFirst: false }),
      sb.from("profiles").select("id, full_name, email").eq("approval_status", "approved").order("full_name"),
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("An obligation title is required.");
    const { error } = await sb.from("compliance_items").insert({
      title: form.title.trim(),
      category: form.category,
      due_date: form.due_date || null,
      owner_id: form.owner_id || currentUserId,
      department_slug: form.department_slug || null,
      branch: form.branch || null,
      risk_score: Number(form.risk_score),
      status: "open",
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    if (form.owner_id) {
      await sb.from("notifications").insert({
        user_id: form.owner_id,
        title: "Compliance obligation assigned to you",
        message: form.title.trim().slice(0, 180),
        link: "/departments/chairperson",
        type: "compliance",
        branch: form.branch || null,
      });
    }
    toast.success("Obligation added to the compliance register");
    setForm(empty);
    load();
  };

  const update = async (row: any, patch: any) => {
    const { error } = await sb.from("compliance_items").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filterStatus === "open_only" && ["complete", "waived"].includes(r.status)) return false;
        if (!["all", "open_only"].includes(filterStatus) && r.status !== filterStatus) return false;
        if (filterCategory !== "all" && r.category !== filterCategory) return false;
        return true;
      }),
    [rows, filterStatus, filterCategory],
  );

  const open = rows.filter((r) => !["complete", "waived"].includes(r.status));
  const overdue = open.filter((r) => r.due_date && r.due_date < today());
  const dueSoon = open.filter((r) => {
    if (!r.due_date || r.due_date < today()) return false;
    const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    return r.due_date <= in30;
  });

  const exportCsv = () =>
    exportRows(
      "compliance-statutory-register",
      ["Obligation", "Category", "Owner", "Department", "Branch", "Due date", "Risk score", "Status"],
      filtered.map((r) => [
        r.title,
        r.category,
        r.owner?.full_name ?? "",
        r.department_slug ?? "",
        branchLabel(r.branch),
        fmtDate(r.due_date),
        r.risk_score ?? "",
        titleCase(r.status),
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open obligations" value={String(open.length)} />
        <Stat label="Overdue" value={String(overdue.length)} />
        <Stat label="Due within 30 days" value={String(dueSoon.length)} />
        <Stat
          label="Compliance health"
          value={`${rows.length ? Math.round(((rows.length - overdue.length) / rows.length) * 100) : 100}%`}
        />
      </div>

      {canManage && (
        <Card className="p-6 print:hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Register a statutory or policy obligation</p>
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Obligation</Label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Annual NPO return submission to DSD"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Accountable owner</Label>
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
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Risk score (1–5)</Label>
              <Select value={form.risk_score} onValueChange={(v) => setForm({ ...form, risk_score: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Add obligation</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open_only">Open obligations</SelectItem>
            <SelectItem value="all">All obligations</SelectItem>
            {COMPLIANCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {COMPLIANCE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Export register
        </Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading the compliance register…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No obligations match this view.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const rag = complianceRag(r);
            return (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[16rem] flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[rag]}`} title={RAG_LABEL[rag]} />
                      <p className="font-medium">{r.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.category} · Owner {r.owner?.full_name ?? "Unassigned"} · {branchLabel(r.branch)}
                      {r.department_slug ? ` · ${r.department_slug}` : ""} · Due {fmtDate(r.due_date)} · Risk {r.risk_score ?? "–"}
                    </p>
                  </div>
                  {canManage && (
                    <Select value={r.status} onValueChange={(v) => update(r, { status: v })}>
                      <SelectTrigger className="h-9 w-44 print:hidden"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMPLIANCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
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
