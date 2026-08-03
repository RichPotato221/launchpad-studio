import { useState } from "react";
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
import { Download, Plus } from "lucide-react";
import {
  BRANCHES,
  branchLabel,
  EXPENSE_CATEGORIES,
  exportRows,
  money,
  RAG_CLASS,
  ragForUtilisation,
  titleCase,
} from "@/lib/finance";

const sb = supabase as any;

export const BUDGET_TYPES = [
  { key: "annual_church", label: "Annual church budget" },
  { key: "branch", label: "Branch budget" },
  { key: "department", label: "Department budget" },
  { key: "ministry", label: "Ministry budget" },
  { key: "event", label: "Event budget" },
  { key: "project", label: "Project / capital budget" },
] as const;

const budgetTypeLabel = (k?: string | null) =>
  BUDGET_TYPES.find((t) => t.key === k)?.label ?? titleCase(k);


export default function BudgetsModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const qc = useQueryClient();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const budgets = useQuery({
    queryKey: ["budgets", year],
    queryFn: async () => {
      const { data, error } = await sb
        .from("budgets")
        .select("*, budget_lines(*)")
        .is("archived_at", null)
        .eq("fiscal_year", Number(year))
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const utilisation = useQuery({
    queryKey: ["budget-utilisation", year],
    queryFn: async () => {
      const { data, error } = await sb.rpc("get_budget_utilisation", { _fiscal_year: Number(year) });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const addLine = useMutation({
    mutationFn: async (payload: { budget_id: string; category: string; line_type: string; planned_amount: number }) => {
      const { error } = await sb.from("budget_lines").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget line added");
      qc.invalidateQueries({ queryKey: ["budgets"] });
      qc.invalidateQueries({ queryKey: ["budget-utilisation"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not add line"),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("budgets").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget archived (nothing is deleted)");
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not archive"),
  });

  const utilFor = (id: string) => (utilisation.data ?? []).find((u) => u.budget_id === id);
  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "budgets",
              ["Budget", "Year", "Department", "Branch", "Planned", "Actual", "Utilisation %", "Status"],
              (budgets.data ?? []).map((b) => {
                const u = utilFor(b.id);
                return [b.name, b.fiscal_year, b.department_slug, b.branch, u?.planned ?? 0, u?.actual ?? 0, u?.utilisation_pct ?? 0, b.status];
              }),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Excel (CSV)
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>Print / PDF</Button>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New budget</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create budget</DialogTitle></DialogHeader>
              <BudgetForm
                currentUserId={currentUserId}
                defaultYear={Number(year)}
                onDone={() => {
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ["budgets"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {budgets.isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading budgets…</Card>
      ) : budgets.error ? (
        <Card className="p-10 text-center text-sm text-red-700">Could not load budgets.</Card>
      ) : (budgets.data ?? []).length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No budgets for {year} yet. {canManage ? "Create one to start tracking utilisation." : ""}
        </Card>
      ) : (
        <div className="space-y-3">
          {(budgets.data ?? []).map((b) => {
            const u = utilFor(b.id);
            const pct = Number(u?.utilisation_pct ?? 0);
            const isOpen = expanded === b.id;
            return (
              <Card key={b.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {titleCase(b.department_slug)} · {branchLabel(b.branch)} · FY {b.fiscal_year}
                    </p>
                    {b.notes && <p className="mt-2 text-sm text-muted-foreground">{b.notes}</p>}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={RAG_CLASS[ragForUtilisation(pct)]}>{pct}% utilised</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {money(u?.actual)} of {money(u?.planned)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full rounded bg-muted">
                  <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                  <Button size="sm" variant="outline" onClick={() => setExpanded(isOpen ? null : b.id)}>
                    {isOpen ? "Hide lines" : `Budget lines (${(b.budget_lines ?? []).length})`}
                  </Button>
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => archive.mutate(b.id)}>Archive</Button>
                  )}
                </div>

                {isOpen && (
                  <div className="mt-4 border-t pt-4">
                    {(b.budget_lines ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No budget lines captured yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                            <th className="py-2">Category</th>
                            <th className="py-2">Type</th>
                            <th className="py-2 text-right">Planned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(b.budget_lines ?? []).map((l: any) => (
                            <tr key={l.id} className="border-b last:border-0">
                              <td className="py-2">{l.category}</td>
                              <td className="py-2">{titleCase(l.line_type)}</td>
                              <td className="py-2 text-right">{money(l.planned_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {canManage && <LineForm onAdd={(v) => addLine.mutate({ budget_id: b.id, ...v })} />}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LineForm({ onAdd }: { onAdd: (v: { category: string; line_type: string; planned_amount: number }) => void }) {
  const [category, setCategory] = useState("");
  const [lineType, setLineType] = useState("expense");
  const [amount, setAmount] = useState("");

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-4 print:hidden">
      <div>
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Line type</Label>
        <Select value={lineType} onValueChange={setLineType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Planned amount</Label>
        <Input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button
          size="sm"
          onClick={() => {
            if (!category || !amount) return toast.error("Category and amount are required.");
            onAdd({ category, line_type: lineType, planned_amount: Number(amount) });
            setCategory("");
            setAmount("");
          }}
        >
          Add line
        </Button>
      </div>
    </div>
  );
}

function BudgetForm({
  currentUserId,
  defaultYear,
  onDone,
}: {
  currentUserId: string;
  defaultYear: number;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    fiscal_year: String(defaultYear),
    department_slug: "finance",
    branch: "",
    notes: "",
    status: "draft",
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
    if (!form.name.trim()) return toast.error("Budget name is required.");
    setSaving(true);
    const { error } = await sb.from("budgets").insert({
      name: form.name.trim(),
      fiscal_year: Number(form.fiscal_year),
      department_slug: form.department_slug,
      branch: form.branch || null,
      notes: form.notes || null,
      status: form.status,
      created_by: currentUserId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Budget created");
    onDone();
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <Label>Budget name *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Financial year</Label>
          <Input type="number" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} />
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
              <SelectItem value="none">All branches</SelectItem>
              {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["draft", "submitted", "approved"].map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create budget"}</Button>
    </form>
  );
}
