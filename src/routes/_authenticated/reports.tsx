import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAllKpis, fetchDepartments, KPI_CATEGORIES, type KpiCategory } from "@/lib/portal";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — TRoGKC Portal" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const kpis = useQuery({ queryKey: ["all-kpis"], queryFn: fetchAllKpis });
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const [category, setCategory] = useState<KpiCategory | "all">("all");
  const [dept, setDept] = useState<string>("all");

  const filtered = (kpis.data ?? []).filter((k) => {
    if (category !== "all" && k.category !== category) return false;
    if (dept !== "all" && k.department_slug !== dept) return false;
    return true;
  });

  const byCategory = KPI_CATEGORIES.map((c) => ({
    ...c,
    count: (kpis.data ?? []).filter((k) => k.category === c.key).length,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Roll-up reporting</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">Church-wide KPIs</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Aggregate view across every department. Data is stored in the KPI table (feeds Power BI via the Postgres connector).
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        {byCategory.map((c) => (
          <Card key={c.key} className="p-4">
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-serif text-3xl">{c.count}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <div>
          <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Category</p>
          <Select value={category} onValueChange={(v) => setCategory(v as any)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {KPI_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Department</p>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(depts.data ?? []).map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3">Department</th>
              <th className="p-3">KPI</th>
              <th className="p-3">Category</th>
              <th className="p-3">Period</th>
              <th className="p-3">Baseline</th>
              <th className="p-3">Target</th>
              <th className="p-3">Actual</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((k) => (
              <tr key={k.id} className="border-t border-border">
                <td className="p-3">{k.department_slug}</td>
                <td className="p-3 font-medium">{k.kpi_name}</td>
                <td className="p-3 text-muted-foreground">{k.category.replace("_", " ")}</td>
                <td className="p-3 text-muted-foreground">{k.period_type} · {k.period_date}</td>
                <td className="p-3">{k.baseline ?? "—"}</td>
                <td className="p-3">{k.target ?? "—"}</td>
                <td className="p-3 font-medium">{k.actual ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No KPI entries for this filter.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
