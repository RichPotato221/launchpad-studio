# Inter-Branch Asset Movement & Resource Loan Agreement

Adds a real, database-backed asset movement system to the Office of the Resource Administrator, built on top of the asset register you already have (assets, QR tokens, categories, custodians, branches).

## What you get

**Asset profile upgrade**
- Each asset gets a permanent reference (TRG-ASSET-000001) plus its QR label, printable.
- Home branch stays fixed; current branch, location, custodian and condition update as the asset moves.
- New statuses: Available, Reserved, On Loan, In Transit, At Event, Under Maintenance, Damaged, Lost, Stolen, Disposed, Retired, Archived. Assets with history are archived, never deleted.

**Movement agreements**
- Numbered agreements (TROG-MOV-2026-000001) covering temporary inter-branch loan, permanent transfer, event movement, internal movement, other.
- Captures source/destination branch, purpose, requester, responsible person, department, dates, transport, notes, and a schedule of one or many assets.
- Workflow: Draft → Requested → Pending approval → Approved → Ready for dispatch → In transit → Received → On loan → Return requested → Return in transit → Returned → Closed, plus Rejected, Overdue, Incident review, Cancelled.
- A requester can never approve their own request; emergency movements can be recorded first and approved afterwards, with the reason kept.

**Handover, receipt and return**
- Dispatch screen: confirm assets, quantity, condition, accessories, transport, photos, then a digital acknowledgement recording name, role, branch, time.
- Receiving branch scans the QR or opens the agreement and confirms what arrived; discrepancies open an incident instead of closing quietly.
- Return runs the same way in reverse, with inspection and condition update before closure.
- Temporary loans keep the home branch; permanent transfers change it only after approval and completed handover, and the original branch stays on record.

**Overdue, extensions, incidents**
- Automatic overdue flagging with reminders before and after the due date, worded neutrally, and escalation at 1, 3 and 7 days.
- Extension requests keep the original return date and record the new one, reason, requester and approver.
- Incidents for damage, loss, theft, missing accessory, quantity or condition discrepancy, with status, photos, estimated impact, actions and outcome. Open incidents block closing an agreement.

**Custody history and audit trail**
- Every asset shows a timeline: location, branch, custodian, agreement, handover, receipt, return, closure.
- Immutable audit records for creation, updates, scans, approvals, dispatch, receipt, return, status/condition/custodian changes, incidents, extensions, cancellation, archiving and document generation. Members cannot edit or delete them.

**Dashboard, reports, agreement document**
- Dashboard counters (total, available, reserved, on loan, in transit, at event, overdue, damaged, lost, stolen, under maintenance) plus assets by branch, pending approvals, awaiting receipt, due for return, open incidents and recent activity.
- Filterable reports (branch, department, asset, category, status, condition, movement type, date, custodian, agreement, user) exportable to CSV, with printable PDF for the register and movement reports.
- A professional printable agreement carrying the TROGKC header, agreement number, full schedule, QR references, confirmations, the 13 agreement terms and audit information — view, download, print.

**Notifications**
- In-app notices for new requests, approval required, approved, rejected, ready for dispatch, dispatch confirmed, receipt required, receipt confirmed, return due, overdue, incident, maintenance, extensions and closure, sent through the portal's existing notification engine so email follows the same branch rules already in place.

**Who can do what**
- Senior Pastors: church-wide oversight.
- Resource Administrator: full operation of register, QR, movements, dispatch, receipt, returns, incidents, reports.
- Branch leaders: their own branch plus authorised inter-branch transactions.
- Department leaders: request resources for their department.
- Everyone else: no access. Enforced in the database, not just the screens.

## Technical notes

- New tables: `asset_qr_codes`, `asset_movements`, `asset_movement_items`, `asset_movement_approvals`, `asset_handover_records`, `asset_condition_records`, `asset_incidents`, `asset_extensions`, `asset_custody_events`, `asset_movement_audit`; existing `assets`, `branches`, `departments`, `asset_documents`, `asset_maintenance_logs`, `user_roles` are reused rather than duplicated.
- Sequential human numbers via Postgres sequences + `BEFORE INSERT` triggers (`TRG-ASSET-%06d`, `TROG-MOV-YYYY-%06d`); unique constraints on asset code and QR token.
- Status transitions, self-approval blocking, unavailable-asset blocking and open-incident closure blocking enforced by triggers/check constraints, not client code.
- RLS: branch isolation using the existing `my_branch()` / `same_branch_or_admin()` helpers, extended with source/destination branch visibility for movement rows; `senior_apostle` and resource-administrator role get church-wide read. GRANTs on every new table.
- Audit rows written by triggers; no update/delete grants for `authenticated`.
- Frontend: new `MovementsModule.tsx`, `AssetProfile.tsx` (custody timeline), `IncidentsModule.tsx`, `MovementAgreementDoc.tsx` (print/PDF via browser print stylesheet + jsPDF for download), QR scan via device camera (`html5-qrcode`) with manual code entry fallback; wired into the existing Resource Center tabs and dashboard.
- Reports extended in `ResourceReports.tsx` with the new filter set and CSV export using the existing `exportRows` helper.
