# TRoGKC Financial Administrator Dashboard
## Complete structure and remediation record

Prepared 19 November 2026 for Throne Room of God Kingdom Center.

## 1. Location and identity

The existing Financial Administrator department remains the entry point. Open Departments → Financial Administrator → Financial Command Centre. The URL is `/departments/finance`; `/finance` redirects there. The `finance-administration` department alias uses the same command centre. The existing cream, gold, dark typography and teal imagery are preserved. No second dashboard was created.

The department page has seven outer sections: Overview, Team, KPI Dashboard, Reports, Resources, AI Assistant, and Financial Command Centre. Overview retains the stored vision and mission. The command centre contains twelve operational sections. Other departments retain their scoped budget/procurement views; leadership has its own financial overview of records it is permitted to see.

## 2. Navigation tree

```text
Financial Administrator
├── Overview — stored vision and mission
├── Team — members and team communication
├── KPI Dashboard — departmental performance
├── Reports — department reports
├── Resources — uploaded department documents
├── AI Assistant — grounded analysis; no financial workflow mutations
└── Financial Command Centre
    ├── Executive dashboard
    ├── Control room
    ├── General ledger
    ├── Member giving
    ├── Monthly workbook
    ├── Budgets
    ├── Budget approvals
    ├── Approvals & payments
    ├── Procurement
    ├── Payroll
    ├── Bank reconciliation
    └── Audit trail
```

## 3. The twelve command-centre sections

### 3.1 Executive dashboard

Eight headline figures: total income over 12 months; total expenditure over 12 months; cash position; available funds; outstanding payments; giving today; giving this month; pending approvals. Supporting views include six-month income/expenditure trends, current-year budget utilisation and recent ledger activity. Refresh, print/PDF and Excel export remain available.

Income and expenditure now derive from posted financial movements rather than unrelated isolated totals. Cash is the sum of active, unarchived bank/cash accounts. Available funds deduct reserved money and approved unpaid obligations. A scope of twelve months is different from year-to-date giving: compare matching periods rather than expecting different date ranges to agree.

### 3.2 Control room

Treasury position: total cash, reserved funds, funded budget allocation, expenditure/commitments and free funds. Account register records name, account type, branch, balance and reserved balance. Department positions show allocated, spent, committed, pending, available and utilisation percentage. Partially approved budgets are funded at their approved amount, not the original request.

Account balances are recorded treasury values, not a live bank connection. Procurement payment posting deducts the selected account automatically. Legacy claim/payroll payments are reflected in movement reporting; they do not acquire a new bank-account posting workflow in this correction.

### 3.3 General ledger

Transactions include journals, procurement, Sunday contributions, tithes, offerings, first fruits, seed, pledges and other entries. Core fields: transaction number, date, title, kind, department, branch, amount, status, category, reference, notes and approval information. Filters cover type, status and branch. Text search is applied before 25-row pagination. Excel fetches every matching accessible row, not just the current page. Excel output is a genuine `.xlsx` workbook.

Records are archived instead of deleted. Administrative archiving is not a financial reversal: posted money remains in financial movement totals. The status of a procurement-generated paid ledger entry cannot be reset, nor can its amount/date/branch/type/department be rewritten. Record a separate correction when money needs adjustment.

### 3.4 Member giving

Date range, giving stream, branch and member search; totals, month figures, unique givers, average gift and breakdown by giving stream; per-member rollups/statements. Only approved/completed giving contributes to recognised giving. Draft, pending, rejected and cancelled entries are excluded. Posted archived gifts stay recognised; archiving does not undo received money.

### 3.5 Monthly workbook

Branch/month sheet with opening balance, month commentary and category lines for income, expenditure, savings and other workbook sections. Rows store target/budget, manual actual, remaining amount and notes. Prior categories and targets can be carried into a new month. Lines are archived rather than permanently removed. Print/PDF and real Excel exports remain.

New reconciliation figures compare the selected month's posted income/expenditure with manually entered workbook actuals. Income gap = workbook income actual − posted income. Expense gap = workbook expenditure actual − posted expenditure. The closing figure is labelled a workbook closing estimate. Manual actuals are deliberately not overwritten: discrepancies become visible for reconciliation instead of silently erasing previously entered figures.

### 3.6 Budgets

Budget register: reference, name, type, department, branch, fiscal year, period, category, purpose, priority, responsible person, requested amount, approved amount, status, version and lock time. Associated budget lines, adjustments and revisions retain history. New budgets begin as draft/submitted; users cannot create an already approved budget. Funded allocations recognise approved, partially approved, active and locked statuses.

### 3.7 Budget approvals

