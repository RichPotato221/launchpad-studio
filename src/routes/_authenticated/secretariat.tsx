import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import ExecutiveDashboard from "@/components/secretariat/ExecutiveDashboard";
import MeetingsModule from "@/components/secretariat/MeetingsModule";
import CorrespondenceModule from "@/components/secretariat/CorrespondenceModule";
import { useCurrentRole } from "@/lib/useCurrentRole";
import { branchLabel, exportRows, fmtDate, fmtDateTime, ragForScore, RAG_CLASS } from "@/lib/secretariat";

export const Route = createFileRoute("/_authenticated/secretariat")({
  head: () => ({
    meta: [
      { title: "Secretarial Office — TRoGKC Leadership Portal" },
      { name: "description", content: "Governance, administration and executive operations hub: meetings, agendas, minutes, resolutions, correspondence, compliance and audit trail." },
      { property: "og:title", content: "Secretarial Office — TRoGKC Leadership Portal" },
      { property: "og:description", content: "Executive cockpit for church governance: meetings, minutes, resolutions, correspondence and compliance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecretariatPage,
});

function SecretariatPage() {
  const role = useCurrentRole();
  const [userId, setUserId] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""));
  }, []);

  const canManage =
    (role.data?.roles ?? []).some((r) =>
      ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"].includes(r),
    ) || false;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 md:px-6">
      <header className="mb-6">
        <h1 className="font-serif text-3xl">Secretarial Office</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Governance, administration and executive operations hub. Every record is access-controlled, versioned and audited.
        </p>
      </header>

      <Tabs defaultValue="cockpit">
        <TabsList className="flex w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="cockpit">Executive cockpit</TabsTrigger>
          <TabsTrigger value="meetings">Meetings & minutes</TabsTrigger>
          <TabsTrigger value="actions">Actions & resolutions</TabsTrigger>
          <TabsTrigger value="correspondence">Correspondence</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        <TabsContent value="cockpit" className="pt-6"><ExecutiveDashboard /></TabsContent>
        <TabsContent value="meetings" className="pt-6">
          {userId && <MeetingsModule currentUserId={userId} canManage={canManage} />}
        </TabsContent>
        <TabsContent value="actions" className="pt-6"><ActionsTracker /></TabsContent>
        <TabsContent value="correspondence" className="pt-6">
          {userId && <CorrespondenceModule currentUserId={userId} canManage={canManage} />}
        </TabsContent>
        <TabsContent value="compliance" className="pt-6"><ComplianceBoard /></TabsContent>
        <TabsContent value="audit" className="pt-6"><AuditTrail /></TabsContent>
      </Tabs>
    </div>
  );
}

