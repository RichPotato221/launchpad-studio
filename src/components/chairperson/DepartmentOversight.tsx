import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer } from "lucide-react";
import { exportRows, fmtDate, titleCase } from "@/lib/finance";
import { RAG_DOT, RAG_LABEL, departmentHealth, ragForHealth, type DepartmentOversightRow } from "@/lib/governance";

const sb = supabase as any;

export default function DepartmentOversight() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [rag, setRag] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["chair-oversight"],
    queryFn: async () => {
      const [{ data: rows }, { data: leaders }] = await Promise.all([
        sb.rpc("get_department_oversight"),
        sb.from("profiles").select("id, full_name, primary_department, approval_status").eq("approval_status", "approved"),
      ]);
      return {
        rows: (rows ?? []) as DepartmentOversightRow[],
        leaders: leaders ?? [],
      };
    },
  });

  const rows = data?.rows ?? [];

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (kind !== "all" && r.kind !== kind) return false;
        if (search.trim() && !r.department_name.toLowerCase().includes(search.toLowerCase())) return false;
        if (rag !== "all" && ragForHealth(departmentHealth(r)) !== rag) return false;
        return true;
      }),
    [rows, kind, search, rag],
  );

  const kinds = Array.from(new Set(rows.map((r) => r.kind)));

  const exportCsv = () =>
    exportRows(
      "department-oversight",
      ["Department", "Structure", "Health", "Rating", "KPI %", "KPIs", "Open tasks", "Overdue", "Reports 90d", "Open risks", "Critical risks", "Compliance", "Open decisions", "Members", "Last activity"],
      filtered.map((r) => {
        const h = departmentHealth(r);
        return [
          r.department_name,
          titleCase(r.kind),
          h,
          RAG_LABEL[ragForHealth(h)],
          r.kpi_avg_pct ?? "",
          r.kpi_count,
          r.open_tasks,
          r.overdue_tasks,
          r.reports_90d,
          r.open_risks,
          r.critical_risks,
          r.open_compliance,
          r.open_decisions,
          r.members,
          fmtDate(r.last_activity),
        ];
      }),
    );

  if (isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground">Loading department oversight…</Card>;

  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Department oversight is available to church leadership (Senior Pastor, Chairperson, Secretary, Lead and Associate Pastors).
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div className="min-w-[200px] flex-1">
          <Label className="text-xs">Search</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Department name…" />
        </div>
        <div className="w-52">
          <Label className="text-xs">Structure</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All structures</SelectItem>
              {kinds.map((k) => <SelectItem key={k} value={k}>{titleCase(k)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Label className="text-xs">Rating</Label>
          <Select value={rag} onValueChange={setRag}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              <SelectItem value="green">On track</SelectItem>
              <SelectItem value="amber">Attention required</SelectItem>
              <SelectItem value="red">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => {
          const h = departmentHealth(r);
          const band = ragForHealth(h);
          const leader = (data?.leaders ?? []).find((l: any) => l.primary_department === r.department_slug);
          return (
            <Card key={r.department_slug} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-lg">{r.department_name}</p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{titleCase(r.kind)}</p>
                </div>
                <span className="flex items-center gap-2 text-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[band]}`} />
                  {h}%
                </span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${RAG_DOT[band]}`} style={{ width: `${h}%` }} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <Row label="Leader" value={leader?.full_name ?? "Not assigned"} />
                <Row label="Members" value={String(r.members)} />
                <Row label="KPI achievement" value={r.kpi_count ? `${r.kpi_avg_pct ?? 0}% (${r.kpi_count})` : "No KPIs"} />
                <Row label="Open tasks" value={`${r.open_tasks} (${r.overdue_tasks} overdue)`} />
                <Row label="Reports (90d)" value={String(r.reports_90d)} />
                <Row label="Open risks" value={`${r.open_risks} (${r.critical_risks} critical)`} />
                <Row label="Compliance" value={String(r.open_compliance)} />
                <Row label="Open decisions" value={String(r.open_decisions)} />
                <Row label="Last activity" value={fmtDate(r.last_activity)} />
                <Row label="Rating" value={RAG_LABEL[band]} />
              </dl>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No departments match these filters.</Card>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </>
  );
}
