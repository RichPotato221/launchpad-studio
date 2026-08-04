import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { money, fmtDate } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";
import { ragForRisk } from "@/lib/governance";
import {
  APPROVAL_CATEGORIES,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  EXEC_RISK_CATEGORIES,
  COMMUNICATION_KINDS,
  COMMUNICATION_CHANNELS,
  labelise,
} from "@/lib/apostolic";
import { Section, BarRow, Empty, Stat } from "./shared";
import { exportToCsv } from "@/lib/exportCsv";

const sb = supabase as any;

/* ---------------- Decision centre (strategic approvals + digital signature) ---------------- */
export function DecisionCentre() {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({ category: APPROVAL_CATEGORIES[0], title: "", summary: "", amount: "" });
  const [sig, setSig] = useState<Record<string, string>>({});

  const list = useQuery({
    queryKey: ["apo-approvals"],
    queryFn: async () => {
      const { data } = await sb.from("apo_approvals").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await sb.from("apo_approvals").insert({
        category: f.category,
        title: f.title,
        summary: f.summary || null,
        amount: f.amount ? Number(f.amount) : null,
        requested_by: userRes.user?.id ?? null,
        reference: `APO-${Date.now().toString().slice(-6)}`,
        audit: [{ at: new Date().toISOString(), action: "submitted", by: userRes.user?.id ?? null }],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setF({ ...f, title: "", summary: "", amount: "" });
      toast.success("Submitted to the Senior Apostle");
      qc.invalidateQueries({ queryKey: ["apo-approvals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async ({ row, status }: { row: any; status: string }) => {
      const signature = sig[row.id]?.trim();
      if (status === "approved" && !signature) throw new Error("Type your name to sign this approval.");
      const { data: userRes } = await supabase.auth.getUser();
      const audit = [
        ...(row.audit ?? []),
        { at: new Date().toISOString(), action: status, by: userRes.user?.id ?? null, signature: signature ?? null },
      ];
      const { error } = await sb
        .from("apo_approvals")
        .update({
          status,
          decided_at: new Date().toISOString(),
          decided_by: userRes.user?.id ?? null,
          signature_name: signature ?? null,
          audit,
        })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision recorded with digital signature");
      qc.invalidateQueries({ queryKey: ["apo-approvals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = (list.data ?? []).filter((a: any) => a.status === "pending");
  const decided = (list.data ?? []).filter((a: any) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <Section title="Submit a strategic decision" description="Projects, budgets, capital purchases, policies, branches, launches and partnerships">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {APPROVAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" />
          <Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="Amount (if applicable)" />
          <Textarea className="md:col-span-3" rows={2} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="Motivation / supporting summary" />
        </div>
        <Button className="mt-3" disabled={!f.title} onClick={() => add.mutate()}>Submit for apostolic approval</Button>
      </Section>

      <Section title="Awaiting apostolic sign-off" description={`${pending.length} pending`}>
        <div className="space-y-4">
          {pending.map((a: any) => (
            <div key={a.id} className="border-b border-border/50 pb-4 last:border-0">
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">
                {a.reference} · {a.category}{a.amount ? ` · ${money(a.amount)}` : ""} · raised {fmtDate(a.created_at)}
              </p>
              {a.summary && <p className="mt-1 text-sm">{a.summary}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  className="max-w-xs"
                  value={sig[a.id] ?? ""}
                  onChange={(e) => setSig({ ...sig, [a.id]: e.target.value })}
                  placeholder="Type your full name to sign"
                />
                <Button size="sm" onClick={() => decide.mutate({ row: a, status: "approved" })}>Approve & sign</Button>
                <Button size="sm" variant="outline" onClick={() => decide.mutate({ row: a, status: "declined" })}>Decline</Button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <Empty>No decisions awaiting sign-off.</Empty>}
        </div>
      </Section>

      <Section title="Approval history & audit trail">
        <div className="space-y-3">
          {decided.map((a: any) => (
            <div key={a.id} className="border-b border-border/50 pb-3 text-sm last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>{a.title}</span>
                <span className="text-xs text-muted-foreground">
                  {labelise(a.status)} {a.signature_name ? `by ${a.signature_name}` : ""} · {fmtDate(a.decided_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {(a.audit ?? []).map((e: any) => `${labelise(e.action)} @ ${new Date(e.at).toLocaleString()}`).join(" → ")}
              </p>
            </div>
          ))}
          {decided.length === 0 && <Empty>No decisions recorded yet.</Empty>}
        </div>
      </Section>
    </div>
  );
}

/* ---------------- Church development projects ---------------- */
export function ProjectsModule() {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({ name: "", category: "building", budget: "", spent: "", start_date: "", target_date: "", contractor: "", owner_name: "", milestones: "", risks: "", status: "planning", progress_pct: 0 });

  const list = useQuery({
    queryKey: ["apo-projects"],
    queryFn: async () => {
      const { data } = await sb.from("apo_projects").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await sb.from("apo_projects").insert({
        ...f,
        budget: Number(f.budget) || 0,
        spent: Number(f.spent) || 0,
        progress_pct: Number(f.progress_pct) || 0,
        start_date: f.start_date || null,
        target_date: f.target_date || null,
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project added");
      setF({ ...f, name: "", budget: "", spent: "", contractor: "", milestones: "", risks: "" });
      qc.invalidateQueries({ queryKey: ["apo-projects"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = list.data ?? [];
  const totalBudget = rows.reduce((s: number, r: any) => s + Number(r.budget ?? 0), 0);
  const totalSpent = rows.reduce((s: number, r: any) => s + Number(r.spent ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Projects" value={rows.length} />
        <Stat label="Total budget" value={money(totalBudget)} />
        <Stat label="Spent to date" value={money(totalSpent)} />
      </div>

      <Section title="Register a development project" description="Buildings, land, infrastructure, sound, interiors, outreach, School of Ministry and missions">
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Project name" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {PROJECT_CATEGORIES.map((c) => <option key={c} value={c}>{labelise(c)}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            {PROJECT_STATUSES.map((c) => <option key={c} value={c}>{labelise(c)}</option>)}
          </select>
          <Input type="number" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} placeholder="Budget" />
          <Input type="number" value={f.spent} onChange={(e) => setF({ ...f, spent: e.target.value })} placeholder="Spent" />
          <Input type="number" value={f.progress_pct} onChange={(e) => setF({ ...f, progress_pct: e.target.value })} placeholder="Progress %" />
          <Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
          <Input type="date" value={f.target_date} onChange={(e) => setF({ ...f, target_date: e.target.value })} />
          <Input value={f.contractor} onChange={(e) => setF({ ...f, contractor: e.target.value })} placeholder="Contractor" />
          <Input value={f.owner_name} onChange={(e) => setF({ ...f, owner_name: e.target.value })} placeholder="Responsible leader" />
          <Textarea rows={2} value={f.milestones} onChange={(e) => setF({ ...f, milestones: e.target.value })} placeholder="Milestones" />
          <Textarea rows={2} value={f.risks} onChange={(e) => setF({ ...f, risks: e.target.value })} placeholder="Risks" />
        </div>
        <Button className="mt-3" disabled={!f.name} onClick={() => add.mutate()}>Add project</Button>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((p: any) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{labelise(p.category)} · {labelise(p.status)}</p>
              </div>
              <span className="text-xs text-muted-foreground">{fmtDate(p.start_date)} → {fmtDate(p.target_date)}</span>
            </div>
            <div className="mt-3"><BarRow label="Completion" value={Number(p.progress_pct)} max={100} hint={`${p.progress_pct}%`} /></div>
            <p className="mt-2 text-xs text-muted-foreground">
              Budget {money(p.budget)} · spent {money(p.spent)}{p.contractor ? ` · ${p.contractor}` : ""}{p.owner_name ? ` · ${p.owner_name}` : ""}
            </p>
            {p.milestones && <p className="mt-1 text-xs text-muted-foreground">Milestones: {p.milestones}</p>}
            {p.risks && <p className="text-xs text-muted-foreground">Risks: {p.risks}</p>}
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-6"><Empty>No development projects registered.</Empty></Card>}
      </div>
    </div>
  );
}

/* ---------------- Executive risk register ---------------- */
export function ExecutiveRiskModule() {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({ category: EXEC_RISK_CATEGORIES[0], description: "", likelihood: 3, impact: 3, mitigation: "", owner_name: "", review_date: "", evidence: "" });

  const list = useQuery({
    queryKey: ["apo-risks"],
    queryFn: async () => {
      const { data } = await sb.from("apo_risks").select("*").order("rating", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await sb.from("apo_risks").insert({
        ...f,
        likelihood: Number(f.likelihood),
        impact: Number(f.impact),
        review_date: f.review_date || null,
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Risk registered");
      setF({ ...f, description: "", mitigation: "", evidence: "" });
      qc.invalidateQueries({ queryKey: ["apo-risks"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = (list.data ?? []).filter((r: any) => r.status !== "closed");

  return (
    <div className="space-y-6">
      <Section title="Register an executive risk">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {EXEC_RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input type="number" min={1} max={5} value={f.likelihood} onChange={(e) => setF({ ...f, likelihood: e.target.value })} placeholder="Likelihood 1-5" />
          <Input type="number" min={1} max={5} value={f.impact} onChange={(e) => setF({ ...f, impact: e.target.value })} placeholder="Impact 1-5" />
          <Input value={f.owner_name} onChange={(e) => setF({ ...f, owner_name: e.target.value })} placeholder="Responsible owner" />
          <Input type="date" value={f.review_date} onChange={(e) => setF({ ...f, review_date: e.target.value })} />
          <Input value={f.evidence} onChange={(e) => setF({ ...f, evidence: e.target.value })} placeholder="Supporting evidence" />
          <Textarea className="md:col-span-2" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Risk description" />
          <Textarea rows={2} value={f.mitigation} onChange={(e) => setF({ ...f, mitigation: e.target.value })} placeholder="Mitigation plan" />
        </div>
        <Button className="mt-3" disabled={!f.description} onClick={() => add.mutate()}>Add risk</Button>
      </Section>

      <Section title="Executive heat map" description="Likelihood (rows) × impact (columns)">
        <div className="grid grid-cols-6 gap-1 text-[0.65rem]">
          <div />
          {[1, 2, 3, 4, 5].map((i) => <div key={`h${i}`} className="text-center text-muted-foreground">I{i}</div>)}
          {[5, 4, 3, 2, 1].map((l) => (
            <div key={`r${l}`} className="contents">
              <div className="text-muted-foreground">L{l}</div>
              {[1, 2, 3, 4, 5].map((i) => {
                const count = rows.filter((r: any) => Number(r.likelihood) === l && Number(r.impact) === i).length;
                return (
                  <div key={`${l}-${i}`} className={`flex h-9 items-center justify-center rounded text-white ${RAG_DOT[ragForRisk(l * i)]} ${count ? "opacity-100" : "opacity-20"}`}>
                    {count || ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {rows.map((r: any) => (
            <div key={r.id} className="border-b border-border/50 pb-2 text-sm last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>{r.description}</span>
                <span className="text-xs text-muted-foreground">{r.category} · rating {r.rating} · {labelise(r.status)}</span>
              </div>
              {r.mitigation && <p className="text-xs text-muted-foreground">Mitigation: {r.mitigation} {r.owner_name ? `· ${r.owner_name}` : ""} {r.review_date ? `· review ${fmtDate(r.review_date)}` : ""}</p>}
            </div>
          ))}
          {rows.length === 0 && <Empty>No executive risks on the register.</Empty>}
        </div>
      </Section>
    </div>
  );
}

/* ---------------- Communication hub ---------------- */
export function CommunicationsModule() {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({ kind: "circular", subject: "", body: "", audience: "all", channels: ["in_app"] });

  const list = useQuery({
    queryKey: ["apo-comms"],
    queryFn: async () => {
      const { data } = await sb.from("apo_communications").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async (status: string) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await sb.from("apo_communications").insert({
        kind: f.kind,
        subject: f.subject,
        body: f.body,
        audience: f.audience,
        channels: f.channels,
        status,
        sent_at: status === "sent" ? new Date().toISOString() : null,
        created_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Communication saved");
      setF({ ...f, subject: "", body: "" });
      qc.invalidateQueries({ queryKey: ["apo-comms"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = (c: string) =>
    setF({ ...f, channels: f.channels.includes(c) ? f.channels.filter((x: string) => x !== c) : [...f.channels, c] });

  return (
    <div className="space-y-6">
      <Section title="Executive communication" description="Circulars, vision letters, prayer alerts, directives and emergency notices">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {COMMUNICATION_KINDS.map((k) => <option key={k} value={k}>{labelise(k)}</option>)}
          </select>
          <Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Subject" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
            <option value="all">All members</option>
            <option value="leadership">Leadership</option>
            <option value="departments">Department heads</option>
            <option value="branches">Branch leaders</option>
          </select>
          <Textarea className="md:col-span-3" rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Message" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {COMMUNICATION_CHANNELS.map((c) => (
            <label key={c} className="flex items-center gap-1">
              <input type="checkbox" checked={f.channels.includes(c)} onChange={() => toggle(c)} /> {labelise(c)}
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button disabled={!f.subject || !f.body} onClick={() => send.mutate("sent")}>Send</Button>
          <Button variant="outline" disabled={!f.subject} onClick={() => send.mutate("draft")}>Save draft</Button>
        </div>
      </Section>

      <Section title="Sent & drafted communications">
        <div className="space-y-3">
          {(list.data ?? []).map((c: any) => (
            <div key={c.id} className="border-b border-border/50 pb-3 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{c.subject}</p>
                <span className="text-xs text-muted-foreground">
                  {labelise(c.kind)} · {labelise(c.status)} · {c.channels?.map(labelise).join(", ")} · {fmtDate(c.sent_at ?? c.created_at)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
            </div>
          ))}
          {(list.data?.length ?? 0) === 0 && <Empty>No communications yet.</Empty>}
        </div>
      </Section>
    </div>
  );
}

/* ---------------- Executive reporting ---------------- */
export function ExecutiveReports() {
  const { data } = useQuery({
    queryKey: ["apo-reports"],
    queryFn: async () => {
      const [oversight, finance, risks, approvals, projects, objectives] = await Promise.all([
        sb.rpc("get_department_oversight"),
        sb.rpc("get_finance_summary", { _months: 12 }),
        sb.from("apo_risks").select("*").neq("status", "closed"),
        sb.from("apo_approvals").select("*"),
        sb.from("apo_projects").select("*"),
        sb.from("apo_objectives").select("*"),
      ]);
      return {
        oversight: oversight.data ?? [],
        finance: finance.data?.[0] ?? null,
        risks: risks.data ?? [],
        approvals: approvals.data ?? [],
        projects: projects.data ?? [],
        objectives: objectives.data ?? [],
      };
    },
  });

  if (!data) return <Card className="p-10 text-center text-sm text-muted-foreground">Preparing executive reports…</Card>;

  const exportRows = () =>
    exportToCsv(
      "apostolic-executive-report",
      ["Department", "KPI %", "Open tasks", "Overdue", "Open risks", "Reports 90d"],
      (data.oversight as any[]).map((d) => [d.department_name, Math.round(Number(d.kpi_avg_pct ?? 0)), d.open_tasks, d.overdue_tasks, d.open_risks, d.reports_90d]),
    );

  const critical = (data.risks as any[]).filter((r) => Number(r.rating) >= 15);
  const pending = (data.approvals as any[]).filter((a) => a.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>Export as PDF / print</Button>
        <Button variant="outline" onClick={exportRows}>Export to Excel (CSV)</Button>
      </div>

      <Section title="Weekly executive brief">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{data.oversight.length} departments reporting into the apostolic office.</li>
          <li>{pending.length} strategic decisions awaiting your signature.</li>
          <li>{critical.length} critical executive risks require intervention.</li>
          <li>{(data.projects as any[]).filter((p) => p.status === "in_progress").length} development projects in delivery.</li>
        </ul>
      </Section>

      <Section title="Monthly executive report">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Income (12m)" value={money(data.finance?.total_income)} />
          <Stat label="Expenditure (12m)" value={money(data.finance?.total_expense)} />
          <Stat label="Cash position" value={money(data.finance?.cash_position)} />
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {(data.oversight as any[]).slice(0, 12).map((d) => (
            <div key={d.department_slug} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1 last:border-0">
              <span>{d.department_name}</span>
              <span className="text-xs text-muted-foreground">
                KPI {Math.round(Number(d.kpi_avg_pct ?? 0))}% · {d.overdue_tasks} overdue · {d.open_risks} risks
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Quarterly apostolic report">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Governance: {(data.approvals as any[]).filter((a) => a.status === "approved").length} strategic approvals signed.</li>
          <li>Development projects: {data.projects.length} registered, {(data.projects as any[]).filter((p) => p.status === "completed").length} completed.</li>
          <li>
            Vision implementation:{" "}
            {data.objectives.length
              ? Math.round((data.objectives as any[]).reduce((s, o) => s + Number(o.progress_pct ?? 0), 0) / data.objectives.length)
              : 0}
            % average objective progress.
          </li>
        </ul>
      </Section>

      <Section title="Annual state of the ministry">
        <p className="text-sm text-muted-foreground">
          Vision fulfilment, church growth, financial stewardship, governance effectiveness, leadership development and
          expansion progress are drawn live from the modules above. Print this page for the annual apostolic charge.
        </p>
      </Section>
    </div>
  );
}
