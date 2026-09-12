import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BRANCHES, branchLabel, fmtDate, exportRows } from "@/lib/finance";
import {
  AGREEMENT_TERMS, ASSET_CONDITION_GRADES, INCIDENT_TYPES, MOVEMENT_PURPOSES, MOVEMENT_TYPES,
  MOVEMENT_STATUSES, NEXT_STATUS, OPEN_INCIDENT_STATUSES, STATUS_TONE,
  assetStatusForMovement, movementTypeLabel, pretty,
} from "@/lib/assetMovement";
import MovementAgreementDoc from "./MovementAgreementDoc";

const sb = supabase as any;

const EMPTY_FORM = {
  movement_type: "temporary_loan",
  source_branch: "",
  destination_branch: "",
  destination_location: "",
  purpose: "Sunday Service",
  purpose_notes: "",
  department_slug: "",
  responsible_person: "",
  dispatch_date: new Date().toISOString().slice(0, 10),
  expected_return_date: "",
  transport_details: "",
  driver_name: "",
  vehicle_details: "",
  event_name: "",
  event_location: "",
  event_start: "",
  event_end: "",
  is_emergency: false,
  emergency_reason: "",
  notes: "",
};

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <Badge variant="outline" className={STATUS_TONE[value] ?? "bg-muted text-muted-foreground border-border"}>
      {pretty(value)}
    </Badge>
  );
}

type Props = { canManage: boolean; isChair: boolean; currentUserId: string };

/**
 * Inter-Branch Asset Movement & Resource Loan Agreements —
 * request, approve, dispatch, receive, loan, return and close, with
 * every step written to the asset register, custody chain and audit trail.
 */
