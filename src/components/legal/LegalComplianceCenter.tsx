import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_CONFIG, LEGAL_SECTIONS, type LegalSection } from "@/lib/legalCompliance";
import { askLegalComplianceAssistant } from "@/lib/legalComplianceAi.functions";
import AgentChat from "@/components/ai/AgentChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Download, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useIdentity } from "@/lib/identity";

const sb = supabase as any;
const PROMPTS = ["Show me overdue compliance matters.", "Which registration documents are expiring?", "Show outstanding audit findings.", "Which contracts require review?", "Show critical risks.", "Show unresolved legal matters.", "Generate this month's compliance summary.", "Show property documents that need review."];

export default function LegalComplianceCenter({ currentUserId }: { departmentSlug?: string; currentUserId: string }) {
  const identity = useIdentity();
  const [section, setSection] = useState<LegalSection>("registration_governance");
  const canManage = Boolean(identity.data && (identity.data.primaryDepartment === "protocol" || identity.data.roleRows.some((r) => r.department_slug === "protocol") || identity.data.roles.some((r) => ["senior_apostle", "chairperson", "secretary"].includes(r))));
  return (
    <Tabs value={section} onValueChange={(value) => setSection(value as LegalSection)} className="space-y-6">
      <div className="md:hidden">
        <Label htmlFor="legal-section">Legal &amp; Compliance section</Label>
        <Select value={section} onValueChange={(value) => setSection(value as LegalSection)}>
          <SelectTrigger id="legal-section" className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>{LEGAL_SECTIONS.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <TabsList className="hidden h-auto w-full flex-wrap justify-start gap-1 md:flex">
        {LEGAL_SECTIONS.map((item) => <TabsTrigger key={item.key} value={item.key}>{item.label}</TabsTrigger>)}
      </TabsList>
      {LEGAL_SECTIONS.map((item) => (
        <TabsContent key={item.key} value={item.key} className="mt-0">
          {item.key === "legal_assistant"
            ? <LegalAssistant />
            : <RecordsSection section={item.key} currentUserId={currentUserId} branch={identity.data?.branch ?? null} canManage={canManage} />}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function LegalAssistant() {
  const ask = useServerFn(askLegalComplianceAssistant);
  return <AgentChat namespace="dept.protocol.legal" title="Legal & Compliance assistant" description="Grounded only in the Legal & Compliance records, reports and documents you are authorised to see." ask={ask as any} suggestions={PROMPTS} />;
}

function RecordsSection({ section, currentUserId, branch, canManage }: { section: Exclude<LegalSection, "legal_assistant">; currentUserId: string; branch: string | null; canManage: boolean }) {
  const config = LEGAL_CONFIG[section];
  const records = useQuery({
    queryKey: ["legal-compliance", section],
    queryFn: async () => {
      const { data, error } = await sb.from("legal_compliance_records").select("*").eq("record_type", section).order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });
  const empty = { title: "", category: config.categories[0], status: config.statuses[0], notes: "", document_url: "", ...Object.fromEntries(config.fields.map((f) => [f.key, ""])) };
  const [form, setForm] = useState<Record<string, string>>(empty);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [escalating, setEscalating] = useState<any>(null);
  const [escalation, setEscalation] = useState({ reason: "", priority: "High" });

  const summaries = useMemo(() => {
    if (section !== "risk") return null;
    const rows = records.data ?? [];
    const count = (v: string) => rows.filter((r: any) => r.details?.risk_rating === v).length;
    return [{ l: "Total risks", v: rows.length }, { l: "Critical", v: count("Critical") }, { l: "High", v: count("High") }, { l: "Medium", v: count("Medium") }, { l: "Low", v: count("Low") }, { l: "Overdue actions", v: rows.filter((r: any) => r.status === "Overdue").length }];
  }, [section, records.data]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      let documentUrl = form.document_url || null;
      if (file) {
        const path = `protocol/legal/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabase.storage.from("department-reports").upload(path, file);
        if (up.error) throw up.error;
        const signed = await supabase.storage.from("department-reports").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed.error) throw signed.error; documentUrl = signed.data.signedUrl;
      }
      const details = Object.fromEntries(config.fields.filter((f) => !["reference_number","issue_date","review_date","renewal_date","responsible_person","last_verified","verified_by"].includes(f.key)).map((f) => [f.key, form[f.key] || null]));
      const { error } = await sb.from("legal_compliance_records").insert({
        record_type: section, branch, title: form.title.trim(), category: form.category, status: form.status, notes: form.notes || null,
        document_url: documentUrl, reference_number: form.reference_number || null, issue_date: form.issue_date || null,
        review_date: form.review_date || null, renewal_date: form.renewal_date || null, responsible_person: form.responsible_person || null,
        last_verified: form.last_verified || null, verified_by: form.verified_by || null, details, created_by: currentUserId,
      });
      if (error) throw error;
      toast.success("Record saved"); setForm(empty); setFile(null); setOpen(false); records.refetch();
    } catch (error: any) { toast.error(error.message ?? "Unable to save record"); } finally { setBusy(false); }
  };

  const escalate = async () => {
    if (!escalating || !escalation.reason.trim()) return toast.error("Give a reason for escalation.");
    const { error } = await sb.from("legal_compliance_escalations").insert({ source_record_id: escalating.id, branch: escalating.branch, matter: escalating.title, reason: escalation.reason.trim(), priority: escalation.priority, supporting_document_url: escalating.document_url, submitted_by: currentUserId });
    if (error) return toast.error(error.message);
    const { data: leaders } = await sb.from("user_roles").select("user_id").in("role", ["chairperson", "senior_apostle"]);
    if (leaders?.length) await sb.from("notifications").insert(leaders.map((r: any) => ({ user_id: r.user_id, title: "Legal & Compliance escalation", message: `${escalation.priority}: ${escalating.title}`.slice(0, 180), link: "/departments/chairperson", type: "compliance", branch: escalating.branch })));
    await sb.from("legal_compliance_records").update({ status: section === "legal_matter" ? "Escalated" : escalating.status }).eq("id", escalating.id);
    toast.success("Escalated to the Chairperson"); setEscalating(null); setEscalation({ reason: "", priority: "High" }); records.refetch();
  };

  return <div className="space-y-6">
    <header><p className="text-xs uppercase tracking-widest text-muted-foreground">Legal &amp; Compliance</p><h2 className="mt-1 font-serif text-3xl">{config.title}</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{config.description}</p></header>
    {summaries && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{summaries.map((s) => <Card key={s.l} className="p-4"><p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{s.l}</p><p className="mt-2 font-serif text-2xl">{s.v}</p></Card>)}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{records.data?.length ?? 0} record{records.data?.length === 1 ? "" : "s"}</p>
      {canManage && <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add record</Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Add {config.title} record</DialogTitle></DialogHeader><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><Label>{config.titleLabel}</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.categories.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{config.statuses.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
        {config.fields.map((field) => <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}><Label>{field.label}</Label>{field.type === "textarea" ? <Textarea value={form[field.key] ?? ""} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} /> : field.type === "select" ? <Select value={form[field.key] ?? ""} onValueChange={(v) => setForm({ ...form, [field.key]: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{field.options?.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select> : <Input type={field.type === "date" ? "date" : "text"} value={form[field.key] ?? ""} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />}</div>)}
        <div className="md:col-span-2"><Label>Supporting document</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save record"}</Button></div>
      </form></DialogContent></Dialog>}
    </div>
    {records.isLoading ? <Card className="p-8 text-center text-sm text-muted-foreground">Loading records…</Card> : !records.data?.length ? <Card className="p-8 text-center text-sm text-muted-foreground">No {config.title.toLowerCase()} records have been added for your branch.</Card> : <div className="space-y-3">{records.data.map((row: any) => <Card key={row.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-widest text-muted-foreground">{row.category} · {row.branch?.replaceAll("_", " ") ?? "Church-wide"}</p><h3 className="mt-1 font-serif text-xl">{row.title}</h3><p className="mt-1 text-sm text-muted-foreground">{row.reference_number ? `${row.reference_number} · ` : ""}{row.responsible_person ? `Responsible: ${row.responsible_person} · ` : ""}{row.review_date ? `Review: ${new Date(row.review_date).toLocaleDateString()} · ` : ""}{row.status}</p>{row.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{row.notes}</p>}<div className="mt-3 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">{config.fields.map((f) => { const value = row[f.key] ?? row.details?.[f.key]; return value ? <p key={f.key}><strong className="text-foreground">{f.label}:</strong> {String(value)}</p> : null; })}</div></div><div className="flex flex-col gap-2">{row.document_url && <Button variant="outline" size="sm" asChild><a href={row.document_url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Document</a></Button>}{canManage && <Button variant="outline" size="sm" onClick={() => setEscalating(row)}><AlertTriangle className="mr-2 h-4 w-4" />Escalate to Chairperson</Button>}</div></div></Card>)}</div>}
    <Dialog open={Boolean(escalating)} onOpenChange={(v) => !v && setEscalating(null)}><DialogContent><DialogHeader><DialogTitle>Escalate to Chairperson</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Matter</Label><p className="mt-1 text-sm">{escalating?.title}</p></div><div><Label>Reason</Label><Textarea required value={escalation.reason} onChange={(e) => setEscalation({ ...escalation, reason: e.target.value })} /></div><div><Label>Priority</Label><Select value={escalation.priority} onValueChange={(v) => setEscalation({ ...escalation, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Normal","High","Critical"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><Button onClick={escalate}><FileText className="mr-2 h-4 w-4" />Submit escalation</Button></div></DialogContent></Dialog>
  </div>;
}
