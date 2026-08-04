import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate, titleCase } from "@/lib/finance";
import { ragForRisk, riskScore, today } from "@/lib/intercession";

const sb = supabase as any;

type Props = {
  table: string;
  categories: readonly string[];
  canManage: boolean;
  currentUserId: string;
  title?: string;
};

/** Reusable digital risk register with likelihood × impact scoring and a heatmap. */
export default function RiskRegisterModule({ table, categories, canManage, currentUserId, title = "Risk register" }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const empty = {
    title: "",
    category: categories[0] ?? "operational",
    description: "",
    likelihood: "3",
    impact: "3",
    owner_name: "",
    mitigation: "",
    review_date: today(),
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from(table).select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => riskScore(b.likelihood, b.impact) - riskScore(a.likelihood, a.impact)),
    [rows],
  );
  const open = rows.filter((r) => r.status !== "closed");
  const critical = open.filter((r) => riskScore(r.likelihood, r.impact) >= 15);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Describe the risk");
    const { error } = await sb.from(table).insert({
      ...form,
      likelihood: Number(form.likelihood),
      impact: Number(form.impact),
      review_date: form.review_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Risk registered");
    setForm({ ...empty });
    load();
  };

  const setStatus = async (row: any, status: string) => {
    const { error } = await sb.from(table).update({ status }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  // 5×5 heatmap counts
  const heat = useMemo(() => {
    const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (const r of open) {
      const l = Math.min(5, Math.max(1, Number(r.likelihood ?? 1)));
      const i = Math.min(5, Math.max(1, Number(r.impact ?? 1)));
      grid[5 - l][i - 1] += 1;
    }
    return grid;
  }, [open]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Open risks</p>
          <p className="font-serif text-2xl">{open.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Critical (score ≥ 15)</p>
          <p className="font-serif text-2xl">{critical.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Reviews due</p>
          <p className="font-serif text-2xl">
            {open.filter((r) => r.review_date && r.review_date <= today()).length}
          </p>
        </Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Register a risk</h3>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Risk</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{titleCase(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Risk owner</Label>
              <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
            </div>
            <div>
              <Label>Likelihood (1–5)</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.likelihood}
                onChange={(e) => setForm({ ...form, likelihood: e.target.value })}
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>Impact (1–5)</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.impact}
                onChange={(e) => setForm({ ...form, impact: e.target.value })}
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>Review date</Label>
              <Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
            </div>
            <div className="md:col-span-1" />
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Mitigation</Label>
              <Textarea rows={2} value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} />
            </div>
            <div className="md:col-span-4"><Button type="submit">Register risk</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-serif text-lg">Risk heatmap</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="text-xs">
            <tbody>
              {heat.map((row, ri) => (
                <tr key={ri}>
                  <td className="pr-2 text-right text-muted-foreground">L{5 - ri}</td>
                  {row.map((count, ci) => {
                    const score = (5 - ri) * (ci + 1);
                    const rag = ragForRisk(score);
                    return (
                      <td key={ci} className="p-1">
                        <div className={`flex h-11 w-14 items-center justify-center rounded border ${RAG_CLASS[rag]}`}>
                          {count || ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td />
                {[1, 2, 3, 4, 5].map((i) => (
                  <td key={i} className="pt-1 text-center text-muted-foreground">I{i}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg">{title}</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                `${table}-register`,
                ["Risk", "Category", "Likelihood", "Impact", "Score", "Owner", "Mitigation", "Review", "Status"],
                sorted.map((r) => [
                  r.title, r.category, r.likelihood, r.impact, riskScore(r.likelihood, r.impact),
                  r.owner_name, r.mitigation, r.review_date, r.status,
                ]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">Risk</th><th>Category</th><th>L</th><th>I</th><th>Score</th>
                <th>Owner</th><th>Review</th><th>Status</th>{canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const score = riskScore(r.likelihood, r.impact);
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="py-2 pr-3">
                      <p className="font-medium">{r.title}</p>
                      {r.mitigation && <p className="text-xs text-muted-foreground">Mitigation: {r.mitigation}</p>}
                    </td>
                    <td className="pr-3">{titleCase(r.category)}</td>
                    <td className="pr-3">{r.likelihood}</td>
                    <td className="pr-3">{r.impact}</td>
                    <td className="pr-3">
                      <Badge variant="outline" className={RAG_CLASS[ragForRisk(score)]}>{score}</Badge>
                    </td>
                    <td className="pr-3">{r.owner_name ?? "—"}</td>
                    <td className="pr-3">{fmtDate(r.review_date)}</td>
                    <td className="pr-3">{titleCase(r.status)}</td>
                    {canManage && (
                      <td className="pr-1">
                        {r.status !== "closed" ? (
                          <Button size="sm" variant="outline" onClick={() => setStatus(r, "closed")}>Close</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setStatus(r, "open")}>Reopen</Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">No risks registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
