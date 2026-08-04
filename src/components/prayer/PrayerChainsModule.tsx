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
import { BRANCHES, RAG_CLASS, branchLabel, exportRows, fmtDate, titleCase } from "@/lib/finance";
import { chainCoverage, ragForScore } from "@/lib/intercession";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string; team: any[] };

/** Module 4: 24/7 prayer chain builder with hourly slot rota and coverage tracking. */
export default function PrayerChainsModule({ canManage, currentUserId, team }: Props) {
  const [chains, setChains] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const nowLocal = new Date();
  const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const empty = {
    name: "",
    focus: "",
    branch: "etwatwa",
    starts_at: isoLocal(nowLocal),
    ends_at: isoLocal(new Date(nowLocal.getTime() + 24 * 3600_000)),
    slot_minutes: "60",
    notes: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("int_chains").select("*").order("starts_at", { ascending: false });
    setChains(data ?? []);
    if (!activeId && data?.[0]) setActiveId(data[0].id);
  };
  const loadSlots = async (chainId: string) => {
    const { data } = await sb.from("int_chain_slots").select("*").eq("chain_id", chainId).order("slot_start");
    setSlots(data ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (activeId) loadSlots(activeId); }, [activeId]);

  const createChain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name the prayer chain");
    const start = new Date(form.starts_at);
    const end = new Date(form.ends_at);
    if (end <= start) return toast.error("The end time must be after the start time");
    const mins = Number(form.slot_minutes) || 60;

    const { data, error } = await sb
      .from("int_chains")
      .insert({
        name: form.name,
        focus: form.focus || null,
        branch: form.branch,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        slot_minutes: mins,
        notes: form.notes || null,
        leader_id: currentUserId,
        created_by: currentUserId,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);

    const rows: any[] = [];
    for (let t = start.getTime(); t < end.getTime(); t += mins * 60_000) {
      rows.push({
        chain_id: data.id,
        slot_start: new Date(t).toISOString(),
        slot_end: new Date(Math.min(t + mins * 60_000, end.getTime())).toISOString(),
      });
    }
    if (rows.length) await sb.from("int_chain_slots").insert(rows);
    toast.success(`Prayer chain created with ${rows.length} slots`);
    setForm({ ...empty });
    setActiveId(data.id);
    load();
  };

  const claim = async (slot: any, name: string, userId: string | null) => {
    const { error } = await sb
      .from("int_chain_slots")
      .update({ intercessor_id: userId, intercessor_name: name || null, covered: !!name })
      .eq("id", slot.id);
    if (error) return toast.error(error.message);
    loadSlots(slot.chain_id);
  };

  const active = chains.find((c) => c.id === activeId) ?? null;
  const coverage = useMemo(() => chainCoverage(slots), [slots]);
  const gaps = slots.filter((s) => !s.covered);

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Create a prayer chain</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Slots are generated automatically so 24/7 or overnight watches can be covered hour by hour.
          </p>
          <form onSubmit={createChain} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Chain name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Branch</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
              >
                {BRANCHES.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
              </select>
            </div>
            <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
            <div>
              <Label>Slot length (minutes)</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.slot_minutes}
                onChange={(e) => setForm({ ...form, slot_minutes: e.target.value })}
              >
                {[30, 60, 120, 180].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <Label>Prayer focus</Label>
              <Textarea rows={2} value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} />
            </div>
            <div className="md:col-span-3"><Button type="submit">Create chain & generate slots</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Prayer chains</h3>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={activeId ?? ""}
            onChange={(e) => setActiveId(e.target.value || null)}
          >
            <option value="">Select a chain…</option>
            {chains.map((c) => <option key={c.id} value={c.id}>{c.name} — {fmtDate(c.starts_at)}</option>)}
          </select>
        </div>

        {!active ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No prayer chain selected yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Slots</p>
                <p className="font-serif text-2xl">{coverage.total}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Covered</p>
                <p className="font-serif text-2xl">{coverage.covered}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Coverage</p>
                <p className="mt-1"><Badge variant="outline" className={RAG_CLASS[ragForScore(coverage.pct, 90, 70)]}>{coverage.pct}%</Badge></p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Gaps</p>
                <p className="font-serif text-2xl">{gaps.length}</p>
              </Card>
            </div>

            {active.focus && <p className="text-sm text-muted-foreground">Focus: {active.focus}</p>}

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  exportRows(
                    `prayer-chain-${active.name}`,
                    ["Slot start", "Slot end", "Intercessor", "Covered", "Missed"],
                    slots.map((s) => [s.slot_start, s.slot_end, s.intercessor_name, s.covered ? "Yes" : "No", s.missed ? "Yes" : "No"]),
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" /> Excel (CSV)
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {slots.map((s) => (
                <div key={s.id} className={`rounded-lg border p-3 ${s.covered ? "bg-emerald-50/50" : "bg-amber-50/40"}`}>
                  <p className="text-sm font-medium">
                    {new Date(s.slot_start).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })} –{" "}
                    {new Date(s.slot_end).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={s.intercessor_name ?? ""}
                      onChange={(e) => {
                        const member = team.find((t) => t.full_name === e.target.value);
                        claim(s, e.target.value, member?.user_id ?? null);
                      }}
                    >
                      <option value="">Unassigned</option>
                      {team.map((t) => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
                    </select>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await sb.from("int_chain_slots").update({ missed: !s.missed }).eq("id", s.id);
                          loadSlots(s.chain_id);
                        }}
                      >
                        {s.missed ? "Missed" : "OK"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {slots.length === 0 && <p className="text-sm text-muted-foreground">This chain has no slots.</p>}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-serif text-lg">All chains</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Chain</th><th>Branch</th><th>Window</th><th>Slot length</th><th>Status</th></tr>
            </thead>
            <tbody>
              {chains.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2 pr-3 font-medium">{c.name}</td>
                  <td className="pr-3">{branchLabel(c.branch)}</td>
                  <td className="pr-3">{fmtDate(c.starts_at)} → {fmtDate(c.ends_at)}</td>
                  <td className="pr-3">{c.slot_minutes} min</td>
                  <td className="pr-3">{titleCase(c.status)}</td>
                </tr>
              ))}
              {chains.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No chains yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
