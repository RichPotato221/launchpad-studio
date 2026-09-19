import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgentTurn, sanitizeHistory, type AgentMessage, type TableSpec } from "@/lib/aiAgent";

type Ask = { question: string; history?: AgentMessage[] };

export const askLegalComplianceAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Ask) => {
    if (!input?.question || input.question.trim().length < 3) throw new Error("Please ask a fuller question.");
    return { question: input.question.trim().slice(0, 800), history: sanitizeHistory(input.history) };
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this workspace.");
    const sb = context.supabase as any;
    const [records, reports, documents] = await Promise.all([
      sb.from("legal_compliance_records").select("*").order("created_at", { ascending: false }).limit(600),
      sb.from("report_entries").select("*").eq("department_slug", "protocol").order("created_at", { ascending: false }).limit(150),
      sb.from("department_resources").select("id,title,description,category,notes,file_url,created_at").eq("department_slug", "protocol").limit(200),
    ]);
    const specs: TableSpec[] = [{
      entity: "legal_compliance_record",
      table: "legal_compliance_records",
      describe: "branch-scoped Legal & Compliance record",
      columns: {
        record_type: { kind: "string", requiredOnCreate: true, enum: ["registration_governance","financial_audit","property_land","contract_legal","operational_compliance","risk","legal_matter","calendar"] },
        branch: { kind: "string", enum: ["etwatwa", "joburg_north", "joburg_south"] },
        title: { kind: "string", requiredOnCreate: true }, category: { kind: "string" }, reference_number: { kind: "string" },
        issue_date: { kind: "date" }, review_date: { kind: "date" }, renewal_date: { kind: "date" }, responsible_person: { kind: "string" },
        status: { kind: "string" }, document_url: { kind: "string" }, last_verified: { kind: "date" }, verified_by: { kind: "string" },
        notes: { kind: "string" }, details: { kind: "json" },
      },
    }];
    return runAgentTurn({
      apiKey,
      systemPrompt: "You are the TRoGKC Legal & Compliance assistant. Answer only from the supplied branch-visible Legal & Compliance records, reports and documents. Never invent a record, person, deadline, legal conclusion or figure. If evidence is absent, say so plainly. You may help monitor governance records, audits, corrective actions, property documentation, contracts, operational reviews, risks, legal matters and deadlines. You do not provide regulated legal advice, approve contracts, change registration authority, approve expenditure, or modify Finance operations. Keep answers concise with short headings and bullets.",
      snapshot: { today: new Date().toISOString().slice(0, 10), records: records.data ?? [], reports: reports.data ?? [], documents: documents.data ?? [] },
      question: data.question,
      history: data.history,
      specs,
      ctx: { supabase: sb, userId: context.userId, actorLabel: "Legal & Compliance assistant" },
    });
  });
