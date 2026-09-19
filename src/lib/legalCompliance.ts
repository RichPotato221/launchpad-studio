export const LEGAL_SECTIONS = [
  { key: "registration_governance", label: "Registration & Governance" },
  { key: "financial_audit", label: "Financial Audit" },
  { key: "property_land", label: "Property & Land" },
  { key: "contract_legal", label: "Contracts & Legal" },
  { key: "operational_compliance", label: "Operational Compliance" },
  { key: "risk", label: "Risk Register" },
  { key: "legal_matter", label: "Legal Matters" },
  { key: "calendar", label: "Compliance Calendar" },
  { key: "legal_assistant", label: "AI Assistant" },
] as const;

export type LegalSection = (typeof LEGAL_SECTIONS)[number]["key"];

type Field = { key: string; label: string; type?: "date" | "textarea" | "select"; options?: string[] };
export type LegalConfig = {
  title: string;
  description: string;
  titleLabel: string;
  categories: string[];
  statuses: string[];
  fields: Field[];
};

export const LEGAL_CONFIG: Record<Exclude<LegalSection, "legal_assistant">, LegalConfig> = {
  registration_governance: {
    title: "Registration & Governance",
    description: "Maintain current registration, constitutional, governance and policy evidence.",
    titleLabel: "Document / record",
    categories: ["NPC / CIPC", "NPO", "Constitution", "Governance Records", "Resolutions", "Policies", "Registers"],
    statuses: ["Current", "Expiring Soon", "Expired", "Missing", "Under Review"],
    fields: [
      { key: "reference_number", label: "Reference number" }, { key: "issue_date", label: "Issue date", type: "date" },
      { key: "review_date", label: "Review / renewal date", type: "date" }, { key: "responsible_person", label: "Responsible person" },
      { key: "last_verified", label: "Last verified", type: "date" }, { key: "verified_by", label: "Verified by" },
    ],
  },
  financial_audit: {
    title: "Financial Audit",
    description: "Monitor financial audit and accountability matters without replacing the Finance function or external auditor.",
    titleLabel: "Audit period",
    categories: ["Audit Overview", "Findings", "Corrective Actions", "Documents"],
    statuses: ["Not Started", "In Progress", "Completed", "Findings Outstanding", "Closed"],
    fields: [
      { key: "auditor", label: "Auditor" }, { key: "audit_type", label: "Audit type" },
      { key: "findings", label: "Findings", type: "textarea" }, { key: "management_response", label: "Management response", type: "textarea" },
      { key: "responsible_person", label: "Responsible person" }, { key: "due_date", label: "Due date", type: "date" },
      { key: "closure_date", label: "Closure date", type: "date" }, { key: "evidence", label: "Evidence reference" },
    ],
  },
  property_land: {
    title: "Property & Land",
    description: "Maintain visibility over the church's land, buildings, leases, ownership records and related legal documentation.",
    titleLabel: "Property",
    categories: ["Land", "Building", "Lease", "Insurance", "Municipal Documentation", "Other"],
    statuses: ["Verified", "Pending Verification", "Documentation Missing", "Under Legal Review"],
    fields: [
      { key: "location", label: "Location" }, { key: "ownership_status", label: "Ownership status" },
      { key: "title_document", label: "Title / ownership document" }, { key: "lease", label: "Lease" },
      { key: "lease_expiry", label: "Lease expiry", type: "date" }, { key: "insurance", label: "Insurance" },
      { key: "legal_restrictions", label: "Legal restrictions", type: "textarea" }, { key: "municipal_documentation", label: "Municipal documentation" },
      { key: "responsible_person", label: "Responsible person" },
    ],
  },
  contract_legal: {
    title: "Contracts & Legal",
    description: "Maintain visibility over significant agreements, obligations, renewals and matters requiring legal review. Recording a contract never approves it.",
    titleLabel: "Contract",
    categories: ["Service", "Supplier", "Employment", "Lease", "Partnership", "Other"],
    statuses: ["Draft", "Under Review", "Approved", "Active", "Expiring", "Expired", "Terminated"],
    fields: [
      { key: "counterparty", label: "Counterparty" }, { key: "department", label: "Department" },
      { key: "start_date", label: "Start date", type: "date" }, { key: "end_date", label: "End date", type: "date" },
      { key: "renewal_date", label: "Renewal date", type: "date" }, { key: "responsible_person", label: "Responsible person" },
      { key: "approval_authority", label: "Approval authority" }, { key: "legal_review", label: "Legal review" },
    ],
  },
  operational_compliance: {
    title: "Operational Compliance",
    description: "Monitor whether church departments maintain required documentation, approvals, controls and evidence.",
    titleLabel: "Requirement",
    categories: ["Registration", "Documentation", "Approval", "Control", "Safety", "Policy", "Other"],
    statuses: ["Compliant", "Partially Compliant", "Non-Compliant", "Pending Evidence", "Under Review"],
    fields: [
      { key: "department", label: "Department" }, { key: "evidence_required", label: "Evidence required" },
      { key: "evidence_uploaded", label: "Evidence uploaded" }, { key: "responsible_person", label: "Responsible person" },
      { key: "review_date", label: "Review date", type: "date" }, { key: "finding", label: "Finding", type: "textarea" },
      { key: "corrective_action", label: "Corrective action", type: "textarea" }, { key: "due_date", label: "Due date", type: "date" },
      { key: "reviewer", label: "Reviewer" },
    ],
  },
  risk: {
    title: "Risk Register",
    description: "Identify legal, governance and compliance risks and track accountable mitigation.",
    titleLabel: "Risk",
    categories: ["Legal", "Governance", "Finance", "Audit", "Property", "Contracts", "Operations", "Registration", "Documentation"],
    statuses: ["Open", "Monitoring", "Mitigating", "Overdue", "Closed"],
    fields: [
      { key: "risk_id", label: "Risk ID" }, { key: "description", label: "Description", type: "textarea" },
      { key: "likelihood", label: "Likelihood", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { key: "impact", label: "Impact", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { key: "risk_rating", label: "Risk rating", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { key: "existing_controls", label: "Existing controls", type: "textarea" }, { key: "mitigation", label: "Mitigation", type: "textarea" },
      { key: "responsible_person", label: "Responsible person" }, { key: "target_date", label: "Target date", type: "date" },
      { key: "review_date", label: "Review date", type: "date" },
    ],
  },
  legal_matter: {
    title: "Legal Matters",
    description: "Record matters needing investigation, responsible escalation or appropriately qualified professional advice.",
    titleLabel: "Matter description",
    categories: ["Legal", "Governance", "Finance", "Audit", "Property", "Contract", "Operational", "Registration", "Other"],
    statuses: ["Open", "Under Review", "Escalated", "Awaiting Advice", "Action Required", "Resolved", "Closed"],
    fields: [
      { key: "matter_id", label: "Matter ID" }, { key: "date_reported", label: "Date reported", type: "date" },
      { key: "department", label: "Department" }, { key: "reported_by", label: "Reported by" },
      { key: "risk_level", label: "Risk level", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { key: "responsible_person", label: "Responsible person" }, { key: "action_required", label: "Action required", type: "textarea" },
      { key: "professional_advice_required", label: "Professional advice required", type: "select", options: ["No", "Yes", "Pending assessment"] },
      { key: "due_date", label: "Due date", type: "date" }, { key: "evidence", label: "Evidence" },
      { key: "resolution", label: "Resolution", type: "textarea" }, { key: "closed_date", label: "Closed date", type: "date" },
    ],
  },
  calendar: {
    title: "Compliance Calendar",
    description: "Track registration, audit, governance, contract, property, insurance, policy, compliance review and reporting deadlines.",
    titleLabel: "Title",
    categories: ["Registration", "Audit", "Governance Review", "Contract Renewal", "Property Review", "Insurance Renewal", "Policy Review", "Compliance Review", "Reporting"],
    statuses: ["Upcoming", "Due Soon", "Overdue", "Completed"],
    fields: [
      { key: "due_date", label: "Due date", type: "date" }, { key: "responsible_person", label: "Responsible person" },
      { key: "reminder", label: "Reminder" },
    ],
  },
};
