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
import { BRANCHES, branchLabel, exportRows, fmtDate, money, titleCase } from "@/lib/finance";

const sb = supabase as any;

const RUN_STATUSES = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted for approval" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
] as const;

const statusClass: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-900",
  approved: "bg-sky-100 text-sky-900",
  paid: "bg-emerald-100 text-emerald-900",
};

type Line = {
  id: string;
  run_id: string;
  person_name: string;
  role_title: string | null;
  department_slug: string | null;
  gross_amount: number;
  allowances: number;
  deductions: number;
  net_amount: number;
  payment_status: string;
  notes: string | null;
};

type Run = {
  id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  branch: string | null;
  status: string;
  notes: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payroll_lines: Line[];
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

export default function PayrollModule({
  canManage,
  currentUserId,
}: {
  canManage: boolean;
  currentUserId: string;
}) {
  const qc = useQueryClient();
  const [openRun, setOpenRun] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const runs = useQuery({
    queryKey: ["payroll-runs"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("payroll_runs")
        .select("*, payroll_lines(*)")
        .order("period_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Run[];
    },
  });

  const members = useQuery({
    queryKey: ["payroll-members"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("profiles")
        .select("id, full_name, primary_department")
        .eq("approval_status", "approved")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const createRun = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await sb.from("payroll_runs").insert({ ...payload, created_by: currentUserId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payroll run created");
      setOpenRun(false);
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not create payroll run"),
  });

  const addLine = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await sb.from("payroll_lines").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payroll line added");
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not add line"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "approved") {
        patch.approved_by = currentUserId;
        patch.approved_at = new Date().toISOString();
      }
      if (status === "paid") patch.paid_at = new Date().toISOString();
      const { error } = await sb.from("payroll_runs").update(patch).eq("id", id);
      if (error) throw error;
      if (status === "paid") {
        await sb.from("payroll_lines").update({ payment_status: "paid" }).eq("run_id", id);
      }
    },
    onSuccess: () => {
      toast.success("Payroll status updated");
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update status"),
  });

  const all = runs.data ?? [];
  const totalNet = all
    .flatMap((r) => r.payroll_lines ?? [])
    .reduce((s, l) => s + Number(l.net_amount ?? 0), 0);
  const pendingRuns = all.filter((r) => r.status === "submitted").length;
  const paidThisYear = all
    .filter((r) => r.status === "paid" && r.period_start.startsWith(String(new Date().getFullYear())))
    .flatMap((r) => r.payroll_lines ?? [])
    .reduce((s, l) => s + Number(l.net_amount ?? 0), 0);

  const runTotals = (r: Run) => {
    const lines = r.payroll_lines ?? [];
    return {
      gross: lines.reduce((s, l) => s + Number(l.gross_amount ?? 0), 0),
      allow: lines.reduce((s, l) => s + Number(l.allowances ?? 0), 0),
      ded: lines.reduce((s, l) => s + Number(l.deductions ?? 0), 0),
      net: lines.reduce((s, l) => s + Number(l.net_amount ?? 0), 0),
      count: lines.length,
    };
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Payroll runs" value={String(all.length)} />
        <Stat label="Awaiting approval" value={String(pendingRuns)} hint="Submitted runs" />
        <Stat label="Paid this year" value={money(paidThisYear)} />
        <Stat label="Total net (all runs)" value={money(totalNet)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Stipends, salaries and honoraria for ministers and staff. Payroll is visible only to finance officers and
          leadership with admin access.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportRows(
                "payroll.csv",
                ["Period", "Branch", "Status", "Person", "Role", "Gross", "Allowances", "Deductions", "Net"],
                all.flatMap((r) =>
                  (r.payroll_lines ?? []).map((l) => [
                    r.period_label,
                    branchLabel(r.branch),
                    titleCase(r.status),
                    l.person_name,
                    l.role_title ?? "",
                    l.gross_amount,
                    l.allowances,
                    l.deductions,
                    l.net_amount,
                  ]),
                ),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>

          {canManage ? (
            <Dialog open={openRun} onOpenChange={setOpenRun}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> New payroll run
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New payroll run</DialogTitle>
                </DialogHeader>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget as HTMLFormElement);
                    createRun.mutate({
                      period_label: String(f.get("period_label")),
                      period_start: String(f.get("period_start")),
                      period_end: String(f.get("period_end")),
                      branch: f.get("branch") ? String(f.get("branch")) : null,
                      notes: String(f.get("notes") ?? "") || null,
                    });
                  }}
                >
                  <div>
                    <Label htmlFor="period_label">Period label</Label>
                    <Input id="period_label" name="period_label" required placeholder="August 2026 stipends" />
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
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" rows={2} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createRun.isPending}>
                    Create run
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {all.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No payroll runs yet. Create the first run to begin capturing stipends and salaries.
          </Card>
        ) : null}

        {all.map((r) => {
          const t = runTotals(r);
          const isOpen = expanded === r.id;
          return (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-lg">{r.period_label}</h3>
                    <Badge className={statusClass[r.status] ?? ""}>{titleCase(r.status)}</Badge>
                    {r.branch ? <Badge variant="outline">{branchLabel(r.branch)}</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmtDate(r.period_start)} – {fmtDate(r.period_end)} · {t.count} people
                    {r.approved_at ? ` · approved ${fmtDate(r.approved_at)}` : ""}
                    {r.paid_at ? ` · paid ${fmtDate(r.paid_at)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-xl">{money(t.net)}</p>
                  <p className="text-xs text-muted-foreground">
                    Gross {money(t.gross)} · Allow {money(t.allow)} · Ded {money(t.ded)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setExpanded(isOpen ? null : r.id)}>
                  {isOpen ? "Hide detail" : "View detail"}
                </Button>
                {canManage && r.status === "draft" ? (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: r.id, status: "submitted" })}>
                    Submit for approval
                  </Button>
                ) : null}
                {canManage && r.status === "submitted" ? (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: r.id, status: "approved" })}>
                    Approve
                  </Button>
                ) : null}
                {canManage && r.status === "approved" ? (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: r.id, status: "paid" })}>
                    Mark paid
                  </Button>
                ) : null}
              </div>

              {isOpen ? (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="py-2">Person</th>
                          <th className="py-2">Role</th>
                          <th className="py-2 text-right">Gross</th>
                          <th className="py-2 text-right">Allowances</th>
                          <th className="py-2 text-right">Deductions</th>
                          <th className="py-2 text-right">Net</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(r.payroll_lines ?? []).map((l) => (
                          <tr key={l.id} className="border-t">
                            <td className="py-2">{l.person_name}</td>
                            <td className="py-2 text-muted-foreground">{l.role_title ?? "—"}</td>
                            <td className="py-2 text-right">{money(l.gross_amount)}</td>
                            <td className="py-2 text-right">{money(l.allowances)}</td>
                            <td className="py-2 text-right">{money(l.deductions)}</td>
                            <td className="py-2 text-right font-medium">{money(l.net_amount)}</td>
                            <td className="py-2">
                              <Badge variant="outline">{titleCase(l.payment_status)}</Badge>
                            </td>
                          </tr>
                        ))}
                        {(r.payroll_lines ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-muted-foreground">
                              No payroll lines yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  {canManage && r.status === "draft" ? (
                    <form
                      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-6"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget as HTMLFormElement;
                        const f = new FormData(form);
                        const memberId = String(f.get("member_id") ?? "");
                        const chosen = (members.data ?? []).find((m: any) => m.id === memberId);
                        addLine.mutate({
                          run_id: r.id,
                          member_id: memberId || null,
                          person_name: chosen?.full_name ?? String(f.get("person_name") ?? "Unnamed"),
                          role_title: String(f.get("role_title") ?? "") || null,
                          department_slug: chosen?.primary_department ?? null,
                          gross_amount: Number(f.get("gross_amount") ?? 0),
                          allowances: Number(f.get("allowances") ?? 0),
                          deductions: Number(f.get("deductions") ?? 0),
                        });
                        form.reset();
                      }}
                    >
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Member</Label>
                        <Select name="member_id">
                          <SelectTrigger>
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                          <SelectContent>
                            {(members.data ?? []).map((m: any) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Input name="role_title" placeholder="Pastor" />
                      </div>
                      <div>
                        <Label className="text-xs">Gross</Label>
                        <Input name="gross_amount" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div>
                        <Label className="text-xs">Allowances</Label>
                        <Input name="allowances" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div>
                        <Label className="text-xs">Deductions</Label>
                        <Input name="deductions" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div className="sm:col-span-6">
                        <Button type="submit" size="sm" disabled={addLine.isPending}>
                          <Plus className="mr-2 h-4 w-4" /> Add payroll line
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
