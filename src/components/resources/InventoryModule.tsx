import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { money, fmtDate, exportRows, BRANCHES, branchLabel } from "@/lib/finance";
import { INVENTORY_CATEGORIES, labelFor, titleish, daysUntil } from "@/lib/resources";

const sb = supabase as any;

const EMPTY = {
  name: "", category: "stationery", unit: "unit", quantity_on_hand: "0", minimum_stock: "0",
  maximum_stock: "", unit_cost: "", supplier_id: "", storage_location: "", branch: "",
  expiry_date: "", notes: "",
};

/** MODULES 8 & 9 — Inventory / Stock Control with procurement triggers into Finance. */
export default function InventoryModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const [i, s, p] = await Promise.all([
      sb.from("res_inventory_items").select("*").order("name"),
      sb.from("suppliers").select("id, name").order("name"),
      sb.from("purchase_requests").select("*").order("created_at", { ascending: false }).limit(60),
    ]);
    setRows(i.data ?? []); setSuppliers(s.data ?? []); setPurchases(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const lowStock = useMemo(() => rows.filter((r) => Number(r.quantity_on_hand) <= Number(r.minimum_stock)), [rows]);
  const expiring = useMemo(
    () => rows.filter((r) => r.expiry_date && (daysUntil(r.expiry_date) ?? 999) <= 60),
    [rows],
  );
  const stockValue = useMemo(
    () => rows.reduce((s, r) => s + Number(r.quantity_on_hand ?? 0) * Number(r.unit_cost ?? 0), 0),
    [rows],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = (v: string) => (v === "" ? null : Number(v));
    const payload: any = {
      name: form.name, category: form.category, unit: form.unit,
      quantity_on_hand: Number(form.quantity_on_hand || 0), minimum_stock: Number(form.minimum_stock || 0),
      maximum_stock: num(form.maximum_stock), unit_cost: num(form.unit_cost),
      supplier_id: form.supplier_id || null, storage_location: form.storage_location || null,
      branch: form.branch || null, expiry_date: form.expiry_date || null, notes: form.notes || null,
    };
    const { error } = editingId
      ? await sb.from("res_inventory_items").update(payload).eq("id", editingId)
      : await sb.from("res_inventory_items").insert({ ...payload, created_by: currentUserId });
    if (error) return toast.error(error.message);
    setForm({ ...EMPTY }); setEditingId(null); toast.success("Inventory item saved"); load();
  };

  const adjust = async (row: any, delta: number) => {
    const next = Math.max(0, Number(row.quantity_on_hand ?? 0) + delta);
    const { error } = await sb.from("res_inventory_items")
      .update({ quantity_on_hand: next, last_counted_on: new Date().toISOString().slice(0, 10) }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const reorder = async (row: any) => {
    const qty = Math.max(Number(row.maximum_stock ?? 0) - Number(row.quantity_on_hand ?? 0), Number(row.minimum_stock ?? 1));
    const { error } = await sb.from("purchase_requests").insert({
      title: `Restock: ${row.name} (${qty} ${row.unit})`,
      department_slug: "resource-administrator", branch: row.branch,
      justification: `Stock at ${row.quantity_on_hand} ${row.unit}, minimum ${row.minimum_stock}. Automatic reorder trigger.`,
      amount_estimated: qty * Number(row.unit_cost ?? 0),
      requested_by: currentUserId, status: "submitted",
    });
    if (error) return toast.error(error.message);
    toast.success("Purchase request raised with Finance"); load();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Stock value</p><p className="mt-1 font-serif text-2xl">{money(stockValue)}</p></Card>
        <Card className="p-4"><p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Below minimum</p><p className="mt-1 font-serif text-2xl">{lowStock.length}</p></Card>
        <Card className="p-4"><p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Expiring in 60 days</p><p className="mt-1 font-serif text-2xl">{expiring.length}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{editingId ? "Edit item" : "Add consumable item"}</p>
          <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Item</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INVENTORY_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            <div><Label>On hand</Label><Input type="number" value={form.quantity_on_hand} onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })} /></div>
            <div><Label>Minimum stock</Label><Input type="number" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} /></div>
            <div><Label>Maximum stock</Label><Input type="number" value={form.maximum_stock} onChange={(e) => setForm({ ...form, maximum_stock: e.target.value })} /></div>
            <div><Label>Unit cost (R)</Label><Input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></div>
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Storage location</Label><Input value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} /></div>
            <div><Label>Expiry date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Save" : "Add item"}</Button>
              {editingId && <Button type="button" variant="outline" onClick={() => { setForm({ ...EMPTY }); setEditingId(null); }}>Cancel</Button>}
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Inventory register</p>
          <Button size="sm" variant="outline" onClick={() => exportRows("inventory",
            ["Item", "Category", "On hand", "Unit", "Minimum", "Unit cost", "Value", "Location", "Expiry"],
            rows.map((r) => [r.name, r.category, r.quantity_on_hand, r.unit, r.minimum_stock, r.unit_cost,
              Number(r.quantity_on_hand ?? 0) * Number(r.unit_cost ?? 0), r.storage_location, r.expiry_date]))}>Export</Button>
        </div>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Item</th><th className="p-3">Category</th><th className="p-3">On hand</th><th className="p-3">Minimum</th><th className="p-3">Value</th><th className="p-3">Expiry</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const low = Number(r.quantity_on_hand) <= Number(r.minimum_stock);
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3">{r.name}<p className="text-xs text-muted-foreground">{r.storage_location ?? "—"}{r.branch ? ` · ${branchLabel(r.branch)}` : ""}</p></td>
                  <td className="p-3">{labelFor(INVENTORY_CATEGORIES, r.category)}</td>
                  <td className="p-3">{r.quantity_on_hand} {r.unit} {low && <Badge variant="destructive" className="ml-1">Low</Badge>}</td>
                  <td className="p-3">{r.minimum_stock}</td>
                  <td className="p-3">{money(Number(r.quantity_on_hand ?? 0) * Number(r.unit_cost ?? 0))}</td>
                  <td className="p-3">{fmtDate(r.expiry_date)}</td>
                  <td className="p-3">
                    {canManage && (
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => adjust(r, 1)}>+1</Button>
                        <Button size="sm" variant="outline" onClick={() => adjust(r, -1)}>−1</Button>
                        {low && <Button size="sm" onClick={() => reorder(r)}>Reorder</Button>}
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingId(r.id);
                          setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k] == null ? "" : String(r[k])])) } as any);
                        }}>Edit</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td className="p-6 text-center text-muted-foreground" colSpan={7}>No inventory items.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Procurement pipeline (shared with Finance)</p>
        <table className="mt-3 w-full text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2">Ref</th><th className="p-2">Request</th><th className="p-2">Department</th><th className="p-2">Estimate</th><th className="p-2">Status</th></tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-2 font-mono text-xs">{p.pr_number}</td>
                <td className="p-2">{p.title}</td>
                <td className="p-2">{p.department_slug ?? "—"}</td>
                <td className="p-2">{money(p.amount_estimated)}</td>
                <td className="p-2">{titleish(p.status)}</td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={5}>No purchase requests.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