Three inner views: Pending, Increase requests and Completed. Finance reviews submitted/under-review requests first. A different leadership approver gives final approval. A requester cannot approve their own request. Leadership cannot approve more than Finance reviewed. Lower final amounts are recorded as partial approvals. Notes/reasons are saved with decision history; decline requires a reason. Finance approval alone does not release spendable allocation. Budget increase requests follow the same staged decision command.

### 3.8 Approvals & payments

Purchase approval/payment queue plus expense claims. Purchase rows expose requester, department, branch, amount, approval stage, payment status, supporting quotation and decision history. Finance reviews first; leadership approves second; only Finance can post payment after full approval and selection of a same-branch active account. Paid requests cannot be reset and paid again.

Expense claims retain their existing pending → Chairperson approved → Senior Pastor authorised → paid path. This correction does not redesign claims into the procurement workflow. Supporting receipts are opened using renewed storage links. Claims are archived rather than deleted.

### 3.9 Procurement

Purchase register, suppliers, quotation upload, request details and branch/status/search filters. One shared approval command is used by Procurement and Approvals & Payments. Sequence: submitted → Finance approved → leadership approved → ordered → received. Payment follows approval and can occur before final delivery; completing delivery never re-posts payment. Paid requests preserve account, amount and posting identity. Archiving retains request/decision history.

### 3.10 Payroll

Payroll runs by label, period, branch and status. Run lines contain person, role, department, gross amount, allowances, deductions, net amount, payment status and notes. Existing draft/submitted/approved/paid flow remains. Financial audit now includes run/line changes; deletion protection includes both tables. Paid lines not linked to a ledger entry are included once in movement reporting.

### 3.11 Bank reconciliation

Statement account, branch, date range, opening/closing balances and file identity; debit/credit transactions with date, description, reference, amount and matching information. Statement header and transactions are imported by one atomic database function. Invalid lines roll back the entire import; retrying the same importer/import key returns the prior import rather than duplicating it. This is file-based reconciliation, not an automatic bank feed.

### 3.12 Audit trail

Accessible financial history across fifteen entities: ledger, claims, purchases, budgets, budget lines, adjustments, revisions, decisions, workbook periods/lines, accounts, statements, bank transactions and payroll runs/lines. Every new insert/update records actor, action, entity, identifier, before/after values and derived branch. All accessible pages are fetched; there is no 200-record cutoff. Excel includes change details. Historical records cannot gain missing before/after information retrospectively. Legacy audit rows without a recoverable branch are not exposed to branch-restricted users; organisation-wide oversight can still see them.

## 4. Approval and accounting contracts

### Purchases

1. Requester submits a draft/request in their branch.
2. Finance reviewer approves, declines with a reason, or returns it.
3. A different authorised leadership user approves or declines.
4. Finance records ordering and receiving.
5. Finance selects an active account in the request branch and posts payment.
6. Within the same transaction, one negative procurement ledger entry is created, account balance is reduced, and paid actor/time and ledger identity are stored.
7. A subsequent attempt to reset or re-post the payment is refused.

### Budgets

1. Draft/submitted request → Finance review and reviewed amount.
2. Different leadership approver → approved or partially approved allocation.
3. Approved amount cannot exceed requested/reviewed amount.
4. Version/lock history and immutable approval decisions are retained.
5. Budget increases add approved increments only through the same command.

### Definitions

- Posted movements: approved/completed ledger entries plus paid legacy claims/payroll not already linked to ledger entries.
- Income: positive posted movement amounts; expenditure: negative posted movement amounts expressed positively.
- Budget allocation: approved amount for funded statuses; interim Finance reviews allocate zero.
- Budget spent: paid procurement linked to that budget, including archived historical payments.
- Budget committed: leadership-approved/ordered/received unpaid linked procurement.
- Budget available: allocation − spent − committed.
- Church available: active cash − reserves − approved unpaid procurement − authorised unpaid claims.
- Unallocated funds additionally reserve remaining funded budget capacity, without double-subtracting procurement commitments already accounted for in it.

A claim without a budget link cannot be assigned reliably to a specific budget. No guessed allocation is introduced. Reconciliation differences in historic manual workbooks are preserved and displayed for review.

## 5. Access and branch controls

Sign-in and approved membership are required for the financial command. Finance reviewers are approved Finance/Finance Administration members or finance-officer role holders. Leadership approval roles are Chairperson, Senior Pastor (`senior_apostle`), Lead Pastor and Associate Pastor. Separate role records remain the authority; client controls are not the security boundary.

The database command validates caller, role, branch, requester, stage, prior approver, reviewed amount and payment account. Branch-required restrictive policies intersect with older permissive rules, preventing a broad older policy from exposing another branch. Child records inherit branch checks through their budget, statement, payroll run or workbook period. Only existing organisation-wide oversight can cross branches. Church-wide legacy records with no branch retain existing read semantics; ordinary branch users cannot write them as new branch-less records.

