import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { BRANCHES, RAG_CLASS, branchLabel, exportRows, fmtDate } from "@/lib/finance";
import { INTERCESSOR_ROLES, PRAYER_WATCHES, labelFor, ragForScore } from "@/lib/intercession";

const sb = supabase as any;

type Props = { canManage: boolean; onChanged?: () => void };

/** Module 9: intercessor team register, watches, gifts, safeguarding and attendance. */
export default function IntercessorTeamModule({ canManage, onChanged }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const empty = {
    user_id: "",
    full_name: "",
    role: "intercessor",
    branch: "etwatwa",
    phone: "",
    email: "",
    availability: "",
    prayer_watch: PRAYER_WATCHES[0],
    spiritual_gifts: "",
    skills: "",
    years_serving: "",
    training_status: "in_progress",
    safeguarding_cleared: false,
    emergency_contact: "",
  };
  const [form, setForm] = useState<Record<string, any>>({ ...empty });

  const load = async () => {
    const [{ data }, { data: p }] = await Promise.all([
      sb.from("int_team_members").select("*").order("full_name"),
      sb.from("profiles").select("id, full_name, email, branch").order("full_name"),
    ]);
    setRows(data ?? []);
    setProfiles(p ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Select or type the intercessor's name");
    const { error } = await sb.from("int_team_members").insert({
      ...form,
      user_id: form.user_id || null,
      years_serving: form.years_serving ? Number(form.years_serving) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Intercessor added to the team register");
    setForm({ ...empty });
    load();
    onChanged?.();
  };

  const patch = async (row: any, values: Record<string, any>) => {
    const { error } = await sb.from("int_team_members").update(values).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
    onChanged?.();
  };

  const active = rows.filter((r) => r.active !== false);
  const cleared = active.filter((r) => r.safeguarding_cleared).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Intercessors</p><p className="font-serif text-2xl">{active.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Safeguarding cleared</p><p className="font-serif text-2xl">{cleared}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Leaders</p><p className="font-serif text-2xl">{active.filter((r) => ["leader", "assistant_leader", "coordinator"].includes(r.role)).length}</p></Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Average attendance</p>
          <p className="mt-1">
            <Badge variant="outline" className={RAG_CLASS[ragForScore(active.length ? Math.round(active.reduce((s, r) => s + (r.attendance_pct ?? 0), 0) / active.length) : 0)]}>
              {active.length ? Math.round(active.reduce((s, r) => s + (r.attendance_pct ?? 0), 0) / active.length) : 0}%
            </Badge>
          </p>
        </Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Add an intercessor</h3>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>Portal member</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.user_id}
                onChange={(e) => {
                  const p = profiles.find((x) => x.id === e.target.value);
                  setForm({
                    ...form,
                    user_id: e.target.value,
                    full_name: p?.full_name ?? form.full_name,
                    email: p?.email ?? form.email,
                    branch: p?.branch ?? form.branch,
                  });
                }}
              >
                <option value="">Not linked</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {INTERCESSOR_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Branch</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                {BRANCHES.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
              </select>
            </div>
            <div>
              <Label>Prayer watch</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.prayer_watch} onChange={(e) => setForm({ ...form, prayer_watch: e.target.value })}>
                {PRAYER_WATCHES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Years serving</Label><Input type="number" value={form.years_serving} onChange={(e) => setForm({ ...form, years_serving: e.target.value })} /></div>
            <div><Label>Availability</Label><Input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Spiritual gifts</Label><Textarea rows={2} value={form.spiritual_gifts} onChange={(e) => setForm({ ...form, spiritual_gifts: e.target.value })} /></div>
            <div><Label>Emergency contact</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></div>
            <div className="flex items-center gap-2 md:col-span-3">
              <input id="safeguarding" type="checkbox" checked={form.safeguarding_cleared} onChange={(e) => setForm({ ...form, safeguarding_cleared: e.target.checked })} />
              <Label htmlFor="safeguarding">Safeguarding / confidentiality agreement signed</Label>
            </div>
            <div className="md:col-span-3"><Button type="submit">Add intercessor</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Intercessor register</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "intercessor-register",
                ["Name", "Role", "Branch", "Watch", "Phone", "Email", "Gifts", "Attendance %", "Safeguarding", "Active"],
                rows.map((r) => [r.full_name, r.role, branchLabel(r.branch), r.prayer_watch, r.phone, r.email, r.spiritual_gifts, r.attendance_pct, r.safeguarding_cleared ? "Yes" : "No", r.active === false ? "No" : "Yes"]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Name</th><th>Role</th><th>Branch</th><th>Watch</th><th>Attendance</th><th>Safeguarding</th><th>Joined</th>{canManage && <th />}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.email ?? r.phone ?? "—"}</p>
                  </td>
                  <td className="pr-3">{labelFor(INTERCESSOR_ROLES, r.role)}</td>
                  <td className="pr-3">{branchLabel(r.branch)}</td>
                  <td className="pr-3">{r.prayer_watch ?? "—"}</td>
                  <td className="pr-3 w-28">
                    {canManage ? (
                      <Input type="number" className="h-9" defaultValue={r.attendance_pct ?? 0} onBlur={(e) => patch(r, { attendance_pct: Number(e.target.value) || 0 })} />
                    ) : (
                      `${r.attendance_pct ?? 0}%`
                    )}
                  </td>
                  <td className="pr-3">
                    <Badge variant="outline" className={r.safeguarding_cleared ? RAG_CLASS.green : RAG_CLASS.red}>
                      {r.safeguarding_cleared ? "Cleared" : "Outstanding"}
                    </Badge>
                  </td>
                  <td className="pr-3">{fmtDate(r.created_at)}</td>
                  {canManage && (
                    <td className="pr-1">
                      <Button size="sm" variant="outline" onClick={() => patch(r, { active: r.active === false })}>
                        {r.active === false ? "Reactivate" : "Deactivate"}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No intercessors registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
