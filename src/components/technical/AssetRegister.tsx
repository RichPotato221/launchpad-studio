import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RAG_CLASS, exportRows, fmtDate, money } from "@/lib/finance";
import {
  ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUSES, FAULT_PRIORITIES, FAULT_STATUSES, FAULT_TYPES,
  MAINTENANCE_FREQUENCIES, MAINTENANCE_TYPES, TECH_INVENTORY_CATEGORIES,
  daysUntil, labelFor, ragForCount, titleish, today,
} from "@/lib/technical";

const sb = supabase as any;

const EMPTY_ASSET = {
  asset_number: "", name: "", category: "audio", subcategory: "", make: "", model: "", serial_number: "",
  barcode: "", purchase_date: "", purchase_cost: "", supplier: "", warranty_expiry: "", insurance_ref: "",
  replacement_date: "", condition: "good", status: "in_service", location: "", assigned_to: "",
  photo_url: "", manual_url: "", notes: "",
};

const EMPTY_MAINT = { asset_id: "", task: "", maintenance_type: "cleaning", frequency: "monthly", due_date: today(), notes: "" };
const EMPTY_FAULT = { asset_id: "", fault_type: "equipment", title: "", description: "", priority: "medium" };
const EMPTY_STOCK = { item: "", category: "cables", unit: "each", quantity: "0", reorder_level: "0", missing_count: "0", location: "", unit_cost: "" };