Approval decisions cannot be inserted/edited/deleted directly by authenticated clients. Fifteen financial tables refuse deletion. Generic AI tool generation/execution excludes protected financial tables so chat cannot bypass approval history or notifications. Supporting files retain the existing storage-access rules; a new short-lived link does not grant access to a document the user was not permitted to view.

## 6. Technical structure

- Entry: `src/routes/_authenticated/departments.$slug.tsx` and Finance redirect route.
- One maintained centre: `src/components/finance/FinanceCenter.tsx`; former `FinanceWorkspace.tsx` is only a compatibility wrapper.
- Screens: FinanceDashboard, FinancialControlRoom, LedgerModule, GivingModule, MonthlyWorkbook, BudgetsModule, BudgetApprovalsModule, ApprovalsModule, FinanceApprovalsTable, ProcurementModule, PayrollModule and ReconciliationModule.
- Shared rules: `src/lib/financeRules.ts` (capabilities/statuses); `financeData.ts` (complete fetch, invalidation and decision calls); `finance.ts` (formatting/export); `financeAttachment.ts` and FinanceAttachment (stored-path link renewal).
- Database commands: `finance_command`, `sync_purchase_payment`, `import_finance_statement`, transition/ledger guards and preserve/audit triggers.
- Reporting: security-invoker `finance_movements`, `get_finance_summary`, `get_financial_trend`, `get_budget_positions`, `get_budget_utilisation`, `get_church_finance_position`.
- Notification emails: authenticated `notifyPurchaseRequest` validates the saved stage and participant, then dispatches the existing notification service. In-portal notices are part of the decision transaction; email failure is reported separately and does not undo a saved decision.
- Applied migrations: `0006_finance_command_safeguards.sql`, `0007_finance_audit_reporting_alignment.sql`, `0008_finance_restrict_branch_and_posted_payments.sql`.

## 7. Resolution of the thirteen findings

1. Double payment: database row locking, one-time ledger identity, immutable paid fields and payment-only command; client reset controls removed.
2. Conflicting approval paths: shared decision command and matched capability helpers across purchase views.
3. Budgets skipping Finance: staged Finance review then different leadership approval; creation limited to draft/submitted.
4. Permanent deletion: archive controls and deletion guards/revoked client deletion across fifteen entities.
5. Partial audit: broader insert/update capture, before/after values, branch restrictions and complete fetching/export; missing past history cannot be reconstructed.
6. Inconsistent figures: shared movement/position reporting plus visible workbook reconciliation gaps; manual/legacy discrepancies are not fabricated away.
7. Partial budgets: funded status list and approved amount used consistently.
8. Current-page search/export: pre-pagination search, complete paged export, actual XLSX format.
9. Draft/rejected giving: recognised giving restricted to approved/completed statuses.
10. Branch leakage: restrictive database policies, scoped purchase list/decision history and branch-aware notification audiences.
11. Partial bank import/expired attachments: atomic retry-safe import and renewable storage-path viewing links in purchase and receipt views.
12. Duplicate legacy screen: compatibility wrapper delegates to the existing maintained centre.
13. AI bypass: generic finance mutation tools disabled at both tool creation and execution; normal approval paths retain decision history.

## 8. Verification, limits and deployment

Ten regression tests pass: approval separation/self-approval, budget stages, payment identity, partial funding, posted giving, archived posted giving, AI restrictions, attachment references, 1,201-row complete fetch and failing incomplete exports.

Authenticated browser checks opened all twelve command-centre sections. A clearly labelled temporary request for R100 was Finance-reviewed at R60, then leadership-approved through the actual UI with a note. Read-back confirmed `partially_approved`, approved/total R60, original request R100 and the saved note. It was archived immediately; no money was paid. Ledger search and an XLSX download were exercised; the downloaded archive contained an Excel workbook. September's existing workbook displayed the new reconciliation figures. Mobile inspection at 390 × 844 found no horizontal page overflow; browser runtime checks reported no errors.

Live authenticated checks confirmed reporting functions respond, Chairperson sees only own-branch/church-wide budgets, direct approval reset/deletion/archived re-approval fail, and non-Finance bank import is blocked. The Audit Trail's former invalid profile relationship was reproduced and corrected; the screen then loaded successfully.

Not exercised: an actual payment/debit from a real account; approving as a second Finance user; successful real statement import; actual email delivery; reopening a privately stored historical receipt. These need appropriately authorised sessions or suitable test fixtures. Passing source/unit and role-denial checks is not a claim that those money-moving paths were executed. Existing historic amounts and manual bookkeeping still need reconciliation; no production financial history was rewritten.

The code is saved in the project and database safeguards are applied. Updating the published website requires publishing this revision; this work does not itself publish it.
