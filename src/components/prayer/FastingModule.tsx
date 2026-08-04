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
import { exportRows, fmtDate, titleCase } from "@/lib/finance";
import { FAST_TYPES, labelFor, today } from "@/lib/intercession";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string; currentUserName: string };

/** Module 7: fasting programmes with participant register, daily scriptures and reflections. */
export default function FastingModule({ canManage, currentUserId, currentUserName }: Props) {
  const [fasts, setFasts] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const empty = {
    name: "",
    fast_type: "corporate",
    purpose: "",
    start_date: today(),
    end_date: today(),
    daily_scriptures: "",
    prayer_points: "",
  };
  const [form, setForm] = useState({ ...empty });
  const [joinForm, setJoinForm] = useState({ spiritual_goal: "" });

  const load = async () => {
    const { data } = await sb.from("int_fasts").select("*").order("start_date", { ascending: false });
    setFasts(data ?? []);
    if (!activeId && data?.[0]) setActiveId(data[0].id);
  };
  const loadParticipants = async (fastId: string) => {
    const { data } = await sb.from("int_fast_participants").select("*").eq("fast_id", fastId).order("participant_name");
    setParticipants(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (activeId) loadParticipants(activeId); }, [activeId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name the fast");
    const { error } = await sb.from("int_fasts").insert({ ...form, created_by: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Fasting programme created");
    setForm({ ...empty });
    load();
  };

  const join = async () => {
    if (!activeId) return;
    const { error } = await sb.from("int_fast_participants").insert({
      fast_id: activeId,
      user_id: currentUserId,
      participant_name: currentUserName,
      spiritual_goal: joinForm.spiritual_goal || null,
      days_completed: 0,
    });
    if (error) return toast.error(error.message);
    toast.success("You have joined this fast");
    setJoinForm({ spiritual_goal: "" });
    loadParticipants(activeId);
  };

  const active = fasts.find((f) => f.id === activeId) ?? null;
  const totalDays = useMemo(() => {
    if (!active) return 0;
    const d = (new Date(active.end_date).getTime() - new Date(active.start_date).getTime()) / 86_400_000;
    return Math.max(1, Math.round(d) + 1);
  }, [active]);
  const alreadyJoined = participants.some((p) => p.user_id === currentUserId);

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Create a fasting programme</h3>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.fast_type} onChange={(e) => setForm({ ...form, fast_type: e.target.value })}>
                {FAST_TYPES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </div>
            <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div className="md:col-span-1"><Label>Purpose</Label><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Daily scriptures</Label><Textarea rows={2} value={form.daily_scriptures} onChange={(e) => setForm({ ...form, daily_scriptures: e.target.value })} /></div>
            <div className="md:col-span-1"><Label>Prayer points</Label><Textarea rows={2} value={form.prayer_points} onChange={(e) => setForm({ ...form, prayer_points: e.target.value })} /></div>
            <div className="md:col-span-3"><Button type="submit">Create fast</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Fasting programmes</h3>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={activeId ?? ""} onChange={(e) => setActiveId(e.target.value || null)}>
            <option value="">Select…</option>
            {fasts.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {!active ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No fast selected.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{labelFor(FAST_TYPES, active.fast_type)}</Badge>
              <Badge variant="outline">{totalDays} days</Badge>
              <Badge variant="outline">{participants.length} participants</Badge>
              <span className="text-xs text-muted-foreground">{fmtDate(active.start_date)} → {fmtDate(active.end_date)}</span>
            </div>
            {active.purpose && <p className="text-sm">Purpose: {active.purpose}</p>}
            {active.daily_scriptures && <p className="text-sm text-muted-foreground">Daily scriptures: {active.daily_scriptures}</p>}
            {active.prayer_points && <p className="text-sm text-muted-foreground">Prayer points: {active.prayer_points}</p>}

            {!alreadyJoined && (
              <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label>Your spiritual goal for this fast</Label>
                  <Input value={joinForm.spiritual_goal} onChange={(e) => setJoinForm({ spiritual_goal: e.target.value })} />
                </div>
                <div className="flex items-end"><Button onClick={join}>Join this fast</Button></div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  exportRows(
                    `fast-${active.name}`,
                    ["Participant", "Days completed", "Goal", "Reflections"],
                    participants.map((p) => [p.participant_name, p.days_completed, p.spiritual_goal, p.reflections]),
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" /> Excel (CSV)
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr><th className="py-2">Participant</th><th>Days completed</th><th>Goal</th><th>Reflections</th></tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.id} className="border-t align-top">
                      <td className="py-2 pr-3 font-medium">{p.participant_name}</td>
                      <td className="pr-3 w-40">
                        {p.user_id === currentUserId || canManage ? (
                          <Input
                            type="number"
                            className="h-9"
                            defaultValue={p.days_completed ?? 0}
                            onBlur={async (e) => {
                              await sb.from("int_fast_participants").update({ days_completed: Number(e.target.value) || 0 }).eq("id", p.id);
                              loadParticipants(active.id);
                            }}
                          />
                        ) : (
                          `${p.days_completed ?? 0} / ${totalDays}`
                        )}
                      </td>
                      <td className="pr-3">{p.spiritual_goal ?? "—"}</td>
                      <td className="pr-3">
                        {p.user_id === currentUserId ? (
                          <Textarea
                            rows={2}
                            defaultValue={p.reflections ?? ""}
                            onBlur={async (e) => {
                              await sb.from("int_fast_participants").update({ reflections: e.target.value }).eq("id", p.id);
                              loadParticipants(active.id);
                            }}
                          />
                        ) : (
                          <span className="text-muted-foreground">{p.reflections ? "Recorded" : "—"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {participants.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No participants yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-serif text-lg">All fasts</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Fast</th><th>Type</th><th>Window</th><th>Status</th></tr>
            </thead>
            <tbody>
              {fasts.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="py-2 pr-3 font-medium">{f.name}</td>
                  <td className="pr-3">{labelFor(FAST_TYPES, f.fast_type)}</td>
                  <td className="pr-3">{fmtDate(f.start_date)} → {fmtDate(f.end_date)}</td>
                  <td className="pr-3">{titleCase(f.status)}</td>
                </tr>
              ))}
              {fasts.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No fasting programmes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
