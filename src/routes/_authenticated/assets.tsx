import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "Asset Register — TRoGKC Portal" }] }),
  component: AssetsPage,
});

const STATUSES = ["in_use", "in_storage", "under_repair", "disposed"];

function AssetsPage() {
  const [tab, setTab] = useState<"assets" | "suppliers" | "movements">("assets");
  const [assets, setAssets] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  const loadAll = async () => {
    const [{ data: a }, { data: d }, { data: s }, { data: ls }] = await Promise.all([
      supabase.from("assets").select("*").order("created_at", { ascending: false }),
      supabase.from("departments").select("slug, name").order("name"),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("assets_low_stock").select("*"),
    ]);
    setAssets(a ?? []);
    setDepts(d ?? []);
    setSuppliers(s ?? []);
    setLowStock(ls ?? []);
  };

  useEffect(() => { loadAll(); }, []);

  const supplierName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Foundation module</p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl">Asset Register</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          What we own, what it cost, who supplied it, and a running stock-take log.
        </p>
      </div>

      {lowStock.length > 0 && (
        <Card className="mb-6 border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-800">Low stock</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {lowStock.map((item) => (
              <li key={item.id}>
                {item.name} — {item.quantity_on_hand} {item.unit_of_measure} left (reorder at {item.reorder_level})
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-6 flex gap-2">
        <Button size="sm" variant={tab === "assets" ? "default" : "outline"} onClick={() => setTab("assets")}>Assets</Button>
        <Button size="sm" variant={tab === "suppliers" ? "default" : "outline"} onClick={() => setTab("suppliers")}>Suppliers</Button>
        <Button size="sm" variant={tab === "movements" ? "default" : "outline"} onClick={() => setTab("movements")}>Stock movements</Button>
      </div>

      {tab === "assets" && (
        <AssetsTab assets={assets} depts={depts} suppliers={suppliers} supplierName={supplierName} onChange={loadAll} />
      )}
      {tab === "suppliers" && <SuppliersTab suppliers={suppliers} onChange={loadAll} />}
      {tab === "movements" && <MovementsTab assets={assets} onChange={loadAll} />}
    </div>
  );
}

function AssetsTab({ assets, depts, suppliers, supplierName, onChange }: any) {
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState({
    name: "", brand: "", model: "", serial_number: "", category: "",
    department_slug: "", location: "", unit_of_measure: "unit", quantity_on_hand: "1",
    reorder_level: "0", purchase_date: "", purchase_value: "", primary_supplier_id: "",
    status: "in_use", next_maintenance_date: "", notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [altSuppliersFor, setAltSuppliersFor] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""));
  }, []);

  const resetForm = () => {
    setForm({
      name: "", brand: "", model: "", serial_number: "", category: "",
      department_slug: "", location: "", unit_of_measure: "unit", quantity_on_hand: "1",
      reorder_level: "0", purchase_date: "", purchase_value: "", primary_supplier_id: "",
      status: "in_use", next_maintenance_date: "", notes: "",
    });
    setEditingId(null);
  };

  const startEdit = (a: any) => {
    setForm({
      name: a.name ?? "", brand: a.brand ?? "", model: a.model ?? "", serial_number: a.serial_number ?? "",
      category: a.category ?? "", department_slug: a.department_slug ?? "", location: a.location ?? "",
      unit_of_measure: a.unit_of_measure ?? "unit", quantity_on_hand: String(a.quantity_on_hand ?? 1),
      reorder_level: String(a.reorder_level ?? 0), purchase_date: a.purchase_date ?? "",
      purchase_value: a.purchase_value != null ? String(a.purchase_value) : "",
      primary_supplier_id: a.primary_supplier_id ?? "", status: a.status ?? "in_use",
      next_maintenance_date: a.next_maintenance_date ?? "", notes: a.notes ?? "",
    });
    setEditingId(a.id);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      brand: form.brand || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      category: form.category || null,
      department_slug: form.department_slug || null,
      location: form.location || null,
      unit_of_measure: form.unit_of_measure || "unit",
      quantity_on_hand: Number(form.quantity_on_hand || 0),
      reorder_level: Number(form.reorder_level || 0),
      purchase_date: form.purchase_date || null,
      purchase_value: form.purchase_value ? Number(form.purchase_value) : null,
      primary_supplier_id: form.primary_supplier_id || null,
      status: form.status,
      next_maintenance_date: form.next_maintenance_date || null,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("assets").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Asset updated");
    } else {
      payload.created_by = userId;
      const { data: inserted, error } = await supabase.from("assets").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      if (inserted && Number(form.quantity_on_hand) > 0) {
        await supabase.from("asset_stock_movements").insert({
          asset_id: inserted.id,
          movement_type: "received",
          quantity_change: Number(form.quantity_on_hand),
          quantity_after: Number(form.quantity_on_hand),
          reason: "Initial stock on registration",
          performed_by: userId,
        });
      }
      toast.success("Asset registered");
    }
    resetForm();
    onChange();
  };

  const removeAsset = async (id: string) => {
    if (!window.confirm("Delete this asset record?")) return;
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Asset deleted");
    onChange();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {editingId ? "Edit asset" : "Register new asset"}
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          </div>
          <div><Label>Serial number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
          <div><Label>Category</Label><Input placeholder="e.g. Sound & AV, Furniture, Vehicles" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>

          <div>
            <Label>Department</Label>
            <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{depts.map((d: any) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Location</Label><Input placeholder="e.g. Storeroom, left shelf" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantity on hand</Label><Input type="number" value={form.quantity_on_hand} onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })} /></div>
            <div><Label>Reorder level</Label><Input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} /></div>
          </div>
          <div><Label>Unit of measure</Label><Input value={form.unit_of_measure} onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Purchase date</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
            <div><Label>Purchase value (R)</Label><Input type="number" step="0.01" value={form.purchase_value} onChange={(e) => setForm({ ...form, purchase_value: e.target.value })} /></div>
          </div>

          <div>
            <Label>Primary supplier</Label>
            <Select value={form.primary_supplier_id} onValueChange={(v) => setForm({ ...form, primary_supplier_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div><Label>Next maintenance date (optional)</Label><Input type="date" value={form.next_maintenance_date} onChange={(e) => setForm({ ...form, next_maintenance_date: e.target.value })} /></div>

          <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="flex gap-2">
            <Button type="submit">{editingId ? "Save changes" : "Register asset"}</Button>
            {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
          </div>
        </form>
      </Card>

      <div className="lg:col-span-2">
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-3">Name</th><th className="p-3">Brand/Model</th><th className="p-3">Category</th>
                <th className="p-3">Qty</th><th className="p-3">Supplier</th><th className="p-3">Status</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a: any) => (
                <>
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="p-3">{a.name}</td>
                    <td className="p-3">{[a.brand, a.model].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="p-3">{a.category ?? "—"}</td>
                    <td className="p-3">{a.quantity_on_hand} {a.unit_of_measure}</td>
                    <td className="p-3">{supplierName(a.primary_supplier_id)}</td>
                    <td className="p-3 capitalize">{a.status?.replace("_", " ")}</td>
                    <td className="p-3 whitespace-nowrap">
                      <button className="mr-3 text-xs underline" onClick={() => startEdit(a)}>Edit</button>
                      <button className="mr-3 text-xs underline" onClick={() => setAltSuppliersFor(altSuppliersFor === a.id ? null : a.id)}>
                        Alt. suppliers
                      </button>
                      <button className="text-xs text-red-600 underline" onClick={() => removeAsset(a.id)}>Delete</button>
                    </td>
                  </tr>
                  {altSuppliersFor === a.id && (
                    <tr>
                      <td colSpan={7} className="bg-muted/30 p-4">
                        <AltSuppliers assetId={a.id} suppliers={suppliers} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {assets.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No assets registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function AltSuppliers({ assetId, suppliers }: { assetId: string; suppliers: any[] }) {
  const [links, setLinks] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [price, setPrice] = useState("");
  const [leadTime, setLeadTime] = useState("");

  const load = async () => {
    const { data } = await supabase.from("asset_suppliers").select("*").eq("asset_id", assetId);
    setLinks(data ?? []);
  };
  useEffect(() => { load(); }, [assetId]);

  const add = async () => {
    if (!supplierId) return;
    const { error } = await supabase.from("asset_suppliers").insert({
      asset_id: assetId, supplier_id: supplierId,
      quoted_price: price ? Number(price) : null,
      lead_time_days: leadTime ? Number(leadTime) : null,
    });
    if (error) return toast.error(error.message);
    setSupplierId(""); setPrice(""); setLeadTime("");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("asset_suppliers").delete().eq("id", id);
    load();
  };

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Alternate suppliers for this item</p>
      <ul className="mt-2 space-y-1 text-sm">
        {links.map((l) => (
          <li key={l.id} className="flex items-center justify-between">
            <span>
              {supplierName(l.supplier_id)}
              {l.quoted_price ? ` · R${l.quoted_price}` : ""}
              {l.lead_time_days ? ` · ${l.lead_time_days}d lead time` : ""}
            </span>
            <button className="text-xs text-red-600 underline" onClick={() => remove(l.id)}>Remove</button>
          </li>
        ))}
        {links.length === 0 && <li className="text-muted-foreground">No alternates listed yet.</li>}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Add supplier…" /></SelectTrigger>
          <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="w-28" placeholder="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Input className="w-32" placeholder="Lead days" type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
        <Button size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

function SuppliersTab({ suppliers, onChange }: any) {
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("suppliers").insert({ ...form, created_by: userRes.user?.id });
    if (error) return toast.error(error.message);
    toast.success("Supplier added");
    setForm({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "" });
    onChange();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Add supplier</p>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Contact person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit">Add supplier</Button>
        </form>
      </Card>

      <Card className="overflow-x-auto lg:col-span-2">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">Name</th><th className="p-3">Contact</th><th className="p-3">Phone</th><th className="p-3">Email</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s: any) => (
              <tr key={s.id} className="border-b border-border/50">
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.contact_person ?? "—"}</td>
                <td className="p-3">{s.phone ?? "—"}</td>
                <td className="p-3">{s.email ?? "—"}</td>
                <td className="p-3"><button className="text-xs text-red-600 underline" onClick={() => remove(s.id)}>Delete</button></td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No suppliers yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function MovementsTab({ assets, onChange }: any) {
  const [assetId, setAssetId] = useState("");
  const [movementType, setMovementType] = useState("received");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase.from("asset_stock_movements").select("*").order("created_at", { ascending: false }).limit(50);
    setHistory(data ?? []);
  };
  useEffect(() => { loadHistory(); }, []);

  const assetName = (id: string) => assets.find((a: any) => a.id === id)?.name ?? "—";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a: any) => a.id === assetId);
    if (!asset) return toast.error("Pick an asset first");

    const qty = Number(quantity);
    const change = movementType === "issued" || movementType === "disposed" ? -Math.abs(qty) : Math.abs(qty);
    const newQty = Number(asset.quantity_on_hand) + change;

    const { data: userRes } = await supabase.auth.getUser();
    const { error: updateError } = await supabase.from("assets").update({ quantity_on_hand: newQty }).eq("id", assetId);
    if (updateError) return toast.error(updateError.message);

    const { error } = await supabase.from("asset_stock_movements").insert({
      asset_id: assetId, movement_type: movementType, quantity_change: change,
      quantity_after: newQty, reason: reason || null, performed_by: userRes.user?.id,
    });
    if (error) return toast.error(error.message);

    toast.success("Movement recorded");
    setQuantity(""); setReason("");
    loadHistory();
    onChange();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Record a movement</p>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <div>
            <Label>Asset</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{assets.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="received">Received (stock in)</SelectItem>
                <SelectItem value="issued">Issued (stock out)</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Quantity</Label><Input required type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
          <Input placeholder="Reason / reference" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button type="submit">Record</Button>
        </form>
      </Card>

      <Card className="overflow-x-auto lg:col-span-2">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">Date</th><th className="p-3">Asset</th><th className="p-3">Type</th><th className="p-3">Change</th><th className="p-3">Balance</th><th className="p-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-border/50">
                <td className="p-3">{new Date(h.created_at).toLocaleString()}</td>
                <td className="p-3">{assetName(h.asset_id)}</td>
                <td className="p-3 capitalize">{h.movement_type.replace("_", " ")}</td>
                <td className={`p-3 ${h.quantity_change < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {h.quantity_change > 0 ? "+" : ""}{h.quantity_change}
                </td>
                <td className="p-3">{h.quantity_after}</td>
                <td className="p-3">{h.reason ?? "—"}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No movements recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

