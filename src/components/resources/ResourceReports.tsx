import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { money, exportRows, branchLabel, BRANCHES, RAG_CLASS } from "@/lib/finance";
import {
  ASSET_CATEGORIES, assetUtilisation, depreciatedValue, facilityReadiness,
  labelFor, ragForPct, replacementForecast, isOverdueReturn,
} from "@/lib/resources";

const sb = supabase as any;

/** MODULES 11 & 12 — Resource KPIs and the reporting suite. */
export default function ResourceReports() {
  const [d, setD] = useState<any>({ assets: [], facilities: [], tickets: [], checkouts: [], requests: [], inventory: [], projects: [], depts: [] });

  useEffect(() => {
    (async () => {
      const [assets, facilities, tickets, checkouts, requests, inventory, projects, depts] = await Promise.all([
        sb.from("assets").select("*"),
        sb.from("res_facilities").select("*"),
        sb.from("res_maintenance_tickets").select("*"),
        sb.from("res_asset_checkouts").select("*"),
        sb.from("res_requests").select("*"),
        sb.from("res_inventory_items").select("*"),
        sb.from("res_projects").select("*"),
        sb.from("departments").select("slug, name"),
      ]);
      setD({
        assets: assets.data ?? [], facilities: facilities.data ?? [], tickets: tickets.data ?? [],
        checkouts: checkouts.data ?? [], requests: requests.data ?? [], inventory: inventory.data ?? [],
        projects: projects.data ?? [], depts: depts.data ?? [],
      });
    })();
  }, []);

  const kpis = useMemo(() => {
    const assets = d.assets as any[];
    const tickets = d.tickets as any[];
    const requests = d.requests as any[];
    const closedTickets = tickets.filter((t) => t.completed_at);
    const mttrHours = closedTickets.length
      ? closedTickets.reduce((s, t) => s + (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 3_600_000, 0) / closedTickets.length
      : 0;
    const fulfilled = requests.filter((r) => ["issued", "returned", "inspected", "closed"].includes(r.status)).length;
    const fulfilmentPct = requests.length ? Math.round((fulfilled / requests.length) * 100) : 100;
    const lost = assets.filter((a) => ["lost", "disposed"].includes(a.lifecycle_status ?? "")).length;
    const lossPct = assets.length ? Math.round((lost / assets.length) * 100) : 0;
    const overdue = (d.checkouts as any[]).filter(isOverdueReturn).length;
    const openOut = (d.checkouts as any[]).filter((c) => !c.checked_in_at).length;
    const returnPct = openOut ? Math.round(((openOut - overdue) / openOut) * 100) : 100;
    const preventive = tickets.filter((t) => t.maintenance_kind === "preventive");
    const preventiveDone = preventive.filter((t) => ["completed", "closed"].includes(t.status)).length;
    const preventivePct = preventive.length ? Math.round((preventiveDone / preventive.length) * 100) : 100;
    const maintenanceSpend = tickets.reduce((s, t) => s + Number(t.actual_cost ?? 0), 0);
    const stockAccuracy = d.inventory.length
      ? Math.round((d.inventory.filter((i: any) => Number(i.quantity_on_hand) >= Number(i.minimum_stock)).length / d.inventory.length) * 100)
      : 100;
    const projectsOnTime = (d.projects as any[]).filter((p) => p.status === "completed" && p.actual_end_date && p.target_end_date && p.actual_end_date <= p.target_end_date).length;
    const projectsDone = (d.projects as any[]).filter((p) => p.status === "completed").length;
    const projectPct = projectsDone ? Math.round((projectsOnTime / projectsDone) * 100) : 100;
    const safety = (d.facilities as any[]).filter((f) => f.safety_status === "compliant").length;
    const safetyPct = d.facilities.length ? Math.round((safety / d.facilities.length) * 100) : 100;

    return [
      { label: "Asset availability", value: assets.length ? Math.round(((assets.length - openOut) / assets.length) * 100) : 100, unit: "%", target: 85 },
      { label: "Asset utilisation", value: assetUtilisation(assets, d.checkouts), unit: "%", target: 40 },
      { label: "Maintenance response (MTTR)", value: Math.round(mttrHours), unit: "h", target: 48, lowerIsBetter: true },
      { label: "Preventive maintenance completion", value: preventivePct, unit: "%", target: 90 },
      { label: "Request fulfilment", value: fulfilmentPct, unit: "%", target: 90 },
      { label: "Equipment return rate", value: returnPct, unit: "%", target: 95 },
      { label: "Asset loss / disposal rate", value: lossPct, unit: "%", target: 5, lowerIsBetter: true },
      { label: "Facility readiness", value: facilityReadiness(d.facilities, d.tickets), unit: "%", target: 90 },
      { label: "Health & safety compliance", value: safetyPct, unit: "%", target: 100 },
      { label: "Stock accuracy", value: stockAccuracy, unit: "%", target: 95 },
      { label: "Projects delivered on time", value: projectPct, unit: "%", target: 80 },
      { label: "Maintenance spend", value: maintenanceSpend, unit: "R", target: 0 },
    ];
  }, [d]);

  const byDept = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    for (const a of d.assets as any[]) {
      const k = a.department_slug ?? "unassigned";
      const cur = map.get(k) ?? { count: 0, value: 0 };
      map.set(k, { count: cur.count + 1, value: cur.value + depreciatedValue(a) });
    }
    return [...map.entries()].map(([slug, v]) => ({
      name: d.depts.find((x: any) => x.slug === slug)?.name ?? "Unassigned", ...v,
    })).sort((a, b) => b.value - a.value);
  }, [d]);

  const byBranch = useMemo(
    () => BRANCHES.map((b) => ({
      name: branchLabel(b),
      count: (d.assets as any[]).filter((a) => a.branch === b).length,
      value: (d.assets as any[]).filter((a) => a.branch === b).reduce((s, a) => s + depreciatedValue(a), 0),
      facilities: (d.facilities as any[]).filter((f) => f.branch === b).length,
    })),
    [d],
  );

  const forecast = useMemo(() => replacementForecast(d.assets, 1), [d]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Resource KPI scorecard</p>
          <Button size="sm" variant="outline" onClick={() => exportRows("resource-kpis", ["KPI", "Value", "Unit", "Target"], kpis.map((k) => [k.label, k.value, k.unit, k.target]))}>Export</Button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kpis.map((k) => {
            const pct = k.unit === "R" ? 100 : k.lowerIsBetter
              ? Math.max(0, Math.min(100, 100 - (k.value / Math.max(k.target, 1)) * 100))
              : Math.min(100, (k.value / Math.max(k.target, 1)) * 100);
            return (
              <div key={k.label} className="rounded border p-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm">{k.label}</p>
                  <span className={`rounded px-2 py-0.5 text-xs ${RAG_CLASS[ragForPct(pct)]}`}>
                    {k.unit === "R" ? money(k.value) : `${k.value}${k.unit}`}
                  </span>
                </div>
                {k.unit !== "R" && <Progress value={pct} className="mt-2 h-1.5" />}
                {k.unit !== "R" && <p className="mt-1 text-xs text-muted-foreground">Target {k.target}{k.unit}</p>}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Assets by department</p>
            <Button size="sm" variant="outline" onClick={() => exportRows("assets-by-department", ["Department", "Assets", "Value"], byDept.map((x) => [x.name, x.count, Math.round(x.value)]))}>Export</Button>
          </div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {byDept.map((x) => (
                <tr key={x.name} className="border-b last:border-0">
                  <td className="py-2">{x.name}</td>
                  <td className="py-2 text-right text-muted-foreground">{x.count}</td>
                  <td className="py-2 text-right">{money(x.value)}</td>
                </tr>
              ))}
              {byDept.length === 0 && <tr><td className="py-3 text-muted-foreground">No assets registered.</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Branch resource comparison</p>
          <table className="mt-3 w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Branch</th><th className="py-2 text-right">Assets</th><th className="py-2 text-right">Value</th><th className="py-2 text-right">Facilities</th></tr>
            </thead>
            <tbody>
              {byBranch.map((x) => (
                <tr key={x.name} className="border-b last:border-0">
                  <td className="py-2">{x.name}</td>
                  <td className="py-2 text-right">{x.count}</td>
                  <td className="py-2 text-right">{money(x.value)}</td>
                  <td className="py-2 text-right">{x.facilities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Category valuation</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {ASSET_CATEGORIES.map((c) => {
                const items = (d.assets as any[]).filter((a) => a.category === c.key);
                if (!items.length) return null;
                return (
                  <tr key={c.key} className="border-b last:border-0">
                    <td className="py-2">{labelFor(ASSET_CATEGORIES, c.key)}</td>
                    <td className="py-2 text-right text-muted-foreground">{items.length}</td>
                    <td className="py-2 text-right">{money(items.reduce((s, a) => s + depreciatedValue(a), 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Replacement forecast (12 months)</p>
            <Button size="sm" variant="outline" onClick={() => exportRows("replacement-forecast", ["Asset", "Estimated cost", "Reason"], forecast.items.map((i) => [i.name, Math.round(i.value), i.reason]))}>Export</Button>
          </div>
          <p className="mt-2 font-serif text-2xl">{money(forecast.total)}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {forecast.items.slice(0, 12).map((i) => (
              <li key={i.name} className="flex justify-between border-b py-1 last:border-0">
                <span>{i.name}<span className="block text-xs text-muted-foreground">{i.reason}</span></span>
                <span>{money(i.value)}</span>
              </li>
            ))}
            {forecast.items.length === 0 && <li className="text-muted-foreground">Nothing due for replacement.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