function ActionsTracker() {
  const q = useQuery({
    queryKey: ["secretariat-actions"],
    queryFn: async () => {
      const [tasks, resolutions] = await Promise.all([
        supabase.from("tasks").select("id, title, status, due_date, priority, branch, department_slug, resolution_id").order("due_date", { nullsFirst: false }),
        supabase.from("resolutions").select("id, resolution_number, resolution_text, status, due_date, created_at, closed_at"),
      ]);
      return { tasks: tasks.data ?? [], resolutions: resolutions.data ?? [] };
    },
  });

  if (!q.data) return <p className="text-sm text-muted-foreground">Loading action tracker…</p>;
  const today = new Date().toISOString().slice(0, 10);
  const open = q.data.tasks.filter((t: any) => !["done", "completed", "cancelled"].includes(t.status));
  const overdue = open.filter((t: any) => t.due_date && t.due_date < today);
  const completion = q.data.tasks.length
    ? Math.round(((q.data.tasks.length - open.length) / q.data.tasks.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Completion</p><p className={`mt-1 inline-block rounded border px-2 text-2xl font-semibold ${RAG_CLASS[ragForScore(completion)]}`}>{completion}%</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Open actions</p><p className="mt-1 text-2xl font-semibold">{open.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Overdue</p><p className="mt-1 text-2xl font-semibold text-red-700">{overdue.length}</p></Card>
      </div>
      <div className="flex justify-end print:hidden">
        <Button size="sm" variant="outline" onClick={() => exportRows("action-tracker", ["Title", "Status", "Due", "Priority", "Branch", "Department"], open.map((t: any) => [t.title, t.status, t.due_date, t.priority, branchLabel(t.branch), t.department_slug]))}>
          <Download className="mr-1.5 h-4 w-4" /> Excel
        </Button>
      </div>
      <Card className="divide-y divide-border/60">
        {open.length === 0 && <p className="p-4 text-sm text-muted-foreground">No outstanding actions.</p>}
        {open.map((t: any) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="text-sm font-medium">{t.title}</p>
              <p className="text-xs text-muted-foreground">Due {fmtDate(t.due_date)} · {branchLabel(t.branch)} · {t.department_slug ?? "—"}{t.resolution_id ? " · from a resolution" : ""}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="capitalize">{t.priority}</Badge>
              <Badge variant={t.due_date && t.due_date < today ? "destructive" : "secondary"} className="capitalize">{t.status}</Badge>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ComplianceBoard() {
  const q = useQuery({
    queryKey: ["secretariat-compliance"],
    queryFn: async () => {
      const [items, docs] = await Promise.all([
        supabase.from("compliance_items").select("*").order("due_date", { nullsFirst: false }),
        supabase.from("documents").select("id, title, status, expiry_date, review_date, version, doc_number"),
      ]);
      return { items: items.data ?? [], docs: docs.data ?? [] };
    },
  });
  if (!q.data) return <p className="text-sm text-muted-foreground">Loading compliance…</p>;
  const today = new Date().toISOString().slice(0, 10);
  const expired = q.data.docs.filter((d: any) => d.expiry_date && d.expiry_date < today);
  const reviewDue = q.data.docs.filter((d: any) => d.review_date && d.review_date <= today);
  const openItems = q.data.items.filter((i: any) => i.status !== "compliant" && i.status !== "closed");
  const score = q.data.items.length ? Math.round(((q.data.items.length - openItems.length) / q.data.items.length) * 100) : 100;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Compliance score</p><p className={`mt-1 inline-block rounded border px-2 text-2xl font-semibold ${RAG_CLASS[ragForScore(score)]}`}>{score}%</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Expired documents</p><p className="mt-1 text-2xl font-semibold">{expired.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Reviews due</p><p className="mt-1 text-2xl font-semibold">{reviewDue.length}</p></Card>
      </div>
      <div className="flex justify-end print:hidden">
        <Button size="sm" variant="outline" onClick={() => exportRows("compliance-register", ["Title", "Category", "Due", "Status", "Risk"], q.data!.items.map((i: any) => [i.title, i.category, i.due_date, i.status, i.risk_score]))}>
          <Download className="mr-1.5 h-4 w-4" /> Excel
        </Button>
      </div>
      <Card className="divide-y divide-border/60">
        {q.data.items.length === 0 && <p className="p-4 text-sm text-muted-foreground">No compliance items registered.</p>}
        {q.data.items.map((i: any) => (
          <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="text-sm font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.category} · due {fmtDate(i.due_date)} · {branchLabel(i.branch)}</p>
            </div>
            <Badge variant="outline" className="capitalize">{i.status}</Badge>
          </div>
        ))}
      </Card>
      <Card className="p-4">
        <h3 className="mb-2 font-serif text-lg">Document control exceptions</h3>
        {expired.length + reviewDue.length === 0 ? (
          <p className="text-sm text-muted-foreground">All controlled documents are current.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {[...expired, ...reviewDue].map((d: any) => (
              <li key={d.id + (d.expiry_date ?? "")} className="border-b border-border/50 pb-1">
                {d.doc_number ? `${d.doc_number} · ` : ""}{d.title} (v{d.version}) — {d.expiry_date && d.expiry_date < today ? `expired ${fmtDate(d.expiry_date)}` : `review due ${fmtDate(d.review_date)}`}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AuditTrail() {
  const q = useQuery({
    queryKey: ["secretariat-audit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("id, action, entity, entity_id, created_at, actor_id, details")
        .order("created_at", { ascending: false })
        .limit(300);
      return data ?? [];
    },
  });
  const rows = q.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Last {rows.length} recorded actions — who, what, when.</p>
        <Button size="sm" variant="outline" onClick={() => exportRows("audit-log", ["When", "Action", "Entity", "Record", "Actor"], rows.map((r: any) => [r.created_at, r.action, r.entity, r.entity_id, r.actor_id]))}>
          <Download className="mr-1.5 h-4 w-4" /> Download logs
        </Button>
      </div>
      <Card className="divide-y divide-border/60">
        {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No activity recorded yet.</p>}
        {rows.map((r: any) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 text-sm">
            <span><span className="font-medium capitalize">{r.action}</span> · {r.entity} · <span className="text-xs text-muted-foreground">{r.entity_id}</span></span>
            <span className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
