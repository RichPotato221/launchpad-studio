import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { money, fmtDate, exportRows, branchLabel, BRANCHES } from "@/lib/finance";
import AssetDocumentsPanel from "./AssetDocumentsPanel";
import {
  ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_LIFECYCLE, INSURANCE_STATUSES,
  depreciatedValue, daysUntil, labelFor, titleish,
} from "@/lib/resources";

const sb = supabase as any;

const EMPTY = {
  name: "", category: "", description: "", brand: "", model: "", serial_number: "",
  purchase_date: "", purchase_value: "", current_value: "", depreciation_rate: "20",
  warranty_expiry: "", primary_supplier_id: "", department_slug: "", branch: "",
  custodian: "", location: "", room_number: "", facility_id: "", condition: "good",
  insurance_status: "uninsured", lifecycle_status: "in_service", is_bookable: "false",
  quantity_on_hand: "1", unit_of_measure: "unit", reorder_level: "0",
  next_maintenance_date: "", notes: "",
};

/** MODULES 2 & 3 — Enterprise Asset Register, QR tracking and mobile check-in/out. */
export default function AssetRegisterModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [maintLogs, setMaintLogs] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [detail, setDetail] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [scan, setScan] = useState("");

  const load = async () => {
    const [a, d, s, f, p, c, mv, ml] = await Promise.all([
      sb.from("assets").select("*").order("created_at", { ascending: false }),
      sb.from("departments").select("slug, name").order("name"),
      sb.from("suppliers").select("*").order("name"),
      sb.from("res_facilities").select("id, name").order("name"),
      sb.from("profiles").select("id, full_name").order("full_name"),
      sb.from("res_asset_checkouts").select("*").order("checked_out_at", { ascending: false }).limit(400),
      sb.from("asset_stock_movements").select("*").order("created_at", { ascending: false }).limit(200),
      sb.from("asset_maintenance_logs").select("*").order("performed_on", { ascending: false }).limit(300),
    ]);
    setAssets(a.data ?? []); setDepts(d.data ?? []); setSuppliers(s.data ?? []);
    setFacilities(f.data ?? []); setMembers(p.data ?? []); setCheckouts(c.data ?? []);
    setMovements(mv.data ?? []); setMaintLogs(ml.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const supplierName = (id?: string | null) => suppliers.find((s) => s.id === id)?.name ?? "—";
  const memberName = (id?: string | null) => members.find((m) => m.id === id)?.full_name ?? "—";

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return assets.filter((a) => {
      if (catFilter !== "all" && a.category !== catFilter) return false;
      if (!term) return true;
      return [a.name, a.asset_code, a.barcode, a.serial_number, a.brand, a.model, a.location]
        .some((v: any) => String(v ?? "").toLowerCase().includes(term));
    });
  }, [assets, q, catFilter]);

  const startEdit = (a: any) => {
    setForm({
      ...EMPTY,
      ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, a[k] == null ? (EMPTY as any)[k] : String(a[k])])),
    } as any);
    setEditingId(a.id);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = (v: string) => (v === "" ? null : Number(v));
    const payload: any = {
      name: form.name, category: form.category || null, description: form.description || null,
      brand: form.brand || null, model: form.model || null, serial_number: form.serial_number || null,
      purchase_date: form.purchase_date || null, purchase_value: num(form.purchase_value),
      current_value: num(form.current_value), depreciation_rate: num(form.depreciation_rate),
      warranty_expiry: form.warranty_expiry || null, primary_supplier_id: form.primary_supplier_id || null,
      department_slug: form.department_slug || null, branch: form.branch || null,
      custodian: form.custodian || null, location: form.location || null, room_number: form.room_number || null,
      facility_id: form.facility_id || null, condition: form.condition, insurance_status: form.insurance_status,
      lifecycle_status: form.lifecycle_status, status: form.lifecycle_status,
      is_bookable: form.is_bookable === "true",
      quantity_on_hand: Number(form.quantity_on_hand || 1), unit_of_measure: form.unit_of_measure || "unit",
      reorder_level: Number(form.reorder_level || 0),
      next_maintenance_date: form.next_maintenance_date || null, notes: form.notes || null,
    };
    if (editingId) {
      const { error } = await sb.from("assets").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Asset updated");
    } else {
      payload.created_by = currentUserId;
      const { error } = await sb.from("assets").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Asset registered with QR code and asset ID");
    }
    setForm({ ...EMPTY }); setEditingId(null); setShowForm(false); load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this asset record?")) return;
    const { error } = await sb.from("assets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Asset deleted"); load();
  };

  const doScan = () => {
    const term = scan.trim().toLowerCase();
    if (!term) return;
    const hit = assets.find(
      (a) => String(a.barcode ?? "").toLowerCase() === term ||
        String(a.asset_code ?? "").toLowerCase() === term ||
        String(a.qr_token ?? "").toLowerCase() === term ||
        String(a.serial_number ?? "").toLowerCase() === term,
    );
    if (!hit) return toast.error("No asset matches that code.");
    setDetail(hit); setScan("");
  };

  const exportRegister = () =>
    exportRows(
      "asset-register",
      ["Asset ID", "Name", "Category", "Brand", "Model", "Serial", "Department", "Branch", "Location", "Condition", "Status", "Purchase date", "Purchase value", "Book value", "Warranty expiry"],
      filtered.map((a) => [
        a.asset_code, a.name, labelFor(ASSET_CATEGORIES, a.category), a.brand, a.model, a.serial_number,
        a.department_slug, a.branch, a.location, a.condition, a.lifecycle_status ?? a.status,
        a.purchase_date, a.purchase_value, Math.round(depreciatedValue(a)), a.warranty_expiry,
      ]),
    );

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <Label>Search the register</Label>
          <Input placeholder="Name, asset ID, serial, barcode…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-56">
          <Label>Category</Label>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ASSET_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Label>Scan / enter code</Label>
          <Input
            placeholder="Scan QR or barcode"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doScan(); } }}
          />
        </div>
        <Button variant="outline" onClick={doScan}>Look up</Button>
        <Button variant="outline" onClick={exportRegister}>Export register</Button>
        {canManage && (
          <Button onClick={() => { setForm({ ...EMPTY }); setEditingId(null); setShowForm((v) => !v); }}>
            {showForm ? "Close form" : "Register asset"}
          </Button>
        )}
      </Card>

      {showForm && canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {editingId ? "Edit asset" : "Register new asset"}
          </p>
          <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Asset name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{ASSET_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>Serial number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
            <div><Label>Purchase date</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
            <div><Label>Purchase price (R)</Label><Input type="number" step="0.01" value={form.purchase_value} onChange={(e) => setForm({ ...form, purchase_value: e.target.value })} /></div>
            <div><Label>Current value (R, optional)</Label><Input type="number" step="0.01" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} /></div>
            <div><Label>Depreciation % p.a.</Label><Input type="number" value={form.depreciation_rate} onChange={(e) => setForm({ ...form, depreciation_rate: e.target.value })} /></div>
            <div><Label>Warranty expiry</Label><Input type="date" value={form.warranty_expiry} onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })} /></div>
            <div>
              <Label>Supplier</Label>
              <Select value={form.primary_supplier_id} onValueChange={(v) => setForm({ ...form, primary_supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned department</Label>
              <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custodian</Label>
              <Select value={form.custodian} onValueChange={(v) => setForm({ ...form, custodian: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Facility</Label>
              <Select value={form.facility_id} onValueChange={(v) => setForm({ ...form, facility_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Room number</Label><Input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} /></div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{titleish(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Insurance</Label>
              <Select value={form.insurance_status} onValueChange={(v) => setForm({ ...form, insurance_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INSURANCE_STATUSES.map((c) => <SelectItem key={c} value={c}>{titleish(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lifecycle status</Label>
              <Select value={form.lifecycle_status} onValueChange={(v) => setForm({ ...form, lifecycle_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSET_LIFECYCLE.map((c) => <SelectItem key={c} value={c}>{titleish(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bookable by departments</Label>
              <Select value={form.is_bookable} onValueChange={(v) => setForm({ ...form, is_bookable: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Quantity on hand</Label><Input type="number" value={form.quantity_on_hand} onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })} /></div>
            <div><Label>Unit of measure</Label><Input value={form.unit_of_measure} onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })} /></div>
            <div><Label>Reorder level</Label><Input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} /></div>
            <div><Label>Next maintenance</Label><Input type="date" value={form.next_maintenance_date} onChange={(e) => setForm({ ...form, next_maintenance_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">{editingId ? "Save asset" : "Register asset"}</Button>
              <Button type="button" variant="outline" onClick={() => { setForm({ ...EMPTY }); setEditingId(null); setShowForm(false); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Asset ID</th><th className="p-3">Name</th><th className="p-3">Category</th>
              <th className="p-3">Department</th><th className="p-3">Location</th><th className="p-3">Condition</th>
              <th className="p-3">Book value</th><th className="p-3">Status</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const out = checkouts.find((c) => c.asset_id === a.id && !c.checked_in_at);
              return (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">{a.asset_code}</td>
                  <td className="p-3">
                    <button className="text-left font-medium hover:underline" onClick={() => setDetail(a)}>{a.name}</button>
                    <p className="text-xs text-muted-foreground">{[a.brand, a.model].filter(Boolean).join(" ")}</p>
                  </td>
                  <td className="p-3">{labelFor(ASSET_CATEGORIES, a.category)}</td>
                  <td className="p-3">{depts.find((d) => d.slug === a.department_slug)?.name ?? "—"}</td>
                  <td className="p-3">{[a.location, a.room_number].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-3">{titleish(a.condition)}</td>
                  <td className="p-3">{money(depreciatedValue(a))}</td>
                  <td className="p-3">
                    {out ? <Badge variant="outline">Checked out</Badge> : <Badge variant="secondary">{titleish(a.lifecycle_status ?? a.status)}</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(a)}>Open</Button>
                    {canManage && <Button size="sm" variant="ghost" onClick={() => startEdit(a)}>Edit</Button>}
                    {canManage && <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>Delete</Button>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td className="p-6 text-center text-muted-foreground" colSpan={9}>No assets match.</td></tr>}
          </tbody>
        </table>
      </Card>

      <SuppliersPanel suppliers={suppliers} canManage={canManage} onChange={load} />
      <StockMovementsPanel assets={assets} movements={movements} canManage={canManage} currentUserId={currentUserId} onChange={load} />

      {detail && (
        <AssetDetailDialog
          asset={detail}
          onClose={() => setDetail(null)}
          checkouts={checkouts.filter((c) => c.asset_id === detail.id)}
          maintLogs={maintLogs.filter((m) => m.asset_id === detail.id)}
          supplierName={supplierName}
          memberName={memberName}
          members={members}
          depts={depts}
          canManage={canManage}
          currentUserId={currentUserId}
          onChange={load}
        />
      )}
    </div>
  );
}

/* ----------------------------- asset detail + QR ----------------------------- */

function AssetDetailDialog({ asset, onClose, checkouts, maintLogs, supplierName, memberName, members, depts, canManage, currentUserId, onChange }: any) {
  const [qr, setQr] = useState("");
  const [co, setCo] = useState({ checked_out_to: "", department_slug: "", purpose: "", due_back_at: "", quantity: "1" });
  const open = checkouts.find((c: any) => !c.checked_in_at);

  useEffect(() => {
    const payload = `${typeof window !== "undefined" ? window.location.origin : ""}/departments/resource-administrator?asset=${asset.qr_token}`;
    QRCode.toDataURL(payload, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(""));
  }, [asset.qr_token]);

  const checkOut = async () => {
    const { error } = await sb.from("res_asset_checkouts").insert({
      asset_id: asset.id,
      checked_out_to: co.checked_out_to || null,
      holder_name: memberName(co.checked_out_to),
      department_slug: co.department_slug || null,
      purpose: co.purpose || null,
      quantity: Number(co.quantity || 1),
      due_back_at: co.due_back_at ? new Date(co.due_back_at).toISOString() : null,
      condition_out: asset.condition ?? "good",
      recorded_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    await sb.from("assets").update({ lifecycle_status: "loaned", status: "loaned" }).eq("id", asset.id);
    toast.success("Asset checked out"); onChange(); onClose();
  };

  const checkIn = async (conditionIn: string) => {
    const { error } = await sb.from("res_asset_checkouts")
      .update({ checked_in_at: new Date().toISOString(), condition_in: conditionIn }).eq("id", open.id);
    if (error) return toast.error(error.message);
    await sb.from("assets").update({ lifecycle_status: "in_service", status: "in_service", condition: conditionIn }).eq("id", asset.id);
    toast.success("Asset checked in"); onChange(); onClose();
  };

  const warrantyDays = daysUntil(asset.warranty_expiry);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{asset.name}</DialogTitle></DialogHeader>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            {qr && <img src={qr} alt={`QR code for ${asset.name}`} className="rounded border" />}
            <p className="text-center font-mono text-xs">{asset.asset_code}</p>
            <p className="text-center font-mono text-[0.65rem] text-muted-foreground">{asset.barcode}</p>
            <Button size="sm" variant="outline" className="w-full" onClick={() => window.print()}>Print label</Button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Category" value={labelFor(ASSET_CATEGORIES, asset.category)} />
              <Field label="Brand / model" value={[asset.brand, asset.model].filter(Boolean).join(" ") || "—"} />
              <Field label="Serial" value={asset.serial_number ?? "—"} />
              <Field label="Supplier" value={supplierName(asset.primary_supplier_id)} />
              <Field label="Department" value={depts.find((d: any) => d.slug === asset.department_slug)?.name ?? "—"} />
              <Field label="Branch" value={asset.branch ? branchLabel(asset.branch) : "—"} />
              <Field label="Custodian" value={memberName(asset.custodian)} />
              <Field label="Location" value={[asset.location, asset.room_number].filter(Boolean).join(" · ") || "—"} />
              <Field label="Condition" value={titleish(asset.condition)} />
              <Field label="Lifecycle" value={titleish(asset.lifecycle_status ?? asset.status)} />
              <Field label="Purchase" value={`${fmtDate(asset.purchase_date)} · ${money(asset.purchase_value)}`} />
              <Field label="Book value" value={money(depreciatedValue(asset))} />
              <Field label="Insurance" value={titleish(asset.insurance_status)} />
              <Field
                label="Warranty"
                value={asset.warranty_expiry ? `${fmtDate(asset.warranty_expiry)}${warrantyDays != null && warrantyDays < 0 ? " (expired)" : warrantyDays != null ? ` (${warrantyDays}d)` : ""}` : "—"}
              />
              <Field label="Next maintenance" value={fmtDate(asset.next_maintenance_date)} />
            </div>
            {asset.description && <p className="text-muted-foreground">{asset.description}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Check-in / check-out history</p>
            <ul className="mt-2 space-y-2 text-sm">
              {checkouts.slice(0, 8).map((c: any) => (
                <li key={c.id} className="border-b pb-1 last:border-0">
                  {memberName(c.checked_out_to) || c.holder_name || "—"} · out {fmtDate(c.checked_out_at)}
                  {c.checked_in_at ? ` · back ${fmtDate(c.checked_in_at)}` : c.due_back_at ? ` · due ${fmtDate(c.due_back_at)}` : ""}
                </li>
              ))}
              {checkouts.length === 0 && <li className="text-muted-foreground">Never issued.</li>}
            </ul>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Maintenance history</p>
            <ul className="mt-2 space-y-2 text-sm">
              {maintLogs.slice(0, 8).map((m: any) => (
                <li key={m.id} className="border-b pb-1 last:border-0">
                  {fmtDate(m.performed_on)} — {m.description ?? m.maintenance_type ?? "Service"} {m.cost ? `· ${money(m.cost)}` : ""}
                </li>
              ))}
              {maintLogs.length === 0 && <li className="text-muted-foreground">No maintenance recorded.</li>}
            </ul>
          </Card>
        </div>

        <AssetDocumentsPanel assetId={asset.id} canManage={canManage} currentUserId={currentUserId} />



        {canManage && (
          <Card className="mt-4 p-4">
            {open ? (
              <div className="flex flex-wrap items-end gap-3">
                <p className="text-sm">
                  Currently held by <strong>{memberName(open.checked_out_to) || open.holder_name || "—"}</strong>
                  {open.due_back_at ? ` · due back ${fmtDate(open.due_back_at)}` : ""}
                </p>
                <div className="w-40">
                  <Label>Condition on return</Label>
                  <Select defaultValue="good" onValueChange={(v) => checkIn(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ASSET_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{titleish(c)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-5">
                <div className="md:col-span-2">
                  <Label>Check out to</Label>
                  <Select value={co.checked_out_to} onValueChange={(v) => setCo({ ...co, checked_out_to: v })}>
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={co.department_slug} onValueChange={(v) => setCo({ ...co, department_slug: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{depts.map((d: any) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Due back</Label><Input type="datetime-local" value={co.due_back_at} onChange={(e) => setCo({ ...co, due_back_at: e.target.value })} /></div>
                <div className="flex items-end"><Button className="w-full" onClick={checkOut}>Check out</Button></div>
                <div className="md:col-span-5"><Label>Purpose</Label><Input value={co.purpose} onChange={(e) => setCo({ ...co, purpose: e.target.value })} /></div>
              </div>
            )}
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}

/* ----------------------------- suppliers ----------------------------- */

function SuppliersPanel({ suppliers, canManage, onChange }: any) {
  const [f, setF] = useState({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "" });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("suppliers").insert({ ...f });
    if (error) return toast.error(error.message);
    setF({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "" });
    toast.success("Supplier added"); onChange();
  };
  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Suppliers &amp; vendors</p>
      {canManage && (
        <form onSubmit={add} className="mt-3 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2"><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Contact</Label><Input value={f.contact_person} onChange={(e) => setF({ ...f, contact_person: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="flex items-end"><Button type="submit" className="w-full">Add</Button></div>
        </form>
      )}
      <ul className="mt-4 grid gap-2 text-sm md:grid-cols-3">
        {suppliers.map((s: any) => (
          <li key={s.id} className="rounded border p-3">
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">{[s.contact_person, s.phone, s.email].filter(Boolean).join(" · ") || "—"}</p>
          </li>
        ))}
        {suppliers.length === 0 && <li className="text-muted-foreground">No suppliers captured.</li>}
      </ul>
    </Card>
  );
}

/* ----------------------------- stock movements ----------------------------- */

function StockMovementsPanel({ assets, movements, canManage, currentUserId, onChange }: any) {
  const [f, setF] = useState({ asset_id: "", movement_type: "received", quantity_change: "1", reason: "" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a: any) => a.id === f.asset_id);
    if (!asset) return toast.error("Select an asset.");
    const delta = Number(f.quantity_change || 0) * (["issued", "written_off", "lost"].includes(f.movement_type) ? -1 : 1);
    const after = Number(asset.quantity_on_hand ?? 0) + delta;
    const { error } = await sb.from("asset_stock_movements").insert({
      asset_id: f.asset_id, movement_type: f.movement_type, quantity_change: delta,
      quantity_after: after, reason: f.reason || null, performed_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    await sb.from("assets").update({ quantity_on_hand: after }).eq("id", f.asset_id);
    setF({ asset_id: "", movement_type: "received", quantity_change: "1", reason: "" });
    toast.success("Stock movement recorded"); onChange();
  };
  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Stock-take &amp; movements</p>
      {canManage && (
        <form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label>Asset</Label>
            <Select value={f.asset_id} onValueChange={(v) => setF({ ...f, asset_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Movement</Label>
            <Select value={f.movement_type} onValueChange={(v) => setF({ ...f, movement_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["received", "issued", "returned", "written_off", "lost", "stock_take"].map((t) => (
                  <SelectItem key={t} value={t}>{titleish(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Quantity</Label><Input type="number" value={f.quantity_change} onChange={(e) => setF({ ...f, quantity_change: e.target.value })} /></div>
          <div className="flex items-end"><Button type="submit" className="w-full">Record</Button></div>
          <div className="md:col-span-5"><Label>Reason</Label><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
        </form>
      )}
      <ul className="mt-4 space-y-1 text-sm">
        {movements.slice(0, 12).map((m: any) => (
          <li key={m.id} className="border-b pb-1 last:border-0">
            {fmtDate(m.created_at)} — {assets.find((a: any) => a.id === m.asset_id)?.name ?? "—"} · {titleish(m.movement_type)} {m.quantity_change} (now {m.quantity_after})
          </li>
        ))}
        {movements.length === 0 && <li className="text-muted-foreground">No movements yet.</li>}
      </ul>
    </Card>
  );
}
