import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Plus, Upload } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, fmtDate, money, titleCase } from "@/lib/finance";

const sb = supabase as any;

type Txn = {
  id: string;
  statement_id: string;
  txn_date: string;
  description: string;
  reference: string | null;
  amount: number;
  direction: string;
  match_status: string;
  matched_entry_id: string | null;
};

type Statement = {
  id: string;
  account_name: string;
  branch: string | null;
  period_start: string;
  period_end: string;
  opening_balance: number;
  closing_balance: number;
  file_name: string | null;
  bank_transactions: Txn[];
};

const matchClass: Record<string, string> = {
  unmatched: "bg-amber-100 text-amber-900",
  matched: "bg-emerald-100 text-emerald-900",
  ignored: "bg-muted text-muted-foreground",
};

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normaliseDate(raw: string) {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function parseStatementCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const di = idx("date");
  const desci = idx("description", "narrative", "details");
  const refi = idx("reference", "ref");
  const ai = idx("amount", "value");
  const debiti = idx("debit");
  const crediti = idx("credit");
  const hasHeader = di >= 0 || ai >= 0;
  const rows = hasHeader ? lines.slice(1) : lines;

  return rows
    .map((line) => {
      const c = splitCsvLine(line);
      const dateRaw = di >= 0 ? c[di] : c[0];
      const description = (desci >= 0 ? c[desci] : c[1]) ?? "";
      const reference = refi >= 0 ? c[refi] ?? null : null;
      let amount = 0;
      if (ai >= 0) amount = Number(String(c[ai] ?? "0").replace(/[^0-9.-]/g, ""));
      else if (debiti >= 0 || crediti >= 0) {
        const deb = Number(String(c[debiti] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
        const cred = Number(String(c[crediti] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
        amount = cred - deb;
      } else amount = Number(String(c[2] ?? "0").replace(/[^0-9.-]/g, ""));

      const txn_date = normaliseDate(dateRaw ?? "");
      if (!txn_date || !Number.isFinite(amount) || amount === 0) return null;
      return {
        txn_date,
        description: description || "Bank transaction",
        reference: reference || null,
        amount: Math.abs(amount),
        direction: amount < 0 ? "debit" : "credit",
      };
    })
    .filter(Boolean) as Array<{
    txn_date: string;
    description: string;
    reference: string | null;
    amount: number;
    direction: string;
  }>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

export default function ReconciliationModule({
  canManage,
  currentUserId,
}: {
  canManage: boolean;
  currentUserId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<ReturnType<typeof parseStatementCsv>>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const statements = useQuery({
    queryKey: ["bank-statements"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("bank_statements")
        .select("*, bank_transactions(*)")
        .order("period_end", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Statement[];
    },
  });

  const entries = useQuery({
    queryKey: ["recon-entries"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("finance_entries")
        .select("id, entry_date, title, amount, kind, transaction_no")
        .is("archived_at", null)
        .order("entry_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const importStatement = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await sb
        .from("bank_statements")
        .insert({ ...payload, imported_by: currentUserId, file_name: fileName })
        .select("id")
        .single();
      if (error) throw error;
      if (pending.length > 0) {
        const { error: tErr } = await sb
          .from("bank_transactions")
          .insert(pending.map((t) => ({ ...t, statement_id: data.id })));
        if (tErr) throw tErr;
      }
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success(`Statement imported with ${pending.length} transactions`);
      setOpen(false);
      setPending([]);
      setFileName(null);
      setActive(id);
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not import statement"),
  });

  const updateTxn = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await sb.from("bank_transactions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-statements"] }),
    onError: (e: any) => toast.error(e.message ?? "Could not update transaction"),
  });

  const list = statements.data ?? [];
  const current = useMemo(() => list.find((s) => s.id === active) ?? list[0] ?? null, [list, active]);
  const txns = current?.bank_transactions ?? [];
  const unmatched = txns.filter((t) => t.match_status === "unmatched");
  const matched = txns.filter((t) => t.match_status === "matched");
  const bankNet = txns.reduce((s, t) => s + (t.direction === "debit" ? -Number(t.amount) : Number(t.amount)), 0);
  const variance = current ? Number(current.opening_balance) + bankNet - Number(current.closing_balance) : 0;

  const autoMatch = useMutation({
    mutationFn: async () => {
      const pool = (entries.data ?? []).filter(
        (e: any) => !txns.some((t) => t.matched_entry_id === e.id),
      );
      const used = new Set<string>();
      const updates: Array<{ id: string; entry: string }> = [];
      unmatched.forEach((t) => {
        const hit = pool.find((e: any) => {
          if (used.has(e.id)) return false;
          if (Math.abs(Number(e.amount ?? 0) - Number(t.amount)) > 0.01) return false;
          const diff = Math.abs(new Date(e.entry_date).getTime() - new Date(t.txn_date).getTime());
          return diff <= 5 * 86400000;
        });
        if (hit) {
          used.add(hit.id);
          updates.push({ id: t.id, entry: hit.id });
        }
      });
      for (const u of updates) {
        const { error } = await sb
          .from("bank_transactions")
          .update({
            match_status: "matched",
            matched_entry_id: u.entry,
            matched_by: currentUserId,
            matched_at: new Date().toISOString(),
          })
          .eq("id", u.id);
        if (error) throw error;
      }
      return updates.length;
    },
    onSuccess: (n) => {
      toast.success(n > 0 ? `${n} transactions auto-matched` : "No new automatic matches found");
      qc.invalidateQueries({ queryKey: ["bank-statements"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Auto-match failed"),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Statement lines" value={String(txns.length)} hint={current?.account_name ?? "No statement"} />
        <Stat label="Matched" value={String(matched.length)} />
        <Stat label="Unmatched" value={String(unmatched.length)} hint="Needs review" />
        <Stat
          label="Reconciliation variance"
          value={money(variance)}
          hint={Math.abs(variance) < 0.01 ? "Balanced" : "Opening + movement vs closing"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Statement</Label>
          <Select value={current?.id ?? ""} onValueChange={setActive}>
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="No statements imported" />
            </SelectTrigger>
            <SelectContent>
              {list.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.account_name} · {fmtDate(s.period_start)} – {fmtDate(s.period_end)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportRows(
                "bank-reconciliation.csv",
                ["Date", "Description", "Reference", "Direction", "Amount", "Status", "Matched entry"],
                txns.map((t) => [
                  t.txn_date,
                  t.description,
                  t.reference ?? "",
                  t.direction,
                  t.amount,
                  t.match_status,
                  (entries.data ?? []).find((e: any) => e.id === t.matched_entry_id)?.title ?? "",
                ]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>

          {canManage && txns.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => autoMatch.mutate()} disabled={autoMatch.isPending}>
              Auto-match
            </Button>
          ) : null}

          {canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Import statement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import bank statement</DialogTitle>
                </DialogHeader>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget as HTMLFormElement);
                    importStatement.mutate({
                      account_name: String(f.get("account_name")),
                      branch: f.get("branch") ? String(f.get("branch")) : null,
                      period_start: String(f.get("period_start")),
                      period_end: String(f.get("period_end")),
                      opening_balance: Number(f.get("opening_balance") ?? 0),
                      closing_balance: Number(f.get("closing_balance") ?? 0),
                    });
                  }}
                >
                  <div>
                    <Label htmlFor="account_name">Bank account</Label>
                    <Input id="account_name" name="account_name" required placeholder="TRoGKC Main Cheque Account" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="period_start">Period start</Label>
                      <Input id="period_start" name="period_start" type="date" required />
                    </div>
                    <div>
                      <Label htmlFor="period_end">Period end</Label>
                      <Input id="period_end" name="period_end" type="date" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="opening_balance">Opening balance</Label>
                      <Input id="opening_balance" name="opening_balance" type="number" step="0.01" defaultValue="0" />
                    </div>
                    <div>
                      <Label htmlFor="closing_balance">Closing balance</Label>
                      <Input id="closing_balance" name="closing_balance" type="number" step="0.01" defaultValue="0" />
                    </div>
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Select name="branch">
                      <SelectTrigger>
                        <SelectValue placeholder="All branches" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((b) => (
                          <SelectItem key={b} value={b}>
                            {branchLabel(b)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="csv">Statement CSV</Label>
                    <Input
                      id="csv"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={async (ev) => {
                        const file = ev.target.files?.[0];
                        if (!file) return;
                        const text = await file.text();
                        const rows = parseStatementCsv(text);
                        setPending(rows);
                        setFileName(file.name);
                        if (rows.length === 0) toast.error("No transactions found in that CSV");
                        else toast.success(`${rows.length} transactions ready to import`);
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expects columns such as Date, Description, Reference and Amount (or Debit/Credit). Negative
                      amounts are treated as money out.
                    </p>
                    {pending.length > 0 ? (
                      <p className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
                        <Upload className="h-3 w-3" /> {pending.length} lines parsed from {fileName}
                      </p>
                    ) : null}
                  </div>
                  <Button type="submit" className="w-full" disabled={importStatement.isPending}>
                    Import statement
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-3">Date</th>
                <th className="p-3">Description</th>
                <th className="p-3">Reference</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ledger match</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap">{fmtDate(t.txn_date)}</td>
                  <td className="p-3">{t.description}</td>
                  <td className="p-3 text-muted-foreground">{t.reference ?? "—"}</td>
                  <td className={`p-3 text-right ${t.direction === "debit" ? "text-destructive" : ""}`}>
                    {t.direction === "debit" ? `(${money(t.amount)})` : money(t.amount)}
                  </td>
                  <td className="p-3">
                    <Badge className={matchClass[t.match_status] ?? ""}>{titleCase(t.match_status)}</Badge>
                  </td>
                  <td className="p-3">
                    {canManage ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={t.matched_entry_id ?? ""}
                          onValueChange={(v) =>
                            updateTxn.mutate({
                              id: t.id,
                              patch: {
                                matched_entry_id: v,
                                match_status: "matched",
                                matched_by: currentUserId,
                                matched_at: new Date().toISOString(),
                              },
                            })
                          }
                        >
                          <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Match to ledger entry" />
                          </SelectTrigger>
                          <SelectContent>
                            {(entries.data ?? []).map((e: any) => (
                              <SelectItem key={e.id} value={e.id}>
                                {fmtDate(e.entry_date)} · {e.title} · {money(e.amount)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {t.match_status !== "ignored" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateTxn.mutate({
                                id: t.id,
                                patch: { match_status: "ignored", matched_entry_id: null },
                              })
                            }
                          >
                            Ignore
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateTxn.mutate({ id: t.id, patch: { match_status: "unmatched" } })}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {(entries.data ?? []).find((e: any) => e.id === t.matched_entry_id)?.title ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No statement lines yet. Import a bank statement CSV to begin reconciling.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
