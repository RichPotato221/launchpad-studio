import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RAG_CLASS, fmtDate, money } from "@/lib/finance";
import { productionReadiness, ragForCount, ragForScore, riskScore, ragForRisk, today, titleish } from "@/lib/technical";

const sb = supabase as any;

function Stat({ label, value, hint, rag }: { label: string; value: string | number; hint?: string; rag?: "green" | "amber" | "red" }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-serif text-2xl">{value}</p>
        {rag && <Badge variant="outline" className={RAG_CLASS[rag]}>{rag.toUpperCase()}</Badge>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

/** MODULE 1 — Technical Operations executive dashboard. */
export default function TechnicalDashboard() {
  const [productions, setProductions] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [p, a, f, m, s, i, r, t] = await Promise.all([
        sb.from("tech_productions").select("*").order("service_date", { ascending: false }).limit(30),
        sb.from("tech_assets").select("*"),
        sb.from("tech_faults").select("*").order("created_at", { ascending: false }),
        sb.from("tech_maintenance").select("*").order("due_date"),
        sb.from("tech_streams").select("*").order("stream_date", { ascending: false }).limit(30),
        sb.from("tech_inventory").select("*"),
        sb.from("tech_risks").select("*"),
        sb.from("tech_team_members").select("*"),
      ]);
      setProductions(p.data ?? []); setAssets(a.data ?? []); setFaults(f.data ?? []);
      setMaintenance(m.data ?? []); setStreams(s.data ?? []); setInventory(i.data ?? []);
      setRisks(r.data ?? []); setTeam(t.data ?? []);
    })();
  }, []);

  const next = useMemo(
    () => productions.filter((p) => p.service_date >= today()).sort((a, b) => a.service_date.localeCompare(b.service_date))[0],
    [productions],
  );
  const readiness = next ? productionReadiness(next) : { done: 0, total: 8, pct: 0 };

  const openFaults = faults.filter((f) => !["resolved", "closed"].includes(f.status));
  const criticalFaults = openFaults.filter((f) => f.priority === "critical" || f.priority === "high");
  const overdueMaint = maintenance.filter((m) => m.status !== "completed" && m.due_date <= today());
  const lowStock = inventory.filter((i) => Number(i.quantity) <= Number(i.reorder_level));
  const faultyAssets = assets.filter((a) => a.condition === "faulty" || a.status === "repair");
  const assetValue = assets.reduce((s, a) => s + Number(a.purchase_cost ?? 0), 0);
  const lastStream = streams[0];
  const streamUptime = streams.length
    ? Math.round(streams.reduce((s, x) => s + Number(x.uptime_pct ?? 100), 0) / streams.length)
    : 100;
  const topRisks = [...risks]
    .filter((r) => r.status !== "closed")
    .sort((a, b) => riskScore(b.likelihood, b.impact) - riskScore(a.likelihood, a.impact))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Next service readiness" value={`${readiness.pct}%`} rag={ragForScore(readiness.pct)}
          hint={next ? `${next.title} · ${fmtDate(next.service_date)}` : "No upcoming production planned"} />
        <Stat label="Open faults" value={openFaults.length} rag={ragForCount(openFaults.length, 1, 5)}
          hint={`${criticalFaults.length} critical / high priority`} />
        <Stat label="Maintenance overdue" value={overdueMaint.length} rag={ragForCount(overdueMaint.length, 1, 4)}
          hint={`${maintenance.filter((m) => m.status !== "completed").length} tasks scheduled`} />
        <Stat label="Stream uptime" value={`${streamUptime}%`} rag={ragForScore(streamUptime, 97, 90)}
          hint={lastStream ? `Last: ${fmtDate(lastStream.stream_date)} · ${titleish(lastStream.health)}` : "No streams logged"} />
        <Stat label="Assets registered" value={assets.length} hint={`Book value ${money(assetValue)}`} />
        <Stat label="Assets faulty / in repair" value={faultyAssets.length} rag={ragForCount(faultyAssets.length, 1, 4)} />
        <Stat label="Consumables below reorder" value={lowStock.length} rag={ragForCount(lowStock.length, 1, 4)} />
        <Stat label="Technical crew" value={team.filter((t) => t.status === "active").length}
          hint={`${team.length} on the register`} />
      </div>

      {next && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Next production</p>
              <h3 className="font-serif text-xl">{next.title}</h3>
              <p className="text-sm text-muted-foreground">
                {fmtDate(next.service_date)} {next.start_time ? `· ${next.start_time.slice(0, 5)}` : ""} {next.venue ? `· ${next.venue}` : ""}
              </p>
            </div>
            <Badge variant="outline" className={RAG_CLASS[ragForScore(readiness.pct)]}>
              {readiness.done}/{readiness.total} checks complete
            </Badge>
          </div>
          <Progress value={readiness.pct} className="mt-4" />
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Priority faults</p>
          <ul className="mt-3 space-y-2 text-sm">
            {openFaults.slice(0, 6).map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                <span>
                  <span className="font-medium">{f.title}</span>
                  <span className="block text-xs text-muted-foreground">{titleish(f.fault_type)} · {fmtDate(f.created_at)}</span>
                </span>
                <Badge variant="outline" className={RAG_CLASS[f.priority === "critical" || f.priority === "high" ? "red" : f.priority === "medium" ? "amber" : "green"]}>
                  {titleish(f.priority)}
                </Badge>
              </li>
            ))}
            {!openFaults.length && <li className="text-muted-foreground">No open faults — all systems in service.</li>}
          </ul>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Top technical risks</p>
          <ul className="mt-3 space-y-2 text-sm">
            {topRisks.map((r) => {
              const score = riskScore(r.likelihood, r.impact);
              return (
                <li key={r.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                  <span>
                    <span className="font-medium">{r.title}</span>
                    <span className="block text-xs text-muted-foreground">{titleish(r.category)} · owner {r.owner ?? "—"}</span>
                  </span>
                  <Badge variant="outline" className={RAG_CLASS[ragForRisk(score)]}>{score}</Badge>
                </li>
              );
            })}
            {!topRisks.length && <li className="text-muted-foreground">No open technical risks recorded.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
