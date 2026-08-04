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
import {
  BRANCHES,
  EXPENSE_CATEGORIES,
  STATUS_CLASS,
  branchLabel,
  exportRows,
  fmtDate,
  money,
  titleCase,
} from "@/lib/finance";

const sb = supabase as any;

const STATUSES = [
  "submitted",
  "chair_approved",
  "senior_pastor_approved",
  "ordered",
  "received",
  "rejected",
  "cancelled",
] as const;

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

type Props = { canManage: boolean; currentUserId: string; departmentSlug?: string; scoped?: boolean };

export default function ProcurementModule({ canManage, currentUserId, departmentSlug = "finance", scoped = false }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const emptyForm = {
    title: "",
    description: "",
    category: "",
    supplier_id: "",
    budget_id: "",
    branch: "",
    amount_estimated: "",
    needed_by: "",
    priority: "normal",
    quote_url: "",
    quote_name: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    let prq = sb
      .from("purchase_requests")
      .select("*, supplier:suppliers(id, name), requester:profiles!purchase_requests_requester_id_fkey(id, full_name, email)")
      .is("archived_at", null);
    if (scoped) prq = prq.eq("department_slug", departmentSlug);
    const [{ data: prs }, { data: sup }, { data: bud }] = await Promise.all([
      prq.order("created_at", { ascending: false }),
      sb.from("suppliers").select("id, name").order("name"),
      sb.from("budgets").select("id, name, fiscal_year").is("archived_at", null).order("fiscal_year", { ascending: false }),
    ]);
    setRows(prs ?? []);
    setSuppliers(sup ?? []);
    setBudgets(bud ?? []);
    setLoading(false);
  };


  useEffect(() => {
    load();
  }, []);

  const onQuote = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `${departmentSlug}/procurement/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const up = await supabase.storage.from("department-reports").upload(path, file);
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("department-reports")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) throw signed.error;
      setForm((f) => ({ ...f, quote_url: signed.data.signedUrl, quote_name: file.name }));
      toast.success("Quotation attached");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const notifyFinanceTeam = async (title: string, branch: string | null) => {
    const financeSlugs = ["finance", "finance-administration"];
    const [{ data: byProfile }, { data: byRole }] = await Promise.all([
      sb.from("profiles").select("id").in("primary_department", financeSlugs),
      sb.from("user_roles").select("user_id").in("department_slug", financeSlugs),
    ]);
    const ids = Array.from(
      new Set([
        ...((byProfile ?? []) as any[]).map((p) => p.id),
        ...((byRole ?? []) as any[]).map((r) => r.user_id),
      ]),
    ).filter(Boolean);
    if (ids.length === 0) return;
    await sb.from("notifications").insert(
      ids.map((id) => ({
        user_id: id,
        title: `New purchase request — ${titleCase(departmentSlug)}`,
        message: title,
        link: "/departments/finance",
        type: "procurement",
        branch: branch ?? null,
      })),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("A title is required.");
    const { error } = await sb.from("purchase_requests").insert({
      department_slug: departmentSlug,
      requester_id: currentUserId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category || null,
      supplier_id: form.supplier_id || null,
      budget_id: form.budget_id || null,
      branch: form.branch || null,
      amount_estimated: form.amount_estimated ? Number(form.amount_estimated) : 0,
      needed_by: form.needed_by || null,
      priority: form.priority,
      quote_url: form.quote_url || null,
      quote_name: form.quote_name || null,
      status: "submitted",
    });
    if (error) return toast.error(error.message);
    await notifyFinanceTeam(form.title.trim(), form.branch || null);
    toast.success("Purchase request sent to the Finance Department");
    setForm(emptyForm);
    load();
  };


  const advance = async (row: any, status: string) => {
    const patch: any = { status };
    const now = new Date().toISOString();
    if (status === "chair_approved") {
      patch.approved_by_chair = currentUserId;
      patch.chair_approved_at = now;
    }
    if (status === "senior_pastor_approved") {
      patch.approved_by_senior = currentUserId;
      patch.senior_approved_at = now;
    }
    if (status === "ordered") {
      patch.ordered_at = now;
      patch.po_number = row.po_number ?? (row.pr_number ?? "PR").replace("PR-", "PO-");
    }
    if (status === "received") patch.received_at = now;
    if (status === "rejected") {
      const reason = window.prompt("Reason for rejection?") ?? "";
      patch.rejection_reason = reason || null;
    }
    const { error } = await sb.from("purchase_requests").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);

    if (row.requester_id && row.requester_id !== currentUserId) {
      await sb.from("notifications").insert({
        user_id: row.requester_id,
        title: `Purchase request ${row.pr_number ?? ""} — ${titleCase(status)}`,
        message: row.title,
        link: "/departments/finance",
        type: "procurement",
        branch: row.branch ?? null,
      });
    }
    toast.success(`Marked ${titleCase(status)}`);
    load();
  };

  const archive = async (row: any) => {
    const { error } = await sb
      .from("purchase_requests")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Archived");
    load();
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        if (filterBranch !== "all" && r.branch !== filterBranch) return false;
        if (search.trim()) {
          const t = search.toLowerCase();
          const hay = `${r.pr_number ?? ""} ${r.title ?? ""} ${r.supplier?.name ?? ""} ${r.category ?? ""} ${r.department_slug ?? ""}`.toLowerCase();
          if (!hay.includes(t)) return false;
        }
        return true;
      }),
    [rows, filterStatus, filterBranch, search],
  );

  const stats = useMemo(() => {
    const open = rows.filter((r) => ["submitted", "chair_approved", "senior_pastor_approved"].includes(r.status));
    const committed = rows.filter((r) => ["ordered", "received"].includes(r.status));
    return {
      awaiting: open.length,
      awaitingValue: open.reduce((s, r) => s + Number(r.amount_estimated || 0), 0),
      committedValue: committed.reduce((s, r) => s + Number(r.amount_actual ?? r.amount_estimated ?? 0), 0),
      received: rows.filter((r) => r.status === "received").length,
    };
  }, [rows]);

  const exportCsv = () =>
    exportRows(
      "procurement-register",
      ["PR number", "Date", "Title", "Category", "Supplier", "Branch", "Estimated", "Priority", "Needed by", "Status", "PO number"],
      filtered.map((r) => [
        r.pr_number,
        fmtDate(r.created_at),
        r.title,
        r.category ?? "",
        r.supplier?.name ?? "",
        branchLabel(r.branch),
        Number(r.amount_estimated ?? 0),
        r.priority,
        fmtDate(r.needed_by),
        titleCase(r.status),
        r.po_number ?? "",
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting approval" value={String(stats.awaiting)} sub={money(stats.awaitingValue)} />
        <StatCard label="Committed spend" value={money(stats.committedValue)} sub="Ordered & received" />
        <StatCard label="Goods received" value={String(stats.received)} sub="Closed out" />
        <StatCard label="Suppliers on register" value={String(suppliers.length)} sub="Approved vendors" />
      </div>

      {/* Raise a request */}
      <Card className="p-6 print:hidden">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Raise a purchase request</p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sound desk replacement" />
          </div>
          <div>
            <Label>Estimated amount (R)</Label>
            <Input type="number" step="any" value={form.amount_estimated} onChange={(e) => setForm({ ...form, amount_estimated: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Supplier</Label>
            <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional — preferred supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Budget</Label>
            <Select value={form.budget_id} onValueChange={(v) => setForm({ ...form, budget_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional — funding budget" /></SelectTrigger>
              <SelectContent>
                {budgets.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} · {b.fiscal_year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
              <SelectTrigger><SelectValue placeholder="Your branch" /></SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Needed by</Label>
            <Input type="date" value={form.needed_by} onChange={(e) => setForm({ ...form, needed_by: e.target.value })} />
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
          <div className="md:col-span-3">
            <Label>Motivation / description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Attach quotation (PDF, image, Word)</Label>
            <Input type="file" onChange={(e) => onQuote(e.target.files?.[0] ?? null)} />
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
            {form.quote_url && <p className="mt-1 text-xs text-emerald-700">Attached: {form.quote_name} ✓</p>}
          </div>
          <div className="flex items-end"><Button type="submit">Submit request</Button></div>
        </form>
      </Card>

      {/* Filters */}
      <Card className="flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div className="min-w-[200px] flex-1">
          <Label className="text-xs">Search</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PR number, title, supplier…" />
        </div>
        <div className="w-48">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label className="text-xs">Branch</Label>
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
      </Card>

      {/* Register */}
      <div className="space-y-3">
        {loading && <Card className="p-8 text-center text-sm text-muted-foreground">Loading procurement register…</Card>}
        {!loading && filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">No purchase requests match these filters.</Card>
        )}
        {filtered.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[240px]">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {r.pr_number}
                  {r.po_number && <> · {r.po_number}</>}
                  {!scoped && r.department_slug && <> · {titleCase(r.department_slug.replace(/-/g, " "))}</>}
                </p>
                <p className="font-serif text-lg">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {money(r.amount_actual ?? r.amount_estimated)} · {r.category ?? "Uncategorised"} ·{" "}
                  {r.supplier?.name ?? "No supplier"} · {branchLabel(r.branch)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Raised {fmtDate(r.created_at)} by {r.requester?.full_name ?? r.requester?.email ?? "—"}
                  {r.needed_by && <> · needed by {fmtDate(r.needed_by)}</>} · {titleCase(r.priority)} priority
                </p>
                {r.description && <p className="mt-2 whitespace-pre-wrap text-sm">{r.description}</p>}
                {r.rejection_reason && <p className="mt-2 text-xs text-red-700">Rejected: {r.rejection_reason}</p>}
                {r.quote_url && (
                  <a href={r.quote_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">
                    📎 {r.quote_name ?? "Quotation"}
                  </a>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-widest ${STATUS_CLASS[r.status] ?? ""}`}>
                  {titleCase(r.status)}
                </span>
                {canManage && (
                  <div className="flex flex-wrap justify-end gap-2 print:hidden">
                    {r.status === "submitted" && <Button size="sm" onClick={() => advance(r, "chair_approved")}>Chair approve</Button>}
                    {r.status === "chair_approved" && <Button size="sm" onClick={() => advance(r, "senior_pastor_approved")}>Senior Pastor approve</Button>}
                    {r.status === "senior_pastor_approved" && <Button size="sm" onClick={() => advance(r, "ordered")}>Raise order</Button>}
                    {r.status === "ordered" && <Button size="sm" onClick={() => advance(r, "received")}>Mark received</Button>}
                    {!["rejected", "cancelled", "received"].includes(r.status) && (
                      <Button size="sm" variant="outline" onClick={() => advance(r, "rejected")}>Reject</Button>
                    )}
                    {["received", "rejected", "cancelled"].includes(r.status) && (
                      <Button size="sm" variant="ghost" onClick={() => archive(r)}>Archive</Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-border/60 pt-2 text-[0.7rem] uppercase tracking-widest text-muted-foreground">
              <span>Chair: {r.chair_approved_at ? fmtDate(r.chair_approved_at) : "—"}</span>
              <span>Senior Pastor: {r.senior_approved_at ? fmtDate(r.senior_approved_at) : "—"}</span>
              <span>Ordered: {r.ordered_at ? fmtDate(r.ordered_at) : "—"}</span>
              <span>Received: {r.received_at ? fmtDate(r.received_at) : "—"}</span>
            </div>
          </Card>
        ))}
      </div>

      {canManage && <SupplierRegister suppliers={suppliers} onChange={load} />}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function SupplierRegister({ suppliers, onChange }: { suppliers: any[]; onChange: () => void }) {
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "" });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Supplier name is required.");
    const { error } = await sb.from("suppliers").insert({
      name: form.name.trim(),
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      email: form.email || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Supplier added");
    setForm({ name: "", contact_person: "", phone: "", email: "" });
    onChange();
  };

  return (
    <Card className="p-6 print:hidden">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Approved supplier register</p>
      <form onSubmit={add} className="mt-4 grid gap-3 md:grid-cols-5">
        <Input placeholder="Supplier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Contact person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
        <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Button type="submit">Add supplier</Button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {suppliers.map((s) => (
          <span key={s.id} className="rounded-full border border-border px-3 py-1 text-xs">{s.name}</span>
        ))}
        {suppliers.length === 0 && <p className="text-sm text-muted-foreground">No suppliers captured yet.</p>}
      </div>
    </Card>
  );
}
