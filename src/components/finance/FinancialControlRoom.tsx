import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, money, titleCase } from "@/lib/finance";
import { sumPositions, useBudgetPositions, useChurchPosition, utilisationBand } from "@/lib/budgets";

const sb = supabase as any;

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-xl md:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

/**
 * The church-wide money picture: cash on hand, what is already allocated to
 * departments, what is committed, and what is genuinely free to allocate.
 */
export default function FinancialControlRoom({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const church = useChurchPosition();
  const positions = useBudgetPositions();
  const [openAccount, setOpenAccount] = useState(false);

  const accounts = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("bank_accounts")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const byDepartment = useMemo(() => {
    const active = (positions.data ?? []).filter((p) => ["approved", "active", "locked"].includes(p.status));
    const slugs = Array.from(new Set(active.map((p) => p.department_slug ?? "church-wide")));
    return slugs
      .map((slug) => [slug, sumPositions(active.filter((r) => (r.department_slug ?? "church-wide") === slug))] as const)
      .sort((a, b) => b[1].allocated - a[1].allocated);
  }, [positions.data]);

  const pos = church.data;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif text-2xl">Financial control room</h3>
        <p className="text-sm text-muted-foreground">
          Cash available to the church, what has been committed to departments, and what is still free to allocate.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Figure label="Total cash" value={money(pos?.total_cash)} hint="All accounts" />
        <Figure label="Reserved" value={money(pos?.reserved)} hint="Not for general use" />
        <Figure label="Allocated to budgets" value={money(pos?.allocated)} />
        <Figure label="Committed" value={money(pos?.committed)} hint="Approved, unpaid" />
        <Figure label="Pending requests" value={money(pos?.pending)} />
        <Figure label="Free to allocate" value={money(pos?.unallocated)} hint="Cash less allocations" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-serif text-xl">Accounts</h4>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setOpenAccount(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add account
          </Button>
        )}
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="p-3">Account</th>
              <th className="p-3">Type</th>
              <th className="p-3">Branch</th>
              <th className="p-3">Balance</th>
              <th className="p-3">Reserved</th>
            </tr>
          </thead>
          <tbody>
            {(accounts.data ?? []).map((a: any) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3 text-muted-foreground">{titleCase(a.account_type)}</td>
                <td className="p-3 text-muted-foreground">{branchLabel(a.branch)}</td>
                <td className="p-3 whitespace-nowrap">{money(a.current_balance)}</td>
                <td className="p-3 whitespace-nowrap">{money(a.reserved_balance)}</td>
              </tr>
            ))}
            {(accounts.data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                  No accounts captured yet. Add the church bank and cash accounts so available funds can be calculated.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-serif text-xl">Department positions</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportRows(
              "department-budget-positions",
              ["Department", "Allocated", "Spent", "Committed", "Pending", "Available", "Utilisation %"],
              byDepartment.map(([slug, t]) => [
                titleCase(slug),
                t.allocated,
                t.spent,
                t.committed,
                t.pending,
                t.available,
                t.utilisation.toFixed(1),
              ]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Excel (CSV)
        </Button>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="p-3">Department</th>
              <th className="p-3">Allocated</th>
              <th className="p-3">Spent</th>
              <th className="p-3">Committed</th>
              <th className="p-3">Pending</th>
              <th className="p-3">Available</th>
              <th className="p-3">Health</th>
            </tr>
          </thead>
          <tbody>
            {byDepartment.map(([slug, t]) => {
              const band = utilisationBand(t.utilisation);
              return (
                <tr key={slug} className="border-b last:border-0">
                  <td className="p-3 font-medium">{titleCase(slug)}</td>
                  <td className="p-3 whitespace-nowrap">{money(t.allocated)}</td>
                  <td className="p-3 whitespace-nowrap">{money(t.spent)}</td>
                  <td className="p-3 whitespace-nowrap">{money(t.committed)}</td>
                  <td className="p-3 whitespace-nowrap">{money(t.pending)}</td>
                  <td className="p-3 whitespace-nowrap font-medium">{money(t.available)}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={band.className}>
                      {t.utilisation.toFixed(0)}% · {band.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {byDepartment.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">
                  No approved department budgets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <AccountDialog
        open={openAccount}
        onOpenChange={setOpenAccount}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["bank-accounts"] });
          qc.invalidateQueries({ queryKey: ["church-finance-position"] });
        }}
      />
    </div>
  );
}

function AccountDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: "", account_type: "bank", branch: "none", opening_balance: "", reserved_balance: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error("An account name is required.");
    setSaving(true);
    const opening = Number(form.opening_balance || 0);
    const { error } = await sb.from("bank_accounts").insert({
      name: form.name.trim(),
      account_type: form.account_type,
      branch: form.branch === "none" ? null : form.branch,
      opening_balance: opening,
      current_balance: opening,
      reserved_balance: Number(form.reserved_balance || 0),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Account added");
    setForm({ name: "", account_type: "bank", branch: "none", opening_balance: "", reserved_balance: "" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a church account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Account name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Main Church Account" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Type</Label>
              <Select value={form.account_type} onValueChange={(v) => set("account_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="savings">Savings / reserve</SelectItem>
                  <SelectItem value="project">Project account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => set("branch", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All branches</SelectItem>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current balance (R)</Label>
              <Input type="number" value={form.opening_balance} onChange={(e) => set("opening_balance", e.target.value)} />
            </div>
            <div>
              <Label>Reserved (R)</Label>
              <Input type="number" value={form.reserved_balance} onChange={(e) => set("reserved_balance", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={saving} onClick={submit}>Save account</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
