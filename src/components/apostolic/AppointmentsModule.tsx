import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fmtDate } from "@/lib/finance";
import { APPOINTMENT_KINDS, labelise } from "@/lib/apostolic";
import { Section, Empty } from "./shared";

const sb = supabase as any;

export function AppointmentsModule() {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({ person_name: "", kind: "appointment", role_title: "", department_slug: "", effective_date: "", notes: "" });

  const list = useQuery({
    queryKey: ["apo-appointments"],
    queryFn: async () => {
      const { data } = await sb.from("apo_appointments").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await sb.from("apo_appointments").insert({
        ...f,
        effective_date: f.effective_date || null,
        department_slug: f.department_slug || null,
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment recorded");
      setF({ ...f, person_name: "", role_title: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["apo-appointments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await sb
        .from("apo_appointments")
        .update({ status, approved_by: userRes.user?.id ?? null, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment updated");
      qc.invalidateQueries({ queryKey: ["apo-appointments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = (list.data ?? []).filter((a: any) => a.status === "pending");
  const history = (list.data ?? []).filter((a: any) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <Section title="Record an appointment" description="Appointments, promotions, ordinations, transfers, sabbaticals, resignations, retirements and successions">
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={f.person_name} onChange={(e) => setF({ ...f, person_name: e.target.value })} placeholder="Person" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {APPOINTMENT_KINDS.map((k) => <option key={k} value={k}>{labelise(k)}</option>)}
          </select>
          <Input value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} placeholder="Role / office" />
          <Input value={f.department_slug} onChange={(e) => setF({ ...f, department_slug: e.target.value })} placeholder="Department slug" />
          <Input type="date" value={f.effective_date} onChange={(e) => setF({ ...f, effective_date: e.target.value })} />
          <Textarea className="md:col-span-3" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Notes / motivation" />
        </div>
        <Button className="mt-3" disabled={!f.person_name} onClick={() => add.mutate()}>Submit for apostolic approval</Button>
      </Section>

      <Section title="Awaiting approval" description={`${pending.length} pending`}>
        <div className="space-y-3">
          {pending.map((a: any) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3 last:border-0">
              <div>
                <p className="text-sm">{a.person_name} — {labelise(a.kind)}{a.role_title ? ` · ${a.role_title}` : ""}</p>
                <p className="text-xs text-muted-foreground">{a.department_slug ?? "Church-wide"} · effective {fmtDate(a.effective_date)}</p>
                {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decide.mutate({ id: a.id, status: "approved" })}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, status: "declined" })}>Decline</Button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <Empty>Nothing awaiting approval.</Empty>}
        </div>
      </Section>

      <Section title="Appointment history" description="Full, auditable record">
        <div className="space-y-2">
          {history.map((a: any) => (
            <div key={a.id} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/50 pb-2 text-sm last:border-0">
              <span>{a.person_name} — {labelise(a.kind)}{a.role_title ? ` · ${a.role_title}` : ""}</span>
              <span className="text-xs text-muted-foreground">{labelise(a.status)} · {fmtDate(a.approved_at ?? a.created_at)}</span>
            </div>
          ))}
          {history.length === 0 && <Empty>No appointment history yet.</Empty>}
        </div>
      </Section>
    </div>
  );
}
