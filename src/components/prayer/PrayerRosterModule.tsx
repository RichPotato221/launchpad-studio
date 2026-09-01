import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { BRANCHES, branchLabel, exportRows } from "@/lib/finance";
import { PRAYER_WATCHES } from "@/lib/intercession";

const sb = supabase as any;

const DAYS = [
  { n: 1, label: "Monday" },
  { n: 2, label: "Tuesday" },
  { n: 3, label: "Wednesday" },
  { n: 4, label: "Thursday" },
  { n: 5, label: "Friday" },
  { n: 6, label: "Saturday" },
  { n: 7, label: "Sunday" },
];

type Props = { canManage: boolean; currentUserId: string };

/** Weekly prayer roster — who prays, and when, from Monday to Sunday. */
export default function PrayerRosterModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showAllBranches, setShowAllBranches] = useState(false);

  const empty = {
    day_of_week: 1,
    watch: PRAYER_WATCHES[0] ?? "",
    start_time: "05:00",
    end_time: "06:00",
    member_id: "",
    full_name: "",
    branch: "etwatwa",
    focus: "",
  };
  const [form, setForm] = useState<Record<string, any>>({ ...empty });

  const load = async () => {
    const [{ data }, { data: team }, { data: people }] = await Promise.all([
      sb.from("int_prayer_roster").select("*").order("day_of_week").order("start_time"),
      sb.from("int_team_members").select("user_id, full_name, branch").order("full_name"),
      sb
        .from("profiles")
        .select("id, full_name, branch")
        .eq("approval_status", "approved")
        .order("full_name"),
    ]);
    setRows(data ?? []);

    // Intercession team first, then every other approved member of the church.
    const teamIds = new Set((team ?? []).map((t: any) => t.user_id).filter(Boolean));
    const merged = [
      ...(team ?? []).map((t: any) => ({ user_id: t.user_id, full_name: t.full_name, branch: t.branch, team: true })),
      ...(people ?? [])
        .filter((p: any) => p.full_name && !teamIds.has(p.id))
        .map((p: any) => ({ user_id: p.id, full_name: p.full_name, branch: p.branch, team: false })),
    ];
    setMembers(merged);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Select the member on duty");
    const { error } = await sb.from("int_prayer_roster").insert({
      ...form,
      day_of_week: Number(form.day_of_week),
      member_id: form.member_id || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Roster slot added");
    setForm({ ...empty, day_of_week: form.day_of_week });
    load();
  };

  const remove = async (row: any) => {
    const { error } = await sb.from("int_prayer_roster").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const byDay = useMemo(() => {
    const map = new Map<number, any[]>();
    DAYS.forEach((d) => map.set(d.n, []));
    rows.filter((r) => r.active !== false).forEach((r) => map.get(r.day_of_week)?.push(r));
    return map;
  }, [rows]);

  /** Members offered for duty — scoped to the chosen branch unless overridden. */
  const visibleMembers = useMemo(
    () => (showAllBranches ? members : members.filter((m) => !m.branch || m.branch === form.branch)),
    [members, showAllBranches, form.branch],
  );

  const timeLabel = (r: any) =>
    r.start_time ? `${String(r.start_time).slice(0, 5)}${r.end_time ? ` – ${String(r.end_time).slice(0, 5)}` : ""}` : "—";

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg">Weekly prayer roster</h3>
            <p className="text-xs text-muted-foreground">Who stands in the gap, and when — Monday through Sunday.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "prayer-roster",
                ["Day", "Watch", "From", "To", "Intercessor", "Branch", "Focus"],
                rows.map((r) => [
                  DAYS.find((d) => d.n === r.day_of_week)?.label ?? "",
                  r.watch,
                  r.start_time,
                  r.end_time,
                  r.full_name,
                  branchLabel(r.branch),
                  r.focus,
                ]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2 w-32">Day</th>
                <th>Watch</th>
                <th>Time</th>
                <th>Intercessor</th>
                <th>Branch</th>
                <th>Focus</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => {
                const slots = byDay.get(d.n) ?? [];
                if (slots.length === 0) {
                  return (
                    <tr key={d.n} className="border-t align-top">
                      <td className="py-2 font-medium">{d.label}</td>
                      <td colSpan={canManage ? 6 : 5} className="py-2 text-muted-foreground">No one rostered yet</td>
                    </tr>
                  );
                }
                return slots.map((r, i) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="py-2 font-medium">{i === 0 ? d.label : ""}</td>
                    <td className="pr-3">{r.watch ? <Badge variant="outline">{r.watch}</Badge> : "—"}</td>
                    <td className="pr-3">{timeLabel(r)}</td>
                    <td className="pr-3">{r.full_name}</td>
                    <td className="pr-3">{r.branch ? branchLabel(r.branch) : "—"}</td>
                    <td className="pr-3">{r.focus || "—"}</td>
                    {canManage && (
                      <td className="pr-1">
                        <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Add a roster slot</h3>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>Day</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}>
                {DAYS.map((d) => <option key={d.n} value={d.n}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Watch</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.watch} onChange={(e) => setForm({ ...form, watch: e.target.value })}>
                {PRAYER_WATCHES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Intercessor</Label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showAllBranches}
                    onChange={(e) => setShowAllBranches(e.target.checked)}
                  />
                  Show members from all branches
                </label>
              </div>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.member_id}
                onChange={(e) => {
                  const m = members.find((x) => x.user_id === e.target.value);
                  setForm({
                    ...form,
                    member_id: m?.user_id ?? "",
                    full_name: m?.full_name ?? "",
                    branch: m?.branch ?? form.branch,
                  });
                }}
              >
                <option value="">Select a member…</option>
                <optgroup label="Intercession team">
                  {visibleMembers.filter((m) => m.team).map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name}{m.branch ? ` — ${branchLabel(m.branch)}` : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="General members">
                  {visibleMembers.filter((m) => !m.team).map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name}{m.branch ? ` — ${branchLabel(m.branch)}` : ""}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div><Label>From</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>To</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            <div>
              <Label>Branch</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                {BRANCHES.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label>Prayer focus</Label><Input value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} /></div>
            <div className="md:col-span-3"><Button type="submit">Add to roster</Button></div>
          </form>
        </Card>
      )}
    </div>
  );
}
