import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRANCHES, branchLabel, exportRows, fmtDate, money } from "@/lib/finance";
import {
  ASSET_MOVEMENT_STATUSES, MOVEMENT_STATUSES, MOVEMENT_TYPES, OPEN_INCIDENT_STATUSES,
  movementTypeLabel, pretty,
} from "@/lib/assetMovement";
import { StatusBadge } from "./MovementsModule";

const sb = supabase as any;

const REPORTS = [
  { key: "register", label: "Asset Register" },
  { key: "movements", label: "Asset Movement Report" },
  { key: "loans", label: "Inter-Branch Loans" },
  { key: "transfers", label: "Permanent Transfers" },
  { key: "overdue", label: "Overdue Assets" },
  { key: "incidents", label: "Incidents" },
  { key: "conditions", label: "Asset Conditions" },
  { key: "branch", label: "Branch Assets" },
  { key: "custody", label: "Custody History" },
  { key: "outstanding", label: "Outstanding Agreements" },
  { key: "audit", label: "Audit Trail" },
] as const;

/** Filterable enterprise asset & movement reporting with CSV and print output. */
export default function AssetMovementReports() {
  const [d, setD] = useState<any>({ assets: [], movements: [], items: [], incidents: [], custody: [], audit: [], people: [] });
  const [report, setReport] = useState<string>("movements");
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [assets, movements, items, incidents, custody, audit, people] = await Promise.all([
        sb.from("assets").select("*").order("name"),
        sb.from("asset_movements").select("*").order("created_at", { ascending: false }).limit(1000),
        sb.from("asset_movement_items").select("*"),
        sb.from("asset_incidents").select("*").order("created_at", { ascending: false }),
        sb.from("asset_custody_events").select("*").order("created_at", { ascending: false }).limit(1000),
        sb.from("asset_movement_audit").select("*").order("created_at", { ascending: false }).limit(500),
        sb.from("profiles").select("id, full_name"),
      ]);
      setD({
        assets: assets.data ?? [], movements: movements.data ?? [], items: items.data ?? [],
        incidents: incidents.data ?? [], custody: custody.data ?? [], audit: audit.data ?? [],
        people: people.data ?? [],
      });
    })();
  }, []);

  const nameOf = (id?: string | null) => d.people.find((p: any) => p.id === id)?.full_name ?? "—";
  const assetOf = (id?: string | null) => d.assets.find((a: any) => a.id === id);

  const inRange = (date?: string | null) => {
    if (!date) return !from && !to;
    const v = date.slice(0, 10);
    if (from && v < from) return false;
    if (to && v > to) return false;
    return true;
  };

  const table = useMemo(() => {
    const term = q.trim().toLowerCase();
    const match = (s: any[]) => s.filter(Boolean).join(" ").toLowerCase().includes(term);
    const movementsBase = d.movements.filter((m: any) =>
      (branch === "all" || m.source_branch === branch || m.destination_branch === branch) &&
      (status === "all" || m.status === status) &&
      (type === "all" || m.movement_type === type) &&
      inRange(m.created_at) &&
      (!term || match([m.agreement_no, m.purpose, nameOf(m.requested_by), m.notes])));

    const itemRefs = (id: string) =>
      d.items.filter((i: any) => i.movement_id === id).map((i: any) => assetOf(i.asset_id)?.asset_ref).filter(Boolean).join(" | ");

    switch (report) {
      case "register": {
        const rows = d.assets.filter((a: any) =>
          (branch === "all" || (a.current_branch ?? a.branch) === branch) &&
          (status === "all" || a.movement_status === status) &&
          (!term || match([a.name, a.asset_ref, a.serial_number, a.category])));
        return {
          headers: ["Reference", "Asset", "Category", "Serial", "Home branch", "Current branch", "Custodian", "Condition", "Status", "Value"],
          rows: rows.map((a: any) => [a.asset_ref, a.name, pretty(a.category), a.serial_number ?? "—",
            branchLabel(a.home_branch ?? a.branch), branchLabel(a.current_branch ?? a.branch),
            nameOf(a.current_custodian_id), pretty(a.condition), a.movement_status, money(a.current_value ?? a.purchase_value)]),
        };
      }
      case "loans":
      case "transfers":
      case "outstanding":
      case "overdue":
      case "movements": {
        let rows = movementsBase;
        if (report === "loans") rows = rows.filter((m: any) => m.movement_type === "temporary_loan");
        if (report === "transfers") rows = rows.filter((m: any) => m.movement_type === "permanent_transfer");
        if (report === "outstanding") rows = rows.filter((m: any) => !["CLOSED", "REJECTED", "CANCELLED"].includes(m.status));
        if (report === "overdue") rows = rows.filter((m: any) => m.overdue || m.status === "OVERDUE");
        return {
          headers: ["Agreement", "Type", "Status", "Source", "Destination", "Purpose", "Requested by", "Responsible", "Dispatch", "Return due", "Returned", "Assets"],
          rows: rows.map((m: any) => [m.agreement_no, movementTypeLabel(m.movement_type), pretty(m.status),
            branchLabel(m.source_branch), branchLabel(m.destination_branch), m.purpose, nameOf(m.requested_by),
            m.responsible_name ?? nameOf(m.responsible_person), fmtDate(m.dispatch_date),
            fmtDate(m.expected_return_date), fmtDate(m.actual_return_date), itemRefs(m.id)]),
        };
      }
      case "incidents": {
        const rows = d.incidents.filter((i: any) =>
          (branch === "all" || i.branch === branch) && inRange(i.created_at) &&
          (!term || match([i.description, i.incident_type, assetOf(i.asset_id)?.name])));
        return {
          headers: ["Type", "Status", "Asset", "Branch", "Reported by", "Reported", "Estimated impact", "Description"],
          rows: rows.map((i: any) => [pretty(i.incident_type), pretty(i.status), assetOf(i.asset_id)?.name ?? "—",
            branchLabel(i.branch), nameOf(i.reported_by), fmtDate(i.created_at), i.estimated_cost ?? "", i.description]),
        };
      }
      case "conditions": {
        const rows = d.assets.filter((a: any) => branch === "all" || (a.current_branch ?? a.branch) === branch);
        return {
          headers: ["Reference", "Asset", "Condition", "Status", "Branch", "Last maintenance due"],
          rows: rows.map((a: any) => [a.asset_ref, a.name, pretty(a.condition), a.movement_status,
            branchLabel(a.current_branch ?? a.branch), fmtDate(a.next_maintenance_date)]),
        };
      }
      case "branch": {
        const rows = BRANCHES.map((b) => {
          const at = d.assets.filter((a: any) => (a.current_branch ?? a.branch) === b);
          const home = d.assets.filter((a: any) => (a.home_branch ?? a.branch) === b);
          const away = home.filter((a: any) => (a.current_branch ?? a.branch) !== b);
          return [branchLabel(b), home.length, at.length, away.length,
            at.filter((a: any) => a.movement_status === "AVAILABLE").length,
            money(at.reduce((s: number, a: any) => s + Number(a.current_value ?? a.purchase_value ?? 0), 0))];
        });
        return { headers: ["Branch", "Home assets", "Currently on site", "Out on loan", "Available", "Value on site"], rows };
      }
      case "custody": {
        const rows = d.custody.filter((c: any) =>
          (branch === "all" || c.branch === branch) && inRange(c.created_at) &&
          (!term || match([assetOf(c.asset_id)?.name, c.event_type, c.custodian_name])));
        return {
          headers: ["When", "Asset", "Event", "Branch", "Location", "Custodian", "Status", "Agreement"],
          rows: rows.map((c: any) => [new Date(c.created_at).toLocaleString("en-ZA"), assetOf(c.asset_id)?.name ?? "—",
            pretty(c.event_type), branchLabel(c.branch), c.location ?? "—", c.custodian_name ?? "—", c.status ?? "—", c.notes ?? "—"]),
        };
      }
      default: {
        const rows = d.audit.filter((a: any) => inRange(a.created_at) && (!term || match([a.entity, a.action])));
        return {
          headers: ["When", "Record type", "Action", "By", "Branch", "Record"],
          rows: rows.map((a: any) => [new Date(a.created_at).toLocaleString("en-ZA"), pretty(a.entity),
            a.action, nameOf(a.actor_id), branchLabel(a.actor_branch), a.record_id]),
        };
      }
    }
    // eslint-disable-next-line
  }, [d, report, branch, status, type, from, to, q]);

  const label = REPORTS.find((r) => r.key === report)?.label ?? "Report";

  const openIncidents = d.incidents.filter((i: any) => OPEN_INCIDENT_STATUSES.includes(i.status)).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Agreements</p><p className="mt-2 font-serif text-2xl">{d.movements.length}</p></Card>
        <Card className="p-4"><p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Outstanding</p><p className="mt-2 font-serif text-2xl">{d.movements.filter((m: any) => !["CLOSED", "REJECTED", "CANCELLED"].includes(m.status)).length}</p></Card>
        <Card className="p-4"><p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Overdue</p><p className="mt-2 font-serif text-2xl">{d.movements.filter((m: any) => m.overdue || m.status === "OVERDUE").length}</p></Card>
        <Card className="p-4"><p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Open incidents</p><p className="mt-2 font-serif text-2xl">{openIncidents}</p></Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <Label className="text-xs">Report</Label>
            <Select value={report} onValueChange={setReport}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REPORTS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
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
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {(report === "register" || report === "conditions" ? ASSET_MOVEMENT_STATUSES : MOVEMENT_STATUSES)
                  .map((s) => <SelectItem key={s} value={s}>{pretty(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Movement type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {MOVEMENT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Search within this report" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outline" size="sm"
            onClick={() => exportRows(`trogkc-${report}`, table.headers, table.rows as any)}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Print / Save as PDF</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <p className="font-serif text-lg">{label}</p>
          <p className="text-xs text-muted-foreground">{table.rows.length} record(s) · generated {fmtDate(new Date().toISOString())}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{table.headers.map((h) => <th key={h} className="p-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r: any[], i: number) => (
                <tr key={i} className="border-t">
                  {r.map((c, j) => (
                    <td key={j} className="p-3 align-top">
                      {typeof c === "string" && (MOVEMENT_STATUSES as readonly string[]).concat(ASSET_MOVEMENT_STATUSES as unknown as string[]).includes(c)
                        ? <StatusBadge value={c} /> : (c ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
              {table.rows.length === 0 && (
                <tr><td className="p-6 text-center text-sm text-muted-foreground" colSpan={table.headers.length}>Nothing matches these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
