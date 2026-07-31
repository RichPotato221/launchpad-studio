import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Plus, RefreshCw } from "lucide-react";
import {
  BRANCHES,
  branchLabel,
  EXPENSE_CATEGORIES,
  exportRows,
  fmtDate,
  money,
  STATUS_CLASS,
  titleCase,
  TRANSACTION_KINDS,
} from "@/lib/finance";

const sb = supabase as any;
const PAGE = 25;

export default function LedgerModule({
  canManage,
  currentUserId,
}: {
  canManage: boolean;
  currentUserId: string;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [branch, setBranch] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["finance-ledger", kind, status, branch, page],
    queryFn: async () => {
      let q = sb
        .from("finance_entries")
        .select("*", { count: "exact" })
        .is("archived_at", null)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (kind !== "all") q = q.eq("kind", kind);
      if (status !== "all") q = q.eq("status", status);
      if (branch !== "all") q = q.eq("branch", branch);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as any[], count: count ?? 0 };
    },
  });

  const rows = useMemo(() => {
    const list = query.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((r) =>
      [r.transaction_no, r.title, r.reference_number, r.category, r.notes, r.department_slug]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term)),
    );
  }, [query.data, search]);

  const setStatusMut = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      const patch: any = { status: next, updated_by: currentUserId };
      if (next === "approved") {
        patch.approved_by = currentUserId;
        patch.approved_at = new Date().toISOString();
      }
      if (next === "archived") patch.archived_at = new Date().toISOString();
      const { error } = await sb.from("finance_entries").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transaction updated");
      qc.invalidateQueries({ queryKey: ["finance-ledger"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  const total = query.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Input
          placeholder="Search transaction no, title, reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs"
        />
        <Select value={kind} onValueChange={(v) => { setKind(v); setPage(0); }}>
          <SelectTrigger className="w-[190px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TRANSACTION_KINDS.map((k) => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["draft", "pending", "approved", "rejected", "cancelled", "completed"].map((s) => (
              <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branch} onValueChange={(v) => { setBranch(v); setPage(0); }}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "finance-general-ledger",
              ["Transaction no", "Date", "Posting date", "Title", "Type", "Category", "Department", "Branch", "Reference", "Amount", "Status"],
              rows.map((r) => [
                r.transaction_no, r.entry_date, r.posting_date, r.title, r.kind, r.category,
                r.department_slug, r.branch, r.reference_number, r.amount, r.status,
              ]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Excel (CSV)
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>Print / PDF</Button>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New transaction</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader><DialogTitle>Capture transaction</DialogTitle></DialogHeader>
              <TransactionForm
                currentUserId={currentUserId}
                onDone={() => {
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ["finance-ledger"] });
                  qc.invalidateQueries({ queryKey: ["finance-summary"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {query.isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading ledger…</Card>
      ) : query.error ? (
        <Card className="p-10 text-center text-sm text-red-700">Could not load the ledger.</Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No transactions match these filters yet.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="p-3">Transaction no</th>
                <th className="p-3">Date</th>
                <th className="p-3">Title</th>
                <th className="p-3">Type</th>
                <th className="p-3">Department</th>
                <th className="p-3">Branch</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status</th>
                {canManage && <th className="p-3 print:hidden">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="p-3 font-mono text-xs">{r.transaction_no ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(r.entry_date)}</td>
                  <td className="p-3">
                    {r.title}
                    {r.reference_number && <p className="text-xs text-muted-foreground">Ref {r.reference_number}</p>}
                  </td>
                  <td className="p-3">{titleCase(r.kind)}</td>
                  <td className="p-3">{titleCase(r.department_slug)}</td>
                  <td className="p-3">{branchLabel(r.branch)}</td>
                  <td className="p-3 text-right">{money(r.amount)}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={STATUS_CLASS[r.status] ?? ""}>{titleCase(r.status)}</Badge>
                  </td>
                  {canManage && (
                    <td className="p-3 print:hidden">
                      <div className="flex flex-wrap gap-1">
                        {r.status !== "approved" && r.status !== "completed" && (
                          <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: r.id, next: "approved" })}>Approve</Button>
                        )}
                        {r.status !== "rejected" && (
                          <Button size="sm" variant="ghost" onClick={() => setStatusMut.mutate({ id: r.id, next: "rejected" })}>Reject</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setStatusMut.mutate({ id: r.id, next: "archived" })}>Archive</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground print:hidden">
        <span>{total} transactions · page {page + 1} of {pages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function TransactionForm({ currentUserId, onDone }: { currentUserId: string; onDone: () => void }) {
  const [form, setForm] = useState({
    title: "",
    kind: "offering",
    amount: "",
    entry_date: new Date().toISOString().slice(0, 10),
    posting_date: new Date().toISOString().slice(0, 10),
    department_slug: "finance",
    branch: "",
    category: "",
    ministry: "",
    reference_number: "",
    notes: "",
    status: "completed",
  });
  const [saving, setSaving] = useState(false);

  const departments = useQuery({
    queryKey: ["dept-options"],
    queryFn: async () => {
      const { data } = await sb.from("departments").select("slug, name").eq("archived", false).order("name");
      return (data ?? []) as { slug: string; name: string }[];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) return toast.error("Title and amount are required.");
    if (Number(form.amount) <= 0) return toast.error("Amount must be greater than zero.");
    setSaving(true);
    const { error } = await sb.from("finance_entries").insert({
      title: form.title.trim(),
      kind: form.kind,
      amount: Number(form.amount),
      entry_date: form.entry_date,
      posting_date: form.posting_date,
      department_slug: form.department_slug,
      branch: form.branch || null,
      category: form.category || null,
      ministry: form.ministry || null,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      status: form.status,
      created_by: currentUserId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Transaction captured — a transaction number was assigned automatically.");
    onDone();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Title *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div>
        <Label>Transaction type</Label>
        <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRANSACTION_KINDS.map((k) => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Amount (ZAR) *</Label>
        <Input type="number" step="any" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
      </div>
      <div>
        <Label>Transaction date</Label>
        <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
      </div>
      <div>
        <Label>Posting date</Label>
        <Input type="date" value={form.posting_date} onChange={(e) => setForm({ ...form, posting_date: e.target.value })} />
      </div>
      <div>
        <Label>Department</Label>
        <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(departments.data ?? []).map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Branch</Label>
        <Select value={form.branch || "none"} onValueChange={(v) => setForm({ ...form, branch: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not branch specific</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Category</Label>
        <Select value={form.category || "none"} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Ministry (optional)</Label>
        <Input value={form.ministry} onChange={(e) => setForm({ ...form, ministry: e.target.value })} />
      </div>
      <div>
        <Label>Reference number</Label>
        <Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
      </div>
      <div>
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["draft", "pending", "approved", "completed"].map((s) => (
              <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label>Notes</Label>
        <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Capture transaction"}</Button>
      </div>
    </form>
  );
}