export default function MovementsModule({ canManage, isChair, currentUserId }: Props) {
  const [movements, setMovements] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [extensions, setExtensions] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [picked, setPicked] = useState<string[]>([]);
  const [scan, setScan] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [branchFilter, setBranchFilter] = useState("all");

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    const [mv, it, ap, ho, ex, inc, ast, pf, dp, prof] = await Promise.all([
      sb.from("asset_movements").select("*").order("created_at", { ascending: false }).limit(500),
      sb.from("asset_movement_items").select("*"),
      sb.from("asset_movement_approvals").select("*").order("created_at"),
      sb.from("asset_handover_records").select("*").order("acknowledged_at"),
      sb.from("asset_extensions").select("*").order("created_at"),
      sb.from("asset_incidents").select("*").order("created_at", { ascending: false }),
      sb.from("assets").select("*").order("name"),
      sb.from("profiles").select("id, full_name, branch, primary_department").order("full_name"),
      sb.from("departments").select("slug, name").order("name"),
      sb.from("profiles").select("id, full_name, branch").eq("id", currentUserId).maybeSingle(),
    ]);
    setMovements(mv.data ?? []);
    setItems(it.data ?? []);
    setApprovals(ap.data ?? []);
    setHandovers(ho.data ?? []);
    setExtensions(ex.data ?? []);
    setIncidents(inc.data ?? []);
    setAssets(ast.data ?? []);
    setPeople(pf.data ?? []);
    setDepts(dp.data ?? []);
    setMe(prof.data ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [currentUserId]);

  useEffect(() => {
    if (me?.branch && !form.source_branch) set("source_branch", me.branch);
    // eslint-disable-next-line
  }, [me]);

  const assetById = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);
  const nameOf = (id?: string | null) =>
    (people.find((p) => p.id === id)?.full_name as string) ?? (id ? "Member" : "—");

  const itemsFor = (id: string) =>
    items.filter((i) => i.movement_id === id).map((i) => ({ ...i, asset: assetById[i.asset_id] }));

  const open = movements.find((m) => m.id === openId) ?? null;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return movements.filter((m) => {
      if (statusFilter === "open" && ["CLOSED", "REJECTED", "CANCELLED"].includes(m.status)) return false;
      if (statusFilter !== "open" && statusFilter !== "all" && m.status !== statusFilter) return false;
      if (branchFilter !== "all" && m.source_branch !== branchFilter && m.destination_branch !== branchFilter) return false;
      if (!term) return true;
      const hay = [m.agreement_no, m.purpose, m.notes, m.event_name, nameOf(m.requested_by)]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term) || itemsFor(m.id).some((i) =>
        [i.asset?.name, i.asset?.asset_ref, i.asset?.serial_number].filter(Boolean).join(" ").toLowerCase().includes(term));
    });
    // eslint-disable-next-line
  }, [movements, items, assets, q, statusFilter, branchFilter, people]);

  /* --------------------------- helpers --------------------------- */

  const notify = async (movementId: string, title: string, message: string, kind = "SYSTEM_NOTIFICATION") => {
    await sb.rpc("notify_asset_movement", {
      _movement_id: movementId, _kind: kind, _title: title, _message: message,
    });
  };

  const custody = async (rows: any[]) => {
    if (rows.length) await sb.from("asset_custody_events").insert(rows);
  };

  const setAssetState = async (
    movement: any,
    movementItems: any[],
    patch: (asset: any) => Record<string, any>,
    eventType: string,
  ) => {
    for (const it of movementItems) {
      const asset = it.asset ?? assetById[it.asset_id];
      if (!asset) continue;
      const changes = patch(asset);
      await sb.from("assets").update({ ...changes, updated_by: currentUserId }).eq("id", asset.id);
    }
    await custody(movementItems.map((it) => {
      const asset = it.asset ?? assetById[it.asset_id];
      const changes = patch(asset ?? {});
      return {
        asset_id: it.asset_id,
        movement_id: movement.id,
        event_type: eventType,
        branch: changes.current_branch ?? asset?.current_branch ?? null,
        location: changes.location ?? asset?.location ?? null,
        custodian_id: changes.current_custodian_id ?? asset?.current_custodian_id ?? null,
        custodian_name: nameOf(changes.current_custodian_id ?? asset?.current_custodian_id),
        condition: asset?.condition ?? null,
        status: changes.movement_status ?? asset?.movement_status ?? null,
        notes: movement.agreement_no,
        actor_id: currentUserId,
      };
    }));
  };

  const advance = async (movement: any, status: string, extra: Record<string, any> = {}) => {
    const { error } = await sb.from("asset_movements").update({ status, ...extra }).eq("id", movement.id);
    if (error) throw new Error(error.message);
  };

  /* --------------------------- actions --------------------------- */

  const createAgreement = async () => {
    if (!form.source_branch || !form.destination_branch) return toast.error("Choose the source and destination branch.");
    if (!form.responsible_person) return toast.error("Choose the responsible person.");
    if (form.movement_type === "temporary_loan" && !form.expected_return_date)
      return toast.error("A temporary loan needs an expected return date.");
    if (picked.length === 0) return toast.error("Add at least one asset to the agreement.");
    if (form.is_emergency && !form.emergency_reason.trim())
      return toast.error("Record the reason for the emergency movement.");

    const payload: any = {
      ...form,
      responsible_name: nameOf(form.responsible_person),
      requested_by: currentUserId,
      created_by: currentUserId,
      status: "REQUESTED",
      expected_return_date: form.expected_return_date || null,
      event_start: form.event_start || null,
      event_end: form.event_end || null,
      department_slug: form.department_slug || null,
    };
    const { data, error } = await sb.from("asset_movements").insert(payload).select().single();
    if (error) return toast.error(error.message);

    const rows = picked.map((id) => ({
      movement_id: data.id,
      asset_id: id,
      quantity: 1,
      condition_before: (assetById[id]?.condition ?? "good").toUpperCase(),
      accessories: assetById[id]?.accessories ?? null,
    }));
    const { error: e2 } = await sb.from("asset_movement_items").insert(rows);
    if (e2) {
      toast.error(e2.message);
      await sb.from("asset_movements").delete().eq("id", data.id);
      return;
    }
    await advance(data, "PENDING_APPROVAL");
    await notify(data.id, "Asset movement request",
      `${data.agreement_no}: ${nameOf(currentUserId)} requested ${rows.length} asset(s) to move from ${branchLabel(form.source_branch)} to ${branchLabel(form.destination_branch)}. Approval is required before dispatch.`,
      "APPROVAL_REQUIRED");
    toast.success(`Agreement ${data.agreement_no} submitted for approval.`);
    setShowNew(false);
    setForm({ ...EMPTY_FORM, source_branch: me?.branch ?? "" });
    setPicked([]);
    load();
  };

  const decide = async (movement: any, decision: "approved" | "rejected", comment: string) => {
    if (movement.requested_by === currentUserId)
      return toast.error("A requester cannot approve their own request.");
    const { error } = await sb.from("asset_movement_approvals").insert({
      movement_id: movement.id, decision, decided_by: currentUserId,
      decided_by_role: isChair ? "chairperson" : "resource_administrator",
      decided_by_branch: me?.branch ?? null, comment: comment || null,
      retrospective: movement.is_emergency,
    });
    if (error) return toast.error(error.message);
    try {
      await advance(movement, decision === "approved" ? "APPROVED" : "REJECTED");
      if (decision === "approved") {
        await setAssetState(movement, itemsFor(movement.id), () => ({ movement_status: "RESERVED" }), "reserved");
      }
      await notify(movement.id, `Movement ${decision}`,
        `${movement.agreement_no} was ${decision} by ${nameOf(currentUserId)}.${comment ? ` Comment: ${comment}` : ""}`,
        decision === "approved" ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED");
      toast.success(`Agreement ${decision}.`);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handover = async (
    movement: any, kind: "dispatch" | "receipt" | "return" | "return_inspection", payload: any,
  ) => {
    const mine = itemsFor(movement.id);
    const { error } = await sb.from("asset_handover_records").insert({
      movement_id: movement.id,
      kind,
      branch: kind === "dispatch" || kind === "return_inspection" ? movement.source_branch : movement.destination_branch,
      acknowledged_by: currentUserId,
      person_name: nameOf(currentUserId),
      person_role: isChair ? "Chairperson" : canManage ? "Resource Administration" : "Member",
      condition_summary: payload.condition,
      accessories: payload.accessories || null,
      quantity_confirmed: mine.reduce((s, i) => s + Number(i.quantity ?? 1), 0),
      discrepancies: payload.discrepancies || null,
      notes: payload.notes || null,
    });
    if (error) return toast.error(error.message);

    await sb.from("asset_condition_records").insert(mine.map((i) => ({
      asset_id: i.asset_id,
      movement_id: movement.id,
      stage: kind,
      condition: payload.condition,
      previous_condition: (i.asset?.condition ?? null),
      branch: kind === "dispatch" ? movement.source_branch : movement.destination_branch,
      recorded_by: currentUserId,
      notes: payload.notes || null,
    })));

    try {
      if (kind === "dispatch") {
        await advance(movement, "IN_TRANSIT", { dispatch_date: new Date().toISOString().slice(0, 10) });
        await setAssetState(movement, mine, () => ({ movement_status: "IN_TRANSIT" }), "dispatched");
        await notify(movement.id, "Assets dispatched",
          `${movement.agreement_no}: the assets left ${branchLabel(movement.source_branch)}. ${branchLabel(movement.destination_branch)} must confirm receipt on arrival.`);
      }
      if (kind === "receipt") {
        const hasIssue = !!payload.discrepancies?.trim();
        const loanStatus = assetStatusForMovement("ON_LOAN", movement.movement_type) ?? "ON_LOAN";
        await advance(movement, "RECEIVED");
        if (hasIssue) {
          await sb.from("asset_incidents").insert({
            movement_id: movement.id,
            asset_id: mine[0]?.asset_id ?? null,
            incident_type: "CONDITION_DISCREPANCY",
            status: "REPORTED",
            branch: movement.destination_branch,
            occurred_at: new Date().toISOString(),
            reported_by: currentUserId,
            description: `Recorded on receipt of ${movement.agreement_no}: ${payload.discrepancies}`,
            condition: payload.condition,
          });
          await advance({ ...movement, status: "RECEIVED" }, "INCIDENT_REVIEW");
        } else if (movement.movement_type === "permanent_transfer") {
          await advance({ ...movement, status: "RECEIVED" }, "CLOSED", {
            actual_return_date: new Date().toISOString().slice(0, 10),
          });
        } else {
          await advance({ ...movement, status: "RECEIVED" }, movement.movement_type === "event" ? "AT_EVENT" : "ON_LOAN");
        }

        await setAssetState(movement, mine, (asset) => ({
          movement_status: movement.movement_type === "permanent_transfer" ? "AVAILABLE" : loanStatus,
          current_branch: movement.destination_branch,
          ...(movement.movement_type === "permanent_transfer" ? { home_branch: movement.destination_branch } : {}),
          current_custodian_id: movement.responsible_person,
          location: movement.destination_location || asset?.location,
          condition: payload.condition?.toLowerCase() ?? asset?.condition,
        }), movement.movement_type === "permanent_transfer" ? "transferred" : "received");

        await notify(movement.id, "Receipt confirmed",
          `${movement.agreement_no}: ${branchLabel(movement.destination_branch)} confirmed receipt${hasIssue ? " with a recorded discrepancy — an incident has been opened." : "."}`);
      }
      if (kind === "return") {
        await advance(movement, "RETURN_IN_TRANSIT");
        await setAssetState(movement, mine, () => ({ movement_status: "IN_TRANSIT" }), "return_dispatched");
        await notify(movement.id, "Return in transit",
          `${movement.agreement_no}: the assets are on their way back to ${branchLabel(movement.source_branch)}.`);
      }
      if (kind === "return_inspection") {
        const hasIssue = !!payload.discrepancies?.trim();
        await advance(movement, "RETURNED", { actual_return_date: new Date().toISOString().slice(0, 10) });
        for (const i of mine) {
          await sb.from("asset_movement_items")
            .update({ condition_after: payload.condition, returned: true }).eq("id", i.id);
        }
        if (hasIssue) {
          await sb.from("asset_incidents").insert({
            movement_id: movement.id,
            asset_id: mine[0]?.asset_id ?? null,
            incident_type: "DAMAGE",
            status: "REPORTED",
            branch: movement.source_branch,
            occurred_at: new Date().toISOString(),
            reported_by: currentUserId,
            description: `Recorded on return inspection of ${movement.agreement_no}: ${payload.discrepancies}`,
            condition: payload.condition,
          });
          await advance({ ...movement, status: "RETURNED" }, "INCIDENT_REVIEW");
        }
        await setAssetState(movement, mine, (asset) => ({
          movement_status: ["NEEDS_REPAIR", "POOR", "UNSERVICEABLE"].includes(payload.condition)
            ? "UNDER_MAINTENANCE" : "AVAILABLE",
          current_branch: asset?.home_branch ?? movement.source_branch,
          current_custodian_id: null,
          condition: payload.condition?.toLowerCase(),
        }), "returned");
        await notify(movement.id, "Assets returned",
          `${movement.agreement_no}: the return was inspected and recorded at ${branchLabel(movement.source_branch)}${hasIssue ? ". A discrepancy was recorded and an incident opened." : "."}`);
      }
      toast.success("Recorded.");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const move = async (movement: any, status: string) => {
    try {
      await advance(movement, status);
      if (status === "CLOSED") {
        await notify(movement.id, "Agreement closed", `${movement.agreement_no} has been closed and archived in the asset record.`);
      }
      if (status === "RETURN_REQUESTED") {
        await notify(movement.id, "Return requested",
          `${movement.agreement_no}: a return has been requested. Please arrange the return handover.`);
      }
      toast.success(`Agreement moved to ${pretty(status)}.`);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const requestExtension = async (movement: any, date: string, reason: string) => {
    if (!date) return toast.error("Choose the new return date.");
    const { error } = await sb.from("asset_extensions").insert({
      movement_id: movement.id,
      original_return_date: movement.original_return_date ?? movement.expected_return_date,
      requested_return_date: date, reason: reason || null, requested_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    await notify(movement.id, "Extension requested",
      `${movement.agreement_no}: an extension to ${fmtDate(date)} was requested by ${nameOf(currentUserId)}.`);
    toast.success("Extension requested.");
    load();
  };

  const decideExtension = async (ext: any, movement: any, approve: boolean) => {
    const { error } = await sb.from("asset_extensions").update({
      status: approve ? "APPROVED" : "REJECTED", approved_by: currentUserId, decided_at: new Date().toISOString(),
    }).eq("id", ext.id);
    if (error) return toast.error(error.message);
    if (approve) {
      await sb.from("asset_movements").update({
        expected_return_date: ext.requested_return_date, overdue: false,
      }).eq("id", movement.id);
    }
    await notify(movement.id, `Extension ${approve ? "approved" : "rejected"}`,
      `${movement.agreement_no}: the extension request was ${approve ? "approved" : "rejected"}.`);
    load();
  };

  const reportIncident = async (movement: any, payload: any) => {
    if (!payload.description?.trim()) return toast.error("Describe what happened.");
    const { error } = await sb.from("asset_incidents").insert({
      movement_id: movement.id,
      asset_id: payload.asset_id || null,
      incident_type: payload.incident_type,
      branch: me?.branch ?? movement.destination_branch,
      occurred_at: new Date().toISOString(),
      reported_by: currentUserId,
      description: payload.description,
      condition: payload.condition || null,
      estimated_cost: payload.estimated_cost ? Number(payload.estimated_cost) : null,
    });
    if (error) return toast.error(error.message);
    if (NEXT_STATUS[movement.status]?.includes("INCIDENT_REVIEW")) {
      await advance(movement, "INCIDENT_REVIEW").catch(() => undefined);
    }
    await notify(movement.id, "Incident reported",
      `${movement.agreement_no}: ${pretty(payload.incident_type)} recorded by ${nameOf(currentUserId)}. The Resource Administrator will review it.`);
    toast.success("Incident recorded.");
    load();
  };

  const scanAdd = () => {
    const term = scan.trim().toLowerCase();
    if (!term) return;
    const hit = assets.find((a) =>
      [a.asset_ref, a.qr_token, a.asset_code, a.barcode, a.serial_number]
        .filter(Boolean).some((v: string) => String(v).toLowerCase() === term));
    if (!hit) return toast.error("No asset matches that reference.");
    if (!picked.includes(hit.id)) setPicked((p) => [...p, hit.id]);
    setScan("");
    toast.success(`${hit.name} added.`);
  };

  const exportCsv = () => {
    exportRows("trogkc-asset-movements",
      ["Agreement", "Type", "Status", "Source", "Destination", "Purpose", "Requested by", "Responsible",
        "Dispatch", "Expected return", "Actual return", "Assets", "Overdue"],
      filtered.map((m) => [
        m.agreement_no, movementTypeLabel(m.movement_type), pretty(m.status), branchLabel(m.source_branch),
        branchLabel(m.destination_branch), m.purpose, nameOf(m.requested_by),
        m.responsible_name ?? nameOf(m.responsible_person), m.dispatch_date, m.expected_return_date,
        m.actual_return_date, itemsFor(m.id).map((i) => i.asset?.asset_ref).join(" | "), m.overdue ? "Yes" : "No",
      ]));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading movement agreements…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl">Inter-Branch Asset Movement &amp; Resource Loan Agreements</h3>
          <p className="text-sm text-muted-foreground">
            Every physical movement of church property is recorded here. Assets remain TROGKC property at all times.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
          <Button size="sm" onClick={() => setShowNew(true)}>New movement request</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search agreement, asset or reference" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open agreements</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {MOVEMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{pretty(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Agreement</th><th className="p-3">Type</th><th className="p-3">Route</th>
                <th className="p-3">Assets</th><th className="p-3">Return due</th><th className="p-3">Status</th><th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const mine = itemsFor(m.id);
                const openInc = incidents.filter((i) => i.movement_id === m.id && OPEN_INCIDENT_STATUSES.includes(i.status));
                return (
                  <tr key={m.id} className="border-t">
                    <td className="p-3 font-medium">{m.agreement_no}
                      <div className="text-xs text-muted-foreground">{nameOf(m.requested_by)} · {fmtDate(m.created_at)}</div>
                    </td>
                    <td className="p-3">{movementTypeLabel(m.movement_type)}<div className="text-xs text-muted-foreground">{m.purpose}</div></td>
                    <td className="p-3">{branchLabel(m.source_branch)} → {branchLabel(m.destination_branch)}</td>
                    <td className="p-3">{mine.length}</td>
                    <td className="p-3">{fmtDate(m.expected_return_date)}</td>
                    <td className="p-3 space-x-1">
                      <StatusBadge value={m.status} />
                      {openInc.length > 0 && <Badge variant="outline" className={STATUS_TONE.ACTION_REQUIRED}>{openInc.length} incident</Badge>}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpenId(m.id)}>Open</Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td className="p-6 text-center text-sm text-muted-foreground" colSpan={7}>No movement agreements match this view.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ---------------- new request ---------------- */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>New inter-branch movement request</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Movement type</Label>
              <Select value={form.movement_type} onValueChange={(v) => set("movement_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MOVEMENT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purpose</Label>
              <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MOVEMENT_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source branch</Label>
              <Select value={form.source_branch} onValueChange={(v) => set("source_branch", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destination branch</Label>
              <Select value={form.destination_branch} onValueChange={(v) => set("destination_branch", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destination location</Label>
              <Input value={form.destination_location} onChange={(e) => set("destination_location", e.target.value)} placeholder="Auditorium, store room…" />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.department_slug} onValueChange={(v) => set("department_slug", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsible person</Label>
              <Select value={form.responsible_person} onValueChange={(v) => set("responsible_person", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? "Member"} · {branchLabel(p.branch)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dispatch date</Label>
              <Input type="date" value={form.dispatch_date} onChange={(e) => set("dispatch_date", e.target.value)} />
            </div>
            <div>
              <Label>Expected return date</Label>
              <Input type="date" value={form.expected_return_date} onChange={(e) => set("expected_return_date", e.target.value)} />
            </div>
            <div>
              <Label>Transport</Label>
              <Input value={form.transport_details} onChange={(e) => set("transport_details", e.target.value)} placeholder="Church bakkie, hired truck…" />
            </div>
            <div>
              <Label>Driver</Label>
              <Input value={form.driver_name} onChange={(e) => set("driver_name", e.target.value)} />
            </div>
            <div>
              <Label>Vehicle</Label>
              <Input value={form.vehicle_details} onChange={(e) => set("vehicle_details", e.target.value)} />
            </div>
            {form.movement_type === "event" && (
              <>
                <div><Label>Event name</Label><Input value={form.event_name} onChange={(e) => set("event_name", e.target.value)} /></div>
                <div><Label>Event location</Label><Input value={form.event_location} onChange={(e) => set("event_location", e.target.value)} /></div>
                <div><Label>Event start</Label><Input type="date" value={form.event_start} onChange={(e) => set("event_start", e.target.value)} /></div>
                <div><Label>Event end</Label><Input type="date" value={form.event_end} onChange={(e) => set("event_end", e.target.value)} /></div>
              </>
            )}
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2 flex items-start gap-2 rounded-md border p-3">
              <Checkbox checked={form.is_emergency} onCheckedChange={(v) => set("is_emergency", !!v)} id="emg" />
              <div className="flex-1">
                <Label htmlFor="emg">Emergency movement (record now, approve retrospectively)</Label>
                {form.is_emergency && (
                  <Textarea className="mt-2" rows={2} placeholder="Reason for the emergency movement"
                    value={form.emergency_reason} onChange={(e) => set("emergency_reason", e.target.value)} />
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[220px]">
                <Label>Scan or type an asset reference</Label>
                <Input value={scan} onChange={(e) => setScan(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); scanAdd(); } }}
                  placeholder="TRG-ASSET-000001" />
              </div>
              <Button type="button" variant="outline" onClick={scanAdd}>Add asset</Button>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {assets
                .filter((a) => !form.source_branch || (a.current_branch ?? a.branch) === form.source_branch)
                .filter((a) => !["DISPOSED", "RETIRED", "ARCHIVED", "LOST", "STOLEN"].includes(a.movement_status))
                .map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/60">
                    <Checkbox checked={picked.includes(a.id)}
                      onCheckedChange={(v) => setPicked((p) => v ? [...p, a.id] : p.filter((x) => x !== a.id))} />
                    <span className="flex-1">{a.name} <span className="text-xs text-muted-foreground">· {a.asset_ref ?? a.asset_code}</span></span>
                    <StatusBadge value={a.movement_status} />
                  </label>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">{picked.length} asset(s) selected.</p>
          </div>

          <details className="rounded-md border p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">Agreement terms that will apply</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4">{AGREEMENT_TERMS.map((t) => <li key={t}>{t}</li>)}</ol>
          </details>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={createAgreement}>Submit for approval</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------------- detail ---------------- */}
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          {open && (
            <MovementDetail
              movement={open}
              items={itemsFor(open.id)}
              approvals={approvals.filter((a) => a.movement_id === open.id)}
              handovers={handovers.filter((h) => h.movement_id === open.id)}
              extensions={extensions.filter((e) => e.movement_id === open.id)}
              incidents={incidents.filter((i) => i.movement_id === open.id)}
              assets={assets}
              nameOf={nameOf}
              canManage={canManage}
              isChair={isChair}
              currentUserId={currentUserId}
              onDecide={decide}
              onHandover={handover}
              onMove={move}
              onExtension={requestExtension}
              onDecideExtension={decideExtension}
              onIncident={reportIncident}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MovementDetail(props: any) {
  const {
    movement, items, approvals, handovers, extensions, incidents, nameOf,
    canManage, isChair, currentUserId, onDecide, onHandover, onMove,
    onExtension, onDecideExtension, onIncident,
  } = props;

  const [tab, setTab] = useState<"overview" | "agreement">("overview");
  const [comment, setComment] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [accessories, setAccessories] = useState("");
  const [discrepancies, setDiscrepancies] = useState("");
  const [notes, setNotes] = useState("");
  const [extDate, setExtDate] = useState("");
  const [extReason, setExtReason] = useState("");
  const [inc, setInc] = useState({ incident_type: "DAMAGE", asset_id: "", description: "", condition: "", estimated_cost: "" });

  const approver = canManage || isChair;
  const isRequester = movement.requested_by === currentUserId;
  const openIncidents = incidents.filter((i: any) => OPEN_INCIDENT_STATUSES.includes(i.status));
  const custodyRows = [
    ...handovers.map((h: any) => ({
      when: h.acknowledged_at, what: `${pretty(h.kind)} confirmed`, who: h.person_name,
      detail: `${branchLabel(h.branch)} · condition ${pretty(h.condition_summary)}${h.discrepancies ? ` · discrepancy: ${h.discrepancies}` : ""}`,
    })),
    ...approvals.map((a: any) => ({
      when: a.created_at, what: `Movement ${pretty(a.decision)}`, who: nameOf(a.decided_by),
      detail: a.comment ?? "",
    })),
    ...incidents.map((i: any) => ({
      when: i.created_at, what: `Incident: ${pretty(i.incident_type)}`, who: nameOf(i.reported_by), detail: i.description,
    })),
  ].sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());

  const HandoverForm = ({ kind, label }: { kind: any; label: string }) => (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>Condition</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ASSET_CONDITION_GRADES.map((c) => <SelectItem key={c} value={c}>{pretty(c)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Accessories</Label><Input value={accessories} onChange={(e) => setAccessories(e.target.value)} placeholder="Cables, stands, cases…" /></div>
        <div className="sm:col-span-2"><Label>Discrepancies (leave blank if none)</Label>
          <Textarea rows={2} value={discrepancies} onChange={(e) => setDiscrepancies(e.target.value)} /></div>
        <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
      <p className="text-xs text-muted-foreground">
        Confirming records your name, role, branch and the date and time as a digital acknowledgement.
      </p>
      <Button size="sm" onClick={() => onHandover(movement, kind, { condition, accessories, discrepancies, notes })}>
        Confirm {label.toLowerCase()}
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-3">
          {movement.agreement_no}
          <StatusBadge value={movement.status} />
          {movement.overdue && <StatusBadge value="OVERDUE" />}
        </DialogTitle>
      </DialogHeader>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "overview" ? "default" : "outline"} onClick={() => setTab("overview")}>Workflow</Button>
        <Button size="sm" variant={tab === "agreement" ? "default" : "outline"} onClick={() => setTab("agreement")}>Agreement document</Button>
      </div>

      {tab === "agreement" ? (
        <MovementAgreementDoc
          movement={movement} items={items} handovers={handovers} approvals={approvals}
          extensions={extensions} incidents={incidents} nameOf={nameOf}
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Info l="Movement type" v={movementTypeLabel(movement.movement_type)} />
            <Info l="Route" v={`${branchLabel(movement.source_branch)} → ${branchLabel(movement.destination_branch)}`} />
            <Info l="Purpose" v={movement.purpose} />
            <Info l="Requested by" v={nameOf(movement.requested_by)} />
            <Info l="Responsible" v={movement.responsible_name ?? nameOf(movement.responsible_person)} />
            <Info l="Department" v={pretty(movement.department_slug)} />
            <Info l="Dispatch" v={fmtDate(movement.dispatch_date)} />
            <Info l="Original return" v={fmtDate(movement.original_return_date)} />
            <Info l="Current return date" v={fmtDate(movement.expected_return_date)} />
          </div>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-2">Reference</th><th className="p-2">Asset</th><th className="p-2">Qty</th>
                  <th className="p-2">Condition out</th><th className="p-2">Condition back</th></tr>
              </thead>
              <tbody>
                {items.map((i: any) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-2">{i.asset?.asset_ref ?? "—"}</td>
                    <td className="p-2">{i.asset?.name ?? "—"}</td>
                    <td className="p-2">{i.quantity}</td>
                    <td className="p-2">{pretty(i.condition_before)}</td>
                    <td className="p-2">{pretty(i.condition_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {openIncidents.length > 0 && (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
              {openIncidents.length} unresolved incident(s) on this agreement. It cannot be closed until they are resolved.
            </div>
          )}

          {/* stage actions */}
          <div className="space-y-3">
            {["REQUESTED", "PENDING_APPROVAL"].includes(movement.status) && (
              approver && !isRequester ? (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">Approval decision</p>
                  <Textarea rows={2} placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onDecide(movement, "approved", comment)}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => onDecide(movement, "rejected", comment)}>Reject</Button>
                  </div>
                </div>
              ) : (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  Awaiting approval. {isRequester ? "A requester cannot approve their own request." : "An authorised approver must decide."}
                </p>
              )
            )}

            {movement.status === "APPROVED" && approver && (
              <Button size="sm" onClick={() => onMove(movement, "READY_FOR_DISPATCH")}>Mark ready for dispatch</Button>
            )}
            {movement.status === "READY_FOR_DISPATCH" && approver && <HandoverForm kind="dispatch" label="Dispatch handover" />}
            {movement.status === "IN_TRANSIT" && <HandoverForm kind="receipt" label="Receipt at destination" />}
            {["ON_LOAN", "AT_EVENT", "OVERDUE"].includes(movement.status) && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onMove(movement, "RETURN_REQUESTED")}>Request return</Button>
              </div>
            )}
            {movement.status === "RETURN_REQUESTED" && <HandoverForm kind="return" label="Return handover" />}
            {movement.status === "RETURN_IN_TRANSIT" && <HandoverForm kind="return_inspection" label="Return inspection" />}
            {["RETURNED", "RECEIVED", "INCIDENT_REVIEW"].includes(movement.status) && approver && (
              <Button size="sm" onClick={() => onMove(movement, "CLOSED")} disabled={openIncidents.length > 0}>
                Close agreement
              </Button>
            )}
          </div>

          {/* extensions */}
          {["ON_LOAN", "AT_EVENT", "OVERDUE", "RECEIVED"].includes(movement.status) && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Extension</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input type="date" value={extDate} onChange={(e) => setExtDate(e.target.value)} />
                <Input className="sm:col-span-2" placeholder="Reason" value={extReason} onChange={(e) => setExtReason(e.target.value)} />
              </div>
              <Button size="sm" variant="outline" onClick={() => onExtension(movement, extDate, extReason)}>Request extension</Button>
              <p className="text-xs text-muted-foreground">The original return date of {fmtDate(movement.original_return_date)} is never overwritten.</p>
            </div>
          )}
          {extensions.length > 0 && (
            <ul className="space-y-1 text-sm">
              {extensions.map((e: any) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 rounded border p-2">
                  <span>{fmtDate(e.original_return_date)} → {fmtDate(e.requested_return_date)}</span>
                  <StatusBadge value={e.status} />
                  <span className="text-xs text-muted-foreground">{e.reason}</span>
                  {e.status === "REQUESTED" && approver && (
                    <span className="ml-auto flex gap-2">
                      <Button size="sm" onClick={() => onDecideExtension(e, movement, true)}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => onDecideExtension(e, movement, false)}>Reject</Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* incident */}
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Report an incident</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={inc.incident_type} onValueChange={(v) => setInc({ ...inc, incident_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={inc.asset_id} onValueChange={(v) => setInc({ ...inc, asset_id: v })}>
                <SelectTrigger><SelectValue placeholder="Asset (optional)" /></SelectTrigger>
                <SelectContent>{items.map((i: any) => <SelectItem key={i.asset_id} value={i.asset_id}>{i.asset?.name}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea className="sm:col-span-2" rows={2} placeholder="What happened?"
                value={inc.description} onChange={(e) => setInc({ ...inc, description: e.target.value })} />
              <Input placeholder="Estimated impact (R)" value={inc.estimated_cost}
                onChange={(e) => setInc({ ...inc, estimated_cost: e.target.value })} />
            </div>
            <Button size="sm" variant="outline" onClick={() => onIncident(movement, inc)}>Record incident</Button>
            <p className="text-xs text-muted-foreground">
              Incidents are recorded for administrative review. No blame or liability is assigned automatically.
            </p>
          </div>

          {/* custody chain */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Custody &amp; activity history</p>
            <ol className="mt-3 space-y-3 border-l pl-4 text-sm">
              <li className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                Agreement created by {nameOf(movement.created_by)} · {fmtDate(movement.created_at)}
              </li>
              {custodyRows.map((r, idx) => (
                <li key={idx} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
                  <span className="font-medium">{r.what}</span> — {r.who}
                  <div className="text-xs text-muted-foreground">{new Date(r.when).toLocaleString("en-ZA")} {r.detail ? `· ${r.detail}` : ""}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ l, v }: { l: string; v: any }) {
  return (
    <div>
      <p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">{l}</p>
      <p>{v ?? "—"}</p>
    </div>
  );
}
