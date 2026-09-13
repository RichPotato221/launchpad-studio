import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { branchLabel, exportRows, fmtDate, money } from "@/lib/finance";
import {
  ASSET_CONDITION_GRADES, INCIDENT_STATUSES, INCIDENT_TYPES, OPEN_INCIDENT_STATUSES, pretty,
} from "@/lib/assetMovement";
import { StatusBadge } from "./MovementsModule";

const sb = supabase as any;

const EMPTY = {
  asset_id: "", movement_id: "", incident_type: "DAMAGE", description: "",
  condition: "", estimated_cost: "", actions_taken: "",
};

/**
 * Damage, loss, theft and discrepancy register. Incidents are recorded for
 * administrative review — no blame or liability is assigned automatically.
 */
export default function AssetIncidentsModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [statusFilter, setStatusFilter] = useState("open");
  const [q, setQ] = useState("");

  const load = async () => {
    const [i, a, m, p] = await Promise.all([
      sb.from("asset_incidents").select("*").order("created_at", { ascending: false }),
      sb.from("assets").select("id, name, asset_ref, branch, current_branch").order("name"),
      sb.from("asset_movements").select("id, agreement_no, status").order("created_at", { ascending: false }),
      sb.from("profiles").select("id, full_name"),
    ]);
    setRows(i.data ?? []); setAssets(a.data ?? []); setMovements(m.data ?? []); setPeople(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const nameOf = (id?: string | null) => people.find((p) => p.id === id)?.full_name ?? "—";
  const assetOf = (id?: string | null) => assets.find((a) => a.id === id);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "open" && !OPEN_INCIDENT_STATUSES.includes(r.status)) return false;
      if (statusFilter !== "open" && statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!t) return true;
      return [r.description, r.incident_type, assetOf(r.asset_id)?.name, assetOf(r.asset_id)?.asset_ref]
        .filter(Boolean).join(" ").toLowerCase().includes(t);
    });
    // eslint-disable-next-line
  }, [rows, assets, q, statusFilter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return toast.error("Describe what happened.");
    const asset = assetOf(form.asset_id);
    const { error } = await sb.from("asset_incidents").insert({
      asset_id: form.asset_id || null,
      movement_id: form.movement_id || null,
      incident_type: form.incident_type,
      branch: asset?.current_branch ?? asset?.branch ?? null,
      occurred_at: new Date().toISOString(),
      reported_by: currentUserId,
      description: form.description,
      condition: form.condition || null,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
      actions_taken: form.actions_taken || null,
    });
    if (error) return toast.error(error.message);
    if (form.movement_id) {
      await sb.rpc("notify_asset_movement", {
        _movement_id: form.movement_id, _kind: "SYSTEM_NOTIFICATION",
        _title: "Incident reported",
        _message: `${pretty(form.incident_type)} recorded against an asset on this agreement. The Resource Administrator will review it.`,
      });
    }
    toast.success("Incident recorded.");
    setForm({ ...EMPTY });
    load();
  };

  const patch = async (row: any, values: Record<string, any>) => {
    const { error } = await sb.from("asset_incidents").update({
      ...values, updated_at: new Date().toISOString(),
      ...(values.status && ["RESOLVED", "CLOSED"].includes(values.status) ? { resolved_at: new Date().toISOString() } : {}),
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Open incidents", rows.filter((r) => OPEN_INCIDENT_STATUSES.includes(r.status)).length],
          ["Damage", rows.filter((r) => r.incident_type === "DAMAGE").length],
          ["Loss / theft", rows.filter((r) => ["LOSS", "THEFT"].includes(r.incident_type)).length],
          ["Estimated impact", money(rows.reduce((s, r) => s + Number(r.estimated_cost ?? 0), 0))],
        ].map(([l, v]) => (
          <Card key={String(l)} className="p-4">
            <p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">{l}</p>
            <p className="mt-2 font-serif text-2xl">{v}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Report an incident</p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label>Incident type</Label>
            <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Asset</Label>
            <Select value={form.asset_id} onValueChange={(v) => setForm({ ...form, asset_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>
                {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} · {a.asset_ref}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Movement agreement (optional)</Label>
            <Select value={form.movement_id} onValueChange={(v) => setForm({ ...form, movement_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select agreement" /></SelectTrigger>
              <SelectContent>
                {movements.map((m) => <SelectItem key={m.id} value={m.id}>{m.agreement_no}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Condition</Label>
            <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{ASSET_CONDITION_GRADES.map((c) => <SelectItem key={c} value={c}>{pretty(c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Estimated impact (R)</Label>
            <Input value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} /></div>
          <div><Label>Actions taken</Label>
            <Input value={form.actions_taken} onChange={(e) => setForm({ ...form, actions_taken: e.target.value })} /></div>
          <div className="md:col-span-3"><Button type="submit">Record incident</Button></div>
        </form>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search incidents" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {INCIDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{pretty(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => exportRows("trogkc-asset-incidents",
          ["Type", "Status", "Asset", "Branch", "Reported by", "Reported", "Estimated impact", "Description", "Resolution"],
          filtered.map((r) => [pretty(r.incident_type), pretty(r.status), assetOf(r.asset_id)?.name ?? "—",
            branchLabel(r.branch), nameOf(r.reported_by), fmtDate(r.created_at), r.estimated_cost ?? "",
            r.description, r.resolution ?? ""]))}>Export CSV</Button>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{pretty(r.incident_type)} · {assetOf(r.asset_id)?.name ?? "Unlinked asset"}</p>
                <p className="text-xs text-muted-foreground">
                  {branchLabel(r.branch)} · reported by {nameOf(r.reported_by)} on {fmtDate(r.created_at)}
                  {r.estimated_cost ? ` · estimated impact ${money(r.estimated_cost)}` : ""}
                </p>
              </div>
              <StatusBadge value={r.status} />
            </div>
            <p className="mt-2 text-sm">{r.description}</p>
            {r.actions_taken && <p className="mt-1 text-sm text-muted-foreground">Actions: {r.actions_taken}</p>}
            {r.resolution && <p className="mt-1 text-sm text-muted-foreground">Resolution: {r.resolution}</p>}
            {canManage && !["CLOSED"].includes(r.status) && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="w-48">
                  <Label className="text-xs">Status</Label>
                  <Select value={r.status} onValueChange={(v) => patch(r, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INCIDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{pretty(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input className="max-w-sm" placeholder="Resolution / approved outcome"
                  defaultValue={r.resolution ?? ""}
                  onBlur={(e) => e.target.value !== (r.resolution ?? "") && patch(r, { resolution: e.target.value })} />
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No incidents in this view.</Card>}
      </div>
    </div>
  );
}
