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
import { pct, ragForScore } from "@/lib/hospitality";

const sb = supabase as any;

const FOLLOW_UP = ["new", "contacted", "visited_again", "joined", "no_response", "closed"];

type Props = { canManage: boolean; currentUserId: string };

/** Guest care: first-timer register, follow-up pipeline, VIP handling and satisfaction. */
export default function GuestCareModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");

  const empty = {
    full_name: "",
    family_name: "",
    phone: "",
    email: "",
    branch: "etwatwa",
    first_visit_date: new Date().toISOString().slice(0, 10),
    invited_by: "",
    interests: "",
    special_needs: "",
    dietary_requirements: "",
    vip: false,
    notes: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("hos_guests").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Guest name is required");
    const { error } = await sb.from("hos_guests").insert({ ...form, visits: 1, created_by: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Guest welcomed and added to the care register");
    setForm({ ...empty });
    load();
  };

  const patch = async (row: any, values: Record<string, any>) => {
    const { error } = await sb.from("hos_guests").update(values).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (stage !== "all" && (r.follow_up_status ?? "new") !== stage) return false;
      if (!term) return true;
      return [r.full_name, r.phone, r.email, r.invited_by, r.interests].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(term));
    });
  }, [rows, q, stage]);

  const joined = rows.filter((r) => r.follow_up_status === "joined").length;
  const conversion = pct(joined, rows.length || 1);
  const satisfaction = (() => {
    const scored = rows.filter((r) => r.satisfaction_score);
    if (!scored.length) return 0;
    return Math.round((scored.reduce((s, r) => s + r.satisfaction_score, 0) / scored.length) * 20);
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Guests registered</p><p className="font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Awaiting follow-up</p><p className="font-serif text-2xl">{rows.filter((r) => ["new", "contacted"].includes(r.follow_up_status ?? "new")).length}</p></Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Joined the church</p>
          <p className="mt-1"><Badge variant="outline" className={RAG_CLASS[ragForScore(conversion, 40, 20)]}>{joined} ({conversion}%)</Badge></p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Guest satisfaction</p>
          <p className="mt-1"><Badge variant="outline" className={RAG_CLASS[ragForScore(satisfaction)]}>{satisfaction}%</Badge></p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-serif text-lg">Welcome a guest</h3>
        <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-3">
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Family name / household</Label><Input value={form.family_name} onChange={(e) => setForm({ ...form, family_name: e.target.value })} /></div>
          <div>
            <Label>Branch</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
              {BRANCHES.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
            </select>
          </div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>First visit</Label><Input type="date" value={form.first_visit_date} onChange={(e) => setForm({ ...form, first_visit_date: e.target.value })} /></div>
          <div><Label>Invited by</Label><Input value={form.invited_by} onChange={(e) => setForm({ ...form, invited_by: e.target.value })} /></div>
          <div><Label>Dietary requirements</Label><Input value={form.dietary_requirements} onChange={(e) => setForm({ ...form, dietary_requirements: e.target.value })} /></div>
          <div><Label>Special needs / accessibility</Label><Input value={form.special_needs} onChange={(e) => setForm({ ...form, special_needs: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Interests</Label><Textarea rows={2} value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} /></div>
          <div className="md:col-span-1"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex items-center gap-2 md:col-span-3">
            <input id="vip" type="checkbox" checked={form.vip} onChange={(e) => setForm({ ...form, vip: e.target.checked })} />
            <Label htmlFor="vip">VIP / special guest (protocol applies)</Label>
          </div>
          <div className="md:col-span-3"><Button type="submit">Add guest</Button></div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Guest care register</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 w-52" placeholder="Search guests…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="all">All stages</option>
              {FOLLOW_UP.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportRows(
                  "hospitality-guests",
                  ["Name", "Branch", "First visit", "Phone", "Email", "Invited by", "Visits", "Stage", "Satisfaction", "VIP"],
                  filtered.map((r) => [r.full_name, branchLabel(r.branch), r.first_visit_date, r.phone, r.email, r.invited_by, r.visits, r.follow_up_status, r.satisfaction_score, r.vip ? "Yes" : "No"]),
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
              <tr><th className="py-2">Guest</th><th>First visit</th><th>Contact</th><th>Visits</th><th>Follow-up</th><th>Satisfaction</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.full_name}</p>
                      {r.vip && <Badge variant="outline">VIP</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {branchLabel(r.branch)}{r.invited_by ? ` · invited by ${r.invited_by}` : ""}
                      {r.dietary_requirements ? ` · dietary: ${r.dietary_requirements}` : ""}
                    </p>
                  </td>
                  <td className="pr-3">{fmtDate(r.first_visit_date)}</td>
                  <td className="pr-3">
                    <p>{r.phone ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.email ?? ""}</p>
                  </td>
                  <td className="pr-3 w-24">
                    {canManage ? (
                      <Input type="number" className="h-9" defaultValue={r.visits ?? 1} onBlur={(e) => patch(r, { visits: Number(e.target.value) || 1 })} />
                    ) : (r.visits ?? 1)}
                  </td>
                  <td className="pr-3">
                    {canManage ? (
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={r.follow_up_status ?? "new"}
                        onChange={(e) => patch(r, { follow_up_status: e.target.value, follow_up_owner_id: currentUserId })}
                      >
                        {FOLLOW_UP.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                      </select>
                    ) : titleCase(r.follow_up_status ?? "new")}
                  </td>
                  <td className="pr-3 w-28">
                    {canManage ? (
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={r.satisfaction_score ?? ""}
                        onChange={(e) => patch(r, { satisfaction_score: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    ) : (r.satisfaction_score ?? "—")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No guests match this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
