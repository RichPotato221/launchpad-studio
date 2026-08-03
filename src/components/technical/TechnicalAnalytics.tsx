import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RAG_CLASS, exportRows, fmtDate, money } from "@/lib/finance";
import { productionReadiness, ragForCount, ragForScore, streamHealthScore, titleish, today } from "@/lib/technical";

const sb = supabase as any;

/** MODULE 12 — Technical analytics, reporting and executive export. */
export default function TechnicalAnalytics() {
  const [productions, setProductions] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [maint, setMaint] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [p, s, f, a, m] = await Promise.all([
        sb.from("tech_productions").select("*").order("service_date", { ascending: false }).limit(60),
        sb.from("tech_streams").select("*").order("stream_date", { ascending: false }).limit(60),
        sb.from("tech_faults").select("*"),
        sb.from("tech_assets").select("*"),
        sb.from("tech_maintenance").select("*"),
      ]);
      setProductions(p.data ?? []); setStreams(s.data ?? []); setFaults(f.data ?? []);
      setAssets(a.data ?? []); setMaint(m.data ?? []);
    })();
  }, []);

  const avgReadiness = productions.length
    ? Math.round(productions.reduce((s, p) => s + productionReadiness(p).pct, 0) / productions.length)
    : 0;
  const avgStream = streams.length
    ? Math.round(streams.reduce((s, x) => s + streamHealthScore(x), 0) / streams.length)
    : 0;
  const resolved = faults.filter((f) => ["resolved", "closed"].includes(f.status));
  const resolutionRate = faults.length ? Math.round((resolved.length / faults.length) * 100) : 100;
  const avgResolutionDays = resolved.length
    ? Math.round(resolved.reduce((s, f) => s + (f.resolved_at ? (new Date(f.resolved_at).getTime() - new Date(f.created_at).getTime()) / 86400000 : 0), 0) / resolved.length)
    : 0;
  const maintCompliance = maint.length
    ? Math.round((maint.filter((m) => m.status === "completed").length / maint.length) * 100)
    : 100;
  const assetValue = assets.reduce((s, a) => s + Number(a.purchase_cost ?? 0), 0);
  const replacementsDue = assets.filter((a) => a.replacement_date && a.replacement_date <= today());

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    faults.forEach((f) => map.set(f.fault_type, (map.get(f.fault_type) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [faults]);

  const exportReport = () => {
    exportRows(
      "technical-operations-report",
      ["Metric", "Value"],
      [
        ["Average service readiness", `${avgReadiness}%`],
        ["Average stream health score", avgStream],
        ["Fault resolution rate", `${resolutionRate}%`],
        ["Average resolution time (days)", avgResolutionDays],
        ["Maintenance compliance", `${maintCompliance}%`],
        ["Assets registered", assets.length],
        ["Asset book value", money(assetValue)],
        ["Replacements due", replacementsDue.length],
        ["Broadcasts logged", streams.length],
        ["Productions planned", productions.length],
      ],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-lg">Technical performance report</h3>
        <Button variant="outline" onClick={exportReport}>Export report</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Service readiness</p>
          <p className="font-serif text-2xl">{avgReadiness}%</p>
          <Progress value={avgReadiness} className="mt-2" />
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Stream health</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-serif text-2xl">{avgStream}</p>
            <Badge variant="outline" className={RAG_CLASS[ragForScore(avgStream, 80, 60)]}>{ragForScore(avgStream, 80, 60).toUpperCase()}</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Fault resolution</p>
          <p className="font-serif text-2xl">{resolutionRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Average {avgResolutionDays} day(s) to close</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Maintenance compliance</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-serif text-2xl">{maintCompliance}%</p>
            <Badge variant="outline" className={RAG_CLASS[ragForScore(maintCompliance)]}>{ragForScore(maintCompliance).toUpperCase()}</Badge>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Faults by type</p>
          <ul className="mt-3 space-y-2 text-sm">
            {byCategory.map(([type, count]) => (
              <li key={type} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <span>{titleish(type)}</span>
                <Badge variant="outline" className={RAG_CLASS[ragForCount(count, 2, 6)]}>{count}</Badge>
              </li>
            ))}
            {!byCategory.length && <li className="text-muted-foreground">No faults recorded.</li>}
          </ul>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Asset lifecycle</p>
          <p className="mt-3 text-sm">Book value: <span className="font-medium">{money(assetValue)}</span></p>
          <p className="text-sm">Assets on register: <span className="font-medium">{assets.length}</span></p>
          <ul className="mt-3 space-y-2 text-sm">
            {replacementsDue.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <span>{a.name}<span className="block text-xs text-muted-foreground">Replacement due {fmtDate(a.replacement_date)}</span></span>
                <Badge variant="outline" className={RAG_CLASS.red}>Due</Badge>
              </li>
            ))}
            {!replacementsDue.length && <li className="text-muted-foreground">No replacements due.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
