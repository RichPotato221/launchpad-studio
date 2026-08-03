import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { money } from "@/lib/finance";
import {
  assetUtilisation, depreciatedValue, facilityReadiness, isOverdueReturn,
  labelFor, ragForOverdue, ragForPct, ragForRisk, replacementForecast, riskScore, ASSET_CATEGORIES, RISK_CATEGORIES,
} from "@/lib/resources";

const sb = supabase as any;

const DOT: Record<string, string> = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };

function Widget({ label, value, sub, rag }: { label: string; value: string; sub?: string; rag?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">{label}</p>
        {rag && <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[rag]}`} />}
      </div>
      <p className="mt-2 font-serif text-2xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

/** MODULE 1 — Executive Resource Dashboard. */
export default function ResourceDashboard() {
  const [d, setD] = useState<any>({
    assets: [], facilities: [], tickets: [], requests: [], checkouts: [],
    projects: [], inventory: [], risks: [], training: [],
  });

  useEffect(() => {
    (async () => {
      const [assets, facilities, tickets, requests, checkouts, projects, inventory, risks, training] = await Promise.all([
        sb.from("assets").select("*"),
        sb.from("res_facilities").select("*"),
        sb.from("res_maintenance_tickets").select("*"),
        sb.from("res_requests").select("*"),
        sb.from("res_asset_checkouts").select("*"),
        sb.from("res_projects").select("*"),
        sb.from("res_inventory_items").select("*"),
        sb.from("res_risks").select("*"),
        sb.from("res_training_records").select("*"),
      ]);
      setD({
        assets: assets.data ?? [], facilities: facilities.data ?? [], tickets: tickets.data ?? [],
        requests: requests.data ?? [], checkouts: checkouts.data ?? [], projects: projects.data ?? [],
        inventory: inventory.data ?? [], risks: risks.data ?? [], training: training.data ?? [],
      });
    })();
  }, []);

  const m = useMemo(() => {
    const assets = d.assets as any[];
    const liveAssets = assets.filter((a: any) => !["disposed", "retired"].includes(a.lifecycle_status ?? a.status));
    const bookValue = assets.reduce((s: number, a: any) => s + depreciatedValue(a), 0);
    const openOut = (d.checkouts as any[]).filter((c) => !c.checked_in_at);
    const overdueReturns = openOut.filter(isOverdueReturn);
    const openTickets = (d.tickets as any[]).filter((t) => !["completed", "closed"].includes(t.status));
    const today = new Date().toISOString().slice(0, 10);
    const maintenanceDue = assets.filter((a: any) => a.next_maintenance_date && a.next_maintenance_date <= today);
    const activeProjects = (d.projects as any[]).filter((p) => ["planning", "approved", "in_progress"].includes(p.status));
    const openRequests = (d.requests as any[]).filter((r) => !["closed", "rejected"].includes(r.status));
    const lowStock = (d.inventory as any[]).filter((i) => Number(i.quantity_on_hand) <= Number(i.minimum_stock));
    const readiness = facilityReadiness(d.facilities, d.tickets);
    const utilisation = assetUtilisation(liveAssets, d.checkouts);
    const forecast = replacementForecast(assets, 1);
    const safety = (d.facilities as any[]).filter((f) => f.safety_status === "compliant").length;
    const safetyPct = d.facilities.length ? Math.round((safety / d.facilities.length) * 100) : 100;
    const topRisks = [...(d.risks as any[])]
      .filter((r) => r.status !== "closed")
      .sort((a, b) => riskScore(b.likelihood, b.impact) - riskScore(a.likelihood, a.impact))
      .slice(0, 5);

    const byCategory = ASSET_CATEGORIES.map((c) => ({
      label: c.label,
      count: assets.filter((a: any) => a.category === c.key).length,
      value: assets.filter((a: any) => a.category === c.key).reduce((s: number, a: any) => s + depreciatedValue(a), 0),
    })).filter((c) => c.count > 0);

    const uncategorised = assets.filter((a: any) => !ASSET_CATEGORIES.some((c) => c.key === a.category)).length;

    return {
      total: assets.length, bookValue, openOut, overdueReturns, openTickets, maintenanceDue,
      activeProjects, openRequests, lowStock, readiness, utilisation, forecast, safetyPct, topRisks,
      byCategory, uncategorised,
      available: liveAssets.length - openOut.length,
    };
  }, [d]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Widget label="Total church assets" value={String(m.total)} sub="Registered items" rag="green" />
        <Widget label="Asset value (depreciated)" value={money(m.bookValue)} sub="Current book value" rag="green" />
        <Widget label="Available equipment" value={String(Math.max(0, m.available))} sub="Not checked out" rag={ragForPct(m.total ? (m.available / m.total) * 100 : 100)} />
        <Widget label="Checked out" value={String(m.openOut.length)} sub={`${m.overdueReturns.length} overdue return(s)`} rag={ragForOverdue(m.overdueReturns.length)} />

        <Widget label="Maintenance due" value={String(m.maintenanceDue.length)} sub="Assets past service date" rag={ragForOverdue(m.maintenanceDue.length, 1, 5)} />
        <Widget label="Open maintenance tickets" value={String(m.openTickets.length)} sub="Corrective & preventive" rag={ragForOverdue(m.openTickets.length, 3, 10)} />
        <Widget label="Development projects" value={String(m.activeProjects.length)} sub="Active infrastructure work" rag="green" />
        <Widget label="Facility readiness" value={`${m.readiness}%`} sub="Available, safe, no open faults" rag={ragForPct(m.readiness)} />

        <Widget label="Resource allocation" value={String(m.openRequests.length)} sub="Requests in the workflow" rag={ragForOverdue(m.openRequests.length, 5, 15)} />
        <Widget label="Asset utilisation" value={`${m.utilisation}%`} sub="Share of assets in active use" rag={ragForPct(m.utilisation, 40, 15)} />
        <Widget label="Replacement forecast" value={money(m.forecast.total)} sub={`${m.forecast.items.length} item(s) next 12 months`} rag={m.forecast.items.length > 10 ? "red" : m.forecast.items.length ? "amber" : "green"} />
        <Widget label="Health & safety compliance" value={`${m.safetyPct}%`} sub={`${m.lowStock.length} stock item(s) below minimum`} rag={ragForPct(m.safetyPct, 95, 80)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Assets by category</p>
          {m.byCategory.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No assets registered yet.</p>}
          <div className="mt-4 space-y-3">
            {m.byCategory.map((c) => (
              <div key={c.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="text-muted-foreground">{c.count} · {money(c.value)}</span>
                </div>
                <Progress value={m.total ? (c.count / m.total) * 100 : 0} className="mt-1 h-1.5" />
              </div>
            ))}
            {m.uncategorised > 0 && (
              <p className="pt-1 text-xs text-muted-foreground">{m.uncategorised} asset(s) not yet categorised.</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Top resource risks</p>
          {m.topRisks.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No open risks on the register.</p>}
          <ul className="mt-4 space-y-3 text-sm">
            {m.topRisks.map((r: any) => {
              const score = riskScore(r.likelihood, r.impact);
              return (
                <li key={r.id} className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[ragForRisk(score)]}`} />
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelFor(RISK_CATEGORIES, r.category)} · score {score} · owner {r.owner_name ?? "unassigned"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
