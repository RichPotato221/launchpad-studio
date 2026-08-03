import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { exportRows, fmtDate, titleCase } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";

const sb = supabase as any;

type Item = {
  id: string;
  source: "Decision" | "Resolution" | "Task" | "Compliance";
  reference: string;
  title: string;
  owner: string;
  ownerId: string | null;
  department: string;
  due: string | null;
  status: string;
  progress: number;
};

const today = () => new Date().toISOString().slice(0, 10);
const isClosed = (s: string) =>
  ["implemented", "closed", "done", "complete", "completed", "cancelled", "waived"].includes(s);

export default function AccountabilityTracker() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("all");
  const [view, setView] = useState("open");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [d, r, t, c] = await Promise.all([
        sb.from("governance_decisions").select("*, owner:profiles!governance_decisions_owner_id_fkey(id, full_name)"),
        sb.from("resolutions").select("*, owner:profiles!resolutions_owner_id_fkey(id, full_name)"),
        sb.from("tasks").select("*, owner:profiles!tasks_assigned_to_fkey(id, full_name)"),
        sb.from("compliance_items").select("*, owner:profiles!compliance_items_owner_id_fkey(id, full_name)"),
      ]);

      const mapped: Item[] = [
        ...(d.data ?? []).map((x: any) => ({
          id: `d-${x.id}`,
          source: "Decision" as const,
          reference: x.decision_number ?? "—",
          title: x.title,
          owner: x.owner?.full_name ?? "Unassigned",
          ownerId: x.owner?.id ?? null,
          department: x.department_slug ?? "—",
          due: x.due_date,
          status: x.status,
          progress: Number(x.implementation_pct ?? 0),
        })),
        ...(r.data ?? []).map((x: any) => ({
          id: `r-${x.id}`,
          source: "Resolution" as const,
          reference: x.resolution_number ?? "—",
          title: x.resolution_text,
          owner: x.owner?.full_name ?? "Unassigned",
          ownerId: x.owner?.id ?? null,
          department: x.department_slug ?? "—",
          due: x.due_date,
          status: x.status,
          progress: isClosed(x.status) ? 100 : 0,
        })),
        ...(t.data ?? []).map((x: any) => ({
          id: `t-${x.id}`,
          source: "Task" as const,
          reference: "—",
          title: x.title,
          owner: x.owner?.full_name ?? "Unassigned",
          ownerId: x.owner?.id ?? null,
          department: x.department_slug ?? "—",
          due: x.due_date,
          status: x.status,
          progress: isClosed(x.status) ? 100 : 0,
        })),
        ...(c.data ?? []).map((x: any) => ({
          id: `c-${x.id}`,
          source: "Compliance" as const,
          reference: "—",
          title: x.title,
          owner: x.owner?.full_name ?? "Unassigned",
          ownerId: x.owner?.id ?? null,
          department: x.department_slug ?? "—",
          due: x.due_date,
          status: x.status,
          progress: isClosed(x.status) ? 100 : 0,
        })),
      ];
      setItems(mapped);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      items
        .filter((i) => (source === "all" ? true : i.source === source))
        .filter((i) => {
          if (view === "open") return !isClosed(i.status);
          if (view === "overdue") return !isClosed(i.status) && !!i.due && i.due < today();
          if (view === "closed") return isClosed(i.status);
          return true;
        })
        .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999")),
    [items, source, view],
  );

  const openItems = items.filter((i) => !isClosed(i.status));
  const overdue = openItems.filter((i) => i.due && i.due < today());
  const completion = items.length
    ? Math.round((items.filter((i) => isClosed(i.status)).length / items.length) * 100)
    : 0;

  const byOwner = useMemo(() => {
    const map = new Map<string, { owner: string; open: number; overdue: number; total: number; closed: number }>();
    for (const i of items) {
      const key = i.owner;
      const e = map.get(key) ?? { owner: key, open: 0, overdue: 0, total: 0, closed: 0 };
      e.total += 1;
      if (isClosed(i.status)) e.closed += 1;
      else {
        e.open += 1;
        if (i.due && i.due < today()) e.overdue += 1;
      }
      map.set(key, e);
    }
    return [...map.values()].sort((a, b) => b.overdue - a.overdue || b.open - a.open).slice(0, 12);
  }, [items]);

  const exportCsv = () =>
    exportRows(
      "accountability-tracker",
      ["Source", "Reference", "Item", "Owner", "Department", "Due date", "Status", "Progress %"],
      filtered.map((i) => [i.source, i.reference, i.title, i.owner, i.department, fmtDate(i.due), titleCase(i.status), i.progress]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tracked commitments" value={String(items.length)} />
        <Stat label="Open" value={String(openItems.length)} />
        <Stat label="Overdue" value={String(overdue.length)} />
        <Stat label="Completion rate" value={`${completion}%`} />
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Accountability by owner</p>
        {byOwner.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No commitments recorded yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {byOwner.map((o) => {
              const pct = o.total ? Math.round((o.closed / o.total) * 100) : 0;
              return (
                <div key={o.owner} className="grid items-center gap-3 sm:grid-cols-[14rem_1fr_9rem]">
                  <p className="truncate text-sm">{o.owner}</p>
                  <Progress value={pct} />
                  <p className="text-xs text-muted-foreground">
                    {pct}% closed · {o.open} open{o.overdue ? ` · ${o.overdue} overdue` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="Decision">Decisions</SelectItem>
            <SelectItem value="Resolution">Resolutions</SelectItem>
            <SelectItem value="Task">Tasks</SelectItem>
            <SelectItem value="Compliance">Compliance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={view} onValueChange={setView}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="overdue">Overdue only</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">Everything</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Export tracker
        </Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading commitments…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nothing matches this view.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => {
            const late = !isClosed(i.status) && !!i.due && i.due < today();
            const rag = isClosed(i.status) ? "green" : late ? "red" : "amber";
            return (
              <Card key={i.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[18rem] flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[rag]}`} />
                      <p className="font-medium">{i.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {i.source} {i.reference !== "—" ? `· ${i.reference}` : ""} · {i.owner} · {i.department} · Due{" "}
                      {fmtDate(i.due)} · {titleCase(i.status)}
                    </p>
                  </div>
                  <div className="w-40">
                    <Progress value={i.progress} />
                    <p className="mt-1 text-right text-xs text-muted-foreground">{i.progress}%</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </Card>
  );
}
