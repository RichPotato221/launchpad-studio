import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";
import { fetchDepartments } from "@/lib/portal";
import { useLeadershipAccess } from "@/lib/useLeadershipAccess";
import { PORTAL_IMAGES } from "@/lib/portalImages";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/governance")({
  head: () => ({ meta: [{ title: "Governance — TRoGKC Portal" }] }),
  component: GovernancePage,
});

const STAGES = [
  { key: "visitor", label: "Visitor" },
  { key: "new_convert", label: "New Convert" },
  { key: "member", label: "Member" },
  { key: "serving", label: "Serving" },
  { key: "leader", label: "Leader" },
] as const;

function GovernancePage() {
  const access = useLeadershipAccess();

  if (access.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Governance</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">Chairpersons &amp; Church Secretary</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Shared workspace for Joint Governance &amp; Department Audits (Article V of the Constitution).
      </p>

      {!access.data?.hasAccess ? (
        <Card className="mt-8 p-6 text-sm text-muted-foreground">
          This workspace is reserved for the Senior Apostle, the Chairperson, and the Church Secretary.
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <MembershipLifecycle />
            <DepartmentReportsRollup />
          </div>
          <Card className="overflow-hidden p-0 h-fit">
            <div className="flex h-96 w-full items-center justify-center bg-muted">
              <img
                src={PORTAL_IMAGES.governanceSecretary}
                alt="Church Secretary reading an official announcement"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Church Secretary</p>
              <p className="mt-1 font-serif text-lg">Official announcements &amp; records</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* -------------------- Membership Lifecycle -------------------- */
function MembershipLifecycle() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState("");
  const [stage, setStage] = useState<string>("");
  const [notes, setNotes] = useState("");

  const profiles = useQuery({
    queryKey: ["gov-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const lifecycle = useQuery({
    queryKey: ["gov-lifecycle"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_lifecycle")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const currentStage = (profileId: string) =>
    lifecycle.data?.find((l) => l.profile_id === profileId)?.stage;

  const submit = async () => {
    if (!selected || !stage) return toast.error("Choose a member and a stage.");
    const { data: userRes } = await getAuthUserResult();
    const { error } = await supabase.from("membership_lifecycle").insert({
      profile_id: selected,
      stage: stage as any,
      notes: notes.trim() || null,
      updated_by: userRes.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Lifecycle stage recorded");
    setSelected("");
    setStage("");
    setNotes("");
    qc.invalidateQueries({ queryKey: ["gov-lifecycle"] });
  };

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Membership Lifecycle</p>
      <p className="mt-1 text-xs text-muted-foreground">Record a member's current stage — visitor through leader.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
          <SelectContent>
            {profiles.data?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name ?? p.email} {currentStage(p.id) ? `(currently: ${currentStage(p.id)})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger><SelectValue placeholder="New stage" /></SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={submit}>Record</Button>
      </div>
      <Textarea
        className="mt-3"
        rows={2}
        placeholder="Optional notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="mt-5 space-y-2">
        {lifecycle.data?.slice(0, 8).map((l) => {
          const p = profiles.data?.find((pr) => pr.id === l.profile_id);
          return (
            <div key={l.id} className="flex items-center justify-between border-b border-border/60 pb-2 text-sm last:border-0">
              <span>{p?.full_name ?? p?.email ?? "Unknown"}</span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{l.stage}</span>
            </div>
          );
        })}
        {lifecycle.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      </div>
    </Card>
  );
}

/* -------------------- Department Reports Roll-up -------------------- */
function DepartmentReportsRollup() {
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const reports = useQuery({
    queryKey: ["gov-reports-rollup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
  });

  const deptName = (slug: string) => depts.data?.find((d) => d.slug === slug)?.name ?? slug;

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent Department Reports</p>
      <p className="mt-1 text-xs text-muted-foreground">Latest activity reports submitted, across every department.</p>
      <div className="mt-4 space-y-3">
        {reports.data?.map((r) => (
          <div key={r.id} className="border-b border-border/60 pb-3 last:border-0">
            <p className="text-sm font-medium">{r.title}</p>
            <p className="text-xs text-muted-foreground">{deptName(r.department_slug)} · {new Date(r.created_at).toLocaleDateString()}</p>
          </div>
        ))}
        {reports.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!reports.isLoading && (reports.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No reports submitted yet.</p>
        )}
      </div>
    </Card>
  );
}


