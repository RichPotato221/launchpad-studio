import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fmtDate } from "@/lib/finance";
import { FIVEFOLD_OFFICES, SUCCESSION_READINESS, labelise } from "@/lib/apostolic";
import { Section, BarRow, Empty } from "./shared";

const sb = supabase as any;

export function FivefoldModule() {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({
    full_name: "",
    office: "pastor",
    calling: "",
    appointment_date: "",
    ordination_history: "",
    spiritual_gifts: "",
    mentor_name: "",
    ministry_assignments: "",
    teaching_schedule: "",
    development_plan: "",
    performance_pct: 0,
    succession_readiness: "developing",
  });

  const list = useQuery({
    queryKey: ["apo-fivefold"],
    queryFn: async () => {
      const { data } = await sb.from("apo_fivefold").select("*").order("office");
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from("apo_fivefold").insert({
        ...f,
        appointment_date: f.appointment_date || null,
        performance_pct: Number(f.performance_pct) || 0,
        spiritual_gifts: f.spiritual_gifts ? String(f.spiritual_gifts).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fivefold profile added");
      setF({ ...f, full_name: "", calling: "", ordination_history: "", spiritual_gifts: "", ministry_assignments: "", teaching_schedule: "", development_plan: "", performance_pct: 0 });
      qc.invalidateQueries({ queryKey: ["apo-fivefold"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("apo_fivefold").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apo-fivefold"] }),
  });

  return (
    <div className="space-y-6">
      <Section title="Add a fivefold ministry profile" description="Calling, ordination, gifts, assignments and development">
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="Full name" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.office} onChange={(e) => setF({ ...f, office: e.target.value })}>
            {FIVEFOLD_OFFICES.map((o) => <option key={o} value={o}>{labelise(o)}</option>)}
          </select>
          <Input type="date" value={f.appointment_date} onChange={(e) => setF({ ...f, appointment_date: e.target.value })} />
          <Input value={f.calling} onChange={(e) => setF({ ...f, calling: e.target.value })} placeholder="Calling" />
          <Input value={f.spiritual_gifts} onChange={(e) => setF({ ...f, spiritual_gifts: e.target.value })} placeholder="Spiritual gifts (comma separated)" />
          <Input value={f.mentor_name} onChange={(e) => setF({ ...f, mentor_name: e.target.value })} placeholder="Mentor" />
          <Input value={f.ministry_assignments} onChange={(e) => setF({ ...f, ministry_assignments: e.target.value })} placeholder="Ministry assignments" />
          <Input value={f.teaching_schedule} onChange={(e) => setF({ ...f, teaching_schedule: e.target.value })} placeholder="Teaching schedule" />
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={100} value={f.performance_pct} onChange={(e) => setF({ ...f, performance_pct: e.target.value })} placeholder="Performance %" />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.succession_readiness} onChange={(e) => setF({ ...f, succession_readiness: e.target.value })}>
              {SUCCESSION_READINESS.map((s) => <option key={s} value={s}>{labelise(s)}</option>)}
            </select>
          </div>
          <Textarea className="md:col-span-2" rows={2} value={f.ordination_history} onChange={(e) => setF({ ...f, ordination_history: e.target.value })} placeholder="Ordination history" />
          <Textarea rows={2} value={f.development_plan} onChange={(e) => setF({ ...f, development_plan: e.target.value })} placeholder="Leadership development plan" />
        </div>
        <Button className="mt-3" disabled={!f.full_name || add.isPending} onClick={() => add.mutate()}>Add profile</Button>
      </Section>

      {FIVEFOLD_OFFICES.map((office) => {
        const rows = (list.data ?? []).filter((r: any) => r.office === office);
        if (rows.length === 0) return null;
        return (
          <Section key={office} title={`${labelise(office)}s`} description={`${rows.length} on the register`}>
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((r: any) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.calling || labelise(r.office)} · appointed {fmtDate(r.appointment_date)}
                      </p>
                    </div>
                    <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(r.id)}>Remove</button>
                  </div>
                  {r.spiritual_gifts?.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Gifts: {r.spiritual_gifts.join(", ")}</p>}
                  {r.mentor_name && <p className="text-xs text-muted-foreground">Mentor: {r.mentor_name}</p>}
                  {r.ministry_assignments && <p className="text-xs text-muted-foreground">Assignments: {r.ministry_assignments}</p>}
                  {r.teaching_schedule && <p className="text-xs text-muted-foreground">Teaching: {r.teaching_schedule}</p>}
                  {r.ordination_history && <p className="mt-1 text-xs text-muted-foreground">Ordination: {r.ordination_history}</p>}
                  {r.development_plan && <p className="mt-1 text-xs text-muted-foreground">Development: {r.development_plan}</p>}
                  <div className="mt-3">
                    <BarRow label="Performance" value={Number(r.performance_pct)} max={100} hint={`${r.performance_pct}%`} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Succession readiness: {labelise(r.succession_readiness)}</p>
                </Card>
              ))}
            </div>
          </Section>
        );
      })}
      {(list.data?.length ?? 0) === 0 && (
        <Card className="p-6"><Empty>No fivefold ministers registered yet.</Empty></Card>
      )}
    </div>
  );
}
