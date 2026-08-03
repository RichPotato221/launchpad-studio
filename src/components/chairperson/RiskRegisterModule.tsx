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
import { BRANCHES, branchLabel, exportRows, fmtDate, titleCase } from "@/lib/finance";
import { ESCALATION_LEVELS, RAG_DOT, RAG_LABEL, RISK_CATEGORIES, RISK_STATUSES, ragForRisk } from "@/lib/governance";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

export default function RiskRegisterModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("open_only");
  const [filterCategory, setFilterCategory] = useState("all");

  const empty = {
    description: "",
    category: "Governance",
    likelihood: "3",
    impact: "3",
    mitigation: "",
    owner_id: "",
    department_slug: "",
    branch: "",
    review_date: "",
    escalation_level: "department",
  };
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const [r, p, d] = await Promise.all([
      sb.from("governance_risks")
        .select("*, owner:profiles!governance_risks_owner_id_fkey(id, full_name, email)")
        .order("rating", { ascending: false }),
      sb.from("profiles").select("id, full_name, email").eq("approval_status", "approved").order("full_name"),
      sb.from("departments").select("slug, name").order("name"),
    ]);
    setRows(r.data ?? []);
    setMembers(p.data ?? []);
    setDepartments(d.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return toast.error("A risk description is required.");
    const { error } = await sb.from("governance_risks").insert({
      description: form.description.trim(),
      category: form.category,
      likelihood: Number(form.likelihood),
      impact: Number(form.impact),
      mitigation: form.mitigation.trim() || null,
      owner_id: form.owner_id || null,
      department_slug: form.department_slug || null,
      branch: form.branch || null,
      review_date: form.review_date || null,
      escalation_level: form.escalation_level,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    if (form.owner_id) {
      await sb.from("notifications").insert({
        user_id: form.owner_id,
        title: "Risk assigned to you",
        message: form.description.trim().slice(0, 180),
        link: "/departments/chairperson",
        type: "governance_risk",
        branch: form.branch || null,
      });
    }
    toast.success("Risk added to the register");
    setForm(empty);
    load();
  };

  const update = async (row: any, patch: any) => {
    const { error } = await sb.from("governance_risks").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filterStatus === "open_only" && r.status === "closed") return false;
        if (!["all", "open_only"].includes(filterStatus) && r.status !== filterStatus) return false;
        if (filterCategory !== "all" && r.category !== filterCategory) return false;
        return true;
      }),
    [rows, filterStatus, filterCategory],
  );

  const open = rows.filter((r) => r.status !== "closed");
  const critical = open.filter((r) => Number(r.rating) >= 15);

  const exportCsv = () =>
    exportRows(
      "governance-risk-register",
      ["Risk ID", "Category", "Description", "Likelihood", "Impact", "Rating", "Band", "Mitigation", "Owner", "Department", "Branch", "Review date", "Status", "Escalation"],
      filtered.map((r) => [
        r.risk_number, r.category, r.description, r.likelihood, r.impact, r.rating,
        RAG_LABEL[ragForRisk(Number(r.rating))], r.mitigation ?? "",
        r.owner?.full_name ?? "", r.department_slug ?? "", branchLabel(r.branch),
        fmtDate(r.review_date), titleCase(r.status), titleCase(r.escalation_level),
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open risks" value={String(open.length)} />
        <Stat label="Critical risks" value={String(critical.length)} />
        <Stat label="Closed risks" value={String(rows.filter((r) => r.status === "closed").length)} />
        <Stat label="Due for review" value={String(open.filter((r) => r.review_date && r.review_date <= new Date().toISOString().slice(0, 10)).length)} />
      </div>

      {/* Heat map */}
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Risk heat map — likelihood × impact</p>
        <div className="mt-4 grid max-w-md grid-cols-6 gap-1 text-[0.65rem]">
          <div />
          {[1, 2, 3, 4, 5].map((i) => <div key={`hi${i}`} className="text-center text-muted-foreground">Impact {i}</div>)}
          {[5, 4, 3, 2, 1].map((l) => (
            <div key={`row${l}`} className="contents">
              <div className="text-muted-foreground">Lik {l}</div>
              {[1, 2, 3, 4, 5].map((i) => {
                const count = open.filter((r) => Number(r.likelihood) === l && Number(r.impact) === i).length;
                return (
                  <div
                    key={`${l}-${i}`}
                    className={`flex h-9 items-center justify-center rounded text-white ${RAG_DOT[ragForRisk(l * i)]} ${count ? "opacity-100" : "opacity-20"}`}
                    title={`${count} risk(s) · rating ${l * i}`}
                  >
                    {count || ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 print:hidden">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Add a risk</p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label>Risk description</Label>
            <Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Pastoral burnout across branch leadership" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RISK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Likelihood (1–5)</Label>
            <Select value={form.likelihood} onValueChange={(v) => setForm({ ...form, likelihood: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Impact (1–5)</Label>
            <Select value={form.impact} onValueChange={(v) => setForm({ ...form, impact: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Escalation level</Label>
            <Select value={form.escalation_level} onValueChange={(v) => setForm({ ...form, escalation_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESCALATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{titleCase(l)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Risk owner</Label>
            <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
              <SelectTrigger><SelectValue placeholder="Assign owner" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
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
            <Label>Next review date</Label>
            <Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Label>Mitigation plan</Label>
            <Textarea rows={2} value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} />
          </div>
          <div><Button type="submit">Add risk</Button></div>
        </form>
      </Card>

      <Card className="flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div className="w-48">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open_only">Open only</SelectItem>
              <SelectItem value="all">All risks</SelectItem>
              {RISK_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Label className="text-xs">Category</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {RISK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
      </Card>

      <div className="space-y-3">
        {loading && <Card className="p-8 text-center text-sm text-muted-foreground">Loading risk register…</Card>}
        {!loading && filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No risks match these filters.</Card>}
        {filtered.map((r) => {
          const band = ragForRisk(Number(r.rating));
          return (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[260px] flex-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {r.risk_number} · {r.category} · {titleCase(r.escalation_level)} escalation
                  </p>
                  <p className="font-serif text-lg">{r.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Owner {r.owner?.full_name ?? "unassigned"} · {r.department_slug ?? "church-wide"} · {branchLabel(r.branch)} · review {fmtDate(r.review_date)}
                  </p>
                  {r.mitigation && <p className="mt-2 whitespace-pre-wrap text-sm">Mitigation: {r.mitigation}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="flex items-center gap-2 text-xs">
                    <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[band]}`} />
                    Rating {r.rating} · {RAG_LABEL[band]}
                  </span>
                  <span className="text-xs text-muted-foreground">L{r.likelihood} × I{r.impact} · {titleCase(r.status)}</span>
                  {(canManage || r.owner_id === currentUserId) && (
                    <Select
                      value={r.status}
                      onValueChange={(v) => update(r, { status: v, closed_at: v === "closed" ? new Date().toISOString() : null })}
                    >
                      <SelectTrigger className="h-9 w-40 print:hidden"><SelectValue /></SelectTrigger>
                      <SelectContent>{RISK_STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
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
