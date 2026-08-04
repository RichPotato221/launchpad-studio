import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate, money, titleCase } from "@/lib/finance";
import { HOS_INVENTORY_CATEGORIES, MOVEMENT_TYPES, isExpiringSoon, labelFor, stockRag } from "@/lib/hospitality";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** Inventory & supplies control: stock levels, reorder alerts, expiry watch and movement audit. */
export default function HospitalityInventoryModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");

  const empty = {
    item_code: "",
    name: "",
    category: "refreshments",
    quantity: "0",
    unit: "units",
    min_stock: "0",
    max_stock: "",
    supplier: "",
    purchase_date: "",
    expiry_date: "",
    storage_location: "",
    unit_value: "",
    condition: "good",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const [{ data }, { data: m }] = await Promise.all([
      sb.from("hos_inventory").select("*").order("name"),
      sb.from("hos_inventory_movements").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setRows(data ?? []);
    setMovements(m ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Item name is required");
    const { error } = await sb.from("hos_inventory").insert({
      ...form,
      quantity: Number(form.quantity) || 0,
      min_stock: Number(form.min_stock) || 0,
      max_stock: form.max_stock ? Number(form.max_stock) : null,
      unit_value: form.unit_value ? Number(form.unit_value) : null,
      purchase_date: form.purchase_date || null,
      expiry_date: form.expiry_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Item added to hospitality stock");
    setForm({ ...empty });
    load();
  };

  const move = async (item: any, type: string) => {
    const raw = window.prompt(`${titleCase(type)} — quantity for ${item.name}:`);
    if (raw === null) return;
    const qty = Number(raw);
    if (!qty || qty <= 0) return toast.error("Enter a quantity greater than zero");
    const delta = type === "receive" ? qty : type === "audit" ? 0 : -qty;
    const newQty = type === "audit" ? qty : Number(item.quantity ?? 0) + delta;
    if (newQty < 0) return toast.error("Not enough stock on hand");

    const reason = window.prompt("Reason / note (optional):") ?? null;
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      sb.from("hos_inventory").update({ quantity: newQty }).eq("id", item.id),
      sb.from("hos_inventory_movements").insert({
        item_id: item.id,
        movement_type: type,
        quantity: qty,
        reason,
        moved_by: currentUserId,
      }),
    ]);
    if (e1 || e2) return toast.error((e1 ?? e2)!.message);
    toast.success("Stock movement recorded");
    load();
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!term) return true;
      return [r.name, r.item_code, r.supplier, r.storage_location].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(term));
    });
  }, [rows, q, category]);

  const lowStock = rows.filter((r) => stockRag(r) === "red");
  const expiring = rows.filter((r) => isExpiringSoon(r));
  const value = rows.reduce((s, r) => s + Number(r.quantity ?? 0) * Number(r.unit_value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Stock lines</p><p className="font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Below minimum</p><p className="font-serif text-2xl">{lowStock.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Expiring in 30 days</p><p className="font-serif text-2xl">{expiring.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Stock value</p><p className="font-serif text-2xl">{money(value)}</p></Card>
      </div>

      {(lowStock.length > 0 || expiring.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/60 p-5">
          <p className="text-sm font-medium text-amber-900">Reorder alert</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
            {lowStock.slice(0, 8).map((r) => <li key={r.id}>{r.name} — {r.quantity} {r.unit} on hand (minimum {r.min_stock})</li>)}
            {expiring.slice(0, 8).map((r) => <li key={`e-${r.id}`}>{r.name} expires {fmtDate(r.expiry_date)}</li>)}
          </ul>
          <p className="mt-3 text-xs text-amber-900">
            Raise a purchase request under this department's Financial Command Centre → Procurement, attaching the quotation.
          </p>
        </Card>
      )}

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Add a stock item</h3>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Item name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Item code</Label><Input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {HOS_INVENTORY_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            <div><Label>Minimum stock</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
            <div><Label>Maximum stock</Label><Input type="number" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: e.target.value })} /></div>
            <div><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
            <div><Label>Unit value (R)</Label><Input type="number" value={form.unit_value} onChange={(e) => setForm({ ...form, unit_value: e.target.value })} /></div>
            <div><Label>Purchase date</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
            <div><Label>Expiry date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            <div><Label>Storage location</Label><Input value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} /></div>
            <div className="md:col-span-4"><Button type="submit">Add item</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Stock register</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 w-52" placeholder="Search stock…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {HOS_INVENTORY_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportRows(
                  "hospitality-inventory",
                  ["Code", "Item", "Category", "Quantity", "Unit", "Minimum", "Supplier", "Expiry", "Location", "Unit value"],
                  filtered.map((r) => [r.item_code, r.name, r.category, r.quantity, r.unit, r.min_stock, r.supplier, r.expiry_date, r.storage_location, r.unit_value]),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Excel (CSV)
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Item</th><th>Category</th><th>On hand</th><th>Minimum</th><th>Expiry</th><th>Location</th>{canManage && <th>Movements</th>}</tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.item_code ?? "—"}{r.supplier ? ` · ${r.supplier}` : ""}</p>
                  </td>
                  <td className="pr-3">{labelFor(HOS_INVENTORY_CATEGORIES, r.category)}</td>
                  <td className="pr-3">
                    <Badge variant="outline" className={RAG_CLASS[stockRag(r)]}>{r.quantity} {r.unit}</Badge>
                  </td>
                  <td className="pr-3">{r.min_stock}</td>
                  <td className="pr-3">
                    {r.expiry_date ? (
                      <span className={isExpiringSoon(r) ? "font-medium text-amber-700" : ""}>{fmtDate(r.expiry_date)}</span>
                    ) : "—"}
                  </td>
                  <td className="pr-3">{r.storage_location ?? "—"}</td>
                  {canManage && (
                    <td className="pr-1">
                      <div className="flex flex-wrap gap-1">
                        {MOVEMENT_TYPES.map((t) => (
                          <Button key={t} size="sm" variant="outline" onClick={() => move(r, t)}>{titleCase(t)}</Button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No stock items match this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-serif text-lg">Movement audit trail</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">When</th><th>Item</th><th>Movement</th><th>Quantity</th><th>Reason</th></tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(m.created_at)}</td>
                  <td className="pr-3">{rows.find((r) => r.id === m.item_id)?.name ?? "—"}</td>
                  <td className="pr-3">{titleCase(m.movement_type)}</td>
                  <td className="pr-3">{m.quantity}</td>
                  <td className="pr-3">{m.reason ?? "—"}</td>
                </tr>
              ))}
              {movements.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No stock movements recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
