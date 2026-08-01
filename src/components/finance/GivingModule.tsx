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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Plus, Printer } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, fmtDate, INCOME_KINDS, money, titleCase } from "@/lib/finance";

const sb = supabase as any;

type Entry = {
  id: string;
  transaction_no: string | null;
  kind: string;
  amount: number;
  entry_date: string;
  branch: string | null;
  member_id: string | null;
  reference_number: string | null;
  notes: string | null;
  status: string | null;
};

type Member = { id: string; full_name: string | null; branch: string | null; email: string | null };

const KIND_OPTIONS = INCOME_KINDS as readonly string[];

export default function GivingModule({
  canManage,
  currentUserId,
}: {
  canManage: boolean;
  currentUserId: string;
}) {
  const qc = useQueryClient();
  const thisYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${thisYear}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState("all");
  const [branch, setBranch] = useState("all");
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [statementFor, setStatementFor] = useState<Member | null>(null);

  const members = useQuery({
    queryKey: ["giving-members"],
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await sb
        .from("profiles")
        .select("id, full_name, branch, email")
        .eq("approval_status", "approved")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const giving = useQuery({
    queryKey: ["giving-entries", from, to, kind, branch],
    queryFn: async (): Promise<Entry[]> => {
      let q = sb
        .from("finance_entries")
        .select("id, transaction_no, kind, amount, entry_date, branch, member_id, reference_number, notes, status")
        .in("kind", KIND_OPTIONS)
        .is("archived_at", null)
        .gte("entry_date", from)
        .lte("entry_date", to)
        .order("entry_date", { ascending: false })
        .limit(2000);
      if (kind !== "all") q = q.eq("kind", kind);
      if (branch !== "all") q = q.eq("branch", branch);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const memberName = (id: string | null) =>
    (members.data ?? []).find((m) => m.id === id)?.full_name ?? (id ? "Unknown member" : "Anonymous / general");

  const rows = giving.data ?? [];

  const totals = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const monthTotal = rows
      .filter((r) => (r.entry_date ?? "").startsWith(month))
      .reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const givers = new Set(rows.filter((r) => r.member_id).map((r) => r.member_id)).size;
    const byKind = new Map<string, number>();
    for (const r of rows) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + Number(r.amount ?? 0));
    return { total, monthTotal, givers, avg: rows.length ? total / rows.length : 0, byKind };
  }, [rows]);

  /** Per-member roll-up used for the giving register. */
  const perMember = useMemo(() => {
    const map = new Map<string, { member_id: string | null; total: number; count: number; last: string }>();
    for (const r of rows) {
      const key = r.member_id ?? "__anon__";
      const cur = map.get(key) ?? { member_id: r.member_id, total: 0, count: 0, last: r.entry_date };
      cur.total += Number(r.amount ?? 0);
      cur.count += 1;
      if (r.entry_date > cur.last) cur.last = r.entry_date;
      map.set(key, cur);
    }
    let list = [...map.values()].sort((a, b) => b.total - a.total);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((r) => memberName(r.member_id).toLowerCase().includes(s));
    }
    return list;
  }, [rows, search, members.data]);

  const create = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await sb.from("finance_entries").insert({
        ...payload,
        created_by: currentUserId,
        department_slug: "finance",
        status: "completed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contribution recorded");
      setOpenForm(false);
      qc.invalidateQueries({ queryKey: ["giving-entries"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not record the contribution"),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total giving (period)</p>
          <p className="mt-1 text-2xl font-semibold">{money(totals.total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">This month</p>
          <p className="mt-1 text-2xl font-semibold">{money(totals.monthTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Active givers</p>
          <p className="mt-1 text-2xl font-semibold">{totals.givers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Average gift</p>
          <p className="mt-1 text-2xl font-semibold">{money(totals.avg)}</p>
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Giving by stream</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {KIND_OPTIONS.map((k) => (
            <div key={k} className="flex items-center justify-between rounded border border-border/60 px-3 py-2 text-sm">
              <span>{titleCase(k)}</span>
              <span className="font-mono">{money(totals.byKind.get(k) ?? 0)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-4 print:hidden">
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Stream</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All streams</SelectItem>
                {KIND_OPTIONS.map((k) => <SelectItem key={k} value={k}>{titleCase(k)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Branch</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Member</Label>
            <Input placeholder="Search member…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "member-giving-register",
                ["Member", "Gifts", "Total", "Last gift"],
                perMember.map((r) => [memberName(r.member_id), r.count, r.total.toFixed(2), r.last]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setOpenForm(true)}>
              <Plus className="mr-2 h-4 w-4" /> Record contribution
            </Button>
          )}
        </div>
      </Card>

      {giving.isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading giving records…</Card>
      ) : perMember.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No contributions in this period.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="p-3">Member</th>
                <th className="p-3">Branch</th>
                <th className="p-3 text-right">Gifts</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Last gift</th>
                <th className="p-3 text-right print:hidden">Statement</th>
              </tr>
            </thead>
            <tbody>
              {perMember.map((r) => {
                const m = (members.data ?? []).find((x) => x.id === r.member_id) ?? null;
                return (
                  <tr key={r.member_id ?? "anon"} className="border-b last:border-0">
                    <td className="p-3 font-medium">{memberName(r.member_id)}</td>
                    <td className="p-3 text-muted-foreground">{branchLabel(m?.branch)}</td>
                    <td className="p-3 text-right font-mono">{r.count}</td>
                    <td className="p-3 text-right font-mono">{money(r.total)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(r.last)}</td>
                    <td className="p-3 text-right print:hidden">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!r.member_id}
                        onClick={() =>
                          setStatementFor(
                            m ?? { id: r.member_id ?? "", full_name: memberName(r.member_id), branch: null, email: null },
                          )
                        }
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {canManage && (
        <Dialog open={openForm} onOpenChange={setOpenForm}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record a contribution</DialogTitle></DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget as HTMLFormElement);
                const memberId = String(f.get("member_id") ?? "");
                create.mutate({
                  kind: String(f.get("kind")),
                  amount: Number(f.get("amount")),
                  entry_date: String(f.get("entry_date")),
                  posting_date: String(f.get("entry_date")),
                  branch: String(f.get("branch")),
                  member_id: memberId === "__anon__" ? null : memberId,
                  reference_number: String(f.get("reference_number") ?? "") || null,
                  notes: String(f.get("notes") ?? "") || null,
                  title: `${titleCase(String(f.get("kind")))} contribution`,
                });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Stream</Label>
                  <Select name="kind" defaultValue="tithe">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((k) => <SelectItem key={k} value={k}>{titleCase(k)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Amount (R)</Label>
                  <Input name="amount" type="number" step="0.01" min="0" required />
                </div>
                <div>
                  <Label className="text-xs">Date received</Label>
                  <Input name="entry_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <Label className="text-xs">Branch</Label>
                  <Select name="branch" defaultValue={BRANCHES[0]}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Member</Label>
                  <Select name="member_id" defaultValue="__anon__">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="__anon__">Anonymous / general offering</SelectItem>
                      {(members.data ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email ?? m.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Reference number</Label>
                  <Input name="reference_number" placeholder="EFT reference, receipt no…" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea name="notes" rows={2} />
                </div>
              </div>
              <Button type="submit" disabled={create.isPending} className="w-full">
                {create.isPending ? "Saving…" : "Record contribution"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <MemberStatement
        member={statementFor}
        onClose={() => setStatementFor(null)}
        from={from}
        to={to}
        entries={rows.filter((r) => statementFor && r.member_id === statementFor.id)}
      />
    </div>
  );
}

function MemberStatement({
  member,
  entries,
  from,
  to,
  onClose,
}: {
  member: Member | null;
  entries: Entry[];
  from: string;
  to: string;
  onClose: () => void;
}) {
  const total = entries.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Giving statement — {member?.full_name ?? "Member"}</DialogTitle></DialogHeader>
        <div id="member-statement" className="space-y-4">
          <div className="rounded border border-border p-4 text-sm">
            <p className="font-serif text-lg">Throne Room of God Kingdom Center</p>
            <p className="text-xs text-muted-foreground">
              Statement of contributions · {fmtDate(from)} to {fmtDate(to)}
            </p>
            <p className="mt-2">{member?.full_name ?? "—"}{member?.email ? ` · ${member.email}` : ""}</p>
            <p className="text-xs text-muted-foreground">{branchLabel(member?.branch)}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="p-2">Date</th>
                <th className="p-2">Transaction</th>
                <th className="p-2">Stream</th>
                <th className="p-2">Reference</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="p-2 whitespace-nowrap">{fmtDate(e.entry_date)}</td>
                  <td className="p-2 font-mono text-xs">{e.transaction_no ?? "—"}</td>
                  <td className="p-2">{titleCase(e.kind)}</td>
                  <td className="p-2 text-muted-foreground">{e.reference_number ?? "—"}</td>
                  <td className="p-2 text-right font-mono">{money(e.amount)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No contributions in this period.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={4} className="p-2 text-right font-medium">Total</td>
                <td className="p-2 text-right font-mono font-semibold">{money(total)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-xs text-muted-foreground">
            Issued for record purposes by the Finance Department. <Badge variant="outline">Confidential</Badge>
          </p>
        </div>
        <div className="flex justify-end gap-2 print:hidden">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                `giving-statement-${(member?.full_name ?? "member").replace(/\s+/g, "-").toLowerCase()}`,
                ["Date", "Transaction", "Stream", "Reference", "Amount"],
                entries.map((e) => [e.entry_date, e.transaction_no, e.kind, e.reference_number, Number(e.amount).toFixed(2)]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
