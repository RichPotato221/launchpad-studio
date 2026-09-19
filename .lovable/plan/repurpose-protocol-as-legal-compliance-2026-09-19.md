# Repurpose Protocol as Legal & Compliance

## Goal
Transform the existing `protocol` department in place into **Legal & Compliance**. Keep its internal slug, memberships, links, branch relationships, header, navigation, typography, cards, forms, mobile behaviour, and shared department components. Do not create another department, role, dashboard architecture, or standalone application.

## Changes

### Existing department page
- Update the existing department record to show **Legal & Compliance**, `1 Cor 14:40`, the supplied description, vision, mission, and mandate.
- Keep the standard Overview, Team, KPI Dashboard, Reports, and Resources sections.
- Add the biblical foundation beneath the existing overview cards using the current visual language.
- Replace Protocol’s specialised Ushering workspace with Legal & Compliance sections in the same primary tab/dropdown system: Registration & Governance, Financial Audit, Property & Land, Contracts & Legal, Operational Compliance, Risk Register, Legal Matters, Compliance Calendar, and AI Assistant.
- Remove the Financial Command Centre from this department only. Finance remains unchanged.
- Keep the existing `protocol` slug and approved-member assignment system. Team copy will become Legal & Compliance-specific without hard-coded people.

### Legal & Compliance records
- Add branch-aware records for governance/registration, audits and corrective actions, property and land, contracts, operational reviews, risks, legal matters, calendar deadlines, and Chairperson escalations.
- Use the supplied fields and status choices, with the existing card, table, form, selector, button, empty-state, and mobile patterns.
- Keep financial records limited to audit evidence, findings, controls, corrective actions, and accountability—no budgets, payments, transactions, procurement, expenditure approvals, or contract auto-approval.
- Keep uploaded resources in the existing document system while adding Legal & Governance categories, notes, secure file access, and permissions for authorised Legal & Compliance members and existing church leadership.

### KPIs and reports
- Preserve the existing KPI entry and KPI card interface.
- Remove the old Protocol KPI rows and seed the ten supplied Legal & Compliance indicators with the requested monthly/quarterly periods and targets.
- Preserve the existing report storage design while adding the Legal & Compliance report types and report metadata: period, status, prepared by, date, and view/download.

### Permissions, branches, and escalation
- Reuse the existing Protocol membership; no new role will be added.
- Permit approved members assigned to `protocol`, plus authorised existing leadership, to maintain Legal & Compliance records within existing branch rules.
- Enforce restricted actions in the database: Legal & Compliance cannot approve expenditure, alter Finance transactions, approve contracts for the church, or silently alter constitutional/registration authority records.
- Add **Escalate to Chairperson** on critical/major records, recording the supplied matter, reason, priority, documents, submitter, date, and status.
- Surface those escalations inside the existing Chairperson command centre rather than creating another Chairperson system.

### Grounded assistant and imagery
- Tailor the existing department assistant pattern to read the actual Legal & Compliance records and use the supplied prompt examples.
- Prevent invented answers by grounding responses only in stored records visible to the signed-in user.
- Replace the old Protocol hospitality image with one understated, church-consistent governance/document stewardship image; avoid gavels, scales, courthouse clichés, cartoons, and generic corporate imagery.

### Cleanup and verification
- Remove user-facing Protocol and old operations content only from the repurposed department; preserve shared Ushering, Hospitality, Attendance, Safety, Volunteer, and Finance components used elsewhere.
- Verify desktop and mobile department navigation, all record forms and empty states, branch isolation, file upload/view/download, KPI/report data, Chairperson escalation visibility, and AI grounding.
- Confirm the final page keeps the established church portal design and the app finishes with a clean build.

## Technical details
- Implement the department-specific sections as focused components rendered conditionally for the existing `protocol` route, while retaining the shared department route and shell.
- Apply schema changes through one migration with grants before RLS policies for every new public table, branch-aware access checks, audit fields, and immutable historical evidence where appropriate.
- Update the department row and seed data in that migration without changing the slug or existing relationships.
- Extend shared resources/reports only with nullable metadata so other departments continue to behave as they do now.