/** MODULES 3–6 — Technical asset register, preventative maintenance, faults, and consumables. */
export default function AssetRegister({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [maint, setMaint] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [asset, setAsset] = useState({ ...EMPTY_ASSET });
  const [editing, setEditing] = useState<string | null>(null);
  const [mForm, setMForm] = useState({ ...EMPTY_MAINT });
  const [fForm, setFForm] = useState({ ...EMPTY_FAULT });
  const [sForm, setSForm] = useState({ ...EMPTY_STOCK });
  const [filter, setFilter] = useState("");

  const load = async () => {
    const [a, m, f, s] = await Promise.all([
      sb.from("tech_assets").select("*").order("name"),
      sb.from("tech_maintenance").select("*").order("due_date"),
      sb.from("tech_faults").select("*").order("created_at", { ascending: false }),
      sb.from("tech_inventory").select("*").order("item"),
    ]);
    setAssets(a.data ?? []); setMaint(m.data ?? []); setFaults(f.data ?? []); setStock(s.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const assetName = (id?: string | null) => assets.find((a) => a.id === id)?.name ?? "General / not asset-specific";

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => [a.name, a.make, a.model, a.serial_number, a.asset_number, a.location]
      .some((v) => (v ?? "").toLowerCase().includes(q)));
  }, [assets, filter]);

  const stats = useMemo(() => ({
    value: assets.reduce((s, a) => s + Number(a.purchase_cost ?? 0), 0),
    faulty: assets.filter((a) => a.condition === "faulty" || a.status === "repair").length,
    overdue: maint.filter((m) => m.status !== "completed" && m.due_date <= today()).length,
    openFaults: faults.filter((f) => !["resolved", "closed"].includes(f.status)).length,
    low: stock.filter((s) => Number(s.quantity) <= Number(s.reorder_level)).length,
  }), [assets, maint, faults, stock]);

  const saveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset.name.trim()) return toast.error("Give the asset a name");
    const payload: any = {
      ...asset,
      purchase_cost: asset.purchase_cost ? Number(asset.purchase_cost) : null,
      purchase_date: asset.purchase_date || null,
      warranty_expiry: asset.warranty_expiry || null,
      replacement_date: asset.replacement_date || null,
      qr_payload: asset.barcode || asset.asset_number || asset.serial_number || null,
    };
    const { error } = editing
      ? await sb.from("tech_assets").update(payload).eq("id", editing)
      : await sb.from("tech_assets").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Asset updated" : "Asset registered");
    setAsset({ ...EMPTY_ASSET }); setEditing(null); load();
  };

  const saveMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mForm.task.trim()) return toast.error("Describe the maintenance task");
    const { error } = await sb.from("tech_maintenance").insert({ ...mForm, asset_id: mForm.asset_id || null });
    if (error) return toast.error(error.message);
    toast.success("Maintenance scheduled"); setMForm({ ...EMPTY_MAINT }); load();
  };

  const completeMaint = async (row: any) => {
    const { error } = await sb.from("tech_maintenance")
      .update({ status: "completed", completed_on: today(), completed_by: currentUserId }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Marked complete"); load();
  };

  const saveFault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fForm.title.trim()) return toast.error("Describe the fault");
    const { error } = await sb.from("tech_faults").insert({ ...fForm, asset_id: fForm.asset_id || null, reported_by: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Fault logged"); setFForm({ ...EMPTY_FAULT }); load();
  };

  const setFaultStatus = async (row: any, status: string) => {
    const patch: any = { status };
    if (status === "resolved" || status === "closed") patch.resolved_at = new Date().toISOString();
    const { error } = await sb.from("tech_faults").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const saveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sForm.item.trim()) return toast.error("Name the item");
    const { error } = await sb.from("tech_inventory").insert({
      ...sForm,
      quantity: Number(sForm.quantity || 0),
      reorder_level: Number(sForm.reorder_level || 0),
      missing_count: Number(sForm.missing_count || 0),
      unit_cost: sForm.unit_cost ? Number(sForm.unit_cost) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Item added"); setSForm({ ...EMPTY_STOCK }); load();
  };

  const adjustStock = async (row: any, delta: number) => {
    const { error } = await sb.from("tech_inventory").update({ quantity: Math.max(0, Number(row.quantity) + delta) }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Register value</p><p className="font-serif text-xl">{money(stats.value)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Assets</p><p className="font-serif text-xl">{assets.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Faulty / repair</p><p className="font-serif text-xl">{stats.faulty}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Maintenance overdue</p><p className="font-serif text-xl">{stats.overdue}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Stock below reorder</p><p className="font-serif text-xl">{stats.low}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">{editing ? "Edit asset" : "Register technical asset"}</h3>
          <form onSubmit={saveAsset} className="mt-4 grid gap-4 md:grid-cols-4">
            <div><Label>Asset number</Label><Input value={asset.asset_number} onChange={(e) => setAsset({ ...asset, asset_number: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Name</Label><Input value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={asset.category} onChange={(e) => setAsset({ ...asset, category: e.target.value })}>
                {ASSET_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div><Label>Make</Label><Input value={asset.make} onChange={(e) => setAsset({ ...asset, make: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={asset.model} onChange={(e) => setAsset({ ...asset, model: e.target.value })} /></div>
            <div><Label>Serial number</Label><Input value={asset.serial_number} onChange={(e) => setAsset({ ...asset, serial_number: e.target.value })} /></div>
            <div><Label>Barcode / QR</Label><Input value={asset.barcode} onChange={(e) => setAsset({ ...asset, barcode: e.target.value })} /></div>
            <div><Label>Purchase date</Label><Input type="date" value={asset.purchase_date} onChange={(e) => setAsset({ ...asset, purchase_date: e.target.value })} /></div>
            <div><Label>Purchase cost</Label><Input type="number" step="0.01" value={asset.purchase_cost} onChange={(e) => setAsset({ ...asset, purchase_cost: e.target.value })} /></div>
            <div><Label>Supplier</Label><Input value={asset.supplier} onChange={(e) => setAsset({ ...asset, supplier: e.target.value })} /></div>
            <div><Label>Warranty expiry</Label><Input type="date" value={asset.warranty_expiry} onChange={(e) => setAsset({ ...asset, warranty_expiry: e.target.value })} /></div>
            <div><Label>Insurance ref</Label><Input value={asset.insurance_ref} onChange={(e) => setAsset({ ...asset, insurance_ref: e.target.value })} /></div>
            <div><Label>Replacement due</Label><Input type="date" value={asset.replacement_date} onChange={(e) => setAsset({ ...asset, replacement_date: e.target.value })} /></div>
            <div>
              <Label>Condition</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={asset.condition} onChange={(e) => setAsset({ ...asset, condition: e.target.value })}>
                {ASSET_CONDITIONS.map((c) => <option key={c} value={c}>{titleish(c)}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={asset.status} onChange={(e) => setAsset({ ...asset, status: e.target.value })}>
                {ASSET_STATUSES.map((c) => <option key={c} value={c}>{titleish(c)}</option>)}
              </select>
            </div>
            <div><Label>Location</Label><Input value={asset.location} onChange={(e) => setAsset({ ...asset, location: e.target.value })} /></div>
            <div><Label>Assigned to</Label><Input value={asset.assigned_to} onChange={(e) => setAsset({ ...asset, assigned_to: e.target.value })} /></div>
            <div><Label>Photo URL</Label><Input value={asset.photo_url} onChange={(e) => setAsset({ ...asset, photo_url: e.target.value })} /></div>
            <div><Label>Manual URL</Label><Input value={asset.manual_url} onChange={(e) => setAsset({ ...asset, manual_url: e.target.value })} /></div>
            <div className="md:col-span-4"><Label>Notes</Label><Textarea rows={2} value={asset.notes} onChange={(e) => setAsset({ ...asset, notes: e.target.value })} /></div>
            <div className="flex items-end gap-2 md:col-span-4">
              <Button type="submit">{editing ? "Save changes" : "Register asset"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setAsset({ ...EMPTY_ASSET }); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Asset register</h3>
          <div className="flex gap-2">
            <Input className="w-56" placeholder="Search assets…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <Button variant="outline" onClick={() => exportRows("technical-assets", visible)}>Export CSV</Button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Asset</th><th>Category</th><th>Serial</th><th>Location</th><th>Condition</th><th>Status</th><th>Warranty</th><th>Value</th>{canManage && <th />}</tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.id} className="border-t border-border/60">
                  <td className="py-2">
                    <span className="font-medium">{a.name}</span>
                    <span className="block text-xs text-muted-foreground">{[a.asset_number, a.make, a.model].filter(Boolean).join(" · ") || "—"}</span>
                  </td>
                  <td>{labelFor(ASSET_CATEGORIES, a.category)}</td>
                  <td className="text-xs">{a.serial_number ?? "—"}</td>
                  <td>{a.location ?? "—"}</td>
                  <td><Badge variant="outline" className={RAG_CLASS[a.condition === "faulty" || a.condition === "poor" ? "red" : a.condition === "fair" ? "amber" : "green"]}>{titleish(a.condition)}</Badge></td>
                  <td>{titleish(a.status)}</td>
                  <td className="text-xs">{fmtDate(a.warranty_expiry)}</td>
                  <td>{money(a.purchase_cost)}</td>
                  {canManage && <td className="text-right"><Button size="sm" variant="ghost" onClick={() => { setEditing(a.id); setAsset({ ...EMPTY_ASSET, ...Object.fromEntries(Object.keys(EMPTY_ASSET).map((k) => [k, a[k] ?? ""])) } as any); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button></td>}
                </tr>
              ))}
              {!visible.length && <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">No assets registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-serif text-lg">Preventative maintenance</h3>
          {canManage && (
            <form onSubmit={saveMaint} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Asset</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={mForm.asset_id} onChange={(e) => setMForm({ ...mForm, asset_id: e.target.value })}>
                  <option value="">General / not asset-specific</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><Label>Task</Label><Input value={mForm.task} onChange={(e) => setMForm({ ...mForm, task: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={mForm.maintenance_type} onChange={(e) => setMForm({ ...mForm, maintenance_type: e.target.value })}>
                  {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{titleish(t)}</option>)}
                </select>
              </div>
              <div>
                <Label>Frequency</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={mForm.frequency} onChange={(e) => setMForm({ ...mForm, frequency: e.target.value })}>
                  {MAINTENANCE_FREQUENCIES.map((t) => <option key={t} value={t}>{titleish(t)}</option>)}
                </select>
              </div>
              <div><Label>Due</Label><Input type="date" value={mForm.due_date} onChange={(e) => setMForm({ ...mForm, due_date: e.target.value })} /></div>
              <div className="flex items-end"><Button type="submit" className="w-full">Schedule</Button></div>
            </form>
          )}
          <ul className="mt-4 space-y-2 text-sm">
            {maint.filter((m) => m.status !== "completed").map((m) => {
              const d = daysUntil(m.due_date);
              return (
                <li key={m.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                  <span>
                    <span className="font-medium">{m.task}</span>
                    <span className="block text-xs text-muted-foreground">{assetName(m.asset_id)} · {titleish(m.maintenance_type)} · due {fmtDate(m.due_date)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className={RAG_CLASS[d === null ? "green" : d < 0 ? "red" : d < 7 ? "amber" : "green"]}>
                      {d === null ? "—" : d < 0 ? `${Math.abs(d)}d overdue` : `${d}d`}
                    </Badge>
                    {canManage && <Button size="sm" variant="outline" onClick={() => completeMaint(m)}>Done</Button>}
                  </span>
                </li>
              );
            })}
            {!maint.filter((m) => m.status !== "completed").length && <li className="text-muted-foreground">No outstanding maintenance.</li>}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-serif text-lg">Fault & incident reporting</h3>
          <form onSubmit={saveFault} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Equipment</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={fForm.asset_id} onChange={(e) => setFForm({ ...fForm, asset_id: e.target.value })}>
                <option value="">Not asset-specific</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label>Fault title</Label><Input value={fForm.title} onChange={(e) => setFForm({ ...fForm, title: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={fForm.fault_type} onChange={(e) => setFForm({ ...fForm, fault_type: e.target.value })}>
                {FAULT_TYPES.map((t) => <option key={t} value={t}>{titleish(t)}</option>)}
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={fForm.priority} onChange={(e) => setFForm({ ...fForm, priority: e.target.value })}>
                {FAULT_PRIORITIES.map((t) => <option key={t} value={t}>{titleish(t)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={fForm.description} onChange={(e) => setFForm({ ...fForm, description: e.target.value })} /></div>
            <div className="flex items-end sm:col-span-2"><Button type="submit">Log fault</Button></div>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {faults.slice(0, 12).map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                <span>
                  <span className="font-medium">{f.title}</span>
                  <span className="block text-xs text-muted-foreground">{assetName(f.asset_id)} · {titleish(f.fault_type)} · {fmtDate(f.created_at)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className={RAG_CLASS[f.priority === "critical" || f.priority === "high" ? "red" : f.priority === "medium" ? "amber" : "green"]}>{titleish(f.priority)}</Badge>
                  {canManage ? (
                    <select className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={f.status} onChange={(e) => setFaultStatus(f, e.target.value)}>
                      {FAULT_STATUSES.map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                    </select>
                  ) : <Badge variant="outline">{titleish(f.status)}</Badge>}
                </span>
              </li>
            ))}
            {!faults.length && <li className="text-muted-foreground">No faults logged.</li>}
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Consumables & spares</h3>
          <Badge variant="outline" className={RAG_CLASS[ragForCount(stats.low, 1, 4)]}>{stats.low} below reorder level</Badge>
        </div>
        {canManage && (
          <form onSubmit={saveStock} className="mt-4 grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2"><Label>Item</Label><Input value={sForm.item} onChange={(e) => setSForm({ ...sForm, item: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={sForm.category} onChange={(e) => setSForm({ ...sForm, category: e.target.value })}>
                {TECH_INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{titleish(c)}</option>)}
              </select>
            </div>
            <div><Label>Qty</Label><Input type="number" value={sForm.quantity} onChange={(e) => setSForm({ ...sForm, quantity: e.target.value })} /></div>
            <div><Label>Reorder at</Label><Input type="number" value={sForm.reorder_level} onChange={(e) => setSForm({ ...sForm, reorder_level: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit" className="w-full">Add</Button></div>
          </form>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Item</th><th>Category</th><th>Qty</th><th>Reorder at</th><th>Missing</th><th>Location</th>{canManage && <th />}</tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="py-2 font-medium">{s.item}</td>
                  <td>{titleish(s.category)}</td>
                  <td><Badge variant="outline" className={RAG_CLASS[Number(s.quantity) <= Number(s.reorder_level) ? "red" : "green"]}>{s.quantity}</Badge></td>
                  <td>{s.reorder_level}</td>
                  <td>{s.missing_count}</td>
                  <td>{s.location ?? "—"}</td>
                  {canManage && (
                    <td className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => adjustStock(s, -1)}>−</Button>
                      <Button size="sm" variant="ghost" onClick={() => adjustStock(s, 1)}>+</Button>
                    </td>
                  )}
                </tr>
              ))}
              {!stock.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No consumables tracked yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
