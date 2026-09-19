# Merge Protocol into the existing Ushering department

## Outcome
Keep the existing Ushering department and all of its data, vision, mission, KPIs, reports, resources, and operational tools. Rename its visible identity to **Ushering & Protocol**, then integrate Protocol as an operational function inside the same department. Keep **Legal & Compliance** as its own existing department.

## Department identity and data safety
- Keep the existing `ushers` department as the primary department record and route.
- Change only its visible name, scripture label, purpose/overview description, and combined operational wording; preserve the exact stored Ushering vision and mission.
- Keep the internal `protocol` identifier attached to Legal & Compliance so its new legal records, permissions, and history continue working.
- Ensure no standalone department named “Protocol” appears in signup, department lists, or department navigation.
- Move any current members whose department is still labelled internally as Protocol into `ushers`; current data checks show no such member rows, so this is a safe no-op unless a row appears before migration.
- Do not delete or rewrite historical records.

## Existing-page changes
- Preserve the standard department navigation: Overview, Team, KPI Dashboard, Reports, Resources.
- Update the overview copy to the supplied combined Ushering & Protocol description.
- Rename the existing operations workspace to **Ushering & Protocol** and retain all working modules.
- Organize its inner navigation for mobile and desktop around:
  - Dashboard
  - Service Operations
  - Ushering
  - Protocol
  - Duty Roster
  - Volunteers
  - Visitor Experience
  - Leadership & Guest Protocol
  - Attendance & Reports
  - Safety & Incidents
  - Care & Communications
  - Training
  - Risk Register
  - AI Assistant

## Combined operations
- Expand the command dashboard with the requested readiness picture: service, ushering, protocol, volunteer coverage, visitor/guest care, leadership/guest coordination, incidents/risks, and training.
- Reuse current service, seating, visitor, volunteer, roster, incident, care, attendance, risk, and training records.
- Add a Protocol workspace for leadership protocol, guest protocol, service protocol, and special events, supporting assignments, notes, status, and reporting.
- Keep the existing duty roster and add a function classification: Ushering, Protocol, or Ushering & Protocol.
- Keep existing volunteers and allow the requested combined assignments without removing current roles.

## KPIs, reports, resources, and AI
- Preserve all five existing Ushering KPIs and add the six requested Protocol KPIs under `ushers`.
- Keep reports in the current reporting tool and add the requested combined report types.
- Keep existing Ushering resources and uploads; add a Protocol category and retain all files.
- Rename and re-ground the existing assistant as **Ushering & Protocol Assistant**, covering both functions while using the same authorised records.

## Technical implementation
- Add only backward-compatible fields/tables needed for Protocol plans and roster function classification.
- Apply branch-scoped access and existing department permissions to new records.
- Keep Legal & Compliance records and permissions untouched.
- Update generated database types after schema changes.

## Verification
- Confirm only **Ushering & Protocol** appears for the combined ministry, while **Legal & Compliance** remains separate.
- Confirm stored Ushering vision and mission are unchanged.
- Confirm existing Ushering records, KPIs, reports, resources, and uploads remain accessible.
- Verify Protocol plans, roster classifications, combined reports/resources, and AI context.
- Test the full page at mobile and desktop widths for overflow and usability.
