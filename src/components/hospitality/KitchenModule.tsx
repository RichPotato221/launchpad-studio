import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate, money, titleCase } from "@/lib/finance";
import { checklistProgress, normaliseChecklist, ragForScore, today } from "@/lib/hospitality";

const sb = supabase as any;

const KITCHEN_CHECKS = [
  "Hands washed & aprons on",
  "Work surfaces sanitised",
  "Fridge temperature checked",
  "Food stored & covered correctly",
  "Allergens identified",
  "Serving utensils clean",
  "Waste removed",
  "Floors cleaned",
  "Equipment switched off",
  "Kitchen locked",
];

type Props = { canManage: boolean; currentUserId: string };

/** Kitchen & catering: menus, dietary options, food cost, hygiene and cleaning checklist. */
export default function KitchenModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const empty = {
    name: "",
    service_date: today(),
    menu_items: "",
    dietary_options: "",
    kitchen_team: "",
    serving_time: "",
    estimated_servings: "",
    food_cost: "",
    notes: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("hos_menus").select("*").order("service_date", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name the menu");
    const { error } = await sb.from("hos_menus").insert({
      ...form,
      estimated_servings: form.estimated_servings ? Number(form.estimated_servings) : null,
      food_cost: form.food_cost ? Number(form.food_cost) : null,
      cleaning_checklist: KITCHEN_CHECKS.map((label) => ({ label, done: false })),
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Menu planned");
    setForm({ ...empty });
    load();
  };

  const patch = async (row: any, values: Record<string, any>) => {
    const { error } = await sb.from("hos_menus").update(values).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggleCheck = async (row: any, index: number) => {
    const items = normaliseChecklist(row.cleaning_checklist).length
      ? normaliseChecklist(row.cleaning_checklist)
      : KITCHEN_CHECKS.map((label) => ({ label, done: false }));
    items[index].done = !items[index].done;
    await patch(row, { cleaning_checklist: items });
  };

  const costPerHead = useMemo(() => {
    const withData = rows.filter((r) => r.food_cost && r.estimated_servings);
    if (!withData.length) return 0;
    return withData.reduce((s, r) => s + Number(r.food_cost) / Number(r.estimated_servings), 0) / withData.length;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Menus planned</p><p className="font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Hygiene checked</p><p className="font-serif text-2xl">{rows.filter((r) => r.hygiene_checked).length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Total food cost</p><p className="font-serif text-2xl">{money(rows.reduce((s, r) => s + Number(r.food_cost ?? 0), 0))}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Average cost per head</p><p className="font-serif text-2xl">{money(costPerHead)}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Plan a menu</h3>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Menu name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Service date</Label><Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} /></div>
            <div><Label>Serving time</Label><Input value={form.serving_time} onChange={(e) => setForm({ ...form, serving_time: e.target.value })} /></div>
            <div><Label>Estimated servings</Label><Input type="number" value={form.estimated_servings} onChange={(e) => setForm({ ...form, estimated_servings: e.target.value })} /></div>
            <div><Label>Food cost (R)</Label><Input type="number" value={form.food_cost} onChange={(e) => setForm({ ...form, food_cost: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Menu items</Label><Textarea rows={2} value={form.menu_items} onChange={(e) => setForm({ ...form, menu_items: e.target.value })} /></div>
            <div><Label>Dietary options (halal, vegan, allergen-free)</Label><Textarea rows={2} value={form.dietary_options} onChange={(e) => setForm({ ...form, dietary_options: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Kitchen team</Label><Input value={form.kitchen_team} onChange={(e) => setForm({ ...form, kitchen_team: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="md:col-span-3"><Button type="submit">Save menu</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Menus & kitchen compliance</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "hospitality-menus",
                ["Menu", "Service date", "Servings", "Food cost", "Dietary options", "Kitchen team", "Hygiene checked"],
                rows.map((r) => [r.name, r.service_date, r.estimated_servings, r.food_cost, r.dietary_options, r.kitchen_team, r.hygiene_checked ? "Yes" : "No"]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {rows.map((r) => {
            const progress = checklistProgress(r.cleaning_checklist ?? KITCHEN_CHECKS.map((label) => ({ label, done: false })));
            return (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.name}</p>
                      <Badge variant="outline">{fmtDate(r.service_date)}</Badge>
                      <Badge variant="outline" className={RAG_CLASS[ragForScore(progress.pct, 90, 60)]}>{progress.pct}% cleaning</Badge>
                      <Badge variant="outline" className={r.hygiene_checked ? RAG_CLASS.green : RAG_CLASS.amber}>
                        {r.hygiene_checked ? "Hygiene checked" : "Hygiene pending"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.estimated_servings ?? "—"} servings · {money(Number(r.food_cost ?? 0))} · {r.serving_time || "time TBC"} · Team: {r.kitchen_team || "—"}
                    </p>
                    {r.menu_items && <p className="mt-2 text-sm">{r.menu_items}</p>}
                    {r.dietary_options && <p className="mt-1 text-xs text-muted-foreground">Dietary: {r.dietary_options}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                    {openId === r.id ? "Close" : "Kitchen checklist"}
                  </Button>
                </div>

                {openId === r.id && (
                  <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium">Hygiene & cleaning checklist</h4>
                      <div className="mt-2 space-y-1">
                        {progress.items.map((item, i) => (
                          <label key={item.label} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={item.done} disabled={!canManage} onChange={() => toggleCheck(r, i)} />
                            <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {canManage && (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!r.hygiene_checked} onChange={(e) => patch(r, { hygiene_checked: e.target.checked })} />
                          Hygiene inspection signed off
                        </label>
                        <div>
                          <Label>Food waste note</Label>
                          <Textarea rows={2} defaultValue={r.waste_note ?? ""} onBlur={(e) => patch(r, { waste_note: e.target.value })} />
                        </div>
                        <div>
                          <Label>Actual food cost (R)</Label>
                          <Input type="number" defaultValue={r.food_cost ?? ""} onBlur={(e) => patch(r, { food_cost: Number(e.target.value) || 0 })} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No menus planned yet.</p>}
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">{titleCase("food safety")}: keep cold items below 5°C and hot items above 63°C.</p>
    </div>
  );
}
